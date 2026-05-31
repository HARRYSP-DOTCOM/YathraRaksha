/**
 * Tender Registry — MoRTH / NHAI / PMGSY / State PWD tenders (real data)
 */
window.TransparencyPanel = {
  _filter: "",
  _rows: [],

  async render() {
    const container = document.getElementById("tender-registry-root");
    if (!container) return;

    if (!this._rows.length) {
      try {
        const base = (window.AppConfig && window.AppConfig.API_BASE_URL) || "/v1";
        const data = await fetch(`${base}/tenders`).then((r) => r.json());
        this._rows = window.RealDataLoader?._flattenTenders?.(data) || [];
        if (!this._rows.length) {
          const keys = ["national_highway_tenders", "pmgsy_tenders", "state_pwd_tenders"];
          keys.forEach((k) => (data[k] || []).forEach((t) => this._rows.push(t)));
        }
      } catch {
        this._rows = window._TENDERS_LIST || window.ROADS_DATA?.getRoadsData?.() || [];
      }
    }

    const q = this._filter.toLowerCase();
    const filtered = q
      ? this._rows.filter(
          (t) =>
            (t.tender_id || "").toLowerCase().includes(q) ||
            (t.road || "").toLowerCase().includes(q) ||
            (t.awarded_to || "").toLowerCase().includes(q)
        )
      : this._rows;

    const esc = (s) => window.App?.escapeHTML?.(String(s ?? "")) || String(s ?? "");

    let html = `
      <div class="tender-search-row" style="margin-bottom:16px;">
        <input type="search" id="tender-search-input" class="form-control" placeholder="Search tender ID, road, contractor..." value="${esc(this._filter)}">
      </div>
      <div class="tender-table-wrap" style="overflow-x:auto;">
      <table class="tender-table" style="width:100%; border-collapse:collapse; font-size:12px;">
        <thead>
          <tr style="color:var(--text-muted); text-align:left;">
            <th>Tender ID</th><th>Road</th><th>Awarded To</th><th>Value (₹Cr)</th>
            <th>Status</th><th>Cost Overrun</th><th>Source</th>
          </tr>
        </thead>
        <tbody>`;

    filtered.forEach((t) => {
      const value = t.contract_value_cr ?? t.budget_allocated_cr ?? 0;
      const overrun = t.cost_overrun_cr ?? Math.max(0, (t.amount_spent_cr || 0) - (t.budget_allocated_cr || value));
      const overrunLabel = overrun > 0 ? `₹${overrun} Cr` : "—";
      html += `<tr style="border-top:1px solid var(--glass-border);">
        <td style="padding:10px 8px;"><strong>${esc(t.tender_id)}</strong></td>
        <td>${esc(t.road)}<br><span style="font-size:10px;color:var(--text-muted);">${esc(t.tender_name || t.section || "")}</span></td>
        <td>${esc(t.awarded_to)}</td>
        <td>₹${value}</td>
        <td><span class="badge badge-sh">${esc(t.status)}</span></td>
        <td>${overrunLabel}</td>
        <td><span class="source-badge">📄 ${esc((t.source || "NHAI").split(",")[0])}</span></td>
      </tr>`;
    });

    if (!filtered.length) {
      html += `<tr><td colspan="7" style="padding:16px;color:var(--text-muted);">Loading tender registry…</td></tr>`;
    }

    html += `</tbody></table></div>`;
    container.innerHTML = html;

    document.getElementById("tender-search-input")?.addEventListener("input", (e) => {
      this._filter = e.target.value;
      this.render();
    });
  },
};
