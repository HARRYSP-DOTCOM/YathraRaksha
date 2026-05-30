from datetime import datetime
import json

SEVERITY_WEIGHTS = {"Low": 5, "Medium": 12, "High": 20, "Critical": 25}

def compute_priority_score(complaint_data: dict, road_data: dict | None) -> dict:
    severity = complaint_data.get("severity", "Medium")
    urgency_score = float(complaint_data.get("urgencyScore", 5) or 5)
    support_count = int(complaint_data.get("supportCount", 0) or 0)
    timestamp = complaint_data.get("timestamp", datetime.utcnow().isoformat())

    try:
        created = datetime.fromisoformat(timestamp.replace("Z",""))
        age_days = (datetime.utcnow() - created).days
    except:
        age_days = 0

    safety_rating = road_data["accidentRecords"]["safetyRating"] if road_data and "accidentRecords" in road_data else 5.0

    # Score components (total 100 pts)
    severity_score   = SEVERITY_WEIGHTS.get(severity, 12)                   # 0-25
    urgency_pts      = round(urgency_score / 10 * 20, 1)                    # 0-20
    road_risk_pts    = round((10 - safety_rating) / 10 * 20, 1)            # 0-20
    age_pts          = round(min(age_days, 10) / 10 * 20, 1)               # 0-20
    community_pts    = round(min(support_count, 10) / 10 * 15, 1)          # 0-15

    total = severity_score + urgency_pts + road_risk_pts + age_pts + community_pts

    if total >= 75:   category = "Critical"
    elif total >= 50: category = "High"
    elif total >= 25: category = "Medium"
    else:             category = "Low"

    return {
        "score": round(total, 1),
        "category": category,
        "breakdown": {
            "severityScore": severity_score,
            "urgencyScore": urgency_pts,
            "roadRiskScore": road_risk_pts,
            "ageScore": age_pts,
            "communityScore": community_pts,
        }
    }
