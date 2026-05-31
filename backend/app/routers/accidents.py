from fastapi import APIRouter, HTTPException

from app.services import real_data

router = APIRouter(prefix="/accidents", tags=["accidents"])


@router.get("")
def accidents_2023():
    if not real_data.data_available():
        raise HTTPException(status_code=503, detail="Accident datasets not found under /data")
    return real_data.get_accidents()
