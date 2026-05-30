from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Complaint
import json
from datetime import datetime

router = APIRouter(prefix="/sla", tags=["sla"])

@router.get("/summary")
def sla_summary(db: Session = Depends(get_db)):
    all_complaints = db.query(Complaint).all()
    now = datetime.utcnow()
    terminal = {"Resolved", "Closed"}

    met = 0
    violated = 0
    resolution_times = []
    by_priority = {p: {"met": 0, "violated": 0} for p in ["Low","Medium","High","Critical"]}

    for c in all_complaints:
        data = json.loads(c.payload_json)
        severity = data.get("severity", "Medium")
        is_resolved = any(s in c.status for s in terminal)

        if c.sla_deadline:
            if is_resolved:
                if c.updated_at <= c.sla_deadline:
                    met += 1
                    by_priority[severity]["met"] += 1
                else:
                    violated += 1
                    by_priority[severity]["violated"] += 1
            elif now > c.sla_deadline:
                violated += 1
                by_priority[severity]["violated"] += 1
            else:
                met += 1
                by_priority[severity]["met"] += 1

        if is_resolved:
            hours = (c.updated_at - c.created_at).total_seconds() / 3600
            resolution_times.append(hours)

    total = met + violated
    return {
        "totalActive": db.query(Complaint).filter(~Complaint.status.in_(list(terminal))).count(),
        "slaMetCount": met,
        "slaViolatedCount": violated,
        "slaMetPercent": round(met / total * 100, 1) if total else 0,
        "slaViolatedPercent": round(violated / total * 100, 1) if total else 0,
        "avgResolutionTimeHours": round(sum(resolution_times) / len(resolution_times), 1) if resolution_times else 0,
        "byPriority": by_priority
    }

@router.get("/overdue")
def sla_overdue(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    rows = db.query(Complaint).filter(
        Complaint.sla_deadline != None,
        Complaint.sla_deadline < now,
    ).order_by(Complaint.sla_deadline.asc()).all()
    terminal = {"Resolved","Closed"}
    results = []
    for r in rows:
        if not any(s in r.status for s in terminal):
            data = json.loads(r.payload_json)
            data["sla_deadline"] = r.sla_deadline.isoformat() + "Z"
            data["escalation_level"] = r.escalation_level
            results.append(data)
    return results
