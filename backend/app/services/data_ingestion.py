import hashlib
import json
from datetime import datetime
from typing import Any

import httpx
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Road
from app.seed_data import load_infrastructure

OPEN_DATA_TIMEOUT = 15.0


def _parse_int(value: Any) -> int | None:
    try:
        return int(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def _parse_float(value: Any) -> float | None:
    try:
        return float(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def _fetch_json(url: str) -> Any:
    if not url:
        return None
    try:
        with httpx.Client(timeout=OPEN_DATA_TIMEOUT) as client:
            response = client.get(url)
            response.raise_for_status()
            return response.json()
    except Exception:
        return None


def _extract_source_name(url: str) -> str:
    if not url:
        return "local fallback"
    return url.split("//")[-1].split("/")[0]


def _normalize_road(raw: dict[str, Any], source_name: str, source_url: str) -> dict[str, Any]:
    name = (
        raw.get("name")
        or raw.get("roadName")
        or raw.get("road_name")
        or raw.get("route")
        or raw.get("displayName")
        or raw.get("id")
    )
    latitude = _parse_float(raw.get("latitude") or raw.get("lat") or raw.get("y"))
    longitude = _parse_float(raw.get("longitude") or raw.get("lng") or raw.get("lon") or raw.get("x"))
    contractor_name = raw.get("contractorName") or raw.get("contractor") or raw.get("contractor_name")
    return {
        "id": raw.get("id") or hashlib.sha256(f"{name}|{latitude}|{longitude}".encode("utf-8")).hexdigest()[:32],
        "name": name or "Unknown Road",
        "country": raw.get("country") or raw.get("nation") or raw.get("location") or "Unknown",
        "authority": raw.get("authority") or raw.get("responsibleAuthority") or raw.get("agency") or "",
        "contractor_name": contractor_name,
        "contractor_performance": _parse_int(raw.get("contractorPerformance") or raw.get("rating") or raw.get("performance")),
        "sanctioned_budget": _parse_int(raw.get("sanctionedBudget") or raw.get("budgetSanctioned") or raw.get("allocatedBudget")),
        "spent_budget": _parse_int(raw.get("spentBudget") or raw.get("budgetSpent") or raw.get("actualSpend")),
        "funding_source": raw.get("fundingSource") or raw.get("fundSource") or raw.get("funding") or "",
        "latitude": latitude,
        "longitude": longitude,
        "source_name": source_name,
        "source_url": source_url,
        "source_verified_at": datetime.utcnow(),
        "data_json": json.dumps(raw, ensure_ascii=False),
    }


def load_open_roads_data() -> list[dict[str, Any]]:
    remote_data = _fetch_json(settings.open_roads_data_url)
    source_url = settings.open_roads_data_url
    if isinstance(remote_data, dict) and remote_data.get("roads"):
        raw_roads = remote_data["roads"]
    elif isinstance(remote_data, list):
        raw_roads = remote_data
    else:
        raw_roads = load_infrastructure().get("roads", [])
        source_url = "local://infrastructure.json"

    source_name = _extract_source_name(source_url)
    return [_normalize_road(raw, source_name, source_url) for raw in raw_roads]


def get_open_data_sources() -> dict[str, str]:
    return {
        "openRoadsDataUrl": settings.open_roads_data_url,
        "refreshOnStartup": str(settings.open_data_refresh_on_startup),
    }


def refresh_road_data(db: Session) -> int:
    rows = load_open_roads_data()
    if not rows:
        return 0

    updated = 0
    for row in rows:
        road_id = row["id"]
        existing = db.get(Road, road_id)
        if existing:
            existing.name = row["name"]
            existing.country = row["country"]
            existing.authority = row["authority"]
            existing.contractor_name = row["contractor_name"]
            existing.contractor_performance = row["contractor_performance"]
            existing.sanctioned_budget = row["sanctioned_budget"]
            existing.spent_budget = row["spent_budget"]
            existing.funding_source = row["funding_source"]
            existing.latitude = row["latitude"]
            existing.longitude = row["longitude"]
            existing.source_name = row["source_name"]
            existing.source_url = row["source_url"]
            existing.source_verified_at = row["source_verified_at"]
            existing.data_json = row["data_json"]
        else:
            db.add(Road(**row))
        updated += 1

    db.commit()
    return updated
