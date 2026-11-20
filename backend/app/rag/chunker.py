"""
Chunker = split long text into small overlapping pieces ("chunks").

Why chunks?  Search works best on small focused pieces, and the LLM can
only read a limited amount of text per question.

Why overlap? The end of one chunk is repeated at the start of the next,
so a sentence cut at the border still appears complete in one chunk.
"""


def split_text(text, chunk_size, overlap):
    """Split one text into chunks of about `chunk_size` characters."""
    if overlap >= chunk_size:
        raise ValueError("chunk_overlap must be smaller than chunk_size")

    chunks = []
    start = 0

    while start < len(text):
        end = min(start + chunk_size, len(text))

        # Don't cut a word in half: move the end back to the last space
        if end < len(text):
            last_space = text.rfind(" ", start, end)
            if last_space > start:
                end = last_space

        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)

        if end >= len(text):
            break  # reached the end of the text

        # Next chunk starts `overlap` characters before this one ended
        # (max(...) guarantees we always move forward -> no endless loop)
        next_start = max(end - overlap, start + 1)

        # ...but at the beginning of a word, not in the middle of one
        if text[next_start - 1] != " ":
            space = text.find(" ", next_start, end)
            if space != -1:
                next_start = space + 1

        start = next_start

    return chunks


def chunk_pages(pages, chunk_size, overlap):
    """
    Turn loader output into chunks, remembering which page each came from:
    [{"chunk_index": 0, "page": 1, "text": "..."}, ...]
    """
    chunks = []
    for page in pages:
        for text in split_text(page["text"], chunk_size, overlap):
            chunks.append({
                "chunk_index": len(chunks),
                "page": page["page"],
                "text": text,
            })
    return chunks
