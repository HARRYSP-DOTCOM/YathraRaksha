/**
 * YatraGPT response library — keyword rules for transparency Q&A.
 */
const ChatbotResponses = {
  formatINR(val) {
    return `₹${(val / 10000000).toFixed(1)} Cr`;
  },

  roadCard(road, extraHtml = "") {
    if (!road) return "<p>Road record not found in the registry.</p>";
    const overrun = road.spentBudget > road.sanctionedBudget;
    const pct = (((road.spentBudget - road.sanctionedBudget) / road.sanctionedBudget) * 100).toFixed(1);
    return `
      <h4>📍 ${road.name}</h4>
      <p style="font-size:11px; color:var(--text-muted); margin-top:4px;">ID: <strong>${road.id}</strong> · ${road.country}</p>
      <ul style="margin: 10px 0; padding-left: 20px; font-size:12px; line-height:1.5;">
        <li><strong>Type:</strong> ${road.type}</li>
        <li><strong>Authority:</strong> ${road.authority}</li>
        <li><strong>Executive Engineer:</strong> ${road.executiveEngineer} (${road.engineerPhone})</li>
        <li><strong>Contractor:</strong> ${road.contractorName} (★${road.contractorPerformance}/5)</li>
        <li><strong>Sanctioned:</strong> ${this.formatINR(road.sanctionedBudget)}</li>
        <li><strong>Spent:</strong> <span class="${overrun ? "text-danger" : "text-success"}">${this.formatINR(road.spentBudget)}${overrun ? ` (+${pct}% overrun)` : ""}</span></li>
        <li><strong>Last relayed:</strong> ${road.lastRelayingDate}</li>
        <li><strong>Guarantee:</strong> ${road.maintenanceGuaranteePeriod} years</li>
        <li><strong>Funding:</strong> ${road.fundingSource || "Public infrastructure fund"}</li>
      </ul>
      ${extraHtml}
      <button type="button" onclick="window.App.selectRoadForReport('${road.id}')" class="btn btn-secondary" style="padding:6px 12px; font-size:11px; margin-top:6px;">Report issue on this road</button>
      <button type="button" onclick="window.App.focusRoadOnMap('${road.id}')" class="btn btn-primary" style="padding:6px 12px; font-size:11px; margin-top:6px; margin-left:6px;">Open on map</button>
    `;
  },

  respond(input, ctx) {
    const lower = input.toLowerCase().trim();
    const db = window.RoadDatabase;
    if (!db) return this.fallback(input, ctx);

    if (/^(hi|hello|hey|namaste|good\s*(morning|evening|afternoon)|start)\b/.test(lower)) {
      return `
        <h4>👋 Welcome to YatraGPT</h4>
        <p style="margin-top:6px;">I help citizens audit road spending, find responsible engineers, and file AI-verified complaints. Your live GPS coordinates are synced automatically when location access is enabled.</p>
        <p style="font-size:12px; margin-top:8px;">Try asking about a specific road (e.g. <em>NH-48</em>), <em>budget overruns</em>, <em>worst contractors</em>, or <em>how to report a pothole</em>.</p>
      `;
    }

    if (/help|what can you|commands|options/.test(lower)) {
      return `
        <h4>🧭 What I can answer</h4>
        <ul style="margin:10px 0; padding-left:20px; font-size:12px; line-height:1.55;">
          <li>Road ownership — contractor, authority, executive engineer</li>
          <li>Budgets in ₹ Crores — sanctioned vs spent, overruns</li>
          <li>Contractor rankings and safety ratings</li>
          <li>Nearest registered road to your current GPS pin</li>
          <li>Complaint filing, offline sync, and tracker status</li>
          <li>Country-specific corridors (India, USA, Germany, UK)</li>
        </ul>
      `;
    }

    if (/my location|nearest road|near me|where am i|closest road|gps/.test(lower)) {
      const [lat, lng] = ctx.coords || [0, 0];
      const { road, distanceKm } = db.findNearestRoad(lat, lng);
      return `
        <h4>📡 Your live location</h4>
        <p style="font-size:12px; margin-top:6px;"><strong>Coordinates:</strong> ${lat}, ${lng}</p>
        <p style="font-size:12px;">These values are auto-filled in the complaint form and map pin when GPS is active.</p>
        <hr class="popup-divider" style="margin:12px 0;">
        <p style="font-size:12px;"><strong>Nearest registered corridor:</strong> ${road.name} (${distanceKm} km away)</p>
        ${this.roadCard(road)}
      `;
    }

    if (/tambaram|mdr-?12|in-mdr12|velachery/.test(lower)) {
      return this.roadCard(db.getRoadById("IN-MDR12"), `<p style="font-size:12px; color:var(--accent-red); margin-top:8px;">🚨 Critical audit: 40%+ cost overrun and 2.1/5 contractor score.</p>`);
    }

    if (/nh-?48|nh48|golden quadrilateral|chennai.*bengaluru|vellore/.test(lower)) {
      return this.roadCard(db.getRoadById("IN-NH48"), `<p style="font-size:12px; margin-top:8px;">⚠️ Moderate defects flagged on Chennai–Bengaluru section; 12.5% budget overrun.</p>`);
    }

    if (/sh-?17|sh17|mysuru|mysore|bengaluru.*express|karnataka.*highway/.test(lower)) {
      return this.roadCard(db.getRoadById("IN-SH17"), `<p style="font-size:12px; color:#34d399; margin-top:8px;">✅ Under budget with 4.5/5 contractor rating.</p>`);
    }

    if (/i-?95|i95|bronx|new york|nysdot|interstate 95/.test(lower)) {
      return this.roadCard(db.getRoadById("US-I95"));
    }

    if (/ca-?101|route 101|silicon valley|granite construction/.test(lower)) {
      return this.roadCard(db.getRoadById("US-CA101"));
    }

    if (/a-?8|autobahn|munich|salzburg|hochtief/.test(lower)) {
      return this.roadCard(db.getRoadById("DE-A8"));
    }

    if (/l-?190|l190|schwarzwald|strabag|landesstra/.test(lower)) {
      return this.roadCard(db.getRoadById("DE-L190"));
    }

    if (/india|indian road|tamil nadu|chennai|bengaluru/.test(lower) && !/nh|sh|mdr/.test(lower)) {
      const india = db.roads.filter((r) => r.country === "India");
      return `
        <h4>🇮🇳 India — registered corridors</h4>
        <ul style="margin:10px 0; padding-left:20px; font-size:12px;">
          ${india.map((r) => `<li><strong>${r.id}</strong> — ${r.name.split("(")[0].trim()} (★${r.contractorPerformance})</li>`).join("")}
        </ul>
      `;
    }

    if (/usa|united states|america/.test(lower)) {
      const us = db.roads.filter((r) => r.country === "United States");
      return `<h4>🇺🇸 United States corridors</h4><ul style="margin:10px 0; padding-left:20px; font-size:12px;">${us.map((r) => `<li><strong>${r.id}</strong> — ${r.name}</li>`).join("")}</ul>`;
    }

    if (/germany|deutschland|europe/.test(lower)) {
      const de = db.roads.filter((r) => r.country === "Germany");
      return `<h4>🇩🇪 Germany corridors</h4><ul style="margin:10px 0; padding-left:20px; font-size:12px;">${de.map((r) => `<li><strong>${r.id}</strong> — ${r.name}</li>`).join("")}</ul>`;
    }

    if (/budget|overrun|overspend|spent|leakage|sanction/.test(lower)) {
      const sorted = [...db.roads]
        .map((r) => ({
          ...r,
          pct: ((r.spentBudget - r.sanctionedBudget) / r.sanctionedBudget) * 100,
        }))
        .sort((a, b) => b.pct - a.pct);
      return `
        <h4>💰 Budget audit (₹ Crores)</h4>
        <p style="font-size:12px; margin-top:6px;">Projects sorted by spend vs sanction variance:</p>
        <ol style="margin:10px 0; padding-left:20px; font-size:12px;">
          ${sorted
            .slice(0, 6)
            .map(
              (r) =>
                `<li style="margin-bottom:6px;"><strong>${r.id}</strong> — Sanctioned ${this.formatINR(r.sanctionedBudget)} · Spent ${this.formatINR(r.spentBudget)} <span class="${r.pct > 0 ? "text-danger" : "text-success"}">(${r.pct > 0 ? "+" : ""}${r.pct.toFixed(1)}%)</span></li>`
            )
            .join("")}
        </ol>
      `;
    }

    if (/under budget|on budget|savings|efficient/.test(lower)) {
      const good = db.roads.filter((r) => r.spentBudget <= r.sanctionedBudget);
      return `<h4>✅ On-budget projects</h4><ul style="margin:10px 0; padding-left:20px; font-size:12px;">${good.map((r) => `<li><strong>${r.id}</strong> — saved ${this.formatINR(r.sanctionedBudget - r.spentBudget)}</li>`).join("")}</ul>`;
    }

    if (/contractor|performance|ranking|rating|integrity/.test(lower)) {
      const ranked = [...db.roads].sort((a, b) => b.contractorPerformance - a.contractorPerformance);
      return `
        <h4>🛠️ Contractor integrity index</h4>
        <ol style="margin:10px 0; padding-left:20px; font-size:12px;">
          ${ranked.map((r) => `<li style="margin-bottom:4px;">${r.contractorPerformance >= 4 ? "🟢" : r.contractorPerformance >= 3 ? "🟡" : "🔴"} <strong>${r.contractorName}</strong> — ${r.contractorPerformance}/5 (${r.id})</li>`).join("")}
        </ol>
      `;
    }

    if (/worst|dangerous|unsafe|critical|bad road|pothole.*road/.test(lower)) {
      const bad = [...db.roads].sort((a, b) => (a.accidentRecords?.safetyRating || 10) - (b.accidentRecords?.safetyRating || 10));
      return `
        <h4>🚨 Highest-risk corridors (audit data)</h4>
        <ul style="margin:10px 0; padding-left:20px; font-size:12px;">
          ${bad
            .slice(0, 4)
            .map(
              (r) =>
                `<li style="margin-bottom:6px;"><strong>${r.id}</strong> — Safety ${r.accidentRecords?.safetyRating || "N/A"}/10 · ${r.accidentRecords?.annualAccidents || "?"} accidents/yr</li>`
            )
            .join("")}
        </ul>
      `;
    }

    if (/safest|best road|good road/.test(lower)) {
      const good = [...db.roads].sort((a, b) => (b.accidentRecords?.safetyRating || 0) - (a.accidentRecords?.safetyRating || 0));
      return `<h4>🟢 Best safety ratings</h4><ul style="margin:10px 0; padding-left:20px; font-size:12px;">${good.slice(0, 4).map((r) => `<li><strong>${r.id}</strong> — ${r.accidentRecords?.safetyRating}/10</li>`).join("")}</ul>`;
    }

    if (/engineer|executive|contact|phone|email|who is responsible|authority|pwd|nhai/.test(lower)) {
      const match = db.searchRoads(lower)[0] || db.findNearestRoad(ctx.coords[0], ctx.coords[1]).road;
      return `
        <h4>👨‍💻 Responsible authority</h4>
        ${this.roadCard(match, `<p style="font-size:11px; margin-top:8px;">Complaints on this corridor route to the executive engineer listed above via the formal grievance notice.</p>`)}
      `;
    }

    if (/routing|route complaint|file complaint|complaint.*who|grievance/.test(lower)) {
      return `
        <h4>📬 Complaint routing</h4>
        <p style="font-size:12px; margin-top:6px;">When you file a verified report, YatraRaksha:</p>
        <ol style="margin:10px 0; padding-left:20px; font-size:12px; line-height:1.5;">
          <li>Matches GPS coordinates to the nearest road asset in the registry</li>
          <li>Assigns the bound contractor and executive engineer from PWD/NHAI records</li>
          <li>Generates a formal civil grievance notice with budget audit context</li>
          <li>Queues offline if needed, then syncs to the outbox tracker</li>
        </ol>
        <button type="button" onclick="window.App.switchTab('capture')" class="btn btn-primary" style="padding:6px 12px; font-size:11px; margin-top:6px;">Go to AI Capture</button>
      `;
    }

    if (/relay|rela|pavement|last repair|maintenance|guarantee|warranty/.test(lower)) {
      return `
        <h4>📅 Relay & guarantee schedule</h4>
        <ul style="margin:10px 0; padding-left:20px; font-size:12px;">
          ${db.roads.map((r) => `<li><strong>${r.id}</strong> — Last relayed ${r.lastRelayingDate} · ${r.maintenanceGuaranteePeriod}-yr guarantee</li>`).join("")}
        </ul>
      `;
    }

    if (/funding|source of fund|who pays|finance/.test(lower)) {
      return `
        <h4>🏦 Funding sources</h4>
        <ul style="margin:10px 0; padding-left:20px; font-size:12px;">
          ${db.roads.map((r) => `<li><strong>${r.id}</strong> — ${r.fundingSource || "General public works budget"}</li>`).join("")}
        </ul>
      `;
    }

    if (/accident|fatality|safety rating|crash/.test(lower)) {
      return `
        <h4>⚠️ Accident & safety telemetry</h4>
        <ul style="margin:10px 0; padding-left:20px; font-size:12px;">
          ${db.roads
            .filter((r) => r.accidentRecords)
            .map(
              (r) =>
                `<li style="margin-bottom:6px;"><strong>${r.id}</strong> — ${r.accidentRecords.annualAccidents} accidents/yr, ${r.accidentRecords.fatalities} fatalities · Rating ${r.accidentRecords.safetyRating}/10</li>`
            )
            .join("")}
        </ul>
      `;
    }

    if (/live track|track.*trip|navigation live|during travel|on the way/.test(lower)) {
      return `
        <h4>📡 Live trip tracking</h4>
        <p style="font-size:12px; margin-top:6px;">After planning a route on the <strong>Map</strong> tab, tap <strong>Start live trip</strong>. GPS updates your position along the route with progress %, ETA, speed, and a moving vehicle marker until you reach the destination.</p>
        <button type="button" onclick="window.App.switchTab('map')" class="btn btn-primary" style="padding:6px 12px; font-size:11px; margin-top:8px;">Open map</button>
      `;
    }

    if (/safest route|plan route|from.*to|navigation|directions/.test(lower)) {
      return `
        <h4>🧭 Safe route planner</h4>
        <p style="font-size:12px; margin-top:6px;">Open the <strong>Map</strong> tab, enter <em>From</em> and <em>To</em> (e.g. Chennai → Bengaluru), then tap <strong>Find safest route</strong>. Use <strong>Start live trip</strong> for full GPS tracking to destination.</p>
        <button type="button" onclick="window.App.switchTab('map')" class="btn btn-primary" style="padding:6px 12px; font-size:11px; margin-top:8px;">Open route planner</button>
      `;
    }

    if (/map|satellite|pin|geolocation|coordinates/.test(lower)) {
      return `
        <h4>🗺️ Using the map hub</h4>
        <ul style="margin:10px 0; padding-left:20px; font-size:12px; line-height:1.5;">
          <li>Your <strong>live GPS</strong> updates latitude/longitude in the complaint form automatically</li>
          <li>Click road polylines for contractor and budget audit cards</li>
          <li>Drag the teal pin to override location manually</li>
          <li>Use toolbar: locate me, fit all roads, or jump to report flow</li>
        </ul>
        <button type="button" onclick="window.App.switchTab('map')" class="btn btn-primary" style="padding:6px 12px; font-size:11px;">Open map</button>
      `;
    }

    if (/offline|sync|outbox|no internet|network/.test(lower)) {
      return `
        <h4>📶 Offline & outbox sync</h4>
        <ul style="margin:10px 0; padding-left:20px; font-size:12px; line-height:1.4;">
          <li>Complaints save locally when offline</li>
          <li>AI runs heuristic validation on-device for road-like images</li>
          <li>GPS coordinates are captured at filing time from your last known fix</li>
          <li>Auto-sync pushes to authorities when connectivity returns</li>
        </ul>
      `;
    }

    if (/tracker|status|complaint.*status|outbox|my complaint|filed/.test(lower)) {
      return `
        <h4>📁 Grievance tracker</h4>
        <p style="font-size:12px; margin-top:6px;">View filed complaints, print audit notices, and follow the administrative timeline (Submitted → Verified → Assigned → Work commenced → Resolved).</p>
        <button type="button" onclick="window.App.switchTab('tracker')" class="btn btn-primary" style="padding:6px 12px; font-size:11px; margin-top:8px;">Open outbox tracker</button>
      `;
    }

    if (/how to report|file a complaint|submit a|report pothole|report issue|file complaint/.test(lower)) {
      return `
        <h4>📝 File a verified complaint</h4>
        <ol style="margin:10px 0; padding-left:20px; font-size:12px; line-height:1.5;">
          <li>Open <strong>AI Capture</strong> — allow location when prompted</li>
          <li>Latitude/longitude fill automatically from live GPS</li>
          <li>Upload a clear photo of the defect</li>
          <li>Review AI diagnostics and contractor routing</li>
          <li>Submit — track progress in the Outbox tab</li>
        </ol>
      `;
    }

    if (/ai|yolo|vision|photo|upload|verify|defect|crack|analyze/.test(lower)) {
      return `
        <h4>🤖 AI defect verification</h4>
        <p style="font-size:12px; margin-top:6px;">Upload a road photo in <strong>AI Capture</strong>. The engine checks that media shows pavement/infrastructure (not random objects), estimates severity, and links your <strong>live GPS</strong> to the nearest road registry entry.</p>
        <button type="button" onclick="window.App.switchTab('capture')" class="btn btn-secondary" style="padding:6px 12px; font-size:11px; margin-top:8px;">Start capture</button>
      `;
    }

    if (/transparency|tender|registry|table|audit board/.test(lower)) {
      return `
        <h4>📊 Tender & audit registry</h4>
        <p style="font-size:12px; margin-top:6px;">The transparency board lists NH/SH/MDR classifications, sanctioned vs spent budgets in ₹, relay dates, and executive engineers. Use <strong>Focus Map</strong> or <strong>Report</strong> on any row.</p>
        <button type="button" onclick="window.App.switchTab('transparency')" class="btn btn-secondary" style="padding:6px 12px; font-size:11px; margin-top:8px;">View registry</button>
      `;
    }

    if (/thank|thanks|great|awesome/.test(lower)) {
      return `<p>You're welcome! Stay safe on the roads — and thank you for supporting public infrastructure transparency. 🙏</p>`;
    }

    const searchHits = db.searchRoads(lower);
    if (searchHits.length === 1) return this.roadCard(searchHits[0]);
    if (searchHits.length > 1) {
      return `
        <h4>🔎 Multiple roads matched</h4>
        <ul style="margin:10px 0; padding-left:20px; font-size:12px;">
          ${searchHits.slice(0, 5).map((r) => `<li><button type="button" onclick="window.App.sendBotMessage('${r.id} details')" class="quick-action-pill" style="margin:2px 0;">${r.id} — ${r.name.substring(0, 40)}…</button></li>`).join("")}
        </ul>
      `;
    }

    if (/\bin-[a-z0-9]+\b|\bus-[a-z0-9]+\b|\bde-[a-z0-9]+\b/i.test(lower)) {
      const id = lower.match(/\b((in|us|de)-[a-z0-9]+)\b/i)?.[1]?.toUpperCase();
      if (id) {
        const road = db.getRoadById(id);
        if (road) return this.roadCard(road);
      }
    }

    return this.fallback(input, ctx);
  },

  fallback(input, ctx) {
    const safe = ctx.escapeHTML(input);
    return `
      <p>I processed: <em>"${safe}"</em></p>
      <p style="margin-top:6px; font-size:12px;">Try one of these topics:</p>
      <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:8px;">
        <button type="button" onclick="window.App.sendBotMessage('What road is nearest to my location?')" class="quick-action-pill">📍 Near me</button>
        <button type="button" onclick="window.App.sendBotMessage('Show budget overruns')" class="quick-action-pill">💸 Budget</button>
        <button type="button" onclick="window.App.sendBotMessage('NH-48 contractor and engineer')" class="quick-action-pill">NH-48</button>
        <button type="button" onclick="window.App.sendBotMessage('Worst roads by safety')" class="quick-action-pill">🚨 Risk</button>
        <button type="button" onclick="window.App.sendBotMessage('How does complaint routing work?')" class="quick-action-pill">📬 Routing</button>
        <button type="button" onclick="window.App.sendBotMessage('How to report a pothole')" class="quick-action-pill">📝 Report</button>
      </div>
    `;
  },
};

window.ChatbotResponses = ChatbotResponses;
