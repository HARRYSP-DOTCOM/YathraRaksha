from fastapi import APIRouter, Query

from app.seed_data import find_nearest_road, get_alternative_routes, get_roads

router = APIRouter(prefix="/roads", tags=["roads"])


@router.get("")
def list_roads(
    q: str | None = Query(None, alias="q"),
    country: str | None = Query(None),
):
    roads = get_roads()
    if country:
        roads = [r for r in roads if r.get("country", "").lower() == country.lower()]
    if q:
        query = q.lower()
        roads = [
            r
            for r in roads
            if query in r["name"].lower()
            or query in r.get("authority", "").lower()
            or query in r.get("contractorName", "").lower()
            or query in r["id"].lower()
        ]
    return roads


@router.get("/nearest")
def nearest_road(lat: float = Query(...), lng: float = Query(...)):
    return find_nearest_road(lat, lng)


@router.get("/routes/alternatives")
def alternative_routes():
    return get_alternative_routes()
