/**
 * YatraRaksha Real Data Loader
 * ============================
 * Drop this file into your project. Call loadRealData() to get all verified
 * government data into your app instead of the hardcoded dummy values.
 *
 * All data sourced from:
 *  - MoRTH Road Accidents in India 2023
 *  - NHAI Annual Report 2022-23 & 2023-24
 *  - CAG Report No.13 of 2023 (Bharatmala Audit)
 *  - Union Budget 2025-26
 *  - PMGSY OMMS / PIB Press Releases
 */

const DATA_BASE_URL = "./data"; // Adjust to wherever you host the JSON files

// ─── Main loader ─────────────────────────────────────────────────────────────

export async function loadRealData() {
  const [accidents, budget, roads, contractors] = await Promise.all([
    fetchJSON(`${DATA_BASE_URL}/accidents/india_accidents_2023.json`),
    fetchJSON(`${DATA_BASE_URL}/budget/india_road_budget.json`),
    fetchJSON(`${DATA_BASE_URL}/roads/india_nh_data.json`),
    fetchJSON(`${DATA_BASE_URL}/contractors/india_contractors.json`),
  ]);
  return { accidents, budget, roads, contractors };
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return res.json();
}

// ─── Tender Registry rows (replaces your hardcoded table) ────────────────────

export function buildTenderRows(roadsData) {
  const nhRows = roadsData.national_highways.map((r) => ({
    assetCode: r.road_code,
    assetName: r.road_name,
    classification: r.classification,
    contractor: "NHAI (Government executed / EPC tender)",
    sanctionedBudget: `₹${r.budget_sanctioned_crore} Cr`,
    spentBudget: `₹${r.budget_spent_crore} Cr`,
    overrunPct: r.overrun_pct,
    lastRelaid: r.last_major_relaying_year,
    executiveEngineer: r.executive_engineer,
    phone: r.contact_phone,
    email: r.contact_email,
    accidents2023: r.accidents_2023,
    fatalities2023: r.fatalities_2023,
    sourceLabel: r.source_budget,
    sourceUrl: "https://morth.nic.in/annual-report",
  }));

  const shRows = roadsData.state_highways_sample.map((r) => ({
    assetCode: r.road_code,
    assetName: r.road_name,
    classification: r.classification,
    contractor: "State PWD (tendered)",
    sanctionedBudget: `₹${r.budget_sanctioned_crore} Cr`,
    spentBudget: `₹${r.budget_spent_crore} Cr`,
    overrunPct: r.overrun_pct,
    lastRelaid: r.last_relaying_year,
    executiveEngineer: r.executive_engineer,
    phone: r.contact_phone,
    email: "—",
    sourceLabel: r.source,
    sourceUrl: "https://morth.nic.in/annual-report",
  }));

  return [...nhRows, ...shRows];
}

// ─── Dashboard KPI cards ─────────────────────────────────────────────────────

export function getDashboardKPIs(accidentsData, budgetData) {
  const nat = accidentsData.national_summary;
  const pmgsy = budgetData.pmgsy_national_summary;
  const capex = budgetData.nhai_capex_last_5_years;
  const latestCapex = capex[capex.length - 1];

  return {
    totalAccidents2023: nat.total_accidents.toLocaleString("en-IN"),
    totalFatalities2023: nat.total_killed.toLocaleString("en-IN"),
    nhShareOfFatalities: `${accidentsData.accidents_by_road_category_2023.national_highways.share_of_total_killed_pct}%`,
    pmgsyRoadsBuiltKm: pmgsy.total_road_length_constructed_km.toLocaleString("en-IN"),
    pmgsyExpenditure: `₹${(pmgsy.total_expenditure_crore / 100000).toFixed(2)} lakh Cr`,
    nhaiCapexFY24: `₹${(latestCapex.capex_crore / 100000).toFixed(2)} lakh Cr`,
    topAccidentState: accidentsData.top_10_states_accidents_2023.data[0].state,
    topFatalityState: accidentsData.top_10_states_nh_fatalities_2023.data[0].state,
  };
}

// ─── Accident chart data ──────────────────────────────────────────────────────

export function getAccidentTrendChart(accidentsData) {
  return accidentsData.year_on_year_trend.map((d) => ({
    year: d.year,
    accidents: d.accidents,
    killed: d.killed,
    injured: d.injured,
  }));
}

export function getStateAccidentChart(accidentsData) {
  return accidentsData.top_10_states_accidents_2023.data.map((d) => ({
    state: d.state,
    accidents: d.accidents,
    killed: d.killed,
  }));
}

// ─── Budget audit chart data ──────────────────────────────────────────────────

export function getBudgetAuditChart(budgetData) {
  return budgetData.morth_budget_allocation.map((d) => ({
    year: d.financial_year,
    sanctioned: d.allocation_crore,
    spent: d.actual_spent_crore,
    overrun: d.actual_spent_crore
      ? d.actual_spent_crore - d.allocation_crore
      : null,
  }));
}

// ─── Contractor performance chart ────────────────────────────────────────────

export function getContractorChart(contractorsData) {
  return contractorsData.top_contractors_india.map((c) => ({
    name: c.name.split(" ").slice(0, 2).join(" "), // short name
    rating: c.quality_rating,
    costOverrun: c.avg_cost_overrun_pct,
    timeOverrun: c.avg_time_overrun_months,
    activeProjects: c.active_nh_projects,
  }));
}

// ─── Source badge helper ──────────────────────────────────────────────────────

export function sourceBadge(label, url) {
  return `<a href="${url}" target="_blank" rel="noopener" 
    class="source-badge" title="Verify this data">
    📄 ${label}
  </a>`;
}

// ─── Road type from Overpass API (live GPS lookup) ───────────────────────────

export async function getRoadTypeFromGPS(lat, lon) {
  const query = `[out:json];way["highway"](around:300,${lat},${lon});out tags;`;
  try {
    const res = await fetch(
      `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`
    );
    const data = await res.json();
    if (!data.elements.length) return null;

    const el = data.elements[0].tags;
    const typeMap = {
      motorway: "NH (Expressway)",
      trunk: "NH",
      primary: "SH",
      secondary: "MDR",
      tertiary: "ODR",
      residential: "VR",
      unclassified: "Other",
    };
    return {
      roadType: typeMap[el.highway] || el.highway,
      roadName: el.name || el.ref || "Unnamed Road",
      ref: el.ref || null,
      surface: el.surface || "Unknown",
      lanes: el.lanes || "Unknown",
      source: "OpenStreetMap via Overpass API",
    };
  } catch (e) {
    console.error("Overpass API error:", e);
    return null;
  }
}
