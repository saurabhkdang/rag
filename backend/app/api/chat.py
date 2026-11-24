import logging
import time
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core import chatlog
from app.core.tenant import get_current_system
from app.rag.llm import LLMError
from app.rag.pipeline import answer_question

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])


class HistoryMessage(BaseModel):
    role: Literal["user", "assistant"]   # Literal = only these exact values are allowed
    content: str = Field(max_length=4000)

class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    # Earlier messages in this conversation (the browser sends them; we store nothing)
    history: list[HistoryMessage] = Field(default=[], max_length=20)

class FeedbackRequest(BaseModel):
    id: str = Field(pattern=r"^[0-9a-f]{32}$")  # exactly the format of our log ids
    rating: Literal["up", "down"]


def _ms_since(started):
    return int((time.perf_counter() - started) * 1000)


def _unique_sources(chunks):
    sources = []
    for c in chunks:
        item = {"source": c["source"], "page": c["page"]}
        if item not in sources:  # same file + page only once
            sources.append(item)
    return sources

@router.get("/info")
def system_info(system: dict = Depends(get_current_system)):
    # Only return safe, public info (never the full config)
    return {
        "name": system["name"],
        "welcome_message": system.get("welcome_message", ""),
        "features": system["features"],
    }


@router.post("/ask")
def ask(body: AskRequest, system: dict = Depends(get_current_system)):
    question = body.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question is empty")

    # Feature flag: use the conversation only if this system has memory switched on
    history = []
    if system["features"].get("chat_memory"):
        history = [m.model_dump() for m in body.history]

    started = time.perf_counter()
    entry = {"question": question, "history_used": len(history)}

    try:
        result = answer_question(system, question, history)
    except LLMError as e:
        # Full error goes to the server log; the visitor gets a friendly message
        logger.error("LLM error for system %s: %s", system["id"], e)
        chatlog.log_question(system["id"], {**entry, "error": True, "duration_ms": _ms_since(started)})
        raise HTTPException(status_code=502, detail="The AI service is not available right now. Please try again.")

    sources = _unique_sources(result["sources"])
    log_id = chatlog.log_question(system["id"], {
        **entry,
        "search_question": result["search_question"],
        "answer": result["answer"],
        "found": result["found"],
        "sources": sources,
        "input_tokens": result["usage"]["input_tokens"],
        "output_tokens": result["usage"]["output_tokens"],
        "duration_ms": _ms_since(started),
    })

    response = {"id": log_id, "answer": result["answer"]}

    # Feature flag: only show sources if this system has "citations" switched on
    if system["features"].get("citations"):
        response["sources"] = sources

    return response

@router.post("/feedback")
def feedback(body: FeedbackRequest, system: dict = Depends(get_current_system)):
    if not system["features"].get("feedback"):
        raise HTTPException(status_code=403, detail="Feedback is not enabled")
    if not chatlog.entry_exists(system["id"], body.id):
        raise HTTPException(status_code=404, detail="Answer not found")

    chatlog.add_feedback(system["id"], body.id, body.rating)
    return {"ok": True}