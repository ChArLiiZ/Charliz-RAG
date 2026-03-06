from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from api.collections import router as collections_router
from api.documents import router as documents_router
from api.health import router as health_router


app = FastAPI(title="Charliz RAG Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:1420",
        "http://127.0.0.1:1420",
        "tauri://localhost",
        "http://tauri.localhost",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(health_router)
app.include_router(collections_router)
app.include_router(documents_router)


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8741, log_level="info")
