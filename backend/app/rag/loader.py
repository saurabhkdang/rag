"""
Loader = read a document and return its text, page by page.
We keep page numbers so answers can later say "source: page 4" (citations feature).
"""
from pathlib import Path

from pypdf import PdfReader


def _clean(text):
    # Collapse newlines, tabs and double spaces into single spaces
    return " ".join(text.split())


def load_pdf(path):
    reader = PdfReader(path)
    pages = []
    for number, page in enumerate(reader.pages, start=1):
        text = _clean(page.extract_text() or "")
        if text:  # skip empty pages (e.g. pages that are only images)
            pages.append({"page": number, "text": text})
    return pages


def load_text_file(path):
    # errors="replace" -> a strange character won't crash the whole file
    text = Path(path).read_text(encoding="utf-8", errors="replace")
    text = _clean(text)
    return [{"page": 1, "text": text}] if text else []


def load_document(path):
    """
    Return a list like: [{"page": 1, "text": "..."}, {"page": 2, "text": "..."}]
    An empty list means the file had no readable text.
    """
    suffix = Path(path).suffix.lower()
    if suffix == ".pdf":
        return load_pdf(path)
    if suffix in (".txt", ".md"):
        return load_text_file(path)
    raise ValueError(f"Unsupported file type: {suffix}")
