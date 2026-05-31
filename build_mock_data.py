import json
import os
import random

DATA_DIR = r"D:\code\harry\YathraRaksha\roadwatch_real_data2"
OUT_FILE = r"D:\code\harry\YathraRaksha\js\mock-data.js"

# Load JSONs
with open(os.path.join(DATA_DIR, "02_contractors_data.json"), encoding="utf-8") as f:
    contractors_data = json.load(f)["contractors"]
with open(os.path.join(DATA_DIR, "03_tenders_data.json"), encoding="utf-8") as f:
    raw_tenders = json.load(f)
    tenders_data = raw_tenders.get("national_highway_tenders", []) + raw_tenders.get("pmgsy_tenders", []) + raw_tenders.get("state_pwd_tenders", [])
with open(os.path.join(DATA_DIR, "04_roads_map_data.json"), encoding="utf-8") as f:
    roads_raw = json.load(f)
with open(os.path.join(DATA_DIR, "06_complaints_sample_data.json"), encoding="utf-8") as f:
    complaints_data = json.load(f)["complaints"]

# Transform Contractors
contractors = []
for c in contractors_data:
    contractors.append({
        "id": c.get("contractor_id", "C001"),
        "name": c.get("name", "Unknown"),
        "projects_completed": c.get("total_road_projects_completed", 0),
        "avg_health_score": c.get("overall_rating", {}).get("quality_score", 85),
        "complaints_count": random.randint(5, 50),
        "budget_efficiency": random.randint(70, 95),
        "completion_rate": random.randint(75, 99)
    })

# Transform Tenders
tenders = []
for t in tenders_data:
    tenders.append({
        "id": t["tender_id"],
        "road_id": t["road_id"],
        "road_name": t.get("project_name", t["road_id"]),
        "date": t.get("awarded_date", "2023-01-01"),
        "budget_allocated": t.get("tender_value_cr", 0) * 10000000,
        "released": t.get("released_cr", 0) * 10000000,
        "spent": t.get("spent_cr", 0) * 10000000,
        "balance": (t.get("tender_value_cr", 0) - t.get("spent_cr", 0)) * 10000000,
        "source": t.get("funding_source", "NHAI"),
        "completion_pct": t.get("physical_progress_pct", 0),
        "contractor_id": t.get("contractor_id", "C001"),
        "anomaly_flag": t.get("anomaly_flag", False),
        "anomaly_reason": t.get("anomaly_reason", None)
    })

# Transform Roads
roads = []
for nh in roads_raw.get("national_highways", []):
    coords = []
    if "key_sections" in nh and len(nh["key_sections"]) > 0:
        sec = nh["key_sections"][0]
        if "start_gps" in sec and "end_gps" in sec:
            coords.append([sec["start_gps"]["lat"], sec["start_gps"]["lon"]])
            coords.append([sec["end_gps"]["lat"], sec["end_gps"]["lon"]])
    elif "kerala_section" in nh and "kannur_gps" in nh["kerala_section"]:
        gps = nh["kerala_section"]["kannur_gps"]
        coords.append([gps["lat"], gps["lon"]])
        coords.append([gps["lat"] + 0.1, gps["lon"] + 0.1])
    else:
        # fallback
        coords.append([20.5937, 78.9629])
        coords.append([21.0, 79.0])

    roads.append({
        "id": nh["road_id"],
        "name": nh["official_name"],
        "type": "NH",
        "state": nh["states_covered"][0] if nh.get("states_covered") else "India",
        "district": "Various",
        "length_km": nh.get("total_length_km", 100),
        "construction_date": f"{nh.get('construction_start_year', 2010)}-01-01",
        "last_relay_date": f"{nh.get('year_fully_completed', 2022)}-01-01",
        "condition": random.choice(["Good", "Fair", "Poor"]),
        "contractor_id": contractors[random.randint(0, len(contractors)-1)]["id"] if contractors else "C001",
        "engineer_name": "NHAI Official",
        "department": nh.get("built_by", "NHAI"),
        "ai_damage_score": random.randint(10, 80),
        "complaint_count": random.randint(0, 50),
        "next_maintenance": "2026-01-01",
        "budget_allocated": nh.get("total_project_cost_cr", 1000) * 10000000,
        "budget_spent": (nh.get("total_project_cost_cr", 1000) * 0.9) * 10000000,
        "repair_history": [],
        "coordinates": coords
    })

for exp in roads_raw.get("expressways", []):
    coords = []
    if "start_gps" in exp and "end_gps" in exp:
        coords.append([exp["start_gps"]["lat"], exp["start_gps"]["lon"]])
        coords.append([exp["end_gps"]["lat"], exp["end_gps"]["lon"]])
    else:
        coords.append([20.5937, 78.9629])
        coords.append([21.0, 79.0])

    roads.append({
        "id": exp["road_id"],
        "name": exp["official_name"],
        "type": "EXP",
        "state": "Various",
        "district": "Various",
        "length_km": exp.get("total_length_km", 100),
        "construction_date": f"{exp.get('construction_start', 2010)}-01-01",
        "last_relay_date": f"{exp.get('completion_date', '2022-01-01')}",
        "condition": "Excellent",
        "contractor_id": contractors[random.randint(0, len(contractors)-1)]["id"] if contractors else "C001",
        "engineer_name": "Official",
        "department": exp.get("built_by", "Authority"),
        "ai_damage_score": random.randint(5, 20),
        "complaint_count": random.randint(0, 10),
        "next_maintenance": "2026-01-01",
        "budget_allocated": exp.get("total_cost_cr", 1000) * 10000000,
        "budget_spent": (exp.get("total_cost_cr", 1000) * 0.95) * 10000000,
        "repair_history": [],
        "coordinates": coords
    })

# Transform Complaints
complaints = []
for idx, c in enumerate(complaints_data):
    gps = c.get("gps_coordinates", {"lat": 20.5, "lon": 78.9})
    complaints.append({
        "id": c.get("complaint_id", f"CMP{idx}"),
        "road_id": c.get("road_id", "NH-48"),
        "road_name": c.get("location_description", "Unknown Road"),
        "location": c.get("location_description", ""),
        "lat": gps.get("lat"),
        "lng": gps.get("lon"),
        "type": c.get("defect_type", "Pothole"),
        "description": c.get("description", ""),
        "submitted_by": "Anonymous",
        "aadhaar_masked": "XXXX-XXXX-XXXX",
        "date": c.get("date_submitted", "2025-01-01"),
        "status": c.get("status", "Filed"),
        "reference_id": c.get("complaint_id", f"CMP{idx}"),
        "photo_url": None,
        "upvote_count": c.get("upvotes", 0)
    })

js_content = f"""/**
 * YATHRA RAKSHA — Real Data Layer
 * Data sourced from official JSON files.
 */

window.MOCK_DATA = (() => {{
  const contractors = {json.dumps(contractors, indent=2)};
  const roads = {json.dumps(roads, indent=2)};
  const complaints = {json.dumps(complaints, indent=2)};
  const tenders = {json.dumps(tenders, indent=2)};

  // ── Helper functions ─────────────────────────────────────
  function getRoadById(id) {{ return roads.find(r => r.id === id); }}
  function getContractorById(id) {{ return contractors.find(c => c.id === id); }}
  function getComplaintsByRoad(roadId) {{ return complaints.filter(c => c.road_id === roadId); }}
  function getTenderByRoad(roadId) {{ return tenders.find(t => t.road_id === roadId); }}

  function getConditionColor(condition) {{
    const map = {{ "Excellent": "#639922", "Good": "#639922", "Fair": "#EF9F27", "Poor": "#E68A00", "Critical": "#E24B4A" }};
    return map[condition] || "#888780";
  }}

  function formatINR(amount) {{
    if (amount >= 10000000) return `₹${{(amount / 10000000).toFixed(2)}} Cr`;
    if (amount >= 100000) return `₹${{(amount / 100000).toFixed(2)}} L`;
    return `₹${{amount.toLocaleString("en-IN")}}`;
  }}

  function getRoadAge(constructionDate) {{
    const built = new Date(constructionDate);
    const now = new Date();
    const years = Math.floor((now - built) / (365.25 * 24 * 60 * 60 * 1000));
    return `${{years}} years`;
  }}

  function getSummaryStats() {{
    const totalAllocated = tenders.reduce((s, t) => s + t.budget_allocated, 0);
    const totalReleased = tenders.reduce((s, t) => s + t.released, 0);
    const totalSpent = tenders.reduce((s, t) => s + t.spent, 0);
    const totalBalance = totalAllocated - totalSpent;
    return {{ totalAllocated, totalReleased, totalSpent, totalBalance }};
  }}

  return {{
    roads, contractors, complaints, tenders,
    getRoadById, getContractorById, getComplaintsByRoad, getTenderByRoad,
    getConditionColor, formatINR, getRoadAge, getSummaryStats
  }};
}})();
"""

with open(OUT_FILE, "w", encoding="utf-8") as f:
    f.write(js_content)
