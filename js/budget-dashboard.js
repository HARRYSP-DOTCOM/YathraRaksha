/**
 * Budget Transparency Dashboard — MoRTH allocated vs spent (CAG audit data)
 */
window.BudgetDashboard = {
  _barChart: null,

  async render() {
    const root = document.getElementById("overview-budget-dashboard");
    if (!root) return;

    let budget = window._BUDGET_AUDIT;
    if (!budget) {
      try {
        const base = (window.AppConfig && window.AppConfig.API_BASE_URL) || "/v1";
        budget = await fetch(`${base}/audit/budget`).then((r) => r.json());
        window._BUDGET_AUDIT = budget;
      } catch {
        root.innerHTML = "<p style='color:var(--text-muted);'>Budget data unavailable.</p>";
        return;
      }
    }

    const years = (budget.national_budget_road_sector || []).filter((y) => y.actual_spent_cr != null);
    const latest = years[years.length - 1];
    const findings = budget.cag_audit_findings?.key_findings || budget.cag_audit_findings?.findings || [];

    root.innerHTML = `
      <h3 style="color:var(--primary); margin:16px 0 12px;">💰 MoRTH Road Sector Budget (Union Budget / CAG)</h3>
      <div class="metrics-grid" style="margin-bottom:16px;">
        <div class="glass-card metric-card"><span class="label">FY ${latest?.fiscal_year || "—"} Allocated</span><span class="value">₹${latest?.budget_allocated_cr?.toLocaleString() || "—"} Cr</span></div>
        <div class="glass-card metric-card"><span class="label">Actual Spent</span><span class="value">₹${latest?.actual_spent_cr?.toLocaleString() || "—"} Cr</span></div>
        <div class="glass-card metric-card"><span class="label">Utilization</span><span class="value">${latest?.utilization_percent ?? "—"}%</span></div>
        <div class="glass-card metric-card"><span class="label">NHAI km constructed</span><span class="value">${latest?.km_constructed?.toLocaleString() || "—"}</span></div>
      </div>
      <div class="glass-card" style="padding:14px; margin-bottom:16px;">
        <h4 style="font-size:13px; color:var(--text-muted);">Allocated vs spent by fiscal year (₹ Cr)</h4>
        <div style="height:260px; position:relative;"><canvas id="chart-morth-budget-bar" width="400" height="260"></canvas></div>
      </div>
      <div class="glass-card" style="padding:14px;">
        <h4>CAG audit findings (${budget.cag_audit_findings?.report || "CAG 2023"})</h4>
        <ul style="font-size:12px; color:var(--text-muted); margin:8px 0 0 18px;">
          ${findings.length ? findings.map((f) => `<li><strong>${f.finding_id || ""}</strong> ${f.issue || f.finding || ""} — ${f.detail || ""} <span class="source-badge">${f.source || "CAG"}</span></li>`).join("") : "<li>No findings loaded.</li>"}
        </ul>
        ${budget.cag_audit_findings?.url ? `<p style="margin-top:8px;font-size:11px;"><a href="${budget.cag_audit_findings.url}" target="_blank" rel="noopener" class="source-link">View CAG report</a></p>` : ""}
      </div>`;

    this.renderBarChart(years);
  },

  renderBarChart(years) {
    if (typeof Chart === "undefined") return;
    const canvas = document.getElementById("chart-morth-budget-bar");
    if (!canvas) return;
    if (this._barChart) this._barChart.destroy();

    this._barChart = new Chart(canvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: years.map((y) => y.fiscal_year),
        datasets: [
          {
            label: "Budget allocated (₹ Cr)",
            data: years.map((y) => y.budget_allocated_cr),
            backgroundColor: "rgba(56,189,248,0.35)",
            borderColor: "#38bdf8",
            borderWidth: 1,
          },
          {
            label: "Actual spent (₹ Cr)",
            data: years.map((y) => y.actual_spent_cr),
            backgroundColor: "rgba(45,212,191,0.4)",
            borderColor: "#0d9488",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: "#94a3b8" } } },
        scales: {
          x: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(255,255,255,0.04)" } },
          y: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(255,255,255,0.04)" } },
        },
      },
    });
    window._charts = window._charts || {};
    window._charts.morthBudget = this._barChart;
  },
};
