"""
Contextualizer = before indexing, the LLM writes one short sentence per chunk
describing WHAT the chunk is, e.g.:
    "Policy schedule listing the insured person's name, address and vehicle details."

Why: chunks from forms and tables often contain only bare labels ("Name RAVI DANG").
The sentence adds the words people actually search with ("insured", "policyholder").

Cost: ONE LLM call per PAGE, only when indexing - never per question.
If anything fails, chunks simply get no context (indexing still works).
"""
import json
import logging

from app.rag import llm

logger = logging.getLogger(__name__)

MAX_PAGE_CHARS = 12000  # keep the prompt a sensible size for very dense pages

PROMPT = """You help a search engine understand document chunks.

Document: {filename}, page {page}
<page>
{page_text}
</page>

This page was split into the numbered chunks below. For EACH chunk, write ONE short
sentence saying what the chunk is and what kind of information it contains. Use the
words a person would search with, including common synonyms (for example:
"Policy schedule listing the insured person's (policyholder's) name, address and
vehicle registration number"). Describe the information; do not repeat the values.

{chunks}

Reply with JSON only, in this exact shape, with exactly {count} sentences in the same order:
{{"contexts": ["sentence for chunk 1", "sentence for chunk 2"]}}"""


def search_text(chunk):
    """The text used for embedding and keyword search: context + chunk text."""
    context = chunk.get("context", "")
    return f"{context}\n{chunk['text']}" if context else chunk["text"]


def add_context(filename, pages, chunks):
    """Give every chunk a "context" sentence ("" if it couldn't be created)."""
    for page in pages:
        page_chunks = [c for c in chunks if c["page"] == page["page"]]
        if not page_chunks:
            continue

        listed = "\n\n".join(f"[{i}] {c['text']}" for i, c in enumerate(page_chunks, start=1))
        prompt = PROMPT.format(
            filename=filename,
            page=page["page"],
            page_text=page["text"][:MAX_PAGE_CHARS],
            chunks=listed,
            count=len(page_chunks),
        )

        contexts = _ask_llm(prompt, len(page_chunks))
        for chunk, context in zip(page_chunks, contexts):
            chunk["context"] = context

    for chunk in chunks:
        chunk.setdefault("context", "")  # any chunk we skipped gets an empty context
    return chunks


def _ask_llm(prompt, count):
    """Return a list of `count` sentences, or `count` empty strings if anything goes wrong."""
    try:
        result = llm.generate([{"role": "user", "content": prompt}], json_mode=True)
        contexts = json.loads(result["text"])["contexts"]

        # Never trust the shape of an AI reply - check it
        if not isinstance(contexts, list) or len(contexts) != count:
            raise ValueError(f"expected {count} sentences, got {contexts!r:.100}")

        return [str(c).strip() for c in contexts]

    except (llm.LLMError, ValueError, KeyError, TypeError) as e:
        # (json.JSONDecodeError is a kind of ValueError)
        logger.warning("Could not create chunk contexts: %s", e)
        return [""] * count