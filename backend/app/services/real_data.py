"""Load government road datasets from repo-root /data."""

from __future__ import annotations

import csv
import json
from functools import lru_cache
from pathlib import Path
from typing import Any

# backend/app/services -> repo root
def _data_dir() -> Path:
    candidates = [
        Path(__file__).resolve().parents[3] / "data",
        Path(__file__).resolve().parents[2] / "data",
    ]
    for path in candidates:
        if (path / "02_contractors_data.json").is_file():
            return path
    return candidates[0]


DATA_DIR = _data_dir()


def _path(name: str) -> Path:
    return DATA_DIR / name


def data_available() -> bool:
    return (_path("02_contractors_data.json")).is_file()


@lru_cache(maxsize=32)
def _load_json(name: str) -> dict[str, Any]:
    with open(_path(name), encoding="utf-8") as f:
        return json.load(f)


def get_contractors() -> dict[str, Any]:
    d2 = _load_json("02_contractors_data.json")
    d1 = _load_json("india_contractors_cag.json")
    flagged_names = [
        c["name"]
        for c in d1.get("top_contractors_india", [])
        if c.get("cag_findings")
    ]
    return {
        "contractors": d2["contractors"],
        "industry_summary": d2.get("industry_summary", {}),
        "cag_flagged": d1.get("flagged_contractors_cag", {}),
        "cag_flagged_contractor_names": flagged_names,
    }


def get_roads() -> dict[str, Any]:
    d2 = _load_json("04_roads_map_data.json")
    d1 = _load_json("india_nh_data.json")
    return {
        **d2,
        "nh_extended": d1.get("national_highways", []),
        "nh_network_totals": d1.get("nh_network_totals", {}),
    }


def get_tenders() -> dict[str, Any]:
    return _load_json("03_tenders_data.json")


def get_budget() -> dict[str, Any]:
    d2 = _load_json("05_budget_audit_data.json")
    d1 = _load_json("india_road_budget.json")
    return {
        **d2,
        "nhai_capex": d1.get("nhai_capex_last_5_years", []),
        "morth_allocation": d1.get("morth_budget_allocation", []),
    }


def get_accidents() -> dict[str, Any]:
    stats = _load_json("india_accidents_2023.json")
    csv_path = _path("road_wise_accidents_2023.csv")
    with open(csv_path, encoding="utf-8", newline="") as f:
        road_wise = list(csv.DictReader(f))
    return {**stats, "road_wise_2023": road_wise}


def get_defect_classes() -> dict[str, Any]:
    return _load_json("01_ai_road_defect_data.json")


def get_seeded_complaints() -> dict[str, Any]:
    return _load_json("06_complaints_sample_data.json")
