/**
 * Placeholder store — hydrated at runtime by js/real-data.js from /v1/* (MoRTH/NHAI/CAG data).
 */
window.CONTRACTORS = window.CONTRACTORS || [];
window.ROADS_DATA = window.ROADS_DATA || [];
window.ROADS_DATA.getRoadsData = function getRoadsData() {
  return window.ROADS_DATA;
};

window.ROADS_DATA.buildGroqContext = function buildGroqContext() {
  const tenders = window._TENDERS_LIST?.length || 0;
  const contractors = window.CONTRACTORS?.length || 0;
  const budgetYears = window._BUDGET_YEARS?.length || 0;
  const nh = window.RoadDatabase?.roads?.length || 0;
  const pmgsyStates = window._PMGSY_STATES?.length || 0;
  const hwySeries = window._HIGHWAY_CONSTRUCTION?.length || 0;
  const inspections = window._AI_INSPECTION_RECORDS?.length || 0;
  const complaints = window._SEEDED_COMPLAINTS?.length || 0;
  const complaintStats = window._COMPLAINT_STATISTICS || {};
  const bharatmala = window._BHARATMALA || {};
  const cagFindings = window._CAG_FINDINGS?.key_findings?.length || 0;

  const parts = [
    `Road network markers loaded: ${nh} corridors (NH/SH/Kerala GPS).`,
    `Registered contractors: ${contractors}.`,
    `Active tenders in registry: ${tenders}.`,
    `MoRTH budget fiscal years: ${budgetYears}.`,
  ];

  if (pmgsyStates) parts.push(`PMGSY state-wise progress: ${pmgsyStates} states.`);
  if (hwySeries) parts.push(`Highway construction time-series: ${hwySeries} monthly data points.`);
  if (inspections) parts.push(`AI inspection records: ${inspections} road segments.`);
  if (complaints) parts.push(`Seeded complaints: ${complaints}. Total FY24: ${complaintStats.total_complaints_india_fy24?.toLocaleString("en-IN") || "N/A"}.`);
  if (bharatmala.total_projects_awarded_km) parts.push(`Bharatmala Phase 1: ${bharatmala.total_projects_awarded_km} km awarded, ${bharatmala.cost_overrun_pct || 0}% cost overrun.`);
  if (cagFindings) parts.push(`CAG audit findings: ${cagFindings} key issues flagged.`);

  parts.push("Data: NHAI Annual Report 2023-24, MoRTH Road Accidents in India 2023, CAG Report 14/2023, Union Budget 2025-26, PMGSY OMMS.");

  return parts.join(" ");
};
