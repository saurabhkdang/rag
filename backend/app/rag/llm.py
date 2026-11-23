"""
LLM = the model that writes the final answer.
ALL OpenAI-specific code lives in this one file. To switch provider later
(Claude, Ollama, ...), rewrite generate() here - nothing else changes.
"""
from openai import OpenAI

from app.settings import OPENAI_API_KEY, OPENAI_MODEL

_client = None


class LLMError(Exception):
    """Something went wrong talking to the AI provider."""


def _get_client():
    global _client
    if not OPENAI_API_KEY:
        raise LLMError("OPENAI_API_KEY is not set in backend/.env")
    if not OPENAI_MODEL:
        raise LLMError("OPENAI_MODEL is not set in backend/.env")
    if _client is None:
        # timeout: don't wait forever; max_retries: retry short network hiccups
        _client = OpenAI(api_key=OPENAI_API_KEY, timeout=60, max_retries=2)
    return _client


def generate(messages, json_mode=False):
    """
    messages = [{"role": "system", "content": "..."}, {"role": "user", "content": "..."}]
    json_mode=True -> the model must reply with valid JSON (the prompt must mention "JSON")
    Returns {"text": "...", "usage": {"input_tokens": .., "output_tokens": ..}}
    """
    client = _get_client()

    options = {}
    if json_mode:
        options["response_format"] = {"type": "json_object"}

    try:
        response = client.chat.completions.create(model=OPENAI_MODEL, messages=messages, **options)
    except Exception as e:
        # Wrong key, no credit, rate limit, network down, unknown model ...
        raise LLMError(f"OpenAI error: {e}") from e

    usage = None
    if response.usage:
        usage = {
            "input_tokens": response.usage.prompt_tokens,
            "output_tokens": response.usage.completion_tokens,
        }

    return {"text": response.choices[0].message.content or "", "usage": usage}