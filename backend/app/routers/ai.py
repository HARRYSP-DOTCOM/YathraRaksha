from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import JSONResponse

from app.seed_data import find_nearest_road
from app.services.yolo_road_detection import analyze_image_bytes

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/analyze")
async def analyze_media(
    file: UploadFile = File(...),
    lat: float | None = Form(None),
    lng: float | None = Form(None),
):
    image_bytes = await file.read()
    result = analyze_image_bytes(image_bytes)

    if result.get("rejected"):
        return JSONResponse(status_code=200, content=result)

    coords = [lat if lat is not None else 20.5937, lng if lng is not None else 78.9629]
    nearest = find_nearest_road(coords[0], coords[1])
    road = nearest.get("road")

    return {
        **result,
        "success": True,
        "coordinates": coords,
        "matchedRoad": road,
        "distanceToRoadKm": nearest.get("distanceKm"),
        "integrityVerificationId": result.get("detection_id"),
        "defectType": result.get("defect_class"),
        "severity": result.get("risk_level"),
        "aiConfidence": f"{(result.get('confidence') or 0) * 100:.1f}%",
        "defectArea": f"{result.get('damage_area_m2', 0)} m²",
        "estimatedDepth": f"{result.get('avg_depth_cm', 0)} cm",
        "urgencyScore": result.get("severity_score"),
        "repairBudgetEstimate": result.get("repair_priority"),
        "repair_priority": result.get("repair_priority"),
        "suggestions": result.get("suggestions", []),
        "roadValidationConfidence": result.get("confidence"),
    }
