/**
 * Budget Transparency Dashboard (Overview tab)
 */
window.BudgetDashboard = {
  _donut: null,
  _velocity: null,

  render() {
    const root = document.getElementById("budget-transparency-root");
    if (!root || !window.ROADS_DATA) return;
    const roads = window.ROADS_DATA.getRoadsData();
    if (!roads.length) return;

    const sum = (fn) => roads.reduce((a, r) => a + fn(r), 0);
    const totalSanctioned = sum((r) => r.sanctionedCr);
    const totalReleased = sum((r) => r.releasedCr);
    const totalSpent = sum((r) => r.spentCr);
    const totalRemaining = totalReleased - totalSpent;
    const breaches = roads.filter((r) => r.anomalyClass === "anomaly-breach" || r.anomalyClass === "anomaly-overspent").length;
    const avgCompletion = Math.round(sum((r) => r.completion) / roads.length);

    const anomalies = roads.filter(
      (r) => r.anomalyClass === "anomaly-breach" || r.anomalyClass === "anomaly-at-risk" || r.anomalyClass === "anomaly-overspent"
    );

    root.innerHTML = `
      <h3 style="color:var(--primary); margin:16px 0 12px;">💰 Budget Transparency Dashboard</h3>
      <div class="metrics-grid" style="margin-bottom:16px;">
        <div class="glass-card metric-card"><span class="label">Total Sanctioned</span><span class="value">₹${totalSanctioned.toFixed(1)} Cr</span></div>
        <div class="glass-card metric-card"><span class="label">Total Released</span><span class="value">₹${totalReleased.toFixed(1)} Cr</span></div>
        <div class="glass-card metric-card"><span class="label">Total Spent</span><span class="value">₹${totalSpent.toFixed(1)} Cr</span></div>
        <div class="glass-card metric-card"><span class="label">Remaining</span><span class="value" style="color:${totalRemaining < 0 ? "#ef4444" : "#10b981"}">₹${totalRemaining.toFixed(1)} Cr</span></div>
        <div class="glass-card metric-card"><span class="label">Budget breaches</span><span class="value">${breaches}</span></div>
        <div class="glass-card metric-card"><span class="label">Avg completion</span><span class="value">${avgCompletion}%</span></div>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px;">
        <div class="glass-card" style="padding:12px;">
          <h4 style="font-size:13px; color:var(--text-muted);">Funding source breakdown</h4>
          <div style="height:220px; position:relative;"><canvas id="chart-funding-donut" width="300" height="220"></canvas></div>
        </div>
        <div class="glass-card" style="padding:12px;">
          <h4 style="font-size:13px; color:var(--text-muted);">Spending velocity (₹ Cr)</h4>
          <div style="height:220px; position:relative;"><canvas id="chart-spending-velocity" width="300" height="220"></canvas></div>
        </div>
      </div>
      <div class="glass-card" style="padding:14px; margin-bottom:16px;">
        <h4>⚠️ Anomaly alerts</h4>
        <div id="anomaly-alert-list">
          ${anomalies.length ? anomalies.map((r) => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--glass-border);">
              <span><strong>${r.id}</strong> ${r.contractor} — overrun ₹${Math.abs(r.remainingCr).toFixed(1)} Cr</span>
              <button type="button" class="btn btn-secondary btn-sm" onclick="window.App.highlightTenderRow('${r.id}')">View</button>
            </div>`).join("") : "<p style='color:var(--text-muted);'>No anomalies detected.</p>"}
        </div>
      </div>
      <div class="glass-card" style="padding:14px;">
        <h4>Contractor fund utilization</h4>
        <table style="width:100%; font-size:12px;">
          <thead><tr style="color:var(--text-muted);"><th>Contractor</th><th>Roads</th><th>Sanctioned</th><th>Spent</th><th>Util %</th><th>Anomalies</th></tr></thead>
          <tbody id="contractor-util-tbody"></tbody>
        </table>
      </div>`;

    this.renderCharts(roads);
    this.renderContractorUtil();
  },

  renderContractorUtil() {
    const tbody = document.getElementById("contractor-util-tbody");
    if (!tbody || !window.CONTRACTORS) return;
    const roads = window.ROADS_DATA.getRoadsData();
    tbody.innerHTML = window.CONTRACTORS.map((c) => {
      const cRoads = roads.filter((r) => c.roads.includes(r.id));
      const sanc = cRoads.reduce((a, r) => a + r.sanctionedCr, 0);
      const spent = cRoads.reduce((a, r) => a + r.spentCr, 0);
      const anom = cRoads.filter((r) => r.anomalyClass !== "anomaly-on-track").length;
      return `<tr style="border-top:1px solid var(--glass-border);">
        <td style="padding:8px;">${c.name}</td><td>${c.roads.length}</td>
        <td>₹${sanc.toFixed(1)} Cr</td><td>₹${spent.toFixed(1)} Cr</td>
        <td>${c.budgetUtil}%</td><td>${anom}</td></tr>`;
    }).join("");
  },

  renderCharts(roads) {
    if (typeof Chart === "undefined") return;
    const fundingMap = {};
    roads.forEach((r) => {
      const key = (r.fundingSource || "Other").split("(")[0].trim();
      fundingMap[key] = (fundingMap[key] || 0) + r.spentCr;
    });

    const donutEl = document.getElementById("chart-funding-donut");
    if (donutEl) {
      if (this._donut) this._donut.destroy();
      this._donut = new Chart(donutEl.getContext("2d"), {
        type: "doughnut",
        data: {
          labels: Object.keys(fundingMap),
          datasets: [{ data: Object.values(fundingMap), backgroundColor: ["#0d9488", "#38bdf8", "#f97316", "#a78bfa", "#94a3b8"] }],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: "#94a3b8" } } } },
      });
    }

    const velEl = document.getElementById("chart-spending-velocity");
    if (velEl) {
      if (this._velocity) this._velocity.destroy();
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const total = roads.reduce((a, r) => a + r.spentCr, 0);
      const pace = months.map((_, i) => (total / 12) * (i + 1));
      const spent = months.map((_, i) => (total / 12) * (i + 0.85));
      this._velocity = new Chart(velEl.getContext("2d"), {
        type: "line",
        data: {
          labels: months,
          datasets: [
            { label: "Sanctioned pace", data: pace, borderColor: "#38bdf8", tension: 0.3 },
            { label: "Released pace", data: pace.map((v) => v * 0.92), borderColor: "#f59e0b", tension: 0.3 },
            { label: "Actual spend", data: spent, borderColor: "#ef4444", tension: 0.3 },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: "#94a3b8" } } },
          scales: { x: { ticks: { color: "#94a3b8" } }, y: { ticks: { color: "#94a3b8" } } },
        },
      });
    }
  },
};
