from fastapi import APIRouter, Query

from app.seed_data import get_budget_audit

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/budget")
def budget_audit(roadId: str | None = Query(None)):
    return get_budget_audit(roadId)
