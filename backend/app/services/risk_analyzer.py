from datetime import datetime, date
from dateutil.relativedelta import relativedelta
import json
from sqlalchemy.orm import Session
from app.models import Complaint
from app.seed_data import get_roads

def analyze_road_risks(db: Session) -> list[dict]:
    roads = get_roads()
    today = date.today()

    # Count active complaints per road
    complaint_counts = {}
    all_c = db.query(Complaint).all()
    for c in all_c:
        if "Resolved" in c.status or "Closed" in c.status:
            continue
        data = json.loads(c.payload_json)
        road_id = (data.get("matchedRoad") or {}).get("id","")
        if road_id:
            complaint_counts[road_id] = complaint_counts.get(road_id, 0) + 1

    results = []
    for road in roads:
        alerts = []
        score = 0

        if road["spentBudget"] > road["sanctionedBudget"]:
            overrun = road["spentBudget"] - road["sanctionedBudget"]
            alerts.append({"type":"BUDGET_OVERRUN","severity":"Critical",
                "message":f"Budget overrun by ₹{overrun/10000000:.1f} Cr","value":overrun})
            score += 30

        potholes = road["accidentRecords"]["potholesPerKm"]
        if potholes > 5:
            alerts.append({"type":"EXCESSIVE_POTHOLES","severity":"Critical",
                "message":f"Pothole density critical: {potholes}/km","value":potholes})
            score += 25

        active = complaint_counts.get(road["id"], 0)
        if active > 5:
            alerts.append({"type":"HIGH_COMPLAINTS","severity":"Warning" if active < 15 else "Critical",
                "message":f"{active} unresolved complaints","value":active})
            score += min(active * 2, 20)

        rating = road["contractorPerformance"]
        if rating < 2.5:
            alerts.append({"type":"LOW_CONTRACTOR_RATING","severity":"Critical",
                "message":f"Contractor rating critically low: {rating}/5","value":rating})
            score += 20

        safety = road["accidentRecords"]["safetyRating"]
        if safety < 3.0:
            alerts.append({"type":"POOR_SAFETY","severity":"Critical",
                "message":f"Safety rating dangerously low: {safety}/10","value":safety})
            score += 20

        try:
            relay_date = datetime.strptime(road["lastRelayingDate"], "%Y-%m-%d").date()
            expiry = relay_date + relativedelta(years=road["maintenanceGuaranteePeriod"])
            if expiry < today and active > 0:
                alerts.append({"type":"GUARANTEE_EXPIRED","severity":"Warning",
                    "message":f"Maintenance guarantee expired on {expiry.isoformat()}","value":str(expiry)})
                score += 15
        except:
            pass

        if score >= 60:   overall = "Critical"
        elif score >= 40: overall = "High"
        elif score >= 20: overall = "Medium"
        else:             overall = "Low"

        results.append({
            "roadId": road["id"], "roadName": road["name"],
            "coordinates": road["coordinates"],
            "alerts": alerts, "overallRisk": overall, "riskScore": min(score, 100)
        })

    return sorted(results, key=lambda x: x["riskScore"], reverse=True)
