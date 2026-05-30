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

@router.get("/dashboard")
def contractor_dashboard(db: Session = Depends(get_db)):
    from app.seed_data import get_roads
    from app.models import Complaint
    import json
    roads = get_roads()

    # Group roads by contractor
    contractor_map = {}
    for road in roads:
        name = road["contractorName"]
        if name not in contractor_map:
            contractor_map[name] = {
                "name": name, "rating": road["contractorPerformance"],
                "country": road["country"], "roads": [], "totalAllocated": 0, "totalSpent": 0,
                "safetyRatings": []
            }
        contractor_map[name]["roads"].append(road["id"])
        contractor_map[name]["totalAllocated"] += road["sanctionedBudget"]
        contractor_map[name]["totalSpent"] += road["spentBudget"]
        contractor_map[name]["safetyRatings"].append(road["accidentRecords"]["safetyRating"])

    # Count complaints per road
    road_complaint_counts = {}
    road_resolved_counts = {}
    all_complaints = db.query(Complaint).all()
    for c in all_complaints:
        data = json.loads(c.payload_json)
        road_id = (data.get("matchedRoad") or {}).get("id","")
        if not road_id: continue
        road_complaint_counts[road_id] = road_complaint_counts.get(road_id, 0) + 1
        if "Resolved" in c.status or "Closed" in c.status:
            road_resolved_counts[road_id] = road_resolved_counts.get(road_id, 0) + 1

    result = []
    for name, info in contractor_map.items():
        total_c = sum(road_complaint_counts.get(r, 0) for r in info["roads"])
        total_r = sum(road_resolved_counts.get(r, 0) for r in info["roads"])
        util = round(info["totalSpent"] / info["totalAllocated"] * 100, 1) if info["totalAllocated"] else 0
        res_rate = round(total_r / total_c * 100, 1) if total_c else 0
        avg_safety = round(sum(info["safetyRatings"]) / len(info["safetyRatings"]), 1) if info["safetyRatings"] else 5.0

        risk = "High" if (util > 110 or res_rate < 50 or info["rating"] < 2.5) else \
               "Medium" if info["rating"] < 3.5 else "Low"

        result.append({
            "name": name, "rating": info["rating"], "country": info["country"],
            "roadsManaged": len(info["roads"]), "roadIds": info["roads"],
            "totalAllocated": info["totalAllocated"], "totalSpent": info["totalSpent"],
            "budgetUtilization": util,
            "totalComplaints": total_c, "resolvedComplaints": total_r,
            "resolutionRate": res_rate, "avgSafetyRating": avg_safety,
            "riskLevel": risk
        })

    return sorted(result, key=lambda x: x["rating"], reverse=True)
