from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.data_ingestion import get_open_data_sources, refresh_road_data

router = APIRouter(prefix="/data", tags=["data"])


@router.post("/refresh")
def refresh_data(db: Session = Depends(get_db)):
    count = refresh_road_data(db)
    if count == 0:
        raise HTTPException(status_code=502, detail="Open data refresh failed or no data available.")
    return {"message": "Road data refreshed from open sources.", "roadCount": count}


@router.get("/sources")
def list_sources():
    return get_open_data_sources()
