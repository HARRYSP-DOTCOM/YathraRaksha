from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, root_validator as pydantic_root_validator
import json
import os

from app.config import settings
from app.prompts.yatragpt_system import YATRAGPT_SYSTEM_PROMPT

router = APIRouter(prefix="/chat", tags=["chatbot"])


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(default_factory=list)
    message: str | None = None
    history: list[dict] = Field(default_factory=list)

    @pydantic_root_validator(pre=True)
    def _normalize_messages(cls, values):
        # If 'messages' already provided, keep it. Otherwise, build from 'message' + 'history'.
        if values.get("messages"):
            return values
        msgs = []
        hist = values.get("history") or []
        if isinstance(hist, list):
            msgs.extend(hist)
        if values.get("message"):
            msgs.append({"role": "user", "content": values.get("message")})
        values["messages"] = msgs
        return values


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

    # Check if client sent a system prompt (first message)
    client_system = None
    user_msgs = []
    for m in body.messages[-30:]:
        if m.role == "system" and m.content.strip():
            client_system = m.content.strip()
        elif m.role in ("user", "assistant") and m.content.strip():
            user_msgs.append({"role": m.role, "content": m.content})

    # If client did not provide a system prompt, build a dynamic context
    def _build_dynamic_context():
        root = os.path.join(os.path.dirname(__file__), "..", "..", "data")
        try:
            root = os.path.normpath(root)
            parts = []
            # roads
            roads_file = os.path.join(root, "04_roads_map_data.json")
            if os.path.exists(roads_file):
                with open(roads_file, "r", encoding="utf-8") as f:
                    roads = json.load(f)
                count = len(roads.get("roads", roads)) if isinstance(roads, dict) else len(roads)
                parts.append(f"Road records available: {count}.")
            # contractors
            contractors_file = os.path.join(root, "02_contractors_data.json")
            if os.path.exists(contractors_file):
                with open(contractors_file, "r", encoding="utf-8") as f:
                    c = json.load(f)
                contractors = c.get("contractors") if isinstance(c, dict) else c
                parts.append(f"Registered contractors: {len(contractors) if contractors else 0}.")
                if contractors:
                    names = [x.get("name") or x.get("id") for x in contractors[:5]]
                    parts.append("Sample contractors: " + ", ".join([n for n in names if n]))
            # tenders
            tenders_file = os.path.join(root, "03_tenders_data.json")
            if os.path.exists(tenders_file):
                with open(tenders_file, "r", encoding="utf-8") as f:
                    t = json.load(f)
                tcount = len(t.get("tenders", t)) if isinstance(t, dict) else len(t)
                parts.append(f"Tender records: {tcount}.")
            return " ".join(parts) or "(No live context available)"
        except Exception:
            return "(No live context available)"

    if client_system:
        system_prompt = client_system
    else:
        base = YATRAGPT_SYSTEM_PROMPT.strip()
        dyn = _build_dynamic_context()
        system_prompt = base.replace("[DYNAMIC_DATA_CONTEXT]", dyn)

    all_messages = [{"role": "system", "content": system_prompt}] + user_msgs

    try:
        client = Groq(api_key=settings.groq_api_key)
        completion = client.chat.completions.create(
            model=settings.groq_model,
            messages=all_messages,
            max_tokens=1024,
            temperature=0.4,
        )
        reply = completion.choices[0].message.content or "I couldn't generate a response."
        tokens = completion.usage.total_tokens if completion.usage else 0
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Groq API error: {exc}") from exc

    return ChatResponse(reply=reply, tokens_used=tokens)
