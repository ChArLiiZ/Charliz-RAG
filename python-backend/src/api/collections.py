from fastapi import APIRouter

from models.collection import Collection, CreateCollectionRequest
from storage.memory_store import store

router = APIRouter(prefix="/collections", tags=["collections"])


@router.get("", response_model=list[Collection])
async def list_collections() -> list[Collection]:
    return store.list_collections()


@router.post("", response_model=Collection)
async def create_collection(payload: CreateCollectionRequest) -> Collection:
    return store.create_collection(payload)
