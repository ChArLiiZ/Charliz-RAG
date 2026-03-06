from fastapi import FastAPI
import uvicorn

from api.collections import router as collections_router
from api.documents import router as documents_router
from api.health import router as health_router


app = FastAPI(title="Charliz RAG Backend")
app.include_router(health_router)
app.include_router(collections_router)
app.include_router(documents_router)


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8741, log_level="info")
