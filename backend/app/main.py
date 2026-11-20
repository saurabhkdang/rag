from fastapi import FastAPI

from app.api import admin, chat, documents

app = FastAPI(title="RAG Platform")

app.include_router(admin.router)
app.include_router(documents.router)
app.include_router(chat.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
