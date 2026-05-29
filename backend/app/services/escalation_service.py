import json
from datetime import datetime, timedelta
from typing import Any
from sqlalchemy.orm import Session
from app.models import Complaint

SLA_HOURS = {
    "Low": 72,
    "Medium": 48,
    "High": 24,
    "Critical": 6
}

def compute_sla_deadline(created_at: datetime, severity: str) -> datetime:
    """Compute the SLA deadline based on the creation time and severity."""
    # Handle casing and defaults gracefully
    sev_key = (severity or "Medium").strip().title()
    hours = SLA_HOURS.get(sev_key, SLA_HOURS["Medium"])
    return created_at + timedelta(hours=hours)

def get_escalation_authority(level: int) -> str:
    """Return the engineering authority corresponding to the escalation level."""
    authorities = {
        0: "Assistant Engineer",
        1: "Executive Engineer",
        2: "Chief Engineer"
    }
    # Clamp to max level of 2
    clamped_level = min(max(level, 0), 2)
    return authorities[clamped_level]

def escalate_complaint(complaint: Complaint, db: Session):
    """Escalates a complaint to the next authority level, updating its status and payload logs."""
    # Only escalate if we haven't reached the maximum level (level 2 -> Chief Engineer)
    if complaint.escalation_level < 2:
        complaint.escalation_level += 1
    
    authority = get_escalation_authority(complaint.escalation_level)
    new_status = f"Escalated - {authority}"
    complaint.status = new_status
    
    # Load existing payload JSON data
    try:
        data = json.loads(complaint.payload_json) if complaint.payload_json else {}
    except Exception:
        data = {}
        
    # Append to statusLogs
    status_logs = data.get("statusLogs", [])
    timestamp_str = datetime.utcnow().isoformat() + "Z"
    status_logs.append({
        "status": "Escalated",
        "timestamp": timestamp_str,
        "message": f"Escalated to {authority}"
    })
    data["statusLogs"] = status_logs
    
    # Append to auditLogs
    audit_logs = data.get("auditLogs", [])
    audit_logs.append({
        "action": "Escalation",
        "timestamp": timestamp_str,
        "message": f"Complaint escalated to level {complaint.escalation_level} ({authority})"
    })
    data["auditLogs"] = audit_logs
    
    # Update payload
    complaint.payload_json = json.dumps(data)
    complaint.updated_at = datetime.utcnow()
    
    # Commit changes
    db.commit()
    db.refresh(complaint)

def run_escalation_sweep(db: Session):
    """Queries all unresolved complaints that have exceeded their SLA deadline and escalates them."""
    now = datetime.utcnow()
    
    # Query complaints that are not in resolved, closed, or rejected states,
    # have an SLA deadline set, are overdue, and haven't reached the max escalation level (2)
    overdue_complaints = (
        db.query(Complaint)
        .filter(~Complaint.status.in_(["Resolved", "Closed", "Rejected"]))
        .filter(Complaint.sla_deadline.isnot(None))
        .filter(Complaint.sla_deadline < now)
        .filter(Complaint.escalation_level < 2)
        .all()
    )
    
    for complaint in overdue_complaints:
        escalate_complaint(complaint, db)
