import type { Collection, Document } from "../../types/domain";

const BASE_URL = "http://127.0.0.1:8741";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    let detail = `Request failed: ${response.status}`;

    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) {
        detail = payload.detail;
      }
    } catch {
      // Ignore invalid error payloads and fall back to status text.
    }

    throw new Error(detail);
  }

  return (await response.json()) as T;
}

export const backendApi = {
  health: () => request<{ status: string; service: string }>("/health"),
  listCollections: () => request<Collection[]>("/collections"),
  listDocuments: () => request<Document[]>("/documents"),
  ingestDocument: async (payload: { collection_id: string; file: File }) => {
    const formData = new FormData();
    formData.append("collection_id", payload.collection_id);
    formData.append("file", payload.file);

    const response = await fetch(`${BASE_URL}/documents/ingest`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      let detail = `Request failed: ${response.status}`;

      try {
        const payload = (await response.json()) as { detail?: string };
        if (payload.detail) {
          detail = payload.detail;
        }
      } catch {
        // Ignore invalid error payloads and fall back to status text.
      }

      throw new Error(detail);
    }

    return (await response.json()) as {
      document_id: string;
      status: Document["status"];
      chunk_count: number;
    };
  },
};
