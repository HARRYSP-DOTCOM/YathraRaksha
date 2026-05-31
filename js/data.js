/**
 * YatraRaksha — single source of truth for budget transparency & contractors
 */
(function () {
  const ROADS_BUDGET = {
    "IN-NH48": { releasedCr: 115, spentCr: 135, completionPct: 94, contractorRegNo: "CIN: U45200KA2001PLC028500", fundingSource: "Central (NHAI)", sourceUrl: "https://morth.nic.in/road-data/NH48", guaranteeUntil: "2027-03-31", lastAuditDate: "2025-11-01" },
    "IN-SH17": { releasedCr: 84, spentCr: 82.5, completionPct: 100, contractorRegNo: "CIN: L74210AP1995PLC018819", fundingSource: "State (Karnataka PWD)", sourceUrl: "https://pwd.karnataka.gov.in/tender/SH17", guaranteeUntil: "2028-06-30", lastAuditDate: "2026-01-15" },
    "IN-MDR12": { releasedCr: 40, spentCr: 45, completionPct: 78, contractorRegNo: "CIN: U45203TN2015PTC100812", fundingSource: "Municipal (CMDA)", sourceUrl: "https://chennaicorporation.gov.in/tenders/MDR12", guaranteeUntil: "2026-01-15", lastAuditDate: "2025-08-20" },
    "IN-NH44": { releasedCr: 290, spentCr: 287.5, completionPct: 88, contractorRegNo: "CIN: L45200RJ2006PLC022198", fundingSource: "Central (NHAI + PPP)", sourceUrl: "https://morth.nic.in/road-data/NH44", guaranteeUntil: "2028-04-01", lastAuditDate: "2026-02-01" },
    "IN-VR09": { releasedCr: 4.5, spentCr: 4.32, completionPct: 100, contractorRegNo: "GSTIN: 33AAAPR0000A1Z5", fundingSource: "Central (PMGSY)", sourceUrl: "https://pmgsy.nic.in/ommas/track", guaranteeUntil: "2024-12-12", lastAuditDate: "2024-06-01" },
    "US-I95": { releasedCr: 185, spentCr: 198, completionPct: 100, contractorRegNo: "DUNS: 00-697-6478", fundingSource: "Federal (FHWA)", sourceUrl: "https://www.fhwa.dot.gov/fastact/projects/I95", guaranteeUntil: "2026-10-15", lastAuditDate: "2025-12-01" },
    "US-CA101": { releasedCr: 90, spentCr: 91.2, completionPct: 100, contractorRegNo: "DUNS: 00-430-5067", fundingSource: "State (Caltrans)", sourceUrl: "https://dot.ca.gov/programs/construction/US101", guaranteeUntil: "2027-08-20", lastAuditDate: "2026-01-20" },
    "DE-A8": { releasedCr: 220, spentCr: 218.5, completionPct: 100, contractorRegNo: "HRB: 44762", fundingSource: "Federal (Autobahn GmbH)", sourceUrl: "https://www.autobahn.de/die-autobahn/projekte/A8", guaranteeUntil: "2028-12-31", lastAuditDate: "2026-03-01" },
    "DE-L190": { releasedCr: 55, spentCr: 62, completionPct: 97, contractorRegNo: "HRB: 22500", fundingSource: "State (Baden-Württemberg)", sourceUrl: "https://www.bmvi.de/projects/L190", guaranteeUntil: "2025-03-10", lastAuditDate: "2025-09-15" },
    "IN-SH21": { releasedCr: 38.5, spentCr: 37.8, completionPct: 92, contractorRegNo: "CIN: U74900KL1976SGC003148", fundingSource: "State (Kerala PWD)", sourceUrl: "https://pwd.kerala.gov.in/tenders/SH21", guaranteeUntil: "2027-09-01", lastAuditDate: "2026-02-28" },
  };

  window.CONTRACTORS = [
    { id: "C001", name: "Infratech Builders Group Ltd", regNo: "CIN: U45200KA2001PLC028500", roads: ["IN-NH48"], completed: 0, inProgress: 1, overdue: 0, healthScore: 3.4, complaints: 47, budgetUtil: 117.4, completionRate: 94, warrantyExpired: false, badge: "POOR" },
    { id: "C002", name: "KNR Constructions Ltd", regNo: "CIN: L74210AP1995PLC018819", roads: ["IN-SH17"], completed: 1, inProgress: 0, overdue: 0, healthScore: 8.7, complaints: 3, budgetUtil: 97.6, completionRate: 100, warrantyExpired: false, badge: "EXCELLENT" },
    { id: "C003", name: "Sri Balaji Roadworks Co.", regNo: "CIN: U45203TN2015PTC100812", roads: ["IN-MDR12"], completed: 0, inProgress: 1, overdue: 1, healthScore: 2.1, complaints: 128, budgetUtil: 140.6, completionRate: 78, warrantyExpired: true, badge: "POOR" },
    { id: "C004", name: "G.R. Infraprojects Ltd", regNo: "CIN: L45200RJ2006PLC022198", roads: ["IN-NH44"], completed: 0, inProgress: 1, overdue: 0, healthScore: 7.9, complaints: 12, budgetUtil: 84.6, completionRate: 88, warrantyExpired: false, badge: "GOOD" },
    { id: "C005", name: "Local Contractor (Ravi Shankar & Sons)", regNo: "GSTIN: 33AAAPR0000A1Z5", roads: ["IN-VR09"], completed: 1, inProgress: 0, overdue: 0, healthScore: 6.1, complaints: 2, budgetUtil: 96.0, completionRate: 100, warrantyExpired: true, badge: "GOOD" },
    { id: "C006", name: "Tully Construction Co.", regNo: "DUNS: 00-697-6478", roads: ["US-I95"], completed: 1, inProgress: 0, overdue: 0, healthScore: 5.3, complaints: 31, budgetUtil: 107.0, completionRate: 100, warrantyExpired: false, badge: "AVERAGE" },
    { id: "C007", name: "Granite Construction Co.", regNo: "DUNS: 00-430-5067", roads: ["US-CA101"], completed: 1, inProgress: 0, overdue: 0, healthScore: 8.4, complaints: 5, budgetUtil: 97.0, completionRate: 100, warrantyExpired: false, badge: "GOOD" },
    { id: "C008", name: "Hochtief AG", regNo: "HRB: 44762", roads: ["DE-A8"], completed: 1, inProgress: 0, overdue: 0, healthScore: 9.2, complaints: 1, budgetUtil: 99.3, completionRate: 100, warrantyExpired: false, badge: "EXCELLENT" },
    { id: "C009", name: "Strabag AG", regNo: "HRB: 22500", roads: ["DE-L190"], completed: 0, inProgress: 1, overdue: 0, healthScore: 5.1, complaints: 18, budgetUtil: 112.7, completionRate: 97, warrantyExpired: true, badge: "AVERAGE" },
    { id: "C010", name: "KITCO Ltd (Kerala)", regNo: "CIN: U74900KL1976SGC003148", roads: ["IN-SH21"], completed: 0, inProgress: 1, overdue: 0, healthScore: 7.4, complaints: 8, budgetUtil: 92.0, completionRate: 92, warrantyExpired: false, badge: "GOOD" },
  ];

  function computeAnomaly(sanctionedCr, releasedCr, spentCr) {
    const remaining = releasedCr - spentCr;
    if (spentCr > sanctionedCr) {
      return { anomaly: "BUDGET BREACH", anomalyIcon: "🚨", anomalyClass: "anomaly-breach", remainingCr: remaining };
    }
    if (spentCr > releasedCr) {
      return { anomaly: "OVERSPENT", anomalyIcon: "🔴", anomalyClass: "anomaly-overspent", remainingCr: remaining };
    }
    if (releasedCr > 0 && spentCr > 0.95 * releasedCr) {
      return { anomaly: "AT RISK", anomalyIcon: "⚠️", anomalyClass: "anomaly-at-risk", remainingCr: remaining };
    }
    return { anomaly: "ON TRACK", anomalyIcon: "🟢", anomalyClass: "anomaly-on-track", remainingCr: remaining };
  }

  function getRoadsData() {
    const roads = window.RoadDatabase?.roads || [];
    return roads
      .filter((r) => ROADS_BUDGET[r.id])
      .map((r) => {
        const b = ROADS_BUDGET[r.id];
        const sanctionedCr = r.sanctionedBudget / 1e7;
        const spentCr = b.spentCr ?? r.spentBudget / 1e7;
        const releasedCr = b.releasedCr;
        const flag = computeAnomaly(sanctionedCr, releasedCr, spentCr);
        return {
          id: r.id,
          name: r.name,
          contractor: r.contractorName,
          rating: r.contractorPerformance,
          sanctioned: `₹${sanctionedCr.toFixed(1)} Cr`,
          released: `₹${releasedCr.toFixed(1)} Cr`,
          spent: `₹${spentCr.toFixed(1)} Cr`,
          remaining: `₹${flag.remainingCr.toFixed(1)} Cr`,
          sanctionedCr,
          releasedCr,
          spentCr,
          remainingCr: flag.remainingCr,
          completion: b.completionPct,
          anomaly: `${flag.anomalyIcon} ${flag.anomaly}`,
          anomalyClass: flag.anomalyClass,
          sourceUrl: b.sourceUrl || r.budgetSourceUrl,
          engineer: `${r.executiveEngineer} | ${r.engineerPhone}`,
          fundingSource: b.fundingSource,
          contractorRegNo: b.contractorRegNo,
          guaranteeUntil: b.guaranteeUntil,
          lastAuditDate: b.lastAuditDate,
          classification: (r.type || "").split("(")[0].trim(),
        };
      });
  }

  function buildGroqContext() {
    const roads = getRoadsData();
    const roadLines = roads
      .map(
        (r) =>
          `${r.id}: ${r.name} | Contractor: ${r.contractor} (★${r.rating}) | ` +
          `Sanctioned: ${r.sanctioned} | Released: ${r.released} | Spent: ${r.spent} | ` +
          `Remaining: ${r.remaining} | ${r.anomaly} | Completion: ${r.completion}% | ` +
          `Engineer: ${r.engineer} | Source: ${r.sourceUrl}`
      )
      .join("\n");
    const contractorLines = window.CONTRACTORS.map(
      (c) =>
        `${c.name}: Health ${c.healthScore}/10, Complaints: ${c.complaints}, ` +
        `Budget Util: ${c.budgetUtil}%, Badge: ${c.badge}`
    ).join("\n");
    const complaints = (window.App?.getComplaintsForContext?.() || [])
      .slice(-5)
      .map((c) => `[${c.refId}] ${c.defectClass} at ${c.road}`)
      .join("\n");
    return `=ROADS DATA=\n${roadLines}\n\n=CONTRACTORS=\n${contractorLines}\n\n=RECENT COMPLAINTS=\n${complaints || "None"}`;
  }

  function mergeRoadEnrichment() {
    if (!window.RoadDatabase?.roads) return;
    window.RoadDatabase.roads.forEach((r) => {
      const b = ROADS_BUDGET[r.id];
      if (!b) return;
      r.releasedBudget = b.releasedCr * 1e7;
      r.completionPct = b.completionPct;
      r.contractorRegNo = b.contractorRegNo;
      r.guaranteeUntil = b.guaranteeUntil;
      const flag = computeAnomaly(r.sanctionedBudget / 1e7, b.releasedCr, b.spentCr);
      r.anomalyFlag = flag.anomaly;
      r.anomalyClass = flag.anomalyClass;
      r.anomalyIcon = flag.anomalyIcon;
    });
    const sh21 = {
      id: "IN-SH21",
      name: "SH-21 Kannur–Kozhikode (Kerala)",
      country: "India",
      type: "State Highway (SH)",
      authority: "Kerala PWD",
      executiveEngineer: "Er. Suresh Nair",
      engineerPhone: "+91-97448-12300",
      contractorName: "KITCO Ltd (Kerala)",
      contractorPerformance: 7.4,
      sanctionedBudget: 420000000,
      spentBudget: 378000000,
      releasedBudget: 385000000,
      fundingSource: "State (Kerala PWD)",
      budgetSourceUrl: "https://pwd.kerala.gov.in/tenders/SH21",
      statusColor: "#f59e0b",
      coordinates: [11.8745, 75.3704],
      path: [[11.8745, 75.3704], [11.2588, 75.7804]],
      completionPct: 92,
    };
    if (!window.RoadDatabase.getRoadById("IN-SH21")) {
      window.RoadDatabase.roads.push(sh21);
    }
    const vr09 = window.RoadDatabase.getRoadById("IN-VR09");
    if (!vr09) {
      window.RoadDatabase.roads.push({
        id: "IN-VR09",
        name: "Village Road (PMGSY)",
        country: "India",
        type: "Village Road",
        authority: "PMGSY",
        executiveEngineer: "Er. Venkatesh B",
        engineerPhone: "+91-80412-67890",
        contractorName: "Local Contractor (Ravi Shankar & Sons)",
        contractorPerformance: 6.1,
        sanctionedBudget: 45000000,
        spentBudget: 43200000,
        coordinates: [11.1271, 78.6569],
        path: [[11.1271, 78.6569], [11.2, 78.7]],
        statusColor: "#10b981",
      });
    }
  }

  window.ROADS_DATA = { getRoadsData, computeAnomaly, buildGroqContext, mergeRoadEnrichment };
  document.addEventListener("DOMContentLoaded", () => {
    if (window.RoadDatabase) mergeRoadEnrichment();
  });
})();
