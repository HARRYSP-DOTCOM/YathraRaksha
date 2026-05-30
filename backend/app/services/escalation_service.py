import json
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models import Complaint

SLA_HOURS = { "Low": 72, "Medium": 48, "High": 24, "Critical": 6 }

HIERARCHY = { 0: "Assistant Engineer", 1: "Executive Engineer", 2: "Chief Engineer" }

def compute_sla_deadline(created_at: datetime, severity: str) -> datetime:
    hours = SLA_HOURS.get(severity, 48)
    return created_at + timedelta(hours=hours)

def escalate_complaint(complaint: Complaint, db: Session) -> Complaint:
    # Only escalate up to level 2
    if complaint.escalation_level >= 2:
        return complaint
    complaint.escalation_level += 1
    authority = HIERARCHY[complaint.escalation_level]
    data = json.loads(complaint.payload_json)
    logs = data.get("statusLogs", [])
    logs.append({
        "status": "Escalated",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "message": f"Complaint escalated to {authority} due to SLA breach.",
        "authority": authority
    })
    data["statusLogs"] = logs
    complaint.status = f"Escalated — {authority}"
    complaint.payload_json = json.dumps(data)
    complaint.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(complaint)
    return complaint

def run_escalation_sweep(db: Session) -> int:
    # Returns count of escalated complaints
    now = datetime.utcnow()
    terminal = ("Resolved", "Closed", "Rejected")
    rows = db.query(Complaint).filter(
        Complaint.sla_deadline != None,
        Complaint.sla_deadline < now,
        Complaint.escalation_level < 2
    ).all()
    count = 0
    for row in rows:
        if row.status not in terminal and not row.status.startswith("Resolved") and not row.status.startswith("Closed"):
            escalate_complaint(row, db)
            count += 1
    return count
