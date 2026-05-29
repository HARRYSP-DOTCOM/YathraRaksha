import uuid
from pathlib import Path

from fastapi import APIRouter, File, Form, UploadFile

from app.config import settings
from app.schemas import MediaUploadResponse

router = APIRouter(prefix="/media", tags=["media"])

UPLOAD_ROOT = Path(__file__).resolve().parent.parent.parent / settings.media_upload_dir
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)


@router.post("/upload", response_model=MediaUploadResponse)
async def upload_media(
    file: UploadFile = File(...),
    complaintId: str | None = Form(None),
):
    ext = Path(file.filename or "upload.jpg").suffix or ".jpg"
    safe_name = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOAD_ROOT / safe_name

    content = await file.read()
    dest.write_bytes(content)

    return MediaUploadResponse(
        url=f"/uploads/{safe_name}",
        filename=safe_name,
        complaintId=complaintId,
    )
