import json
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_user
from app.database import get_db
from app.models import Complaint, User
from app.schemas import ComplaintStatusUpdate

router = APIRouter(prefix="/complaints", tags=["complaints"])


def _serialize_complaint(row: Complaint) -> dict[str, Any]:
    data = json.loads(row.payload_json)
    data["status"] = row.status
    data["userId"] = row.user_id
    data["escalation_level"] = row.escalation_level
    data["sla_deadline"] = row.sla_deadline.isoformat() + "Z" if row.sla_deadline else None
    return data


@router.post("")
def create_complaint(
    payload: dict[str, Any],
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user),
):
    complaint_id = payload.get("id")
    if not complaint_id:
        raise HTTPException(status_code=400, detail="Complaint id is required")

    existing = db.get(Complaint, complaint_id)
    if existing:
        return _serialize_complaint(existing)

    user_id = payload.get("userId") or (user.id if user else None)
    status_value = payload.get("status", "Submitted")

    created_at = datetime.utcnow()
    severity = payload.get("severity", "Medium")
    from app.services.escalation_service import compute_sla_deadline
    sla_deadline = compute_sla_deadline(created_at, severity)

    row = Complaint(
        id=complaint_id,
        user_id=user_id,
        payload_json=json.dumps(payload),
        status=status_value,
        created_at=created_at,
        sla_deadline=sla_deadline,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize_complaint(row)


@router.patch("/{complaint_id}/escalate")
def manual_escalate_complaint(
    complaint_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    if current_user.role not in ("engineer", "admin"):
        raise HTTPException(status_code=403, detail="Only engineers and admins can manually escalate complaints")

    complaint = db.get(Complaint, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    from app.services.escalation_service import escalate_complaint
    escalate_complaint(complaint, db)
    return _serialize_complaint(complaint)


@router.post("/{complaint_id}/escalate")
def manual_escalate(complaint_id: str, db: Session = Depends(get_db), user: User = Depends(require_user)):
    row = db.get(Complaint, complaint_id)
    if not row:
        raise HTTPException(status_code=404, detail="Complaint not found")
    from app.services.escalation_service import escalate_complaint
    updated = escalate_complaint(row, db)
    return _serialize_complaint(updated)


@router.get("")
def list_complaints(
    status: str | None = Query(None),
    userId: str | None = Query(None),
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user),
):
    query = db.query(Complaint)
    if user:
        query = query.filter(Complaint.user_id == user.id)
    elif userId:
        query = query.filter(Complaint.user_id == userId)

    rows = query.order_by(Complaint.created_at.desc()).all()
    results = [_serialize_complaint(r) for r in rows]
    if status:
        results = [c for c in results if c.get("status") == status]
    return results


@router.get("/{complaint_id}")
def get_complaint(complaint_id: str, db: Session = Depends(get_db)):
    row = db.get(Complaint, complaint_id)
    if not row:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return _serialize_complaint(row)


@router.patch("/{complaint_id}/status")
def update_complaint_status(
    complaint_id: str,
    body: ComplaintStatusUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_user),
):
    row = db.get(Complaint, complaint_id)
    if not row:
        raise HTTPException(status_code=404, detail="Complaint not found")

    data = json.loads(row.payload_json)
    data["status"] = body.status
    logs = data.get("statusLogs", [])
    logs.append(
        {
            "status": body.status,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "message": body.message or f"Status updated to {body.status}",
        }
    )
    data["statusLogs"] = logs
    row.status = body.status
    row.payload_json = json.dumps(data)
    row.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return _serialize_complaint(row)


@router.post("/sync")
def sync_complaint(
    payload: dict[str, Any],
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user),
):
    if user and not payload.get("userId"):
        payload["userId"] = user.id
    return create_complaint(payload, db, user)
