import { useEffect, useState } from "react";
import { backendApi } from "../lib/api/backend";
import type { Collection, Document } from "../types/domain";

export function DocumentsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState("default");
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    const [collectionData, documentData] = await Promise.all([
      backendApi.listCollections(),
      backendApi.listDocuments(),
    ]);

    setCollections(collectionData);
    setDocuments(documentData);
    setError(null);
    setSelectedCollectionId((current) =>
      collectionData.some((collection) => collection.id === current)
        ? current
        : (collectionData[0]?.id ?? "default"),
    );
  }

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        await loadData();
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unknown error");
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsUploading(true);
    setError(null);
    setMessage(null);

    try {
      const result = await backendApi.ingestDocument({
        collection_id: selectedCollectionId,
        file,
      });

      await loadData();
      setMessage(`Imported ${file.name} with ${result.chunk_count} chunks.`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  return (
    <section className="panel">
      <h2>Documents</h2>
      <p>Import `.txt`, `.md`, `.pdf`, `.docx`, `.csv`, or `.xlsx` files through Unstructured parsing.</p>
      <div className="stack">
        <div className="upload-panel">
          <label className="field">
            <span>Collection</span>
            <select
              className="input-like"
              value={selectedCollectionId}
              onChange={(event) => setSelectedCollectionId(event.target.value)}
            >
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Upload text document</span>
            <input
              className="input-like"
              type="file"
              accept=".txt,.md,.pdf,.docx,.csv,.xlsx,.xls,text/plain,text/markdown,application/pdf"
              onChange={handleFileChange}
              disabled={isUploading || collections.length === 0}
            />
          </label>
          {message ? <p className="success-text">{message}</p> : null}
        </div>
        <div>
          <h3>Collections</h3>
          <ul>
            {collections.map((collection) => (
              <li key={collection.id}>{collection.name}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Documents</h3>
          <ul>
            {documents.map((document) => (
              <li key={document.id}>
                {document.file_name} ({document.status}, {document.chunk_count ?? 0} chunks)
              </li>
            ))}
          </ul>
        </div>
        {error ? <p className="error-text">{error}</p> : null}
      </div>
    </section>
  );
}
