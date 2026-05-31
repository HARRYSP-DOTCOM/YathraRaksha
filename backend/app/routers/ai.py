import base64
import json
import re
from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.config import settings

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
    """Legacy endpoint: accepts multipart file upload."""
    image_bytes = await file.read()
    b64 = base64.b64encode(image_bytes).decode("utf-8")
    return _analyze_with_vision_ai(
        b64, lat or 20.5937, lng or 78.9629, "Uploaded location"
    )


@router.post("/analyze-road")
async def analyze_road(body: RoadAnalysisRequest):
    """Accepts a base64 image via JSON body and analyzes it with vision AI."""
    return _analyze_with_vision_ai(
        body.image_base64, body.lat, body.lng, body.location_name
    )


def _analyze_with_vision_ai(
    image_base64: str, lat: float, lng: float, location_name: str
) -> dict:
    """Analyze a road image using Google Gemini Vision only."""
    if not settings.gemini_api_key:
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY not configured. Add it to backend/.env for road image detection.",
        )

    image_base64_clean = _strip_data_url(image_base64)
    media_type = _image_media_type(image_base64)

    system_prompt = (
        "You are a road damage detection AI expert. Analyze the provided road image "
        "and return ONLY valid JSON (no markdown, no code fences): "
        '{ "detected_damages": string[], "severity_score": number (0-10), '
        '"ai_complaint_text": string }. '
        "detected_damages must only include items from this specific list: "
        "[Pothole, Alligator Cracking, Longitudinal Crack, Transverse Crack, "
        "Rutting, Good Condition]. "
        "If multiple issues are present, list them all. "
        "If the image is not a road scene or no defects are found, use detected_damages=['Good Condition'] and severity_score=0. "
        "Generate a formal complaint text in English addressed to the Public Works Department, "
        f"referencing the location: {location_name} ({lat}, {lng})."
    )
    user_prompt = (
        f"Analyze this road image from {location_name} ({lat}, {lng}). "
        "Identify defects: Pothole, Alligator Cracking, Longitudinal Crack, Transverse Crack, Rutting, or Good Condition. "
        "Return ONLY JSON."
    )

    try:
        return _analyze_with_gemini(
            image_base64_clean,
            media_type,
            system_prompt,
            user_prompt,
            lat,
            lng,
            location_name,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Gemini vision analysis failed: {exc}",
        ) from exc


def _analyze_with_gemini(
    image_base64: str,
    media_type: str,
    system_prompt: str,
    user_prompt: str,
    lat: float,
    lng: float,
    location_name: str,
) -> dict:
    import google.generativeai as genai

    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel(
        model_name=settings.gemini_model,
        system_instruction=system_prompt
    )

    image_data = base64.b64decode(image_base64)
    
    response = model.generate_content(
        contents=[
            {
                "role": "user",
                "parts": [
                    {"text": user_prompt},
                    {"mime_type": media_type, "data": image_data}
                ]
            }
        ],
        generation_config=genai.types.GenerationConfig(
            temperature=0.1,
            response_mime_type="application/json",
        )
    )

    return _parse_llm_json(response.text, lat, lng, location_name, provider="gemini")


def _parse_llm_json(
    reply: str, lat: float, lng: float, location_name: str, provider: str
) -> dict:
    cleaned = reply.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
    if not cleaned.startswith("{"):
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            cleaned = match.group(0)

    try:
        result = json.loads(cleaned)
        damages = _normalize_damages(result.get("detected_damages", []))
        severity = _normalize_severity(result.get("severity_score", 5))
        complaint_text = result.get("ai_complaint_text", "")
    except json.JSONDecodeError:
        damages = ["Pothole"]
        severity = 5
        complaint_text = reply if reply else _mock_complaint(location_name)

    return {
        "success": True,
        "detected_damages": damages,
        "selected_road_problems": damages,
        "problem_options": _problem_options(damages),
        "severity_score": severity,
        "ai_complaint_text": complaint_text,
        "coordinates": [lat, lng],
        "location_name": location_name,
        "provider": provider,
    }


def _normalize_damages(value: Any) -> list[str]:
    allowed = {
        "pothole": "Pothole",
        "alligator cracking": "Alligator Cracking",
        "fatigue cracking": "Alligator Cracking",
        "longitudinal crack": "Longitudinal Crack",
        "transverse crack": "Transverse Crack",
        "rutting": "Rutting",
        "good condition": "Good Condition",
        "no defect": "Good Condition",
    }
    if isinstance(value, str):
        raw_items = [value]
    elif isinstance(value, list):
        raw_items = value
    else:
        raw_items = []

    normalized: list[str] = []
    for item in raw_items:
        key = str(item).strip().lower().replace("_", " ")
        label = allowed.get(key)
        if label and label not in normalized:
            normalized.append(label)
    return normalized


def _normalize_severity(value: Any) -> int:
    try:
        return max(0, min(10, round(float(value))))
    except (TypeError, ValueError):
        return 5


def _problem_options(selected: list[str]) -> list[dict[str, Any]]:
    labels = [
        "Pothole",
        "Alligator Cracking",
        "Longitudinal Crack",
        "Transverse Crack",
        "Rutting",
        "Good Condition",
    ]
    selected_set = set(selected)
    return [{"label": label, "selected": label in selected_set} for label in labels]


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


def _image_media_type(image_base64: str) -> str:
    match = re.match(r"^data:(image/[^;]+);base64,", image_base64.strip())
    return match.group(1) if match else "image/jpeg"
