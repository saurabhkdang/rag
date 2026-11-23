"""
Retriever = find the best chunks for a question.
  Vector search  -> chunks with similar MEANING   (paraphrases, "how do I...")
  Keyword search -> chunks with the same WORDS     (names, numbers, IDs)
  Hybrid         -> both lists merged with Reciprocal Rank Fusion (RRF)
Used by BOTH the chat and the admin search tester, so they always agree.
"""
from app.rag import embedder, keyword_search, vectorstore
from app.settings import MIN_SCORE

RRF_K = 60  # standard value; bigger = ranks matter a bit less


def _fuse(vector_results, keyword_results):
    """
    Reciprocal Rank Fusion: each list gives a chunk 1 / (RRF_K + rank) points.
    Ranked high in either list -> high total. Found by both -> highest.
    Works with ranks only, so we never have to compare BM25 scores
    with cosine scores (they're on completely different scales).
    """
    points = {}
    items = {}
    for results, match in ((vector_results, "vector"), (keyword_results, "keyword")):
        for rank, item in enumerate(results, start=1):
            points[item["id"]] = points.get(item["id"], 0) + 1 / (RRF_K + rank)
            if item["id"] in items:
                items[item["id"]]["match"] = "both"
            else:
                items[item["id"]] = {**item, "match": match}

    ordered_ids = sorted(points, key=points.get, reverse=True)
    return [items[chunk_id] for chunk_id in ordered_ids]


def retrieve(config, question, top_k=None):
    top_k = top_k or config["top_k"]
    system_id = config["id"]
    hybrid = config["features"].get("hybrid_search", False)

    # In hybrid mode, fetch more candidates from each list before merging
    candidates = top_k * 3 if hybrid else top_k

    vector_results = vectorstore.search(system_id, embedder.embed_query(question), candidates)
    vector_results = [r for r in vector_results if r["score"] >= MIN_SCORE]

    if not hybrid:
        return [{**r, "match": "vector"} for r in vector_results]

    keyword_results = keyword_search.search(system_id, question, candidates)
    return _fuse(vector_results, keyword_results)[:top_k]
