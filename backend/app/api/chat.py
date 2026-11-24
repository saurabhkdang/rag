import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.tenant import get_current_system
from app.rag.llm import LLMError
from app.rag.pipeline import answer_question
from typing import Literal

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])


class HistoryMessage(BaseModel):
    role: Literal["user", "assistant"]   # Literal = only these exact values are allowed
    content: str = Field(max_length=4000)

class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    # Earlier messages in this conversation (the browser sends them; we store nothing)
    history: list[HistoryMessage] = Field(default=[], max_length=20)


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

    try:
        result = answer_question(system, question, history)
    except LLMError as e:
        # Full error goes to the server log; the visitor gets a friendly message
        logger.error("LLM error for system %s: %s", system["id"], e)
        raise HTTPException(status_code=502, detail="The AI service is not available right now. Please try again.")

    response = {"answer": result["answer"]}

    # Feature flag: only show sources if this system has "citations" switched on
    if system["features"].get("citations"):
        sources = []
        for s in result["sources"]:
            item = {"source": s["source"], "page": s["page"]}
            if item not in sources:  # same file + page only once
                sources.append(item)
        response["sources"] = sources

    return response
