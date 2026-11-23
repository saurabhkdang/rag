"""
Vector store = a ChromaDB database inside each system's own folder:
    rag_systems/<id>/vectordb/
One database per system -> clients' data can never mix.
"""
import threading

import chromadb
from chromadb.config import Settings

from app.core import registry
from app.settings import EMBEDDING_MODEL

COLLECTION_NAME = "documents"
BATCH_SIZE = 1000  # ChromaDB limits how many items one call can add

_clients = {}  # system_id -> open ChromaDB client (opening is slow, so reuse)
_lock = threading.Lock()


def _get_client(system_id):
    with _lock:
        if system_id not in _clients:
            path = registry.vectordb_dir(system_id)
            _clients[system_id] = chromadb.PersistentClient(
                path=str(path),
                settings=Settings(anonymized_telemetry=False),
            )
        return _clients[system_id]


def get_collection(system_id):
    return _get_client(system_id).get_or_create_collection(
        name=COLLECTION_NAME,
        configuration={"hnsw": {"space": "cosine"}},  # compare vectors by direction = meaning
        metadata={"embedding_model": EMBEDDING_MODEL},  # remember which model built it
    )


def close(system_id):
    """Release the database files. Needed before archiving:
    Windows cannot move a folder while files inside it are open."""
    with _lock:
        client = _clients.pop(system_id, None)
    if client is not None:
        client.close()


def add_chunks(system_id, filename, chunks, vectors):
    collection = get_collection(system_id)
    for i in range(0, len(chunks), BATCH_SIZE):
        batch = chunks[i : i + BATCH_SIZE]
        collection.upsert(
            ids=[f"{filename}::{c['chunk_index']}" for c in batch],  # unique id per chunk
            embeddings=vectors[i : i + BATCH_SIZE],
            documents=[c["text"] for c in batch],
            metadatas=[
                {"source": filename, "page": c["page"], "chunk_index": c["chunk_index"], "context": c.get("context", "")}
                for c in batch
            ],
        )


def delete_document(system_id, filename):
    """Remove every chunk that came from this file."""
    get_collection(system_id).delete(where={"source": filename})


def reset(system_id):
    """Delete the whole collection (used by 'Re-index all')."""
    client = _get_client(system_id)
    existing = [c.name for c in client.list_collections()]
    if COLLECTION_NAME in existing:
        client.delete_collection(COLLECTION_NAME)


def count_by_source(system_id):
    """{"manual.pdf": 42, "faq.txt": 7}: how many chunks of each file are indexed."""
    result = get_collection(system_id).get(include=["metadatas"])
    counts = {}
    for meta in result["metadatas"]:
        counts[meta["source"]] = counts.get(meta["source"], 0) + 1
    return counts


def search(system_id, query_vector, top_k):
    """Return the top_k chunks closest in meaning to the query."""
    collection = get_collection(system_id)
    if collection.count() == 0:
        return []

    result = collection.query(
        query_embeddings=[query_vector],
        n_results=top_k,
        include=["documents", "metadatas", "distances"],
    )

    matches = []
    # [0] because we sent one query; Chroma returns one list per query
    for chunk_id, text, meta, distance in zip(
        result["ids"][0], result["documents"][0], result["metadatas"][0], result["distances"][0]
    ):
        matches.append({
            "id": chunk_id,
            "text": text,
            "source": meta["source"],
            "page": meta["page"],
            "context": meta.get("context", ""),
            "score": round(1 - distance, 4),  # cosine distance -> similarity (1 = same meaning)
        })
    return matches

def all_chunks(system_id):
    """Every stored chunk of a system (used by keyword search)."""
    result = get_collection(system_id).get(include=["documents", "metadatas"])
    return [
        {
            "id": chunk_id,
            "text": text,
            "context": meta.get("context", ""),
            "source": meta["source"],
            "page": meta["page"],
            "score": None,
        }
        for chunk_id, text, meta in zip(result["ids"], result["documents"], result["metadatas"])
    ]
