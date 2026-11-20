import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.tenant import get_current_system
from app.rag.llm import LLMError
from app.rag.pipeline import answer_question

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)


@router.get("/info")
def system_info(system: dict = Depends(get_current_system)):
    # Only return safe, public info (never the full config)
    return {
        "name": system["name"],
        "features": system["features"],
    }


@router.post("/ask")
def ask(body: AskRequest, system: dict = Depends(get_current_system)):
    question = body.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question is empty")

    try:
        result = answer_question(system, question)
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
