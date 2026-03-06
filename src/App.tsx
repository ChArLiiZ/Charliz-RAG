import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { HealthPanel } from "./components/HealthPanel";
import { Sidebar } from "./components/Sidebar";
import { backendApi } from "./lib/api/backend";
import { useAppStore } from "./stores/appStore";
import { ChatPage } from "./pages/ChatPage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { SettingsPage } from "./pages/SettingsPage";

function renderPage(page: string) {
  switch (page) {
    case "documents":
      return <DocumentsPage />;
    case "settings":
      return <SettingsPage />;
    default:
      return <ChatPage />;
  }
}

export function App() {
  const currentPage = useAppStore((state) => state.currentPage);
  const sidecarStatus = useAppStore((state) => state.sidecarStatus);
  const setSidecarStatus = useAppStore((state) => state.setSidecarStatus);
  const setHealth = useAppStore((state) => state.setHealth);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        setSidecarStatus("starting");
        await invoke("start_sidecar");
        const payload = await backendApi.health();

        if (!cancelled) {
          setHealth(payload);
          setSidecarStatus("ready");
        }
      } catch (error) {
        if (!cancelled) {
          setSidecarStatus("error");
          setHealth(null);
          console.error(error);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [setHealth, setSidecarStatus]);

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="content">
        <header className="page-header">
          <div>
            <p className="eyebrow">Soft Tech Workspace</p>
            <h1>Charliz RAG</h1>
          </div>
          <HealthPanel status={sidecarStatus} />
        </header>
        {renderPage(currentPage)}
      </main>
    </div>
  );
}
