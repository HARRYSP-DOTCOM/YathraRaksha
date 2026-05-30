from math import atan2, cos, radians, sin, sqrt
import json
from datetime import datetime
from sqlalchemy.orm import Session
from app.models import Complaint

def _haversine_km(lat1, lon1, lat2, lon2):
    r = 6371.0
    d_lat = radians(lat2 - lat1)
    d_lon = radians(lon2 - lon1)
    a = sin(d_lat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lon/2)**2
    return r * 2 * atan2(sqrt(a), sqrt(1-a))

def find_nearby_complaints(lat: float, lng: float, defect_type: str, db: Session, radius_km: float = 0.25) -> list[dict]:
    terminal = ("Resolved", "Closed", "Rejected", "Merged")
    rows = db.query(Complaint).filter(~Complaint.status.in_(terminal)).all()
    results = []
    for row in rows:
        data = json.loads(row.payload_json)
        coords = data.get("coordinates")
        if not coords or len(coords) < 2:
            continue
        dist = _haversine_km(lat, lng, coords[0], coords[1])
        if dist <= radius_km and data.get("defectType", "").lower() == defect_type.lower():
            results.append({
                "id": data.get("id"),
                "defectType": data.get("defectType"),
                "coordinates": coords,
                "distanceKm": round(dist, 3),
                "supportCount": data.get("supportCount", 0),
                "status": row.status,
                "timestamp": data.get("timestamp"),
            })
    return sorted(results, key=lambda x: x["distanceKm"])

def merge_as_duplicate(original_id: str, duplicate_id: str, db: Session):
    original = db.get(Complaint, original_id)
    duplicate = db.get(Complaint, duplicate_id)
    if not original or not duplicate:
        return None

    # Increment supportCount on original
    orig_data = json.loads(original.payload_json)
    orig_data["supportCount"] = orig_data.get("supportCount", 0) + 1
    original.payload_json = json.dumps(orig_data)

    # Mark duplicate as Merged
    dup_data = json.loads(duplicate.payload_json)
    logs = dup_data.get("statusLogs", [])
    logs.append({"status": "Merged", "timestamp": datetime.utcnow().isoformat()+"Z",
                 "message": f"Merged into complaint {original_id} as duplicate."})
    dup_data["statusLogs"] = logs
    duplicate.status = "Merged"
    duplicate.payload_json = json.dumps(dup_data)

    db.commit()
    db.refresh(original)
    return orig_data
