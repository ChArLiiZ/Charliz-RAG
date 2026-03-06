export type Collection = {
  id: string;
  name: string;
  description?: string | null;
  embedding_profile_id: string;
  created_at: string;
  updated_at: string;
};

export type Document = {
  id: string;
  collection_id: string;
  file_name: string;
  file_path: string;
  size_bytes: number;
  status: "queued" | "processing" | "ready" | "failed";
  chunk_count?: number | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
};
