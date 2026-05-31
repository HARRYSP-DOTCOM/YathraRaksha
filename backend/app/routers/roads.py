from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Road
from app.seed_data import find_nearest_road, get_alternative_routes, get_roads, _haversine_km
from app.services import real_data

router = APIRouter(prefix="/roads", tags=["roads"])


def _serialize_road(row: Road) -> dict[str, Any]:
    return {
        "id": row.id,
        "name": row.name,
        "country": row.country,
        "authority": row.authority,
        "contractorName": row.contractor_name,
        "contractorPerformance": row.contractor_performance,
        "sanctionedBudget": row.sanctioned_budget,
        "spentBudget": row.spent_budget,
        "fundingSource": row.funding_source,
        "latitude": row.latitude,
        "longitude": row.longitude,
        "sourceName": row.source_name,
        "sourceUrl": row.source_url,
        "sourceVerifiedAt": row.source_verified_at.isoformat() + "Z" if row.source_verified_at else None,
    }


def _get_db_roads(db: Session) -> list[Road]:
    return db.query(Road).all()


def _filter_roads(roads: list[Road], query: str | None, country: str | None) -> list[Road]:
    results = roads
    if country:
        results = [r for r in results if (r.country or "").lower() == country.lower()]
    if query:
        q = query.lower()
        results = [
            r
            for r in results
            if q in (r.name or "").lower()
            or q in (r.authority or "").lower()
            or q in (r.contractor_name or "").lower()
            or q in (r.id or "").lower()
        ]
    return results



@router.get("")
def list_roads(
    q: str | None = Query(None, alias="q"),
    country: str | None = Query(None),
    format: str | None = Query(None, description="Use format=list for legacy road array"),
    db: Session = Depends(get_db),
):
    if real_data.data_available() and format != "list" and not q and not country:
        return real_data.get_roads()

    rows = _get_db_roads(db)
    if not rows:
        return get_roads()
    return [_serialize_road(road) for road in _filter_roads(rows, q, country)]


@router.get("/nearest")
def nearest_road(lat: float = Query(...), lng: float = Query(...), db: Session = Depends(get_db)):
    rows = _get_db_roads(db)
    if not rows:
        return find_nearest_road(lat, lng)

    nearest = None
    min_distance = float("inf")
    for road in rows:
        if road.latitude is None or road.longitude is None:
            continue
        dist = _haversine_km(lat, lng, road.latitude, road.longitude)
        if dist < min_distance:
            min_distance = dist
            nearest = road

    return {"road": _serialize_road(nearest) if nearest else None, "distanceKm": round(min_distance, 2)}


@router.get("/routes/alternatives")
def alternative_routes():
    return get_alternative_routes()
