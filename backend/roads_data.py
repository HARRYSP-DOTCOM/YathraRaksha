"""Road & contractor budget data with computed anomaly flags."""

from __future__ import annotations

from datetime import date
from typing import Any


def compute_anomaly(
    sanctioned_cr: float, released_cr: float, spent_cr: float
) -> dict[str, str]:
    remaining = released_cr - spent_cr
    if spent_cr > sanctioned_cr:
        return {
            "anomaly": "BUDGET BREACH",
            "anomalyIcon": "🚨",
            "anomalyClass": "anomaly-breach",
        }
    if spent_cr > released_cr:
        return {
            "anomaly": "OVERSPENT",
            "anomalyIcon": "🔴",
            "anomalyClass": "anomaly-overspent",
        }
    if released_cr > 0 and spent_cr > 0.95 * released_cr:
        return {
            "anomaly": "AT RISK",
            "anomalyIcon": "⚠️",
            "anomalyClass": "anomaly-at-risk",
        }
    return {
        "anomaly": "ON TRACK",
        "anomalyIcon": "🟢",
        "anomalyClass": "anomaly-on-track",
    }


def _road(
    rid: str,
    name: str,
    classification: str,
    contractor: str,
    reg_no: str,
    funding: str,
    sanctioned: float,
    released: float,
    spent: float,
    completion: int,
    source_url: str,
    engineer: str,
    phone: str,
    guarantee_until: str,
    country: str = "India",
) -> dict[str, Any]:
    flag = compute_anomaly(sanctioned, released, spent)
    return {
        "id": rid,
        "name": name,
        "classification": classification,
        "contractor": contractor,
        "contractorRegNo": reg_no,
        "fundingSource": funding,
        "sanctionedCr": sanctioned,
        "releasedCr": released,
        "spentCr": spent,
        "remainingCr": round(released - spent, 2),
        "completionPct": completion,
        "sourceUrl": source_url,
        "engineer": engineer,
        "engineerPhone": phone,
        "guaranteeUntil": guarantee_until,
        "country": country,
        **flag,
    }


ROADS_DATA: list[dict[str, Any]] = [
    _road(
        "IN-NH48",
        "NH-48 Golden Quadrilateral (Chennai–Bengaluru)",
        "NH",
        "Infratech Builders Group Ltd",
        "CIN: U45200KA2001PLC028500",
        "Central (NHAI)",
        120.0,
        115.0,
        135.0,
        94,
        "https://morth.nic.in/road-data/NH48",
        "Er. Rajesh K. Vardhan",
        "+91-98402-12345",
        "2027-03-31",
    ),
    _road(
        "IN-SH17",
        "SH-17 Bengaluru–Mysuru Link",
        "SH",
        "KNR Constructions Ltd",
        "CIN: L74210AP1995PLC018819",
        "State (Karnataka PWD)",
        85.0,
        84.0,
        82.5,
        100,
        "https://pwd.karnataka.gov.in/tender/SH17",
        "Er. Manjunath Swamy",
        "+91-94480-56789",
        "2028-06-30",
    ),
    _road(
        "IN-MDR12",
        "MDR-12 Tambaram–Velachery",
        "MDR",
        "Sri Balaji Roadworks Co.",
        "CIN: U45203TN2015PTC100812",
        "Municipal (CMDA)",
        32.0,
        40.0,
        45.0,
        78,
        "https://chennaicorporation.gov.in/tenders/MDR12",
        "Er. Selvakumar Arumugam",
        "+91-94440-98765",
        "2026-01-15",
    ),
    _road(
        "IN-NH44",
        "NH-44 Salem–Madurai Corridor",
        "NH",
        "G.R. Infraprojects Ltd",
        "CIN: L45200RJ2006PLC022198",
        "Central (NHAI + PPP)",
        340.0,
        290.0,
        287.5,
        88,
        "https://morth.nic.in/road-data/NH44",
        "Er. Prakash Mehta",
        "+91-97140-33210",
        "2028-04-01",
    ),
    _road(
        "IN-VR09",
        "Village Road (PMGSY)",
        "Village",
        "Local Contractor (Ravi Shankar & Sons)",
        "GSTIN: 33AAAPR0000A1Z5",
        "Central (PMGSY)",
        4.5,
        4.5,
        4.32,
        100,
        "https://pmgsy.nic.in/ommas/track",
        "Er. Venkatesh B",
        "+91-80412-67890",
        "2024-12-12",
    ),
    _road(
        "US-I95",
        "Interstate 95 New York Bronx Corridor",
        "Interstate",
        "Tully Construction Co.",
        "DUNS: 00-697-6478",
        "Federal (FHWA)",
        185.0,
        185.0,
        198.0,
        100,
        "https://www.fhwa.dot.gov/fastact/projects/I95",
        "Eng. Sarah Jenkins",
        "+1-518-555-0195",
        "2026-10-15",
        country="USA",
    ),
    _road(
        "US-CA101",
        "US Route 101 Silicon Valley Expressway",
        "US Route",
        "Granite Construction Co.",
        "DUNS: 00-430-5067",
        "State (Caltrans)",
        94.0,
        90.0,
        91.2,
        100,
        "https://dot.ca.gov/programs/construction/US101",
        "Eng. David Vance",
        "+1-510-555-2345",
        "2027-08-20",
        country="USA",
    ),
    _road(
        "DE-A8",
        "A8 Autobahn München–Salzburg",
        "Autobahn",
        "Hochtief AG",
        "HRB: 44762",
        "Federal (Autobahn GmbH)",
        220.0,
        220.0,
        218.5,
        100,
        "https://www.autobahn.de/die-autobahn/projekte/A8",
        "Dipl.-Ing. Hans-D. Weber",
        "+49-89-5456-7890",
        "2028-12-31",
        country="Germany",
    ),
    _road(
        "DE-L190",
        "L190 Landesstraße Schwarzwald Link",
        "Landesstraße",
        "Strabag AG",
        "HRB: 22500",
        "State (Baden-Württemberg)",
        55.0,
        55.0,
        62.0,
        97,
        "https://www.bmvi.de/projects/L190",
        "Dipl.-Ing. Brigitte Müller",
        "+49-721-926-0",
        "2025-03-10",
        country="Germany",
    ),
    _road(
        "IN-SH21",
        "SH-21 Kannur–Kozhikode (Kerala)",
        "SH",
        "KITCO Ltd (Kerala)",
        "CIN: U74900KL1976SGC003148",
        "State (Kerala PWD)",
        42.0,
        38.5,
        37.8,
        92,
        "https://pwd.kerala.gov.in/tenders/SH21",
        "Er. Suresh Nair",
        "+91-97448-12300",
        "2027-09-01",
    ),
]

CONTRACTORS: list[dict[str, Any]] = [
    {"id": "C001", "name": "Infratech Builders Group Ltd", "regNo": "CIN: U45200KA2001PLC028500", "roads": ["IN-NH48"], "completed": 0, "inProgress": 1, "overdue": 0, "healthScore": 3.4, "complaints": 47, "budgetUtil": 117.4, "completionRate": 94, "warrantyExpired": False, "badge": "POOR"},
    {"id": "C002", "name": "KNR Constructions Ltd", "regNo": "CIN: L74210AP1995PLC018819", "roads": ["IN-SH17"], "completed": 1, "inProgress": 0, "overdue": 0, "healthScore": 8.7, "complaints": 3, "budgetUtil": 97.6, "completionRate": 100, "warrantyExpired": False, "badge": "EXCELLENT"},
    {"id": "C003", "name": "Sri Balaji Roadworks Co.", "regNo": "CIN: U45203TN2015PTC100812", "roads": ["IN-MDR12"], "completed": 0, "inProgress": 1, "overdue": 1, "healthScore": 2.1, "complaints": 128, "budgetUtil": 140.6, "completionRate": 78, "warrantyExpired": True, "badge": "POOR"},
    {"id": "C004", "name": "G.R. Infraprojects Ltd", "regNo": "CIN: L45200RJ2006PLC022198", "roads": ["IN-NH44"], "completed": 0, "inProgress": 1, "overdue": 0, "healthScore": 7.9, "complaints": 12, "budgetUtil": 84.6, "completionRate": 88, "warrantyExpired": False, "badge": "GOOD"},
    {"id": "C005", "name": "Local Contractor (Ravi Shankar & Sons)", "regNo": "GSTIN: 33AAAPR0000A1Z5", "roads": ["IN-VR09"], "completed": 1, "inProgress": 0, "overdue": 0, "healthScore": 6.1, "complaints": 2, "budgetUtil": 96.0, "completionRate": 100, "warrantyExpired": True, "badge": "GOOD"},
    {"id": "C006", "name": "Tully Construction Co.", "regNo": "DUNS: 00-697-6478", "roads": ["US-I95"], "completed": 1, "inProgress": 0, "overdue": 0, "healthScore": 5.3, "complaints": 31, "budgetUtil": 107.0, "completionRate": 100, "warrantyExpired": False, "badge": "AVERAGE"},
    {"id": "C007", "name": "Granite Construction Co.", "regNo": "DUNS: 00-430-5067", "roads": ["US-CA101"], "completed": 1, "inProgress": 0, "overdue": 0, "healthScore": 8.4, "complaints": 5, "budgetUtil": 97.0, "completionRate": 100, "warrantyExpired": False, "badge": "GOOD"},
    {"id": "C008", "name": "Hochtief AG", "regNo": "HRB: 44762", "roads": ["DE-A8"], "completed": 1, "inProgress": 0, "overdue": 0, "healthScore": 9.2, "complaints": 1, "budgetUtil": 99.3, "completionRate": 100, "warrantyExpired": False, "badge": "EXCELLENT"},
    {"id": "C009", "name": "Strabag AG", "regNo": "HRB: 22500", "roads": ["DE-L190"], "completed": 0, "inProgress": 1, "overdue": 0, "healthScore": 5.1, "complaints": 18, "budgetUtil": 112.7, "completionRate": 97, "warrantyExpired": True, "badge": "AVERAGE"},
    {"id": "C010", "name": "KITCO Ltd (Kerala)", "regNo": "CIN: U74900KL1976SGC003148", "roads": ["IN-SH21"], "completed": 0, "inProgress": 1, "overdue": 0, "healthScore": 7.4, "complaints": 8, "budgetUtil": 92.0, "completionRate": 92, "warrantyExpired": False, "badge": "GOOD"},
]


def get_roads() -> list[dict[str, Any]]:
    return ROADS_DATA


def get_contractors() -> list[dict[str, Any]]:
    return CONTRACTORS


def get_road_by_id(road_id: str) -> dict[str, Any] | None:
    return next((r for r in ROADS_DATA if r["id"] == road_id), None)
