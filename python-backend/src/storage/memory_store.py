from datetime import datetime, UTC
from pathlib import Path
from uuid import uuid4

from models.collection import Collection, CreateCollectionRequest
from models.document import Document, IngestDocumentRequest


class MemoryStore:
    def __init__(self) -> None:
        self.collections: dict[str, Collection] = {}
        self.documents: dict[str, Document] = {}
        self._seed_default_collection()

    def _seed_default_collection(self) -> None:
        now = datetime.now(UTC)
        collection = Collection(
            id="default",
            name="Default Collection",
            description="Initial collection for early development.",
            created_at=now,
            updated_at=now,
        )
        self.collections[collection.id] = collection

    def list_collections(self) -> list[Collection]:
        return list(self.collections.values())

    def create_collection(self, payload: CreateCollectionRequest) -> Collection:
        now = datetime.now(UTC)
        collection = Collection(
            id=f"col_{uuid4().hex[:8]}",
            name=payload.name,
            description=payload.description,
            created_at=now,
            updated_at=now,
        )
        self.collections[collection.id] = collection
        return collection

    def list_documents(self) -> list[Document]:
        return list(self.documents.values())

    def create_document(self, payload: IngestDocumentRequest) -> Document:
        now = datetime.now(UTC)
        file_path = Path(payload.file_path)
        document = Document(
            id=f"doc_{uuid4().hex[:8]}",
            collection_id=payload.collection_id,
            file_name=file_path.name or payload.file_path,
            file_path=str(file_path),
            size_bytes=file_path.stat().st_size if file_path.exists() else 0,
            status="queued",
            chunk_count=None,
            error_message=None,
            created_at=now,
            updated_at=now,
        )
        self.documents[document.id] = document
        return document


store = MemoryStore()
