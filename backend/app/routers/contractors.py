from fastapi import APIRouter, Query

from app.seed_data import get_contractors

router = APIRouter(prefix="/contractors", tags=["contractors"])


@router.get("")
def list_contractors(sortBy: str = Query("rating")):
    return get_contractors(sortBy)
