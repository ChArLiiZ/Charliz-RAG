from fastapi import APIRouter, HTTPException

from models.document import Document, IngestDocumentRequest
from storage.memory_store import store

router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("", response_model=list[Document])
async def list_documents() -> list[Document]:
    return store.list_documents()


@router.post("/ingest")
async def ingest_document(payload: IngestDocumentRequest) -> dict[str, str]:
    if payload.collection_id not in store.collections:
        raise HTTPException(status_code=404, detail="Collection not found")

    document = store.create_document(payload)
    return {
        "documentId": document.id,
        "status": document.status,
    }
