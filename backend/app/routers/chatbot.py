from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.config import settings
from app.prompts.yatragpt_system import YATRAGPT_SYSTEM_PROMPT

router = APIRouter(prefix="/chat", tags=["chatbot"])


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(default_factory=list)


class ChatResponse(BaseModel):
    reply: str
    tokens_used: int = 0


@router.post("", response_model=ChatResponse)
async def chat_endpoint(body: ChatRequest):
    if not settings.groq_api_key:
        raise HTTPException(
            status_code=503,
            detail="Chatbot unavailable — GROQ_API_KEY is not configured in .env",
        )

    try:
        from groq import Groq
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail="groq SDK not installed. Run: pip install groq",
        ) from exc

    history = [
        {"role": m.role, "content": m.content}
        for m in body.messages[-20:]
        if m.role in ("user", "assistant") and m.content.strip()
    ]

    all_messages = [{"role": "system", "content": YATRAGPT_SYSTEM_PROMPT.strip()}] + history

    try:
        client = Groq(api_key=settings.groq_api_key)
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=all_messages,
            max_tokens=1024,
            temperature=0.4,
        )
        reply = completion.choices[0].message.content or "I couldn't generate a response."
        tokens = completion.usage.total_tokens if completion.usage else 0
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Groq API error: {exc}") from exc

    return ChatResponse(reply=reply, tokens_used=tokens)
