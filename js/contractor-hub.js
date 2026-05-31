/**
 * Contractor Accountability Hub tab
 */
window.ContractorHub = {
  _radarChart: null,
  _selected: ["C008", "C002", "C003"],

  badgeClass(b) {
    const m = { EXCELLENT: "badge-excellent", GOOD: "badge-good", AVERAGE: "badge-average", POOR: "badge-poor" };
    return m[b] || "badge-average";
  },

  render() {
    const root = document.getElementById("contractor-hub-root");
    if (!root || !window.CONTRACTORS) return;
    const list = [...window.CONTRACTORS];

    const cards = list
      .map(
        (c) => `
      <div class="glass-card" style="padding:14px; margin-bottom:10px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <h4 style="margin:0; color:var(--text-white);">${c.name}</h4>
            <p style="font-size:11px; color:var(--text-muted); margin:4px 0;">${c.regNo}</p>
          </div>
          <span class="contractor-badge ${this.badgeClass(c.badge)}">${c.badge}</span>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:10px; font-size:12px;">
          <span>Roads: ${c.roads.join(", ")}</span>
          <span>Health: <strong style="color:var(--primary)">${c.healthScore}/10</strong></span>
          <span>✅ ${c.completed} | 🔄 ${c.inProgress} | ⚠️ ${c.overdue}</span>
          <span>Complaints: ${c.complaints}</span>
          <span>Budget util: ${c.budgetUtil}%</span>
          <span>Completion: ${c.completionRate}%</span>
        </div>
      </div>`
      )
      .join("");

    const best = [...list].sort((a, b) => b.healthScore - a.healthScore).slice(0, 5);
    const worst = [...list].sort((a, b) => a.healthScore - b.healthScore).slice(0, 5);

    const tableRow = (c, rank) => `<tr>
      <td>${rank}</td><td>${c.name}</td><td>${c.healthScore}</td>
      <td>${c.completionRate}%</td><td>${c.budgetUtil}%</td>
      <td><span class="contractor-badge ${this.badgeClass(c.badge)}">${c.badge}</span></td>
    </tr>`;

    root.innerHTML = `
      <h3 style="color:var(--primary); margin-bottom:12px;">Contractor metrics</h3>
      <div style="max-height:320px; overflow-y:auto; margin-bottom:20px;">${cards}</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px;">
        <div class="glass-card" style="padding:12px;">
          <h4>🏆 Best contractors</h4>
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
        labels: ["Health", "Budget %", "Completion", "Low complaints", "Warranty"],
        datasets: selected.map((c, i) => ({
          label: c.name.substring(0, 20),
          data: [
            c.healthScore,
            Math.min(10, c.budgetUtil / 10),
            c.completionRate / 10,
            Math.max(0, 10 - c.complaints / 15),
            c.warrantyExpired ? 3 : 9,
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
