"""
Ingest = the full pipeline for one file:
    load (text per page) -> chunk -> embed -> store in ChromaDB
"""
from app.core import registry
from app.rag import contextualizer, embedder, vectorstore
from app.rag.chunker import chunk_pages
from app.rag.loader import load_document
from app.settings import ALLOWED_EXTENSIONS


def index_document(system_id, filename):
    """Index one file. Returns the number of chunks stored."""
    config = registry.load_system(system_id)
    path = registry.documents_dir(system_id) / filename

    pages = load_document(path)
    chunks = chunk_pages(pages, config["chunk_size"], config["chunk_overlap"])

    # Remove this file's old chunks first, so re-indexing never leaves leftovers
    vectorstore.delete_document(system_id, filename)

    if not chunks:
        return 0

    # Feature: add an LLM-written description to every chunk (one call per page)
    if config["features"].get("contextual_chunks", False):
        chunks = contextualizer.add_context(filename, pages, chunks)

    # Embed context + text, so the vector carries the description's meaning too
    vectors = embedder.embed_texts([contextualizer.search_text(c) for c in chunks])
    vectorstore.add_chunks(system_id, filename, chunks, vectors)
    return len(chunks)


def reindex_all(system_id):
    """Wipe the system's index and rebuild it from every document.
    Use after changing chunk settings or the embedding model."""
    vectorstore.reset(system_id)

    results = {}
    for path in sorted(registry.documents_dir(system_id).iterdir()):
        if path.is_file() and path.suffix.lower() in ALLOWED_EXTENSIONS:
            results[path.name] = index_document(system_id, path.name)
    return results
