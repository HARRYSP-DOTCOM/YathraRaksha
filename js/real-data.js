/**
 * Loads MoRTH / NHAI / CAG government datasets from /v1/* and hydrates the UI.
 */
window.RealDataLoader = {
  _cache: {},
  _cagNames: [],

  async init() {
    const base = (window.AppConfig && window.AppConfig.API_BASE_URL) || "/v1";
    const fetchJson = async (path) => {
      const res = await fetch(`${base}${path}`);
      if (!res.ok) throw new Error(`${path} → ${res.status}`);
      return res.json();
    };

    try {
      const [contractors, roads, tenders, budget, accidents, defects, complaints] =
        await Promise.all([
          fetchJson("/contractors"),
          fetchJson("/roads"),
          fetchJson("/tenders"),
          fetchJson("/audit/budget"),
          fetchJson("/accidents"),
          fetchJson("/ai/defect-classes"),
          fetchJson("/complaints/seed"),
        ]);

      this._cache = { contractors, roads, tenders, budget, accidents, defects, complaints };
      this._cagNames = contractors.cag_flagged_contractor_names || [];
      this._hydrateContractors(contractors);
      this._hydrateTenders(tenders);
      this._hydrateRoads(roads, accidents);
      this._hydrateBudget(budget);
      this._hydrateDefects(defects);
      this._hydrateComplaints(complaints);
      window._realDataReady = true;
      return true;
    } catch (err) {
      console.warn("[RealData] API load failed, trying /data/*.json", err);
      return this._initFromStatic();
    }
  },

  async _initFromStatic() {
    const load = (p) => fetch(p).then((r) => (r.ok ? r.json() : null));
    try {
      const contractors = await load("/data/02_contractors_data.json");
      const cag = await load("/data/india_contractors_cag.json");
      if (!contractors) return false;
      const merged = {
        contractors: contractors.contractors,
        industry_summary: contractors.industry_summary,
        cag_flagged: cag?.flagged_contractors_cag || {},
        cag_flagged_contractor_names: (cag?.top_contractors_india || [])
          .filter((c) => c.cag_findings)
          .map((c) => c.name),
      };
      this._cache.contractors = merged;
      this._cagNames = merged.cag_flagged_contractor_names;
      this._hydrateContractors(merged);
      const tenders = await load("/data/03_tenders_data.json");
      if (tenders) this._hydrateTenders(tenders);
      const roads = await load("/data/04_roads_map_data.json");
      const nh = await load("/data/india_nh_data.json");
      if (roads) {
        this._hydrateRoads(
          { ...roads, nh_extended: nh?.national_highways || [], nh_network_totals: nh?.nh_network_totals || {} },
          await load("/data/india_accidents_2023.json")
        );
      }
      const budget = await load("/data/05_budget_audit_data.json");
      if (budget) this._hydrateBudget(budget);
      const defects = await load("/data/01_ai_road_defect_data.json");
      if (defects) this._hydrateDefects(defects);
      const complaints = await load("/data/06_complaints_sample_data.json");
      if (complaints) this._hydrateComplaints(complaints);
      window._realDataReady = true;
      return true;
    } catch (e) {
      console.warn("[RealData] static fallback failed", e);
      return false;
    }
  },

  isCagFlagged(name) {
    if (!name) return false;
    const n = name.toLowerCase();
    return this._cagNames.some(
      (flag) => n.includes(flag.split("(")[0].trim().toLowerCase().slice(0, 12)) || flag.toLowerCase().includes(n.slice(0, 12))
    );
  },

  qualityStars(score) {
    const s = Math.max(0, Math.min(5, Math.round((score || 0) / 20)));
    return "★".repeat(s) + "☆".repeat(5 - s);
  },

  _hydrateContractors(payload) {
    window.CONTRACTORS = (payload.contractors || []).map((c) => {
      const score = c.overall_rating?.quality_score ?? 70;
      const active = c.active_projects?.length || 0;
      const completed = c.completed_projects_sample?.length || c.total_road_projects_completed || 0;
      return {
        id: c.contractor_id,
        name: c.name,
        regNo: c.bse_code ? `BSE: ${c.bse_code}` : c.nhai_empanelment_class || "",
        roads: (c.active_projects || []).map((p) => p.road).filter(Boolean),
        completed,
        inProgress: active,
        overdue: 0,
        healthScore: (score / 10).toFixed(1),
        qualityScore: score,
        stars: this.qualityStars(score),
        complaints: Math.round((c.overall_rating?.complaints_per_100km || 2) * 10),
        budgetUtil: c.overall_rating?.timely_completion_rate_percent || 80,
        completionRate: c.overall_rating?.timely_completion_rate_percent || 75,
        warrantyExpired: false,
        badge: score >= 85 ? "EXCELLENT" : score >= 75 ? "GOOD" : score >= 65 ? "AVERAGE" : "POOR",
        cagFlagged: this.isCagFlagged(c.name),
        source: c.overall_rating?.source || "NHAI Annual Report 2023-24",
      };
    });
    window._cagFlaggedMeta = payload.cag_flagged;
  },

  _flattenTenders(tendersPayload) {
    const keys = ["national_highway_tenders", "pmgsy_tenders", "state_pwd_tenders"];
    const rows = [];
    keys.forEach((k) => {
      (tendersPayload[k] || []).forEach((t) => rows.push({ ...t, _registry: k }));
    });
    return rows;
  },

  _hydrateTenders(tendersPayload) {
    const rows = this._flattenTenders(tendersPayload);
    window._TENDERS_RAW = tendersPayload;
    window._TENDERS_LIST = rows;
    if (!Array.isArray(window.ROADS_DATA)) window.ROADS_DATA = [];
    window.ROADS_DATA.length = 0;
    rows.forEach((t) => {
      const allocated = t.budget_allocated_cr ?? t.contract_value_cr ?? 0;
      const spent = t.amount_spent_cr ?? 0;
      const overrun = t.cost_overrun_cr ?? Math.max(0, spent - allocated);
      let anomaly = "ON TRACK";
      let anomalyClass = "anomaly-on-track";
      if (spent > allocated) {
        anomaly = "BUDGET BREACH";
        anomalyClass = "anomaly-breach";
      } else if (t.status === "Delayed" || (t.time_overrun_days && t.time_overrun_days > 90)) {
        anomaly = "AT RISK";
        anomalyClass = "anomaly-at-risk";
      }
      window.ROADS_DATA.push({
        id: t.tender_id,
        tenderId: t.tender_id,
        name: t.tender_name || t.road,
        road: t.road,
        class: "Tender",
        contractor: t.awarded_to,
        contractorReg: "",
        fundingSource: t.tender_type || "NHAI",
        sanctioned: allocated,
        released: allocated,
        spent,
        sanctionedCr: allocated,
        releasedCr: allocated,
        spentCr: spent,
        remainingCr: allocated - spent,
        completion: t.progress_percent ?? (t.status === "Completed" ? 100 : 50),
        sourceUrl: t.tender_document_url || "https://tender.nhai.gov.in",
        source: t.source || "NHAI Tender Portal",
        costOverrunCr: overrun,
        status: t.status,
        engineer: t.section || "",
        guaranteeUntil: t.expected_completion || t.completion_date || "—",
        lastAuditDate: t.contract_award_date || "—",
        anomaly,
        anomalyClass,
        remaining: (allocated - spent).toFixed(1),
        sanctionedLabel: `₹${allocated} Cr`,
        releasedLabel: `₹${allocated} Cr`,
        spentLabel: `₹${spent} Cr`,
        remainingLabel: `₹${(allocated - spent).toFixed(1)} Cr`,
      });
    });
    window.ROADS_DATA.getRoadsData = function getRoadsData() {
      return window.ROADS_DATA;
    };
    window.ROADS_DATA.forEach((r) => {
      r.remaining = parseFloat((r.released - r.spent).toFixed(2));
    });
  },

  _accidentCountForRoad(roadId, accidents) {
    const wise = accidents?.road_wise_2023 || [];
    const code = (roadId || "").replace(/\s/g, "").toUpperCase();
    const row = wise.find((w) => (w.road_code || "").toUpperCase() === code);
    return row ? parseInt(row.accidents_2023, 10) : null;
  },

  _hydrateRoads(mapPayload, accidents) {
    const roads = [];
    const accidentLookup = accidents || this._cache.accidents || {};

    const addRoad = (nh, coords, extra = {}) => {
      const id = nh.road_id || nh.id;
      const accidentsCount = this._accidentCountForRoad(id, accidentLookup);
      const path = [];
      if (nh.key_sections) {
        nh.key_sections.forEach((s) => {
          if (s.start_gps && s.end_gps) path.push([s.start_gps.lat, s.start_gps.lon], [s.end_gps.lat, s.end_gps.lon]);
        });
      } else if (nh.start_gps && nh.end_gps) {
        path.push([nh.start_gps.lat, nh.start_gps.lon], [nh.end_gps.lat, nh.end_gps.lon]);
      }
      const lat = coords?.lat ?? (path[0] && path[0][0]) ?? 20.5937;
      const lng = coords?.lon ?? (path[0] && path[0][1]) ?? 78.9629;
      const statusColor = accidentsCount > 2000 ? "#ff3b30" : accidentsCount > 800 ? "#ff9f1c" : "#0d9488";
      roads.push({
        id,
        name: nh.official_name || id,
        route: nh.route,
        country: "India",
        type: "NH",
        authority: "NHAI",
        contractorName: (nh.primary_contractors || nh.built_by || []).join?.(", ") || nh.built_by || "NHAI",
        contractorPerformance: 4,
        sanctionedBudget: (nh.total_project_cost_cr || 0) * 1e7,
        spentBudget: (nh.total_project_cost_cr || 0) * 0.85 * 1e7,
        fundingSource: "MoRTH / NHAI",
        coordinates: [lat, lng],
        path: path.length ? path : [[lat, lng]],
        statusColor,
        lengthKm: nh.total_length_km,
        builtBy: nh.built_by,
        accidents2023: accidentsCount,
        source: nh.source || "MoRTH Road Transport Yearbook 2022-23",
        ...extra,
      });
    };

    (mapPayload.national_highways || []).forEach((nh) => {
      const start = nh.key_sections?.[0]?.start_gps;
      addRoad(nh, start);
    });

    (mapPayload.expressways || []).forEach((ex) => {
      addRoad(
        { ...ex, road_id: ex.road_id, official_name: ex.official_name, route: ex.route, built_by: ex.built_by },
        ex.start_gps
      );
    });

    const kl = mapPayload.kerala_roads_detail;
    if (kl?.state_highways) {
      kl.state_highways.forEach((sh) => {
        const g = sh.start_gps || sh.kannur_gps;
        if (!g) return;
        roads.push({
          id: sh.road_id,
          name: sh.name,
          route: sh.route,
          country: "India",
          type: "SH",
          authority: sh.maintained_by || "Kerala PWD",
          contractorName: sh.contractor_last_work || "Kerala PWD",
          contractorPerformance: 3.5,
          sanctionedBudget: (sh.cost_of_last_work_cr || 10) * 1e7,
          spentBudget: (sh.cost_of_last_work_cr || 10) * 0.9 * 1e7,
          fundingSource: "State",
          coordinates: [g.lat, g.lon],
          path: [[g.lat, g.lon]],
          statusColor: "#38bdf8",
          lengthKm: sh.length_km,
          builtBy: sh.maintained_by,
          source: kl.statistics?.source || "Kerala PWD Annual Report 2022-23",
        });
      });
    }

    if (mapPayload.national_highways?.length) {
      const nh66 = mapPayload.national_highways.find((n) => n.road_id === "NH-66");
      if (nh66?.kerala_section?.kannur_gps) {
        const g = nh66.kerala_section.kannur_gps;
        const existing = roads.find((r) => r.id === "NH-66");
        if (existing) {
          existing.coordinates = [g.lat, g.lon];
        }
      }
    }

    window.RoadDatabase.roads = roads;
    window._roadsMapPayload = mapPayload;
  },

  _hydrateBudget(budget) {
    window._BUDGET_AUDIT = budget;
    const sector = budget.national_budget_road_sector || [];
    window._BUDGET_YEARS = sector.filter((y) => y.actual_spent_cr != null);
  },

  _hydrateDefects(defects) {
    window._AI_DEFECT_DATA = defects;
    const labels = (defects.defect_classes || [])
      .filter((d) => d.class_name !== "road_good_condition")
      .map((d) => d.class_name.replace(/_/g, " "));
    window._VISION_DEFECT_LABELS = labels;

    const bench = defects.model_performance_benchmarks || {};
    const card = document.getElementById("ai-model-benchmarks-card");
    const list = document.getElementById("ai-defect-class-list");
    if (list) {
      list.innerHTML = (defects.defect_classes || [])
        .map(
          (d) =>
            `<li><strong>${d.class_name.replace(/_/g, " ")}</strong> — ${d.description || ""} <span class="source-badge">Gemini Vision</span></li>`
        )
        .join("");
    }
    if (card && bench.gemini_3_5_flash) {
      card.style.display = "block";
      const el = document.getElementById("ai-benchmark-scores");
      if (el) {
        el.innerHTML = `
          <div class="popup-row"><strong>Gemini 3.5 Flash</strong>: Accuracy ${(bench.gemini_3_5_flash.accuracy * 100).toFixed(1)}% · ${bench.gemini_3_5_flash.inference_ms}ms lat</div>
          <div class="popup-row" style="font-size:11px;opacity:0.8;">${bench.note}</div>
        `;
      }
    }
  },

  _hydrateComplaints(payload) {
    window._SEEDED_COMPLAINTS = payload.complaints || [];
    if (window.MapHub?.plotSeededComplaints) {
      window.MapHub.plotSeededComplaints(window._SEEDED_COMPLAINTS);
    }
  },
};

// ROADS_DATA helper when still a plain array before hydration
if (Array.isArray(window.ROADS_DATA) && !window.ROADS_DATA.getRoadsData) {
  window.ROADS_DATA.getRoadsData = function getRoadsData() {
    return window.ROADS_DATA;
  };
}
