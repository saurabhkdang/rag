"""
Feature catalog = every optional feature a RAG system can have.
Add a feature here and it automatically appears on the admin settings page.

  default       -> value for newly created systems
  needs_reindex -> changing it only takes effect after "Re-index all"
  coming_soon   -> shown in the admin, but can't be switched on yet
"""
FEATURES = {
    "hybrid_search": {
        "label": "Hybrid search",
        "description": "Combine meaning-based and keyword search. Much better for names, numbers and IDs.",
        "default": True,
        "needs_reindex": False,
        "coming_soon": False,
    },
    "contextual_chunks": {
        "label": "Contextual chunks",
        "description": "AI writes a short description of every chunk while indexing. Better results on forms and tables. Small AI cost per page, at indexing only.",
        "default": True,
        "needs_reindex": True,
        "coming_soon": False,
    },
    "citations": {
        "label": "Citations",
        "description": "Show the source file and page under each answer.",
        "default": False,
        "needs_reindex": False,
        "coming_soon": False,
    },
    "chat_memory": {
        "label": "Chat memory",
        "description": "Remember the last few messages, so users can ask follow-up questions. One small extra AI call per follow-up.",
        "default": False,
        "needs_reindex": False,
        "coming_soon": False,
    },
        "feedback": {
        "label": "Answer feedback",
        "description": "Show thumbs up/down under each answer. Ratings appear on the admin Logs page.",
        "default": True,
        "needs_reindex": False,
        "coming_soon": False,
    },
}


def catalog():
    """List for the admin page: [{"key": "citations", "label": ..., ...}, ...]"""
    return [{"key": key, **info} for key, info in FEATURES.items()]


def default_features():
    """{"hybrid_search": True, "citations": False, ...} for new systems."""
    return {key: info["default"] for key, info in FEATURES.items()}


def validate_features(features):
    """Raise ValueError for unknown features or ones that aren't available yet."""
    unknown = [key for key in features if key not in FEATURES]
    if unknown:
        raise ValueError(f"Unknown feature(s): {', '.join(unknown)}")
    for key, enabled in features.items():
        if enabled and FEATURES[key]["coming_soon"]:
            raise ValueError(f"'{FEATURES[key]['label']}' is not available yet")