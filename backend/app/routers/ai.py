from fastapi import APIRouter, File, Form, UploadFile

from app.seed_data import find_nearest_road
from app.services.ai_analysis import analyze_road_image

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/analyze")
async def analyze_media(
    file: UploadFile = File(...),
    lat: float = Form(...),
    lng: float = Form(...),
):
    nearest = find_nearest_road(lat, lng)
    image_bytes = await file.read()

    # Two-stage analysis — returns structured response (never raises)
    result = analyze_road_image(image_bytes, [lat, lng], nearest)

    # If road validation failed, return 422 with structured rejection body
    if not result.get("success"):
        from fastapi.responses import JSONResponse

        return JSONResponse(status_code=422, content=result)

    return result
