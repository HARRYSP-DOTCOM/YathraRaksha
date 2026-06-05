/**
 * Contractor Accountability Hub — NHAI contractor registry + CAG flags
 */
window.ContractorHub = {
  _radarChart: null,
  _selected: [],

  badgeClass(b) {
    const m = { EXCELLENT: "badge-excellent", GOOD: "badge-good", AVERAGE: "badge-average", POOR: "badge-poor" };
    return m[b] || "badge-average";
  },

  async render() {
    const root = document.getElementById("contractor-hub-root");
    if (!root) return;
    
    if (!this._rows || !this._rows.length) {
      if (root) root.innerHTML = "<p style='color:var(--text-muted);'>Loading contractor registry…</p>";
      try {
        const base = (window.AppConfig && window.AppConfig.API_BASE_URL) || "/v1";
        const data = await fetch(`${base}/contractors`).then((r) => r.json());
        
        // Populate window.CONTRACTORS
        const cagFlaggedNames = (data.cag_flagged_contractor_names || []).map(n => n.toLowerCase());
        const isCagFlagged = (name) => {
          const n = (name || "").toLowerCase();
          return cagFlaggedNames.some(flag => n.includes(flag.split("(")[0].trim().slice(0, 12)) || flag.includes(n.slice(0, 12)));
        };
        window.CONTRACTORS = data.contractors.map(c => {
           return {
             id: c.contractor_id,
             name: c.name,
             regNo: c.bse_code ? `BSE: ${c.bse_code}` : (c.type || c.nhai_empanelment_class || ""),
             stars: "★".repeat(Math.round(c.overall_rating.quality_score / 20)) + "☆".repeat(5 - Math.round(c.overall_rating.quality_score / 20)),
             qualityScore: c.overall_rating.quality_score,
             badge: c.overall_rating.quality_score >= 85 ? "EXCELLENT" : (c.overall_rating.quality_score >= 70 ? "GOOD" : "AVERAGE"),
             healthScore: Math.round(c.overall_rating.timely_completion_rate_percent / 10),
             completed: c.total_road_projects_completed,
             inProgress: (c.active_projects || []).length,
             completionRate: c.overall_rating.timely_completion_rate_percent,
             complaints: Math.round((c.overall_rating?.complaints_per_100km || 2) * 10),
             budgetUtil: c.overall_rating.timely_completion_rate_percent || 80,
             roads: (c.active_projects || []).map(p => p.road),
             cagFlagged: isCagFlagged(c.name),
             source: c.overall_rating.source
           };
        });
        // Store CAG flagged metadata and contractor type explanations
        window._cagFlaggedMeta = data.cag_flagged || {};
        window._contractorTypes = data.contractor_types || {};
        window._topContractorsCAG = data.top_contractors_cag || [];
        this._rows = window.CONTRACTORS;
      } catch (err) {
        console.error("Failed to load contractors", err);
        return;
      }
    }
    const list = [...this._rows];
    if (!this._selected.length) this._selected = list.slice(0, 3).map((c) => c.id);

    const cards = list
      .map((c) => {
        const cag = c.cagFlagged
          ? `<span class="cag-flagged-badge">⚠️ CAG Flagged</span>`
          : "";
        return `
      <div class="glass-card" style="padding:14px; margin-bottom:10px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px;">
          <div>
            <h4 style="margin:0; color:var(--text-white);">${c.name}</h4>
            <p style="font-size:11px; color:var(--text-muted); margin:4px 0;">${c.regNo}</p>
            <p style="font-size:12px; color:#fbbf24; margin:0;">${c.stars || "★★★☆☆"} <span style="color:var(--text-muted);font-size:10px;">quality ${c.qualityScore || "—"}/100</span></p>
          </div>
          <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
            <span class="contractor-badge ${this.badgeClass(c.badge)}">${c.badge}</span>
            ${cag}
          </div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:10px; font-size:12px;">
          <span>Roads: ${(c.roads || []).join(", ") || "—"}</span>
          <span>Health: <strong style="color:var(--primary)">${c.healthScore}/10</strong></span>
          <span>✅ ${c.completed} | 🔄 ${c.inProgress}</span>
          <span>Completion: ${c.completionRate}%</span>
        </div>
        <p style="margin-top:8px;font-size:10px;"><span class="source-badge">📄 ${c.source || "NHAI 2023-24"}</span></p>
      </div>`;
      })
      .join("");

    const best = [...list].sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0)).slice(0, 5);
    const worst = [...list].sort((a, b) => (a.qualityScore || 0) - (b.qualityScore || 0)).slice(0, 5);

    const tableRow = (c, rank) => `<tr>
      <td>${rank}</td><td>${c.name}</td><td>${c.stars || ""}</td>
      <td>${c.completionRate}%</td>
      <td>${c.cagFlagged ? '<span class="cag-flagged-badge">CAG</span>' : "—"}</td>
    </tr>`;

    root.innerHTML = `
      <h3 style="color:var(--primary); margin-bottom:12px;">Contractor metrics (NHAI / MoRTH)</h3>
      <div style="max-height:320px; overflow-y:auto; margin-bottom:20px;">${cards}</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px;">
        <div class="glass-card" style="padding:12px;">
          <h4>🏆 Top quality scores</h4>
          <table style="width:100%;font-size:11px;"><tbody>
            ${best.map((c, i) => tableRow(c, i + 1)).join("")}
          </tbody></table>
        </div>
        <div class="glass-card" style="padding:12px;">
          <h4>🚨 Needs oversight</h4>
          <table style="width:100%;font-size:11px;"><tbody>
            ${worst.map((c, i) => tableRow(c, i + 1)).join("")}
          </tbody></table>
        </div>
      </div>
      <div class="glass-card" style="padding:16px;">
        <h4 style="margin-bottom:8px;">Performance radar (select up to 3)</h4>
        <select id="contractor-radar-select" multiple size="3" class="form-control" style="margin-bottom:12px;">
          ${list.map((c) => `<option value="${c.id}" ${this._selected.includes(c.id) ? "selected" : ""}>${c.name}</option>`).join("")}
        </select>
        <div style="height:280px; position:relative;">
          <canvas id="chart-contractor-radar" width="400" height="280"></canvas>
        </div>
      </div>`;

    document.getElementById("contractor-radar-select")?.addEventListener("change", (e) => {
      this._selected = Array.from(e.target.selectedOptions)
        .map((o) => o.value)
        .slice(0, 3);
      this.renderRadar();
    });
    this.renderRadar();
  },

  renderRadar() {
    if (typeof Chart === "undefined") return;
    const canvas = document.getElementById("chart-contractor-radar");
    if (!canvas) return;
    if (this._radarChart) this._radarChart.destroy();
    const selected = window.CONTRACTORS.filter((c) => this._selected.includes(c.id));
    const colors = ["#0d9488", "#38bdf8", "#f97316"];
    this._radarChart = new Chart(canvas.getContext("2d"), {
      type: "radar",
      data: {
        labels: ["Quality", "Timely %", "Completion", "Low complaints", "Empanelment"],
        datasets: selected.map((c, i) => ({
          label: c.name.substring(0, 24),
          data: [
            (c.qualityScore || 70) / 10,
            (c.completionRate || 70) / 10,
            (c.completionRate || 70) / 10,
            Math.max(0, 10 - (c.complaints || 0) / 20),
            c.badge === "EXCELLENT" ? 9 : c.badge === "GOOD" ? 7 : 5,
          ],
          borderColor: colors[i % 3],
          backgroundColor: colors[i % 3] + "33",
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { r: { min: 0, max: 10, ticks: { color: "#94a3b8" }, grid: { color: "rgba(255,255,255,0.06)" } } },
        plugins: { legend: { labels: { color: "#94a3b8", font: { size: 10 } } } },
      },
    });
    window._charts = window._charts || {};
    window._charts.contractorRadar = this._radarChart;
  },
};
