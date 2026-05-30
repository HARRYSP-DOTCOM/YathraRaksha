from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.risk_analyzer import analyze_road_risks

router = APIRouter(prefix="/alerts", tags=["alerts"])

@router.get("/roads")
def road_alerts(riskLevel: str | None = Query(None), alertType: str | None = Query(None), db: Session = Depends(get_db)):
    results = analyze_road_risks(db)
    if riskLevel:
        results = [r for r in results if r["overallRisk"].lower() == riskLevel.lower()]
    if alertType:
        results = [r for r in results if any(a["type"] == alertType for a in r["alerts"])]
    return results
