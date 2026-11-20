"""
Admin API for one system's documents: upload, list, delete, preview chunks.
Files are stored in rag_systems/<system_id>/documents/
"""
import re
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile

from app.core import registry
from app.core.auth import require_admin
from app.core.tenant import require_admin_host
from app.rag.chunker import chunk_pages
from app.rag.loader import load_document
from app.settings import ALLOWED_EXTENSIONS, MAX_UPLOAD_MB

# Admin host + login required for every route in this file
router = APIRouter(
    prefix="/api/admin/systems/{system_id}/documents",
    tags=["documents"],
    dependencies=[Depends(require_admin_host), Depends(require_admin)],
)

UNSAFE_CHARS = re.compile(r"[^A-Za-z0-9._ -]")
MAX_BYTES = MAX_UPLOAD_MB * 1024 * 1024


# ---------- helpers ----------

def _documents_dir(system_id):
    if not registry.SLUG_PATTERN.match(system_id) or registry.load_system(system_id) is None:
        raise HTTPException(status_code=404, detail="System not found")
    return registry.documents_dir(system_id)


def _safe_filename(name):
    name = Path(name).name                       # "../../evil.pdf" -> "evil.pdf"
    name = UNSAFE_CHARS.sub("_", name)           # strange characters -> "_"
    return name.strip(" .")


def _get_file(system_id, filename):
    folder = _documents_dir(system_id)
    if filename != _safe_filename(filename):
        raise HTTPException(status_code=400, detail="Invalid file name")
    path = folder / filename
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Document not found")
    return path


# ---------- routes ----------

@router.get("")
def list_documents(system_id: str):
    folder = _documents_dir(system_id)
    documents = []
    for path in sorted(folder.iterdir()):
        if path.is_file() and path.suffix.lower() in ALLOWED_EXTENSIONS:
            stat = path.stat()
            documents.append({
                "name": path.name,
                "size": stat.st_size,
                "uploaded_at": datetime.fromtimestamp(stat.st_mtime).isoformat(timespec="seconds"),
            })
    return documents


@router.post("")
def upload_document(system_id: str, file: UploadFile):
    folder = _documents_dir(system_id)

    filename = _safe_filename(file.filename or "")
    if not filename or Path(filename).suffix.lower() not in ALLOWED_EXTENSIONS:
        allowed = ", ".join(sorted(ALLOWED_EXTENSIONS))
        raise HTTPException(status_code=400, detail=f"Only {allowed} files are allowed")

    path = folder / filename
    if path.exists():
        raise HTTPException(status_code=409, detail=f"'{filename}' already exists. Delete it first to replace it.")

    size = 0
    try:
        # Save in 1 MB pieces, so a huge upload can't fill the server's memory
        with open(path, "wb") as out:
            while piece := file.file.read(1024 * 1024):
                size += len(piece)
                if size > MAX_BYTES:
                    raise HTTPException(status_code=413, detail=f"File is larger than {MAX_UPLOAD_MB} MB")
                out.write(piece)

        # Make sure we can actually read it (catches fake/broken/encrypted PDFs)
        pages = load_document(path)

    except HTTPException:
        path.unlink(missing_ok=True)   # remove the half-saved file
        raise
    except Exception:
        path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="Could not read this file. Is it a valid, unencrypted PDF or text file?")

    if not pages:
        path.unlink()
        raise HTTPException(status_code=400, detail="No text found. Scanned PDFs (images only) are not supported yet.")

    return {
        "name": filename,
        "size": size,
        "pages": len(pages),
        "characters": sum(len(p["text"]) for p in pages),
    }


@router.delete("/{filename}")
def delete_document(system_id: str, filename: str):
    path = _get_file(system_id, filename)
    path.unlink()
    return {"deleted": filename}


@router.get("/{filename}/chunks")
def preview_chunks(system_id: str, filename: str, limit: int = 20):
    """Show how this file will be split, using the system's chunk settings."""
    path = _get_file(system_id, filename)
    config = registry.load_system(system_id)

    pages = load_document(path)
    try:
        chunks = chunk_pages(pages, config["chunk_size"], config["chunk_overlap"])
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "chunk_size": config["chunk_size"],
        "chunk_overlap": config["chunk_overlap"],
        "total_chunks": len(chunks),
        "chunks": chunks[:limit],   # only the first few, to keep the response small
    }
