"""
Chat log = every question and answer of a system, one JSON object per line (JSON Lines):
    rag_systems/<id>/logs/chat-2026-11.jsonl   (one file per month)
    rag_systems/<id>/logs/feedback.jsonl       (thumbs up/down, linked by log id)
Lines are only ever appended: fast, and old lines are never rewritten.
"""
import json
import logging
import threading
import uuid
from datetime import datetime, timezone

from app.core import registry
from app.settings import OPENAI_MODEL, PRICE_INPUT_PER_1M, PRICE_OUTPUT_PER_1M

logger = logging.getLogger(__name__)

FEEDBACK_FILE = "feedback.jsonl"
_lock = threading.Lock()  # two requests must never write the same file at the same time


def _now():
    return datetime.now(timezone.utc)


def _append(path, record):
    path.parent.mkdir(parents=True, exist_ok=True)
    with _lock:
        with open(path, "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")


def _read(path):
    if not path.exists():
        return []
    records = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError:
                continue  # a damaged line (e.g. power cut mid-write): skip it, keep the rest
    return records


def cost_usd(input_tokens, output_tokens):
    return (input_tokens * PRICE_INPUT_PER_1M + output_tokens * PRICE_OUTPUT_PER_1M) / 1_000_000


def log_question(system_id, entry):
    """Save one question. Adds id, time, model and cost. Returns the id (None if saving failed)."""
    now = _now()
    record = {
        "id": uuid.uuid4().hex,  # random 32 chars: impossible to guess
        "at": now.isoformat(timespec="seconds"),
        "model": OPENAI_MODEL,
        **entry,
    }
    # Store the cost NOW: if you change model or prices later, old entries stay correct
    record["cost_usd"] = round(cost_usd(record.get("input_tokens", 0), record.get("output_tokens", 0)), 6)

    try:
        _append(registry.logs_dir(system_id) / f"chat-{now:%Y-%m}.jsonl", record)
    except OSError as e:
        # A full disk must not break the chat: the visitor still gets the answer
        logger.error("Could not write chat log for %s: %s", system_id, e)
        return None
    return record["id"]


def all_entries(system_id):
    """Every logged question, newest first, each with its rating ("up", "down" or None)."""
    folder = registry.logs_dir(system_id)
    if not folder.exists():
        return []

    entries = []
    for path in sorted(folder.glob("chat-*.jsonl")):  # file names sort by month
        entries += _read(path)

    ratings = {}
    for feedback in _read(folder / FEEDBACK_FILE):
        ratings[feedback["id"]] = feedback["rating"]  # later votes overwrite earlier: last vote wins

    for entry in entries:
        entry["rating"] = ratings.get(entry["id"])

    entries.reverse()  # newest first
    return entries


def entry_exists(system_id, log_id):
    return any(entry["id"] == log_id for entry in all_entries(system_id))


def add_feedback(system_id, log_id, rating):
    _append(
        registry.logs_dir(system_id) / FEEDBACK_FILE,
        {"id": log_id, "rating": rating, "at": _now().isoformat(timespec="seconds")},
    )


def usage_by_month(system_id):
    """[{"month": "2026-11", "questions": 40, "unanswered": 3, "cost_usd": 0.12, "up": 5, ...}, ...]"""
    months = {}
    for entry in all_entries(system_id):
        month = entry["at"][:7]  # "2026-11-24T..." -> "2026-11"
        if month not in months:
            months[month] = {
                "month": month, "questions": 0, "unanswered": 0, "errors": 0,
                "input_tokens": 0, "output_tokens": 0, "cost_usd": 0.0, "up": 0, "down": 0,
            }
        m = months[month]
        m["questions"] += 1
        if entry.get("error"):
            m["errors"] += 1
        elif not entry.get("found"):
            m["unanswered"] += 1
        m["input_tokens"] += entry.get("input_tokens", 0)
        m["output_tokens"] += entry.get("output_tokens", 0)
        m["cost_usd"] += entry.get("cost_usd", 0)
        if entry["rating"] == "up":
            m["up"] += 1
        elif entry["rating"] == "down":
            m["down"] += 1

    for m in months.values():
        m["cost_usd"] = round(m["cost_usd"], 4)
    return list(months.values())  # newest month first (entries were newest first)