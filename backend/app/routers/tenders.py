from fastapi import APIRouter, HTTPException

from app.services import real_data

router = APIRouter(prefix="/tenders", tags=["tenders"])


@router.get("")
def list_tenders():
    if not real_data.data_available():
        raise HTTPException(status_code=503, detail="Tender datasets not found under /data")
    return real_data.get_tenders()
