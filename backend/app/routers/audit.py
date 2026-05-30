from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Road
from app.seed_data import get_budget_audit

router = APIRouter(prefix="/audit", tags=["audit"])


def _serialize_budget_road(road: Road) -> dict:
    return {
        "id": road.id,
        "name": road.name,
        "sanctionedBudget": road.sanctioned_budget,
        "spentBudget": road.spent_budget,
        "overrun": bool(road.sanctioned_budget is not None and road.spent_budget is not None and road.spent_budget > road.sanctioned_budget),
        "fundingSource": road.funding_source,
    }


@router.get("/budget")
def budget_audit(roadId: str | None = Query(None), db: Session = Depends(get_db)):
    roads = db.query(Road).all()
    if not roads:
        return get_budget_audit(roadId)

    selected = roads
    if roadId:
        selected = [road for road in roads if road.id == roadId]
        if not selected:
            return {"roads": [], "summary": {}}

    total_sanctioned = sum((road.sanctioned_budget or 0) for road in selected)
    total_spent = sum((road.spent_budget or 0) for road in selected)
    overruns = [road for road in selected if road.sanctioned_budget is not None and road.spent_budget is not None and road.spent_budget > road.sanctioned_budget]

    return {
        "roads": [_serialize_budget_road(road) for road in selected],
        "summary": {
            "totalSanctioned": total_sanctioned,
            "totalSpent": total_spent,
            "overrunCount": len(overruns),
            "efficiencyPercent": round((total_sanctioned / total_spent) * 100, 1) if total_spent else 100,
        },
    }
