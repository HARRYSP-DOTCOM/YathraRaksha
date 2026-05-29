from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings

router = APIRouter(prefix="/chat", tags=["chatbot"])

SYSTEM_PROMPT = (
    "You are YatraGPT, an AI assistant for the YatraRaksha road-infrastructure transparency platform. "
    "You help citizens find information about roads, contractors, budgets, maintenance history, and how to file complaints. "
    "You have access to a database of road projects across India, USA, and Germany.\n\n"
    "When answering questions:\n"
    "- Be specific about road names, contractor names, budget amounts, and dates when you know them\n"
    "- For road types: In India use NH (National Highway), SH (State Highway), MDR (Major District Road). "
    "In USA use Interstate, US Route. In Germany use Autobahn, Landesstraße.\n"
    "- Always cite the source of budget information when available\n"
    "- Guide users on how to file complaints if they report an issue\n"
    "- Keep responses concise, helpful, and factual\n"
    "- When a user reports a road issue, ask for: road name/number, issue type "
    "(pothole/flooding/no markings/damaged signs/road collapse), their location, "
    "and guide them to the complaint form on the AI Capture tab\n"
)


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []


class ChatResponse(BaseModel):
    response: str


def _get_road_context() -> str:
    try:
        from app.seed_data import get_roads
        roads = get_roads()
        if not roads:
            return ""
        lines = ["Available road records in the database:"]
        for r in roads[:12]:
            lines.append(
                f"- {r.get('id','?')}: {r.get('name','?')} | "
                f"Type: {r.get('type','?')} | Country: {r.get('country','?')} | "
                f"Contractor: {r.get('contractorName','?')} (★{r.get('contractorPerformance','?')}/5) | "
                f"Authority: {r.get('authority','?')} | "
                f"Sanctioned: ₹{r.get('sanctionedBudget',0)/1e7:.1f} Cr | "
                f"Spent: ₹{r.get('spentBudget',0)/1e7:.1f} Cr | "
                f"Last relayed: {r.get('lastRelayingDate','?')} | "
                f"Guarantee: {r.get('maintenanceGuaranteePeriod','?')} yrs"
            )
        return "\n".join(lines)
    except Exception:
        return ""


@router.post("", response_model=ChatResponse)
async def chat(req: ChatRequest):
    if not settings.groq_api_key:
        raise HTTPException(
            status_code=503,
            detail="Chatbot unavailable — GROQ_API_KEY is not configured in .env",
        )

    try:
        from groq import Groq
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="groq SDK not installed. Run: pip install groq",
        )

    road_ctx = _get_road_context()
    system_msg = SYSTEM_PROMPT
    if road_ctx:
        system_msg += f"\n\nDatabase context:\n{road_ctx}"

    messages = [{"role": "system", "content": system_msg}]

    for entry in req.history[-20:]:
        role = entry.get("role", "user")
        content = entry.get("content", "")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": req.message})

    try:
        client = Groq(api_key=settings.groq_api_key)
        completion = client.chat.completions.create(
            model=settings.groq_model,
            messages=messages,
            temperature=0.7,
            max_tokens=1024,
        )
        reply = completion.choices[0].message.content or "I couldn't generate a response."
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Groq API error: {exc}") from exc

    return ChatResponse(response=reply)
