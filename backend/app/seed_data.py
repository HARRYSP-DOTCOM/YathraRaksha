import json
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
INFRASTRUCTURE_FILE = DATA_DIR / "infrastructure.json"

_cache: dict | None = None


def load_infrastructure() -> dict:
    global _cache
    if _cache is None:
        with INFRASTRUCTURE_FILE.open(encoding="utf-8") as f:
            _cache = json.load(f)
    return _cache


def get_roads() -> list[dict]:
    return load_infrastructure()["roads"]


def get_alternative_routes() -> dict:
    return load_infrastructure().get("alternativeRoutes", {})


def find_nearest_road(lat: float, lng: float) -> dict:
    roads = get_roads()
    nearest = None
    min_distance = float("inf")

    for road in roads:
        coords = road["coordinates"]
        dist = _haversine_km(lat, lng, coords[0], coords[1])
        if dist < min_distance:
            min_distance = dist
            nearest = road

    return {"road": nearest, "distanceKm": round(min_distance, 2)}


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    from math import atan2, cos, radians, sin, sqrt

    r = 6371.0
    d_lat = radians(lat2 - lat1)
    d_lon = radians(lon2 - lon1)
    a = sin(d_lat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return r * c


def get_contractors(sort_by: str = "rating") -> list[dict]:
    seen: dict[str, dict] = {}
    for road in get_roads():
        name = road["contractorName"]
        rating = road["contractorPerformance"]
        if name not in seen or seen[name]["rating"] < rating:
            seen[name] = {
                "name": name,
                "rating": rating,
                "roadsMaintained": [road["id"]],
                "country": road["country"],
            }
        else:
            seen[name]["roadsMaintained"].append(road["id"])

    contractors = list(seen.values())
    if sort_by == "rating":
        contractors.sort(key=lambda c: c["rating"], reverse=True)
    else:
        contractors.sort(key=lambda c: c["name"])
    return contractors


def get_budget_audit(road_id: str | None = None) -> dict:
    roads = get_roads()
    if road_id:
        roads = [r for r in roads if r["id"] == road_id]
        if not roads:
            return {"roads": [], "summary": {}}

    total_sanctioned = sum(r["sanctionedBudget"] for r in roads)
    total_spent = sum(r["spentBudget"] for r in roads)
    overruns = [r for r in roads if r["spentBudget"] > r["sanctionedBudget"]]

    return {
        "roads": [
            {
                "id": r["id"],
                "name": r["name"],
                "sanctionedBudget": r["sanctionedBudget"],
                "spentBudget": r["spentBudget"],
                "overrun": r["spentBudget"] > r["sanctionedBudget"],
                "fundingSource": r["fundingSource"],
                "utilizationPercent": round(r["spentBudget"] / r["sanctionedBudget"] * 100, 1) if r["sanctionedBudget"] else 0,
                "remainingBudget": r["sanctionedBudget"] - r["spentBudget"],
                "statusLabel": "Over Budget" if r["spentBudget"] > r["sanctionedBudget"] else ("Under-utilized" if r["spentBudget"] < r["sanctionedBudget"] * 0.7 else "On Track"),
                "contractorName": r["contractorName"],
                "contractorPerformance": r["contractorPerformance"],
            }
            for r in roads
        ],
        "summary": {
            "totalSanctioned": total_sanctioned,
            "totalSpent": total_spent,
            "overrunCount": len(overruns),
            "efficiencyPercent": round((total_sanctioned / total_spent) * 100, 1) if total_spent else 100,
            "totalRemaining": total_sanctioned - total_spent,
            "utilizationPercent": round(total_spent / total_sanctioned * 100, 1) if total_sanctioned else 0,
        },
    }
