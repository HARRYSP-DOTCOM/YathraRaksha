from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.accountability_engine import get_all_accountability_scores

router = APIRouter(prefix="/accountability", tags=["accountability"])

@router.get("/scores")
def accountability_scores(roadId: str | None = Query(None), db: Session = Depends(get_db)):
    scores = get_all_accountability_scores(db)
    if roadId:
        return next((s for s in scores if s["roadId"] == roadId), {})
    return scores

@router.get("/leaderboard")
def leaderboard(db: Session = Depends(get_db)):
    scores = get_all_accountability_scores(db)
    nat_avg = round(sum(s["accountabilityScore"] for s in scores) / len(scores), 1) if scores else 0
    return {
        "nationalAverage": nat_avg,
        "top5": scores[:5],
        "bottom5": scores[-5:],
        "totalRoads": len(scores)
    }
