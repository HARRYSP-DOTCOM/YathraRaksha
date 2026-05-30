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


@router.get("/{complaint_id}/priority")
def get_complaint_priority(complaint_id: str, db: Session = Depends(get_db)):
    from app.services.priority_scorer import compute_priority_score
    from app.seed_data import get_roads
    row = db.get(Complaint, complaint_id)
    if not row:
        raise HTTPException(404, "Not found")
    data = json.loads(row.payload_json)
    road_id = (data.get("matchedRoad") or {}).get("id")
    road = next((r for r in get_roads() if r["id"] == road_id), None) if road_id else None
    priority = compute_priority_score(data, road)
    return {"complaintId": complaint_id, **priority}

@router.get("/ranked")
def ranked_complaints(status: str | None = Query(None), db: Session = Depends(get_db)):
    from app.services.priority_scorer import compute_priority_score
    from app.seed_data import get_roads
    all_roads = {r["id"]: r for r in get_roads()}
    rows = db.query(Complaint).all()
    results = []
    for row in rows:
        data = json.loads(row.payload_json)
        if status and row.status != status:
            continue
        road_id = (data.get("matchedRoad") or {}).get("id")
        road = all_roads.get(road_id)
        priority = compute_priority_score(data, road)
        data["priorityScore"] = priority["score"]
        data["priorityCategory"] = priority["category"]
        data["status"] = row.status
        results.append(data)
    return sorted(results, key=lambda x: x["priorityScore"], reverse=True)


@router.post("/check-duplicate")
def check_duplicate(body: dict, db: Session = Depends(get_db)):
    from app.services.duplicate_detector import find_nearby_complaints
    lat = body.get("lat"); lng = body.get("lng"); defect_type = body.get("defectType","")
    if lat is None or lng is None:
        raise HTTPException(400, "lat and lng required")
    nearby = find_nearby_complaints(lat, lng, defect_type, db)
    return {"isDuplicate": len(nearby) > 0, "nearbyComplaints": nearby}


@router.post("/{complaint_id}/support")
def support_complaint(complaint_id: str, db: Session = Depends(get_db), user: User = Depends(require_user)):
    row = db.get(Complaint, complaint_id)
    if not row:
        raise HTTPException(404, "Not found")
    data = json.loads(row.payload_json)
    data["supportCount"] = data.get("supportCount", 0) + 1
    logs = data.get("statusLogs", [])
    logs.append({"status": "Community Support", "timestamp": datetime.utcnow().isoformat()+"Z",
                 "message": f"A citizen confirmed this issue. Total support: {data['supportCount']}"})
    data["statusLogs"] = logs
    row.payload_json = json.dumps(data)
    db.commit()
    return _serialize_complaint(row)


@router.post("/{original_id}/merge/{duplicate_id}")
def merge_complaints(original_id: str, duplicate_id: str, db: Session = Depends(get_db), user: User = Depends(require_user)):
    from app.services.duplicate_detector import merge_as_duplicate
    result = merge_as_duplicate(original_id, duplicate_id, db)
    if not result:
        raise HTTPException(404, "One or both complaints not found")
    return result


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

    from app.services.priority_scorer import compute_priority_score
    from app.seed_data import get_roads
    road_id = (data.get("matchedRoad") or {}).get("id")
    road = next((r for r in get_roads() if r["id"] == road_id), None) if road_id else None
    priority = compute_priority_score(data, road)
    data["priorityScore"] = priority["score"]
    data["priorityCategory"] = priority["category"]

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
