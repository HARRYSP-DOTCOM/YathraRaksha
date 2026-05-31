"""Groq AI chat proxy — /v1/ai/chat and /v1/ai/chat/stream"""

import json
import os

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.config import settings
from app.prompts.yatragpt_system import YATRAGPT_SYSTEM_PROMPT

router = APIRouter(prefix="/ai/chat", tags=["ai-chat"])

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
PRIMARY_MODEL = "meta-llama/llama-4-maverick-17b-128e-instruct"
FALLBACK_MODEL = "llama-3.3-70b-versatile"


class ChatRequest(BaseModel):
    messages: list[dict] = Field(default_factory=list)
    context: str = ""


class ChatResponse(BaseModel):
    reply: str
    model: str = ""
    usage: dict | None = None


def _system_content(context: str) -> str:
    base = YATRAGPT_SYSTEM_PROMPT.strip()
    if context:
        return base.replace("[DYNAMIC_DATA_CONTEXT]", context)
    return base.replace("[DYNAMIC_DATA_CONTEXT]", "(No live context provided)")


def _prepare_messages(req: ChatRequest) -> list[dict]:
    history = [
        m for m in req.messages[-10:]
        if m.get("role") in ("user", "assistant") and m.get("content")
    ]
    return [{"role": "system", "content": _system_content(req.context)}] + history


async def _groq_json(messages: list[dict], model: str) -> dict:
    if not settings.groq_api_key:
        raise HTTPException(status_code=503, detail="GROQ_API_KEY not configured")
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            GROQ_URL,
            headers={
                "Authorization": f"Bearer {settings.groq_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": messages,
                "max_tokens": 1024,
                "temperature": 0.7,
            },
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=resp.text[:500])
        return resp.json()


@router.post("", response_model=ChatResponse)
async def chat(req: ChatRequest):
    messages = _prepare_messages(req)
    try:
        data = await _groq_json(messages, PRIMARY_MODEL)
        model_used = PRIMARY_MODEL
    except HTTPException:
        data = await _groq_json(messages, FALLBACK_MODEL)
        model_used = FALLBACK_MODEL

    reply = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    return ChatResponse(
        reply=reply or "I could not generate a response.",
        model=model_used,
        usage=data.get("usage"),
    )


@router.post("/stream")
async def chat_stream(req: ChatRequest):
    if not settings.groq_api_key:
        raise HTTPException(status_code=503, detail="GROQ_API_KEY not configured")

    messages = _prepare_messages(req)

    async def event_stream():
        for model in (PRIMARY_MODEL, FALLBACK_MODEL):
            try:
                async with httpx.AsyncClient(timeout=90) as client:
                    async with client.stream(
                        "POST",
                        GROQ_URL,
                        headers={
                            "Authorization": f"Bearer {settings.groq_api_key}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "model": model,
                            "messages": messages,
                            "stream": True,
                            "max_tokens": 1024,
                            "temperature": 0.7,
                        },
                    ) as resp:
                        if resp.status_code != 200:
                            continue
                        async for chunk in resp.aiter_text():
                            if chunk:
                                yield chunk
                        return
            except Exception:
                continue
        yield 'data: {"error":"Service temporarily unavailable"}\n\n'

    return StreamingResponse(event_stream(), media_type="text/event-stream")
