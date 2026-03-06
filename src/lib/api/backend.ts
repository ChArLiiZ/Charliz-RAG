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
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export const backendApi = {
  health: () => request<{ status: string; service: string }>("/health"),
  listCollections: () => request<Collection[]>("/collections"),
  listDocuments: () => request<Document[]>("/documents"),
};
