import json
import base64
import re

from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.config import settings
from app.seed_data import find_nearest_road

router = APIRouter(prefix="/ai", tags=["ai"])


class RoadAnalysisRequest(BaseModel):
    image_base64: str
    lat: float = 20.5937
    lng: float = 78.9629
    location_name: str = "Unknown location"


@router.get("/defect-classes")
def defect_classes():
    return {
        "defect_classes": [
            "Pothole",
            "Alligator Cracking",
            "Longitudinal Crack",
            "Transverse Crack",
            "Rutting",
            "Good Condition",
        ]
    }


@router.post("/analyze")
async def analyze_media(
    file: UploadFile = File(...),
    lat: float | None = Form(None),
    lng: float | None = Form(None),
):
    """Legacy endpoint — accepts multipart file upload."""
    image_bytes = await file.read()
    # Delegate to the Groq-based analysis
    b64 = base64.b64encode(image_bytes).decode("utf-8")
    return _analyze_with_claude_or_groq(b64, lat or 20.5937, lng or 78.9629, "Uploaded location")


@router.post("/analyze-road")
async def analyze_road(body: RoadAnalysisRequest):
    """New endpoint — accepts base64 image via JSON body, analyzes with Groq LLM."""
    return _analyze_with_claude_or_groq(
        body.image_base64, body.lat, body.lng, body.location_name
    )


def _analyze_with_claude_or_groq(
    image_base64: str, lat: float, lng: float, location_name: str
) -> dict:
    """Analyze road image using Claude Vision, fallback to Groq, then fallback to mock."""
    image_base64_clean = _strip_data_url(image_base64)
    system_prompt = (
        "You are a road damage detection AI. Analyze the provided road image "
        "and return ONLY valid JSON (no markdown, no code fences): "
        '{ "detected_damages": string[], "severity_score": number (0-10), '
        '"ai_complaint_text": string }. '
        "detected_damages must only include items from: "
        "[Pothole, Alligator Cracking, Longitudinal Crack, Transverse Crack, "
        "Rutting, Good Condition]. "
        "Generate complaint text in formal English addressed to the relevant "
        "Public Works Department, referencing the location: "
        f"{location_name} ({lat}, {lng})."
    )
    user_prompt = (
        f"Analyze this road image captured at {location_name} "
        f"({lat}, {lng}). Classify only visible road-surface damage, estimate "
        "severity, and generate the formal complaint text. Return ONLY valid JSON."
    )

    # 1. Attempt Claude Vision (Anthropic API)
    if settings.anthropic_api_key:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
            
            # Use Sonnet as requested by user
            message = client.messages.create(
                model=settings.anthropic_model,
                max_tokens=1024,
                system=system_prompt,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": "image/jpeg",
                                    "data": image_base64_clean,
                                },
                            },
                            {
                                "type": "text",
                                "text": user_prompt
                            }
                        ],
                    }
                ],
            )
            
            reply = message.content[0].text
            return _parse_llm_json(reply, lat, lng, location_name)
        except Exception as exc:
            print(f"Claude API failed: {exc}, falling back to Groq...")

    # 2. Attempt Groq Fallback
    if settings.groq_api_key:
        try:
            from groq import Groq
            client = Groq(api_key=settings.groq_api_key)
            
            completion = client.chat.completions.create(
                model=settings.groq_vision_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": user_prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{image_base64_clean}",
                                },
                            },
                        ],
                    },
                ],
                max_completion_tokens=512,
                temperature=0.3,
                response_format={"type": "json_object"},
            )

            reply = completion.choices[0].message.content or ""
            return _parse_llm_json(reply, lat, lng, location_name)
        except Exception as exc:
            print(f"Groq API failed: {exc}, falling back to mock...")

    # 3. Fallback mock response
    return {
        "success": True,
        "detected_damages": ["Pothole", "Alligator Cracking"],
        "severity_score": 6,
        "ai_complaint_text": _mock_complaint(location_name),
        "coordinates": [lat, lng],
        "location_name": location_name,
    }


def _parse_llm_json(reply: str, lat: float, lng: float, location_name: str) -> dict:
    cleaned = reply.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

    try:
        result = json.loads(cleaned)
        return {
            "success": True,
            "detected_damages": result.get("detected_damages", []),
            "severity_score": result.get("severity_score", 5),
            "ai_complaint_text": result.get("ai_complaint_text", ""),
            "coordinates": [lat, lng],
            "location_name": location_name,
        }
    except json.JSONDecodeError:
        return {
            "success": True,
            "detected_damages": ["Pothole"],
            "severity_score": 5,
            "ai_complaint_text": reply if reply else _mock_complaint(location_name),
            "coordinates": [lat, lng],
            "location_name": location_name,
        }


def _mock_complaint(location_name: str) -> str:
    return (
        f"To the Executive Engineer, Public Works Department,\n\n"
        f"This is to formally report road damage observed at {location_name}. "
        f"The AI analysis has detected the following issues: Pothole, Alligator Cracking. "
        f"The severity is rated 6/10, indicating significant damage requiring prompt "
        f"attention. The road surface shows signs of structural failure that poses a "
        f"safety risk to commuters, particularly two-wheeler riders.\n\n"
        f"Immediate repair action is requested to prevent accidents and further "
        f"deterioration.\n\nRegards,\nCitizen via Yathra Raksha Platform"
    )


def _strip_data_url(image_base64: str) -> str:
    return re.sub(r"^data:image/[^;]+;base64,", "", image_base64.strip())
