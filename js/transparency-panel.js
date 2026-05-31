/**
 * Enhanced Tender Registry / Spending panel
 */
window.TransparencyPanel = {
  _filter: "",

  render() {
    const container = document.getElementById("tender-registry-root");
    if (!container || !window.ROADS_DATA) return;

    const roads = window.ROADS_DATA;
    const q = this._filter.toLowerCase();
    const filtered = q
      ? roads.filter(
          (r) =>
            r.id.toLowerCase().includes(q) ||
            r.name.toLowerCase().includes(q) ||
            r.contractor.toLowerCase().includes(q)
        )
      : roads;

    let html = `
      <div class="tender-search-row" style="margin-bottom:16px;">
        <input type="search" id="tender-search-input" class="form-control" placeholder="Search roads, contractors, regions..." value="${window.App?.escapeHTML?.(this._filter) || ""}">
      </div>
      <div class="tender-table-wrap" style="overflow-x:auto;">
      <table class="tender-table" style="width:100%; border-collapse:collapse; font-size:12px;">
        <thead>
          <tr style="color:var(--text-muted); text-align:left;">
            <th>Asset</th><th>Contractor</th><th>Funding</th>
            <th>Sanctioned</th><th>Released</th><th>Spent</th>
            <th>Remaining</th><th>Complete</th><th>Anomaly</th><th>Source</th><th></th>
          </tr>
        </thead>
        <tbody>`;

    filtered.forEach((r) => {
      const remClass = r.remainingCr < 0 ? "color:#ef4444;font-weight:700" : "color:#10b981";
      html += `<tr class="tender-row" data-road-id="${r.id}" style="border-top:1px solid var(--glass-border);">
        <td style="padding:10px 8px;"><strong>${r.id}</strong><br><span style="color:var(--text-muted);font-size:11px;">${r.name}</span></td>
        <td>${r.contractor}<br><span style="font-size:10px;color:var(--text-muted);">${r.contractorRegNo || ""}</span></td>
        <td><span class="badge badge-sh">${r.fundingSource}</span></td>
        <td>${r.sanctioned}</td><td>${r.released}</td><td>${r.spent}</td>
        <td style="${remClass}">${r.remaining}</td>
        <td>
          <div class="completion-bar"><div class="completion-bar-fill ${r.completion < 80 ? "critical" : ""}" style="width:${r.completion}%"></div></div>
          <span style="font-size:10px;">${r.completion}%</span>
        </td>
        <td><span class="anomaly-badge ${r.anomalyClass}">${r.anomaly}</span></td>
        <td><a class="source-link" href="${r.sourceUrl}" target="_blank" rel="noopener">Source</a></td>
        <td>
          <button type="button" class="btn btn-secondary btn-sm" onclick="window.App.focusRoadOnMap('${r.id}')">Map</button>
          <button type="button" class="btn btn-primary btn-sm" onclick="window.App.selectRoadForReport('${r.id}')">Report</button>
        </td>
      </tr>
      <tr class="tender-detail-row" id="detail-${r.id}" style="display:none;">
        <td colspan="11" style="padding:12px; background:rgba(255,255,255,0.02);">
          <div class="popup-row"><strong>Engineer:</strong> ${r.engineer}</div>
          <div class="popup-row"><strong>Guarantee until:</strong> ${r.guaranteeUntil}</div>
          <div class="popup-row"><strong>Last audit:</strong> ${r.lastAuditDate}</div>
        </td>
      </tr>`;
    });

    html += `</tbody></table></div>`;
    container.innerHTML = html;

    document.getElementById("tender-search-input")?.addEventListener("input", (e) => {
      this._filter = e.target.value;
      this.render();
    });
  },
};
