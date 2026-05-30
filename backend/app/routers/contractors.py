from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Road
from app.seed_data import get_contractors

router = APIRouter(prefix="/contractors", tags=["contractors"])


@router.get("")
def list_contractors(sortBy: str = Query("rating"), db: Session = Depends(get_db)):
    roads = db.query(Road).all()
    if not roads:
        return get_contractors(sortBy)

    seen: dict[str, dict] = {}
    for road in roads:
        if not road.contractor_name:
            continue
        rating = road.contractor_performance or 0
        name = road.contractor_name
        if name not in seen or seen[name]["rating"] < rating:
            seen[name] = {
                "name": name,
                "rating": rating,
                "roadsMaintained": [road.id],
                "country": road.country,
            }
        else:
            seen[name]["roadsMaintained"].append(road.id)

    contractors = list(seen.values())
    if sortBy == "rating":
        contractors.sort(key=lambda c: c["rating"], reverse=True)
    else:
        contractors.sort(key=lambda c: c["name"])
    return contractors
