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

    row = Complaint(
        id=complaint_id,
        user_id=user_id,
        payload_json=json.dumps(payload),
        status=status_value,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize_complaint(row)


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
