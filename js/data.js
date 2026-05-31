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
  return [
    `Road network markers loaded: ${nh} corridors (NH/SH/Kerala GPS).`,
    `Registered contractors: ${contractors}.`,
    `Active tenders in registry: ${tenders}.`,
    `MoRTH budget fiscal years: ${budgetYears}.`,
    "Data: NHAI Annual Report 2023-24, MoRTH Road Accidents in India 2023, CAG Report 14/2023.",
  ].join(" ");
};
