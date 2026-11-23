"""
Keyword search (BM25) = the classic search-engine algorithm.
Scores chunks by the question's WORDS:
  - a word that appears often in a chunk  -> higher score
  - a RARE word (e.g. a name, policy no.) -> counts much more than common words
Great for exact facts that vector search misses: names, numbers, IDs, dates.
"""
import re

from rank_bm25 import BM25Okapi

from app.rag import vectorstore


def tokenize(text):
    """'Policy No. AB-123!' -> ['policy', 'no', 'ab', '123']"""
    return re.findall(r"[a-z0-9]+", text.lower())


def search(system_id, question, limit):
    chunks = vectorstore.all_chunks(system_id)
    if not chunks:
        return []

    # Build the BM25 index from all chunks of this system.
    # Fast for a few thousand chunks; for very large systems we'd cache it.
    bm25 = BM25Okapi([tokenize(c["text"]) for c in chunks])
    scores = bm25.get_scores(tokenize(question))

    ranked = sorted(zip(chunks, scores), key=lambda pair: pair[1], reverse=True)
    # score 0 = not a single question word in that chunk -> skip it
    return [chunk for chunk, score in ranked[:limit] if score > 0]
