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

      // Non-blocking: load supplementary data in background
      Promise.allSettled([
        fetchJson("/highway-construction").then((d) => this._hydrateHighwayConstruction(d)),
        fetchJson("/budget/pmgsy").then((d) => this._hydratePMGSY(d)),
        fetchJson("/budget/bharatmala").then((d) => this._hydrateBharatmala(d)),
      ]).catch(() => {});

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
        contractor_types: cag?.contractor_types_explained || {},
        top_contractors_cag: cag?.top_contractors_india || [],
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
          {
            ...roads,
            nh_extended: nh?.national_highways || [],
            sh_extended: nh?.state_highways_sample || [],
            nh_network_totals: nh?.nh_network_totals || {},
          },
          await load("/data/india_accidents_2023.json")
        );
      }
      const budgetAudit = await load("/data/05_budget_audit_data.json");
      const budgetRaw = await load("/data/india_road_budget.json");
      if (budgetAudit) {
        const budgetMerged = {
          ...budgetAudit,
          nhai_capex: budgetRaw?.nhai_capex_last_5_years?.data || budgetRaw?.nhai_capex_last_5_years || [],
          morth_allocation: budgetRaw?.morth_budget_allocation?.data || budgetRaw?.morth_budget_allocation || [],
          pmgsy_national: budgetRaw?.pmgsy_national_summary || {},
          pmgsy_state_wise: budgetRaw?.pmgsy_state_wise?.data || [],
          bharatmala_audit: budgetRaw?.bharatmala_phase1_audit || {},
        };
        this._hydrateBudget(budgetMerged);
      }
      const defects = await load("/data/01_ai_road_defect_data.json");
      if (defects) this._hydrateDefects(defects);
      const complaints = await load("/data/06_complaints_sample_data.json");
      if (complaints) this._hydrateComplaints(complaints);

      // Load highway construction CSV (non-blocking)
      load("/data/TLHWYCONS.csv").catch(() => null);
      // Parse CSV from static file for highway construction (text)
      fetch("/data/TLHWYCONS.csv").then(r => r.ok ? r.text() : null).then(csv => {
        if (!csv) return;
        const lines = csv.trim().split("\n").slice(1);
        const series = lines.map(l => {
          const [date, val] = l.split(",");
          return { date: date.trim(), value: parseInt(val.trim(), 10) };
        }).filter(r => !isNaN(r.value));
        this._hydrateHighwayConstruction({ series });
      }).catch(() => {});

      // Hydrate PMGSY/Bharatmala from loaded budget data
      if (budgetRaw) {
        this._hydratePMGSY({
          national_summary: budgetRaw.pmgsy_national_summary || {},
          state_wise: budgetRaw.pmgsy_state_wise?.data || [],
        });
        this._hydrateBharatmala(budgetRaw.bharatmala_phase1_audit || {});
      }

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

    // Extended state highways from india_nh_data.json (SH-36 TN, SH-9 KA, SH-1 MH)
    (mapPayload.sh_extended || []).forEach((sh) => {
      const accCount = this._accidentCountForRoad(sh.road_code, accidentLookup);
      roads.push({
        id: sh.road_code,
        name: sh.road_name,
        route: sh.road_name,
        country: "India",
        type: "SH",
        authority: sh.responsible_authority || "State PWD",
        contractorName: sh.executive_engineer || "State PWD",
        contractorPerformance: 3.5,
        sanctionedBudget: (sh.budget_sanctioned_crore || 0) * 1e7,
        spentBudget: (sh.budget_spent_crore || 0) * 1e7,
        fundingSource: "State PWD",
        coordinates: [20.5937, 78.9629], // Default India center (no GPS in SH data)
        path: [[20.5937, 78.9629]],
        statusColor: sh.overrun_pct > 5 ? "#ff9f1c" : "#38bdf8",
        lengthKm: sh.length_km,
        builtBy: sh.responsible_authority,
        accidents2023: accCount,
        overrunPct: sh.overrun_pct,
        source: sh.source || "State PWD Annual Report",
      });
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

    // NHAI capex time series
    window._NHAI_CAPEX = budget.nhai_capex || [];
    // MoRTH allocation time series
    window._MORTH_ALLOCATION = budget.morth_allocation || [];
    // State-wise allocation FY24
    window._STATE_ALLOCATION = budget.state_wise_allocation_fy24 || [];
    // CAG audit findings
    window._CAG_FINDINGS = budget.cag_audit_findings || {};
    // Maintenance budget info
    window._MAINTENANCE_BUDGET = budget.maintenance_budget || {};
    // PMGSY & Bharatmala (may also be set from dedicated endpoints)
    if (budget.pmgsy_national) window._PMGSY_NATIONAL = budget.pmgsy_national;
    if (budget.pmgsy_state_wise?.length) window._PMGSY_STATES = budget.pmgsy_state_wise;
    if (budget.bharatmala_audit?.total_projects_awarded_km) window._BHARATMALA = budget.bharatmala_audit;
  },

  _hydrateHighwayConstruction(data) {
    window._HIGHWAY_CONSTRUCTION = data.series || [];
    console.log(`[RealData] Highway construction: ${window._HIGHWAY_CONSTRUCTION.length} data points loaded`);
  },

  _hydratePMGSY(data) {
    window._PMGSY_NATIONAL = data.national_summary || {};
    window._PMGSY_STATES = data.state_wise || [];
    console.log(`[RealData] PMGSY: ${window._PMGSY_STATES.length} states loaded`);
  },

  _hydrateBharatmala(data) {
    window._BHARATMALA = data || {};
    console.log(`[RealData] Bharatmala audit loaded: ${data.total_projects_awarded_km || 0} km awarded`);
  },

  _hydrateDefects(defects) {
    window._AI_DEFECT_DATA = defects;
    const labels = (defects.defect_classes || [])
      .filter((d) => d.class_name !== "road_good_condition")
      .map((d) => d.class_name.replace(/_/g, " "));
    window._VISION_DEFECT_LABELS = labels;

    // Inspection records
    window._AI_INSPECTION_RECORDS = defects.sample_inspection_records || [];

    // Open datasets for AI
    window._AI_OPEN_DATASETS = defects.open_datasets_to_use || [];

    const bench = defects.model_performance_benchmarks || {};
    window._AI_BENCHMARKS = bench;
    const card = document.getElementById("ai-model-benchmarks-card");
    const list = document.getElementById("ai-defect-class-list");
    if (list) {
      list.innerHTML = (defects.defect_classes || [])
        .map(
          (d) =>
            `<li><strong>${d.class_name.replace(/_/g, " ")}</strong> — ${d.description || ""} <span class="source-badge">Groq Vision</span></li>`
        )
        .join("");
    }
    if (card && bench.llama_3_2_90b_vision_baseline) {
      card.style.display = "block";
      const el = document.getElementById("ai-benchmark-scores");
      if (el) {
        el.innerHTML = `
          <div class="popup-row"><strong>Llama 3.2 90B Vision</strong>: Accuracy ${(bench.llama_3_2_90b_vision_baseline.accuracy * 100).toFixed(1)}% · ${bench.llama_3_2_90b_vision_baseline.inference_ms}ms lat</div>
          <div class="popup-row" style="font-size:11px;opacity:0.8;">${bench.note}</div>
        `;
      }
    }
  },

  _hydrateComplaints(payload) {
    window._SEEDED_COMPLAINTS = payload.complaints || [];
    window._COMPLAINT_STATISTICS = payload.statistics || {};
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
