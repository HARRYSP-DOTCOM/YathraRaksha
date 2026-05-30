from datetime import datetime
import json
from sqlalchemy.orm import Session
from app.models import Complaint
from app.seed_data import get_roads

def compute_accountability_score(road: dict, complaints: list[dict]) -> dict:
    total = len(complaints)
    resolved = sum(1 for c in complaints if "Resolved" in c.get("status","") or "Closed" in c.get("status",""))
    resolution_rate = round(resolved / total * 100, 1) if total else 0

    # Avg resolution time (hours)
    resolution_times = []
    for c in complaints:
        if "Resolved" in c.get("status","") or "Closed" in c.get("status",""):
            logs = c.get("statusLogs", [])
            submitted = next((l for l in logs if l["status"] == "Submitted"), None)
            resolved_log = next((l for l in reversed(logs) if "Resolved" in l["status"] or "Closed" in l["status"]), None)
            if submitted and resolved_log:
                try:
                    t1 = datetime.fromisoformat(submitted["timestamp"].replace("Z",""))
                    t2 = datetime.fromisoformat(resolved_log["timestamp"].replace("Z",""))
                    resolution_times.append((t2-t1).total_seconds()/3600)
                except: pass
    avg_res_hours = round(sum(resolution_times)/len(resolution_times), 1) if resolution_times else 48

    # Budget efficiency — reward being on/under budget
    sanctioned = road.get("sanctionedBudget", 1)
    spent = road.get("spentBudget", 1)
    budget_util_raw = spent / sanctioned if sanctioned else 1
    budget_eff_score = min(1.0 / budget_util_raw, 1.0) * 100  # higher is better

    # Citizen satisfaction — proxy from contractorPerformance
    satisfaction = road.get("contractorPerformance", 3) / 5 * 100

    # Spending efficiency — lower cost per resolved complaint is better
    cost_per_resolved = spent / max(resolved, 1)
    max_cpr = 10_000_000  # 1 crore per complaint = poor
    spending_eff = max(0, (1 - cost_per_resolved / max_cpr) * 100)

    # Resolution time score — 48h = 100pts, 0h = 100pts, >96h drops
    res_time_score = max(0, 100 - max(0, avg_res_hours - 24) * 1.5)

    # Weighted final score
    weights = {
        "resolutionRate":   (resolution_rate,       0.30),
        "resolutionTime":   (res_time_score,         0.20),
        "budgetEfficiency": (budget_eff_score,       0.25),
        "satisfaction":     (satisfaction,           0.15),
        "spendingEff":      (spending_eff,           0.10),
    }
    final = sum(v * w for v, w in weights.values())
    final = round(min(max(final, 0), 100), 1)

    if final >= 90: grade = "A+"
    elif final >= 80: grade = "A"
    elif final >= 65: grade = "B"
    elif final >= 50: grade = "C"
    elif final >= 35: grade = "D"
    else: grade = "F"

    return {
        "roadId": road["id"], "roadName": road["name"],
        "totalComplaints": total, "resolvedComplaints": resolved,
        "resolutionRate": resolution_rate,
        "avgResolutionTimeHours": avg_res_hours,
        "budgetUtilization": round(budget_util_raw * 100, 1),
        "citizenSatisfaction": round(satisfaction, 1),
        "spendingEfficiency": round(spending_eff, 1),
        "scoreBreakdown": {k: round(v, 1) for k, (v, _) in weights.items()},
        "accountabilityScore": final,
        "grade": grade,
    }

def get_all_accountability_scores(db: Session) -> list[dict]:
    roads = get_roads()
    all_complaints_raw = db.query(Complaint).all()

    # Group complaints by road ID
    road_complaints = {r["id"]: [] for r in roads}
    for c in all_complaints_raw:
        data = json.loads(c.payload_json)
        data["status"] = c.status
        road_id = (data.get("matchedRoad") or {}).get("id","")
        if road_id in road_complaints:
            road_complaints[road_id].append(data)

    scores = [compute_accountability_score(road, road_complaints[road["id"]]) for road in roads]
    return sorted(scores, key=lambda x: x["accountabilityScore"], reverse=True)
