from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.seed_data import find_nearest_road
from app.services.ai_analysis import analyze_media_filename

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/analyze")
async def analyze_media(
    file: UploadFile = File(...),
    lat: float = Form(...),
    lng: float = Form(...),
):
    nearest = find_nearest_road(lat, lng)
    try:
        report = analyze_media_filename(file.filename or "road.jpg", [lat, lng], nearest)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return report
