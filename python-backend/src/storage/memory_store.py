from datetime import datetime, UTC
from uuid import uuid4

from core.chunker import chunk_text
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
        return sorted(self.documents.values(), key=lambda document: document.created_at, reverse=True)

    def create_document(self, payload: IngestDocumentRequest) -> Document:
        now = datetime.now(UTC)
        chunks = chunk_text(payload.content)
        document = Document(
            id=f"doc_{uuid4().hex[:8]}",
            collection_id=payload.collection_id,
            file_name=payload.file_name,
            file_path=payload.file_name,
            size_bytes=len(payload.content.encode("utf-8")),
            status="ready",
            chunk_count=len(chunks),
            error_message=None,
            created_at=now,
            updated_at=now,
        )
        self.documents[document.id] = document
        return document


store = MemoryStore()
