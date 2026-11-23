"""
Embedder = turns text into a vector (a list of numbers that captures its meaning).
Texts with similar meaning get vectors that are close to each other.
Runs locally on the CPU: free, private, no API key.
"""
import threading

from app.settings import EMBEDDING_MODEL, EMBEDDING_QUERY_PREFIX

_model = None
_lock = threading.Lock()


def get_model():
    """Load the model once (first time downloads ~90 MB), then reuse it."""
    global _model
    with _lock:  # if two requests arrive together, load the model only once
        if _model is None:
            # Imported here, not at the top: it's a heavy import (PyTorch),
            # so the server starts fast and only pays this cost when needed
            from sentence_transformers import SentenceTransformer

            _model = SentenceTransformer(EMBEDDING_MODEL)
    return _model


def embed_texts(texts):
    """List of strings -> list of vectors (each vector = list of floats)."""
    vectors = get_model().encode(
        texts,
        batch_size=32,
        normalize_embeddings=True,  # all vectors get length 1 -> fair comparison
        show_progress_bar=False,
    )
    return vectors.tolist()


def embed_query(text):
    """One question -> one vector. (Chunks are embedded WITHOUT the prefix.)"""
    return embed_texts([EMBEDDING_QUERY_PREFIX + text])[0]
