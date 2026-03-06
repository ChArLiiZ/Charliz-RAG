import tempfile
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from models.document import Document, IngestDocumentRequest, IngestDocumentResponse
from parsers.document_parser import parse_document
from storage.memory_store import store

router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("", response_model=list[Document])
async def list_documents() -> list[Document]:
    return store.list_documents()


SUPPORTED_EXTENSIONS = {".txt", ".md", ".pdf", ".docx", ".csv", ".xlsx", ".xls"}


@router.post("/ingest", response_model=IngestDocumentResponse)
async def ingest_document(
    collection_id: str = Form(...),
    file: UploadFile = File(...),
) -> IngestDocumentResponse:
    if collection_id not in store.collections:
        raise HTTPException(status_code=404, detail="Collection not found")

    file_name = file.filename or "upload"
    suffix = Path(file_name).suffix.lower()

    if suffix not in SUPPORTED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {suffix or 'unknown'}")

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        temp_path = Path(temp_file.name)
        temp_file.write(await file.read())

    try:
        content = parse_document(temp_path)
    except Exception as error:
        raise HTTPException(status_code=400, detail=f"Document parsing failed: {error}") from error
    finally:
        temp_path.unlink(missing_ok=True)

    if not content.strip():
        raise HTTPException(status_code=400, detail="Document content is empty")

    document = store.create_document(
        IngestDocumentRequest(
            collection_id=collection_id,
            file_name=file_name,
            content=content,
        )
    )
    return IngestDocumentResponse(
        document_id=document.id,
        status=document.status,
        chunk_count=document.chunk_count or 0,
    )
