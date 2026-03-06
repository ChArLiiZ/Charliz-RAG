# Charliz RAG - Project Plan

## Implementation Progress

Last updated: 2026-03-06

### Current Status

- [x] Initialized project workspace structure.
- [x] Added React + TypeScript + Vite frontend shell.
- [x] Added basic app layout with sidebar and health status panel.
- [x] Added Tauri v2 Rust skeleton with `start_sidecar`, `stop_sidecar`, and placeholder `load_settings` commands.
- [x] Added Python FastAPI sidecar with `GET /health`.
- [x] Added collection and document API scaffolding with in-memory backend store.
- [x] Connected `Documents` page to backend collection/document stub endpoints.
- [x] Fixed frontend and Rust build blockers for local Tauri development.
- [x] Added first-pass Tauri sidecar lifecycle hardening with startup delay, health retry, and shutdown cleanup.
- [x] Added first working document ingestion slice for `.txt` and `.md` files.
- [x] Switched document parsing to `unstructured` with multipart file upload.
- [ ] Add persistent settings storage and secure API key handling.
- [ ] Replace in-memory document stub with real ingestion pipeline.

### This Iteration

- Foundation work started from an empty workspace.
- Current frontend pages are placeholders for `Chat`, `Documents`, and `Settings`.
- Current backend scope is intentionally minimal: health check only.
- Backend now exposes early `collections` and `documents` scaffolding for Phase 2.
- Verified `GET /health` locally on `http://127.0.0.1:8741/health`.
- Verified `GET /collections` and `GET /documents` locally against the FastAPI stub backend.
- Verified `pnpm build` succeeds for the frontend.
- Verified `cargo check` succeeds for `src-tauri`.
- Added placeholder Tauri Windows icon so local build/dev can proceed.
- Added frontend health retry and Tauri-side shutdown cleanup for the Python backend.
- Added FastAPI CORS configuration for local Vite/Tauri origins so frontend health checks can succeed.
- Added a minimal text chunker and in-memory ingestion flow that marks uploaded text documents as `ready`.
- Documents page now supports direct `.txt` / `.md` upload from the UI and shows chunk counts.
- Backend now accepts multipart file upload and parses documents with `unstructured.partition.auto.partition`.
- Verified parser smoke test for Markdown and verified `POST /documents/ingest` returns `ready` with chunk metadata.
- Fixed PDF ingestion by routing PDFs through `partition_pdf(strategy="fast")` and adding the required `unstructured-inference` dependency.
- Remaining gap: sidecar lifecycle still needs stronger stale-process/port-conflict recovery.
- Next focus: replace the in-memory document flow with persistent storage while keeping `unstructured` as the parser layer.

### Notes

- Existing plan content below has visible encoding corruption. Progress tracking will be maintained in this section first to avoid rewriting the full document before functionality is in place.

## Context

建立一個 Windows 桌面 RAG 應用程式，讓使用者能上傳文件、建立知識庫，並透過自選的 LLM provider（含本地 Ollama）進行對話式問答。目標是簡單易用、不需要使用者自行安裝 Python 或其他依賴。

---

## Technology Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Desktop Shell | **Tauri v2** (Rust) | 小安裝包、原生 webview、內建 sidecar 支援 |
| Frontend | **React 19 + TypeScript + Vite** | 生態系最完整、chat UI 元件豐富 |
| UI Components | **shadcn/ui** + **Tailwind CSS v4** | 高品質可客製元件、搭配 Tailwind |
| State | **Zustand** + **TanStack Query** | 輕量且適合 async 資料同步 |
| i18n | **react-i18next** | 中英雙語切換（繁中 / English）|
| Python Backend | **FastAPI** (as Tauri sidecar) | Async、自動 OpenAPI、與 Tauri sidecar 整合良好 |
| LLM 抽象層 | **LiteLLM** | 統一介面支援 100+ providers（OpenAI/Anthropic/Gemini/OpenRouter/Ollama 等）|
| Embedding (本地) | **sentence-transformers** (`all-MiniLM-L6-v2`, 22MB) | 免 API key、CPU 可跑 |
| Embedding (API) | **LiteLLM embedding** | 可選用 OpenAI/Cohere 等雲端 embedding |
| Vector DB | **LanceDB** (embedded persistent mode) | Rust 核心、AnythingLLM 驗證、PyInstaller 相容性好 |
| Metadata/History | **SQLite** (via aiosqlite) | 聊天記錄、文件註冊、設定 |
| Document Parsing | **Unstructured** (`[csv,docx,xlsx,md,pdf]` extras) | 統一 API 支援 PDF/DOCX/Excel/CSV/TXT/MD，非 PDF 格式純 Python 無需 ML |
| Python Packaging | **PyInstaller** (`--onedir` mode) | 打包成獨立執行檔，使用者不需裝 Python |
| API Key Storage | **Tauri Store plugin** + AES-256 加密 | 安全儲存於本機 |

### Technology Choice Rationale

#### Vector DB: LanceDB (而非 ChromaDB)

ChromaDB 在 PyInstaller 打包時有嚴重問題（segfault、RecursionError、動態 import 失敗），且 bundle size 巨大（150-300+ MB，含大量桌面用不到的 gRPC/OpenTelemetry 依賴）。LanceDB 的 Rust 核心 + PyO3 binding 架構與 PyInstaller 相容性好，已被 AnythingLLM 等桌面 RAG 應用驗證，效能優異且 API 穩定。

#### Document Parsing: Unstructured (而非多個獨立套件)

Unstructured 提供統一的 `partition()` API 自動偵測檔案格式，支援 PDF/DOCX/Excel/CSV/TXT/MD 等格式。非 PDF 格式使用純 Python 解析（python-docx、openpyxl 等），無需 ML 模型。PDF 提供 `"fast"` 策略（pdfminer，純 Python）和 `"hi_res"` 策略（需 ML 模型）兩種選擇。相比 Docling（強制依賴 PyTorch，bundle 1.5-2.5GB+），Unstructured 在桌面打包場景下更輕量。

---

## Architecture

```
+------------------------------------------------------------------+
|                     Charliz RAG Desktop App                       |
|                                                                   |
|  +-------------------+          +-----------------------------+   |
|  |  Tauri (Rust)      |   IPC   |  Frontend (React + TS)      |   |
|  |  - Sidecar 管理    |<------->|  - Chat 介面                |   |
|  |  - 加密 API Key    | invoke  |  - 文件管理                 |   |
|  |  - 檔案對話框      |         |  - 知識庫管理               |   |
|  |  - 視窗管理        |         |  - 設定頁面                 |   |
|  +--------+-----------+         +----------+------------------+   |
|           | spawn/kill                     | HTTP localhost:8741   |
|  +--------v--------------------------------------------v------+   |
|  |            Python Backend (FastAPI Sidecar)                |   |
|  |                                                            |   |
|  |  API Layer ─── RAG Pipeline ─── LLM Provider (LiteLLM)    |   |
|  |       |             |                                      |   |
|  |  Unstructured  Chunker      Embedding Engine               |   |
|  |  (all formats) Recursive    Local(MiniLM) / API           |   |
|  |       |             |              |                       |   |
|  |  +--------------------------------------------------+     |   |
|  |  | LanceDB (vectors)    |    SQLite (metadata)      |     |   |
|  |  +--------------------------------------------------+     |   |
|  +------------------------------------------------------------+   |
|                                                                   |
|  Data: %APPDATA%/charliz-rag/ (lancedb/, charliz.db, models/)     |
+-------------------------------------------------------------------+
```

### Communication Model

```
Frontend (JS/TS)                 Rust (Tauri)               Python (FastAPI)
     |                               |                           |
     |--- invoke("start_sidecar") -->|                           |
     |                               |--- spawn process -------->|
     |                               |                           |--- uvicorn starts
     |                               |<-- stdout: "READY:8741" --|    on port 8741
     |<-- event: "sidecar-ready" ----|                           |
     |                               |                           |
     |--- HTTP GET /health ----------------------------------------->|
     |<-- 200 OK ---------------------------------------------------.|
     |                               |                           |
     |--- HTTP POST /chat/stream (SSE) ------------------------------>|
     |<-- text/event-stream: chunks ----------------------------------|
     |                               |                           |
     |--- invoke("save_api_key") --->|                           |
     |                               |-- encrypt + store         |
     |<-- ok ------------------------|                           |
     |                               |                           |
     | (window close)                |--- stdin: "SHUTDOWN\n" -->|
     |                               |                           |--- graceful exit
```

- **Rust <-> Python**: Stdin/Stdout 用於生命週期管理（啟動/關閉）
- **Frontend <-> Python**: HTTP over localhost 用於所有業務邏輯
- **Chat streaming**: SSE (Server-Sent Events) over HTTP
- **API Key flow**: Frontend → Rust encrypt → Store plugin → 請求時解密 → 放入 HTTP body → Python 用完即丟

---

## UI Style Direction

### Chosen Direction: Soft Tech

整體風格定調為 **Soft Tech**：偏現代、乾淨、理性，有輕微科技感，但不走過度發光、霓虹、重漸層或模板感很重的 AI dashboard 風格。

核心原則：

- 以高可讀性和長時間使用舒適度為優先
- 科技感只放在重點互動區，不鋪滿整個畫面
- 主要視覺語言靠色彩節制、層次、邊框與留白，不靠花俏裝飾
- Light / Dark mode 都必須是第一級體驗，不是事後補上

### Visual Keywords

- Clean
- Calm
- Precise
- Lightweight
- Modern desktop tool

### Color System

**Accent 色：**
- 主色走 `teal / cyan / blue-slate`
- 避免高飽和純藍、螢光青、過亮紫色
- Accent 只用於主要 CTA、active state、focus ring、選取狀態、loading highlight

**Light Mode 基調：**
- 背景：偏冷白，不要純白
- 卡片：白色或極淡藍灰
- 邊框：淡 slate / zinc 灰
- 文字：深 slate，不要純黑

**Dark Mode 基調：**
- 背景：深藍灰 / 深炭灰，不用純黑
- 卡片：比背景亮一階
- 邊框：低對比冷灰
- 文字：偏冷白，降低刺眼感

**建議基礎色票：**

```ts
const palette = {
  light: {
    bg: "#F6F8FB",
    surface: "#FFFFFF",
    surfaceAlt: "#EEF3F8",
    border: "#D8E2EC",
    text: "#13202B",
    textMuted: "#5B6B79",
    accent: "#1F9FB2",
    accentStrong: "#167E8E",
    success: "#2E9E6F",
    warning: "#D69A2D",
    danger: "#D75B6A",
  },
  dark: {
    bg: "#0F1722",
    surface: "#16202C",
    surfaceAlt: "#1B2836",
    border: "#28384A",
    text: "#EAF1F7",
    textMuted: "#9FB0C0",
    accent: "#48C2D8",
    accentStrong: "#78D7E6",
    success: "#4DBA87",
    warning: "#E6B24A",
    danger: "#F07C8A",
  },
};
```

### Typography

- 主字體建議：`Manrope` 或 `Plus Jakarta Sans`
- 後備可用：`Segoe UI`, `system-ui`, `sans-serif`
- 避免太幾何或太品牌感強烈的字體，保持工具產品可讀性

字級方向：

- App title / page title：`28-32px`
- Section title：`18-20px`
- Body：`14-15px`
- Caption / metadata：`12-13px`

### Component Language

- 圓角：`12px` 為主，大卡片可到 `16px`
- 邊框比重高於陰影，陰影只做非常淡的層次
- 按鈕以實心主按鈕 + 淡底次按鈕 + ghost 按鈕為主
- Input / Select 要有清楚 focus ring，顏色使用 accent
- Chat message、document card、settings panel 都維持相同 surface 邏輯

### Layout Principles

- 採用桌面工具式三區塊結構：Sidebar / Main Content / Context Panel
- 留白要足夠，但不要做成 marketing page
- 聊天區寬度不要太滿，讓回答內容有閱讀節奏
- Source citation、document status、provider status 這些輔助資訊要弱化但清楚

### Motion Principles

- 僅使用低干擾動效：fade in、panel slide、skeleton loading、streaming cursor
- 動畫時間控制在 `120ms - 220ms`
- 不使用大範圍漂浮、縮放或玻璃擬態特效

### Light / Dark Mode Rules

- 所有顏色一律走 semantic tokens，不直接在元件寫死 hex
- Dark mode 不做純黑背景，避免長時間閱讀疲勞
- Light mode 不做純白背景，避免對比過硬
- 狀態色在 dark mode 需要提高亮度，避免與背景混在一起
- 圖示、分隔線、選中狀態都需分別定義 light/dark 對應值

### UI Tone 參考

- 類似現代筆記 / 研究 / AI 工具
- 比企業後台更柔和
- 比消費級 AI 網站更克制

### Provider Configuration Strategy

Provider 設定不要做成前後端都寫死的 `if/else`，建議改成可擴充 registry：

- frontend 用 `providerCatalog.ts` 定義 provider metadata（label、是否需要 API key、預設 base URL、建議 models、是否支援動態抓 model）
- backend 用 `ProviderConfig` / `ResolvedModelConfig` 統一轉換成 LiteLLM 所需參數（`model`、`api_key`、`api_base`、額外 headers）
- 設定資料要分成「provider 類型」和「實際 model 字串」兩層，避免 UI 的顯示名稱直接耦合到 LiteLLM model id
- OpenRouter 應視為獨立 provider，不要只當成 OpenAI 相容 base URL，否則後續擴充 provider-specific header / routing 會卡住
- model 選擇器要同時支援「建議清單」與「手動輸入」，因為新模型更新速度一定快於桌面 app 發版速度

---

## Project Structure

```
charliz-rag/
├── package.json                    # Root workspace
├── src/                            # Frontend (React + TS)
│   ├── App.tsx
│   ├── pages/
│   │   ├── ChatPage.tsx            # 聊天頁面
│   │   ├── DocumentsPage.tsx       # 文件管理
│   │   ├── KnowledgeBasePage.tsx   # 知識庫管理
│   │   └── SettingsPage.tsx        # LLM/Embedding 設定
│   ├── components/
│   │   ├── chat/                   # ChatWindow, ChatInput, MessageBubble, SourceCitation
│   │   ├── documents/              # DocumentList, DocumentUpload, DocumentCard
│   │   ├── settings/               # ProviderSelect, ApiKeyInput, ModelSelect
│   │   └── ui/                     # shadcn/ui 元件 (Button, Input, Dialog, Card 等)
│   ├── i18n/
│   │   ├── index.ts                # react-i18next 設定
│   │   ├── zh-TW.json              # 繁體中文
│   │   └── en.json                 # English
│   ├── features/
│   │   ├── chat/     (hooks/, api/, types/)
│   │   ├── documents/ (hooks/, api/, types/)
│   │   └── settings/  (hooks/, api/, types/)
│   ├── stores/                     # Zustand stores
│   └── lib/                        # api-client, tauri-bridge, constants
│
├── src-tauri/                      # Tauri / Rust
│   ├── tauri.conf.json
│   ├── src/
│   │   ├── lib.rs                  # Plugin 註冊、sidecar 生命週期
│   │   ├── commands/
│   │   │   ├── sidecar.rs          # 啟動/停止/健康檢查 Python
│   │   │   ├── settings.rs         # 加密 API key 讀寫
│   │   │   └── files.rs            # 原生檔案選擇器
│   │   └── crypto.rs               # AES-256-GCM 加解密
│   └── capabilities/default.json
│
├── python-backend/                 # Python RAG Backend
│   ├── pyproject.toml
│   ├── requirements.txt
│   ├── build_sidecar.py            # PyInstaller 打包腳本
│   └── src/
│       ├── main.py                 # FastAPI + uvicorn + 父行程 watchdog
│       ├── api/
│       │   ├── chat.py             # POST /chat/stream (SSE)
│       │   ├── documents.py        # 文件上傳/狀態/刪除
│       │   ├── collections.py      # 知識庫 CRUD
│       │   └── health.py           # GET /health
│       ├── core/
│       │   ├── rag_pipeline.py     # Retrieve → Augment → Generate
│       │   ├── document_processor.py
│       │   ├── chunker.py          # Recursive text splitter
│       │   ├── retriever.py        # LanceDB query + top-k
│       │   └── context_builder.py  # 組裝 prompt（chunks + history）
│       ├── llm/
│       │   ├── provider.py         # LiteLLM wrapper
│       │   ├── config.py           # LLMConfig dataclass
│       │   └── provider_registry.py # Provider metadata / model mapping / validation
│       ├── embeddings/
│       │   ├── local_embedder.py   # sentence-transformers
│       │   └── api_embedder.py     # litellm.embedding()
│       ├── storage/
│       │   ├── vector_store.py     # LanceDB wrapper (embedded, file-based)
│       │   └── metadata_db.py      # SQLite (aiosqlite)
│       ├── parsers/
│       │   ├── document_parser.py  # Unstructured partition() 統一解析
│       │   └── parser_config.py    # 各格式解析策略設定（PDF: fast/hi_res）
│       └── models/                 # Pydantic request/response schemas
└── scripts/
    ├── build-sidecar.ps1
    └── dev.ps1
```

---

## Key Data Flows

### Document Ingestion

```
使用者拖入檔案 → Tauri file dialog → POST /documents/ingest
→ Unstructured partition() 自動偵測格式解析 → Chunker (recursive split, 512 tokens, 64 overlap)
→ Embedding (MiniLM) → LanceDB table.add() + SQLite 註冊
→ Frontend polls status → 顯示 "Ready"
```

**Detailed flow:**

1. Frontend 呼叫 Tauri `open_file_dialog` 取得檔案路徑
2. `POST /documents/ingest {file_path, collection_id}` 送到 Python
3. Python 註冊文件到 SQLite (status: "processing")，回傳 202 + document_id
4. 背景任務啟動：
   - `unstructured.partition.auto.partition(filename)` 解析文件
   - Chunker 將 elements 切割成適當大小的 chunks
   - Embedding engine 生成向量
   - LanceDB table.add() 儲存向量 + metadata
   - SQLite 更新 status → "ready"
5. Frontend polling `/documents/{id}/status` 追蹤進度

### Chat Query (RAG)

```
使用者輸入問題 → POST /chat/stream (SSE)
→ Embed query → LanceDB table.search().limit(5)
→ Context builder (system prompt + chunks + history)
→ LiteLLM.acompletion(stream=True)
→ SSE tokens → Frontend 即時顯示
→ 最後送出 sources metadata → 顯示引用來源
```

**SSE Event format:**

```
data: {"type": "token", "content": "根據"}
data: {"type": "token", "content": "文件"}
...
data: {"type": "sources", "sources": [{"doc": "report.pdf", "page": 3, "score": 0.89}]}
data: {"type": "done"}
```

---

## LLM Provider 支援

透過 LiteLLM 統一介面：

| Provider | API Key | Model Examples |
|----------|---------|----------------|
| OpenAI | 需要 | gpt-5.2, gpt-5-mini, gpt-4.1 |
| Anthropic | 需要 | claude-sonnet-4, claude-opus-4, claude-opus-4.1 |
| Google Gemini | 需要 | gemini-2.5-flash, gemini-2.5-pro |
| OpenRouter | 需要 | openrouter/auto, openai/gpt-5.2, anthropic/claude-sonnet-4, google/gemini-2.5-pro |
| Ollama (本地) | 不需要 | 由本機動態偵測，例如 llama3.2, qwen2.5, mistral, phi4 |

Settings 頁面：選 provider → 輸入 API key / base URL（視 provider 而定）→ 選建議 model 或手動輸入 model → Test connection

### Provider / Model UX 規劃

- provider 切換時顯示對應欄位：
  - OpenAI / Anthropic / Gemini / OpenRouter：API key 必填
  - Ollama：預設 `http://localhost:11434`，可手動改 base URL
- model 欄位改成 `combobox + free text input`
  - 可點選預設建議 models
  - 可直接輸入任意 LiteLLM model name
  - 保留最近使用的 model 歷史
- OpenRouter 若未來要支援自訂 headers，可預留 `X-Title` / `HTTP-Referer` 擴充欄位，但第一版可先不暴露 UI
- `Test connection` 要測實際 provider + model 組合，不只是測 API key 是否存在
- 設定資料結構建議如下：

```ts
type LlmSettings = {
  provider: "openai" | "anthropic" | "gemini" | "openrouter" | "ollama";
  apiKey?: string;
  baseUrl?: string;
  model: string;
  suggestedModels?: string[];
};
```

**LiteLLM model 格式：**
- OpenAI: `gpt-5.2`
- Anthropic: `anthropic/claude-sonnet-4-20250514`
- Google: `gemini/gemini-2.5-flash`
- OpenRouter: `openrouter/auto` 或 `openai/gpt-5.2`
- Ollama: `ollama/llama3.2`（需設定 base_url: `http://localhost:11434`）

> 原則上不要把 model 清單寫死成唯一來源。文件內列的只應是「預設建議值」，實作上仍須允許使用者直接輸入 model 名稱。

---

## API Endpoints

```
GET    /health                     → 健康檢查
POST   /chat/stream                → SSE 串流聊天 (RAG)
GET    /conversations              → 對話列表
GET    /conversations/:id/messages → 對話訊息
DELETE /conversations/:id          → 刪除對話
POST   /documents/ingest           → 上傳文件
GET    /documents                  → 文件列表
GET    /documents/:id/status       → 文件處理狀態
DELETE /documents/:id              → 刪除文件
GET    /collections                → 知識庫列表
POST   /collections                → 建立知識庫
PUT    /collections/:id            → 更新知識庫
DELETE /collections/:id            → 刪除知識庫
GET    /models/ollama              → 查詢 Ollama 可用模型
POST   /settings/test-llm          → 測試指定 provider + model 是否可用
PUT    /settings/embedding         → 更新 embedding 設定
```

---

## Implementation Phases

### Phase 1: Foundation（基礎建設）
- Tauri v2 + React + Vite 專案初始化（含 shadcn/ui + Tailwind v4）
- Python FastAPI 專案結構 + PyInstaller 打包腳本
- Sidecar 生命週期管理（spawn, ready signal, shutdown, watchdog）
- 基本 app shell + sidebar navigation + `/health` 連線確認
- **驗收：** App 視窗開啟，顯示 "Backend Connected"

### Phase 2: Document Ingestion（文件攝入）
- Unstructured 整合（PDF fast 策略/DOCX/Excel/CSV/TXT/MD）
- Text chunker (recursive character splitter, 512 tokens, 64 overlap)
- LanceDB + SQLite 初始化
- Local embedding (sentence-transformers all-MiniLM-L6-v2)
- 文件上傳 UI（拖放 + 檔案選擇器）+ 狀態追蹤
- Collection（知識庫）CRUD
- **驗收：** 上傳 PDF → chunking 完成 → LanceDB 有資料

### Phase 3: Chat with RAG（RAG 對話）
- Retriever（LanceDB search + top-k）
- Context builder（system prompt + chunks + conversation history + token budget）
- LLM Provider（先完成 provider registry，並支援 OpenAI / OpenRouter 基線整合）
- SSE streaming endpoint
- Chat UI（streaming 顯示、markdown render、source citations）
- 對話歷史管理（建立/列表/刪除）
- **驗收：** 問與文件相關的問題 → streaming 回答 + source citations

### Phase 4: Multi-Provider Support（多 Provider 支援）
- LiteLLM 完整整合（Anthropic/Gemini/OpenRouter/Ollama）
- Settings 頁面（provider select, API key input, base URL, suggested model picker + custom model input）
- Rust 端 AES-256 加密 API key 儲存
- Ollama model discovery（GET /models/ollama）
- Connection test 功能（實際驗證 provider + model）
- API embedding provider 選項
- **驗收：** 可切換不同 provider 正常問答

### Phase 5: Polish（打磨）
- i18n 中英雙語（react-i18next）
- Error handling + loading states + toast notifications
- 對話標題自動產生（使用 LLM 摘要首條訊息）
- 鍵盤快捷鍵（Ctrl+Enter 送出等）
- Light/dark theme
- Sidecar crash recovery（自動重啟 + 錯誤通知）
- **驗收：** 整體 UX 流暢，中英文切換正常

### Phase 6: Packaging（打包發佈）
- PyInstaller 最終打包（CPU-only torch + embedding model 預載）
- Tauri Windows installer (MSI/NSIS)
- 首次使用引導設定（選 LLM provider）
- 乾淨 Windows 機器安裝測試
- **驗收：** `.msi` 安裝檔在乾淨 Windows 11 上正常運作

---

## MVP 開發順序（建議實作切法）

### Milestone 1: App Shell + Sidecar Ready

- Tauri 啟動前端與 Python sidecar
- `/health` 可通
- Settings store 可讀寫
- 先只做單一固定 collection

**完成定義：**
- App 開啟 3 秒內可看到 backend ready 狀態
- 關閉視窗時 sidecar 能正常退出

### Milestone 2: Document Ingestion Vertical Slice

- 單檔上傳 `.pdf` / `.txt`
- chunking + embedding + LanceDB 寫入
- documents list / ingest status 可查
- 先不做取消，只做成功 / 失敗 / 處理中三態

**完成定義：**
- 上傳一份文件後可以在資料庫看到 chunks
- UI 能顯示 processing → ready / failed

### Milestone 3: Chat Vertical Slice

- 單一 collection 查詢
- SSE streaming
- citations 顯示 chunk 來源
- conversation 建立與訊息保存

**完成定義：**
- 對已上傳文件提問可得到引用來源明確的回答

### Milestone 4: Provider Settings

- OpenAI / OpenRouter
- model 建議清單 + 手動輸入
- `POST /settings/test-llm`
- API key 加密儲存

**完成定義：**
- 使用者可在 UI 改 provider 與 model，並成功完成一次問答

### Milestone 5: Production Hardening

- 多 collection
- Ollama model discovery
- 匯入失敗重試 / 更完整錯誤訊息
- 安裝包與乾淨機器驗證

---

## 設定與資料 Schema

### Persisted Settings

```ts
type PersistedSettings = {
  llm: {
    provider: "openai" | "anthropic" | "gemini" | "openrouter" | "ollama";
    model: string;
    apiKeyRef?: string;
    baseUrl?: string;
    temperature: number;
    maxTokens?: number;
    topP?: number;
    extraHeaders?: Record<string, string>;
    recentModels: string[];
  };
  embedding: {
    mode: "local" | "api";
    provider?: "openai" | "cohere" | "openrouter" | "ollama";
    model: string;
    apiKeyRef?: string;
    dimensions?: number;
  };
  retrieval: {
    topK: number;
    scoreThreshold?: number;
    maxContextChunks: number;
  };
  ui: {
    language: "zh-TW" | "en";
    theme: "light" | "dark" | "system";
  };
};
```

### Domain Entities

```ts
type Collection = {
  id: string;
  name: string;
  description?: string;
  embeddingProfileId: string;
  createdAt: string;
  updatedAt: string;
};

type Document = {
  id: string;
  collectionId: string;
  fileName: string;
  filePath: string;
  mimeType?: string;
  sizeBytes: number;
  hashSha256: string;
  status: "queued" | "processing" | "ready" | "failed";
  chunkCount?: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
};

type Conversation = {
  id: string;
  collectionId: string;
  title: string;
  llmProvider: string;
  llmModel: string;
  createdAt: string;
  updatedAt: string;
};

type Message = {
  id: string;
  conversationId: string;
  role: "system" | "user" | "assistant";
  content: string;
  citations?: Citation[];
  createdAt: string;
};

type Citation = {
  documentId: string;
  documentName: string;
  chunkId: string;
  page?: number;
  score: number;
};
```

### Schema 原則

- `Conversation` 要明確綁定 `collectionId`，第一版不要做跨 collection retrieval
- `Document.hashSha256` 用來做重複匯入判斷
- `apiKeyRef` 只存 reference key，不存明文 API key
- collection 建立後就綁定 embedding profile，避免不同 embedding 維度混用

---

## API Contract 草案

### `POST /documents/ingest`

Request:

```json
{
  "filePath": "C:\\docs\\report.pdf",
  "collectionId": "col_123"
}
```

Response `202`:

```json
{
  "documentId": "doc_123",
  "status": "processing"
}
```

### `GET /documents/:id/status`

Response `200`:

```json
{
  "documentId": "doc_123",
  "status": "ready",
  "chunkCount": 42,
  "errorMessage": null
}
```

### `POST /chat/stream`

Request:

```json
{
  "conversationId": "conv_123",
  "collectionId": "col_123",
  "message": "請根據文件整理重點",
  "provider": "openrouter",
  "model": "openai/gpt-5.2",
  "overrides": {
    "temperature": 0.2,
    "topK": 5
  }
}
```

SSE Events:

```text
data: {"type":"message_start","conversationId":"conv_123"}
data: {"type":"token","content":"根據"}
data: {"type":"token","content":"文件"}
data: {"type":"sources","sources":[{"documentId":"doc_123","documentName":"report.pdf","chunkId":"chunk_9","page":3,"score":0.89}]}
data: {"type":"message_end","messageId":"msg_456"}
data: {"type":"done"}
```

### `POST /settings/test-llm`

Request:

```json
{
  "provider": "openrouter",
  "model": "openai/gpt-5.2",
  "apiKey": "or-***",
  "baseUrl": "https://openrouter.ai/api/v1"
}
```

Response `200`:

```json
{
  "ok": true,
  "provider": "openrouter",
  "model": "openai/gpt-5.2",
  "latencyMs": 842
}
```

### Error Response

所有非 2xx endpoint 建議統一格式：

```json
{
  "error": {
    "code": "PROVIDER_AUTH_FAILED",
    "message": "Invalid API key",
    "details": {}
  }
}
```

### Error Code 建議

- `PROVIDER_AUTH_FAILED`
- `PROVIDER_MODEL_NOT_FOUND`
- `PROVIDER_RATE_LIMITED`
- `DOCUMENT_PARSE_FAILED`
- `DOCUMENT_EMBED_FAILED`
- `VECTOR_DIMENSION_MISMATCH`
- `COLLECTION_NOT_FOUND`
- `CONVERSATION_NOT_FOUND`

---

## Key Technical Considerations

1. **PyInstaller `--onedir`**: 避免 `--onefile` 的子程序殺不掉問題（Tauri kill 只殺 bootloader，Python 程序變孤兒）
2. **Parent process watchdog**: Python 背景執行緒定期檢查 Tauri PID 是否存活，父程序消失時自動退出
3. **Port conflict**: Python 嘗試預設 port 8741，佔用時自動遞增（最多試 10 次），透過 stdout 回報實際 port
4. **Bundle size**: Unstructured 非 PDF 格式純 Python（~200-400MB）；sentence-transformers 需 CPU-only torch，可考慮用 onnxruntime 替代以縮小
5. **Embedding model**: 首次執行時下載 or 打包時預先包含（設 `SENTENCE_TRANSFORMERS_HOME` 指向 bundled 目錄）
6. **Token limit**: Context builder 實作 budget 系統 — 保留 system prompt (~200 tokens) + max response (~2048 tokens)，其餘 60% 給 chunks、40% 給 history；不同 model context window 不同，這裡不要寫死成單一固定值
7. **Embedding 維度不符**: 切換 embedding model 時需 re-embed（LanceDB table 需重建），UI 需提示使用者
8. **安全性**: Python 只 bind `127.0.0.1`、CORS 限定 `tauri://localhost` 和 `http://localhost`、API key 不落地 Python（僅記憶體中使用）；OpenRouter 若需額外 headers 也要走 Rust 解密流程，不要存到前端明文 state
9. **離線能力**: Ollama + 本地 embedding = 完全離線可用（適合隱私敏感環境）
10. **Windows 注意事項**: PyInstaller binary 可能觸發 Windows Defender 誤報（建議 code signing）、路徑長度限制（存 `%APPDATA%` 短路徑）
11. **Provider 相容性**: 不同 provider 的 model naming、base URL、streaming 行為、rate limit 錯誤格式都不同，backend 需要一層統一錯誤轉換，前端只處理一致的錯誤型別
12. **Model 更新速度**: 雲端模型更新很快，預設 model 清單只做 UX 輔助，不能當唯一白名單，不然文件與實作都會很快過期

---

## Supported File Formats

| 格式 | 副檔名 | 解析方式 | 備註 |
|------|---------|----------|------|
| PDF | `.pdf` | Unstructured `"fast"` strategy (pdfminer) | 純 Python，無需 ML |
| Word | `.docx` | Unstructured (python-docx) | |
| Excel | `.xlsx`, `.xls` | Unstructured (openpyxl) | |
| CSV | `.csv` | Unstructured (pandas) | |
| 純文字 | `.txt` | Unstructured | |
| Markdown | `.md` | Unstructured | |

> 若未來需要更精確的 PDF 表格/版面解析，可升級為 `"hi_res"` strategy（需額外安裝 tesseract + poppler）。

---

## Verification Plan

1. `pnpm dev` 啟動開發模式 → Tauri 視窗開啟 → 顯示 "Backend Connected"
2. 上傳一份 PDF → 確認 chunking 完成 → LanceDB 有資料
3. 上傳 DOCX/Excel/CSV 各一份 → 確認都能正常解析
4. 在 Chat 輸入與文件相關的問題 → 收到 streaming 回答 + source citations
5. Settings 切換不同 provider → 確認都能正常回答
6. Settings 輸入自訂 model 名稱（非預設清單）→ 確認可正常儲存與呼叫
7. 設定 Ollama → 選本地模型 → 離線問答正常
8. 切換中/英文介面 → UI 文字正確切換
9. `pnpm tauri build` → 產生 Windows installer → 在乾淨 Windows 機器測試安裝

---

## 建議補強項目

1. **設定 schema 要先定義清楚**：目前文件有提到 provider、model、embedding，但還缺完整的 persisted settings schema。這一塊最好先定義，不然前後端很容易各長一套格式。
2. **Conversation / collection 關聯要明確**：對話是否綁定單一 collection、能不能跨 collection 查詢，現在還不夠清楚，這會直接影響 API 與 UI。
3. **文件重複匯入策略**：同一檔案重複上傳要如何處理（覆蓋、建立新版本、去重）目前沒寫，之後很容易補不進架構。
4. **索引工作佇列 / 取消機制**：大檔案匯入與 embedding 需要背景 job 狀態管理，建議補上取消、失敗重試、部分失敗可觀測性。
5. **設定驗證責任邊界**：前端只做基本欄位驗證，真正的 provider/model 可用性檢查應由 backend 統一處理，避免 UI 與實際呼叫邏輯分裂。
