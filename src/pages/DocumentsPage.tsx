import { useEffect, useState } from "react";
import { backendApi } from "../lib/api/backend";
import type { Collection, Document } from "../types/domain";

export function DocumentsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [collectionData, documentData] = await Promise.all([
          backendApi.listCollections(),
          backendApi.listDocuments(),
        ]);

        if (!cancelled) {
          setCollections(collectionData);
          setDocuments(documentData);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unknown error");
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="panel">
      <h2>Documents</h2>
      <p>Phase 2 scaffold is in place. Collections and documents are loaded from backend stubs.</p>
      <div className="stack">
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
                {document.file_name} ({document.status})
              </li>
            ))}
          </ul>
        </div>
        {error ? <p className="error-text">{error}</p> : null}
      </div>
    </section>
  );
}
