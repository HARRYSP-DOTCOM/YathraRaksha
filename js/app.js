/**
 * YatraRaksha Application Orchestrator - INR & Satellite Enabled
 * Coordinates navigation grids, on-demand double satellite map loads,
 * Chart.js Crores diagrams, YOLO edge diagnostic logs, and conversational chatbot guides.
 */

const App = {
  activeTab: "overview",
  selectedCoords: [12.9716, 79.1588],
  coordsLockedByUser: false,
  liveLocationStatus: "pending",
  _locationUnsubscribe: null,
  activeRoutePlan: null,
  selectedRouteId: null,
  tripActive: false,
  activeAIReport: null,
  activeCharts: {},
  escapeHTML(str) {
    if (!str) return "";
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  },
  miniMap: null,
  deferredInstallPrompt: null,

  sampleMediaFiles: {
    pothole: {
      name: "sample_image_001.jpg",
      coords: [12.9716, 79.1588],
      description: "Severe Class-III structural failure forming in the middle lane of the NH-48 expressway. Creating hazardous swerving for high-speed traffic."
    },
    crack: {
      name: "sample_image_002.png",
      coords: [37.3861, -122.0839],
      description: "Extensive alligator structural cracking near the CA-101 highway offramp. Surface aggregate is completely loose."
    },
    marking: {
      name: "sample_image_003.jpg",
      coords: [12.9229, 80.1239],
      description: "Center line and shoulder markings have faded completely on MDR-12, causing dangerous driving lanes during night hours."
    },
    light: {
      name: "sample_image_004.jpg",
      coords: [30.2672, -97.7431],
      description: "Streetlight knocked down due to utility accident, leaving the intersection in complete darkness."
    },
    cat: {
      name: "sample_image_005.png",
      coords: [48.4682, 8.2439],
      description: "Just a cute office kitten sitting on a keyboard."
    },
    coffee: {
      name: "sample_image_006.jpg",
      coords: [40.8501, -73.8407],
      description: "My morning espresso coffee cup."
    }
  },

  /**
   * Animated welcome splash before dashboard (once per browser session).
   */
  _captchaAnswer: null,

  _createCaptcha() {
    const a = Math.floor(Math.random() * 7) + 3;
    const b = Math.floor(Math.random() * 6) + 2;
    return {
      question: `What is ${a} + ${b}?`,
      answer: String(a + b),
    };
  },

  showCaptchaStep(onComplete) {
    const main = document.getElementById("welcome-main");
    const panel = document.getElementById("welcome-captcha");
    const questionEl = document.getElementById("captcha-question");
    const answerInput = document.getElementById("captcha-answer");
    const feedback = document.getElementById("captcha-feedback");
    const challenge = this._createCaptcha();

    this._captchaAnswer = challenge.answer;

    main?.classList.add("welcome-hidden");
    panel?.classList.remove("hidden");

    if (questionEl) questionEl.textContent = challenge.question;
    if (answerInput) {
      answerInput.value = "";
      answerInput.focus();
    }
    if (feedback) feedback.textContent = "";
  },

  verifyCaptcha(onComplete) {
    const answerInput = document.getElementById("captcha-answer");
    const feedback = document.getElementById("captcha-feedback");
    const answer = answerInput?.value.trim() || "";

    if (!answer) {
      if (feedback) feedback.textContent = "Please enter the captcha answer before continuing.";
      answerInput?.focus();
      return;
    }

    if (answer === this._captchaAnswer) {
      this.dismissWelcome(onComplete);
      return;
    }

    if (feedback) feedback.textContent = "Incorrect answer. Please try again.";
    if (answerInput) {
      answerInput.value = "";
      answerInput.focus();
    }
  },

  showWelcome(onComplete) {
    const screen = document.getElementById("welcome-screen");
    const done = typeof onComplete === "function" ? onComplete : () => {};

    if (!screen) {
      done();
      return;
    }

    if (sessionStorage.getItem("roadwatch_welcome_seen") === "1") {
      screen.remove();
      this.revealAppLayout();
      done();
      return;
    }

    document.body.classList.add("welcome-active");

    const enter = () => this.showCaptchaStep(done);

    document.getElementById("welcome-enter-btn")?.addEventListener("click", enter);
    document.getElementById("welcome-skip-btn")?.addEventListener("click", () => this.dismissWelcome(done));
    document.getElementById("captcha-verify-btn")?.addEventListener("click", () => this.verifyCaptcha(done));
    document.getElementById("captcha-back-btn")?.addEventListener("click", () => {
      document.getElementById("welcome-captcha")?.classList.add("hidden");
      document.getElementById("welcome-main")?.classList.remove("welcome-hidden");
    });
    document.getElementById("captcha-answer")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.verifyCaptcha(done);
      }
    });

    const self = this;
    function welcomeKey(e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const captchaPanel = document.getElementById("welcome-captcha");
        if (captchaPanel && !captchaPanel.classList.contains("hidden")) {
          self.verifyCaptcha(done);
        } else {
          enter();
        }
        document.removeEventListener("keydown", welcomeKey);
      }
    }

    document.addEventListener("keydown", welcomeKey);
  },

  dismissWelcome(onComplete) {
    const screen = document.getElementById("welcome-screen");
    sessionStorage.setItem("roadwatch_welcome_seen", "1");
    document.body.classList.remove("welcome-active");

    if (!screen) {
      if (onComplete) onComplete();
      return;
    }

    screen.classList.add("welcome-screen--exit");

    setTimeout(() => {
      screen.remove();
      this.revealAppLayout();
      if (onComplete) onComplete();
    }, 720);
  },

  revealAppLayout() {
    document.querySelector(".app-layout")?.classList.add("app-layout--revealed");
  },

  /**
   * Application bootstrapper
   */
  init() {
    if (this._dashboardReady) return;
    this._dashboardReady = true;

    console.log("✅ YatraRaksha ready:", AuthModule.getUser()?.name);

    // Initialize core services
    this.registerEventListeners();

    const launchTab = new URLSearchParams(window.location.search).get("tab");
    if (launchTab) this.switchTab(launchTab);

    this.checkNetworkStatus();
    this.requestNotificationPermission();
    this.renderReportsList();
    this.initCharts();
    
    window.ROADS_DATA?.mergeRoadEnrichment?.();

    this.applyCoordinates(this.selectedCoords[0], this.selectedCoords[1], {
      updateMap: false,
      silent: true,
    });
    this.startLiveLocation();

    if (!document.getElementById("chat-box")?.children?.length) {
      this.appendChatMessage(
        "assistant",
        "👋 Hi! I'm YatraGPT. Ask me about road quality, contractor budgets, filing complaints, or safe routes."
      );
    }

    this.monitorStorageQuota();
  },

  registerEventListeners() {
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        const modal = document.getElementById('public-timeline-modal');
        if (modal) modal.style.display = 'none';
      }
    });

    // Navigation Tabs (Supports both Desktop sidebar and Mobile bottom tabs)
    document.querySelectorAll(".nav-link, .mobile-nav-link").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const tab = e.currentTarget.getAttribute("data-tab");
        if (tab) this.switchTab(tab);
      });
    });

    // File input selection
    const dropZone = document.getElementById("drop-zone");
    const fileInput = document.getElementById("file-input");

    dropZone.addEventListener("click", () => fileInput.click());
    
    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("dragover");
    });

    dropZone.addEventListener("dragleave", () => {
      dropZone.classList.remove("dragover");
    });

    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("dragover");
      if (e.dataTransfer.files.length > 0) {
        this.handleFileSelected(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener("change", (e) => {
      if (e.target.files.length > 0) {
        this.handleFileSelected(e.target.files[0]);
      }
    });

    // Form Submission
    document.getElementById("complaint-form").addEventListener("submit", (e) => {
      e.preventDefault();
      this.submitComplaint();
    });

    // Fallback: enable submit button if fields manually filled without AI scan
    const enableIfManual = () => {
      const btn = document.getElementById("file-complaint-btn");
      if (!btn || !btn.disabled) return;
      const desc = document.getElementById("user-desc")?.value?.trim();
      const contact = document.getElementById("user-contact")?.value?.trim();
      if (desc && contact) {
        setTimeout(() => {
          if (btn.disabled) {
            btn.disabled = false;
            btn.title = "Unverified — AI scan not completed";
            btn.innerHTML = "📄 File Unverified Complaint";
          }
        }, 3000);
      }
    };
    document.getElementById("user-desc")?.addEventListener("input", enableIfManual);
    document.getElementById("user-contact")?.addEventListener("input", enableIfManual);


    document.getElementById("chat-input")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.handleUserChatMessage();
      }
    });

    document.getElementById("map-panel-close")?.addEventListener("click", () => {
      const panel = document.getElementById("map-audit-panel");
      if (panel) panel.style.display = "none";
    });

    document.getElementById("btn-use-live-gps")?.addEventListener("click", () => {
      this.useLiveGpsLocation(true);
    });

    document.getElementById("btn-plan-route")?.addEventListener("click", () => this.planSafeRoute());
    document.getElementById("btn-clear-route")?.addEventListener("click", () => this.clearRoutes());
    document.getElementById("btn-route-use-gps")?.addEventListener("click", () => this.setRouteFromGps());
    document.getElementById("btn-start-trip")?.addEventListener("click", () => this.startLiveTrip());
    document.getElementById("btn-stop-trip")?.addEventListener("click", () => this.stopLiveTrip());

    // Offline sync triggers
    window.addEventListener("online", () => {
      this.checkNetworkStatus();
      window.RoadTracker.syncOfflineQueue((syncedItem) => {
        this.showToast(`✨ Synced offline complaint: RWAI-${syncedItem.id}`);
        this.renderReportsList();
      });
    });

    window.addEventListener("offline", () => {
      this.checkNetworkStatus();
    });

    // Listen for background state updates from Tracker simulation
    window.addEventListener("yatra_raksha_complaint_update", (e) => {
      this.renderReportsList();
      this.showToast(`🔔 Status Update [RWAI-${e.detail.id.substring(5, 11)}]: ${e.detail.status}`);
      
      const detailContainer = document.getElementById("active-tracker-container");
      if (detailContainer && detailContainer.getAttribute("data-id") === e.detail.id) {
        this.viewComplaintDetails(e.detail.id);
      }
    });

    // Language switcher (sidebar)
    this.initLanguageSwitcher();
  },

  /* ─── Language / Accessibility Switcher ─── */
  _currentLang: "en",
  _langNames: {
    en: "English", hi: "हिन्दी", ml: "മലയാളം",
    ta: "தமிழ்", kn: "ಕನ್ನಡ", te: "తెలుగు",
    bn: "বাংলা", mr: "मराठी",
  },

  initLanguageSwitcher() {
    /* Sidebar toggle */
    const sidebarToggle = document.getElementById("lang-toggle-sidebar");
    const sidebarDropdown = document.getElementById("lang-dropdown-sidebar");
    if (sidebarToggle && sidebarDropdown) {
      sidebarToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        const open = sidebarDropdown.classList.toggle("open");
        sidebarToggle.setAttribute("aria-expanded", open);
      });

      sidebarDropdown.querySelectorAll(".lang-option").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.selectLanguage(btn.dataset.lang, sidebarDropdown);
        });
      });
    }

    /* Mobile globe button → bottom sheet modal */
    document.getElementById("lang-toggle-mobile")?.addEventListener("click", () => {
      this.showMobileLangModal();
    });

    /* Close dropdown on outside click */
    document.addEventListener("click", () => {
      if (sidebarDropdown?.classList.contains("open")) {
        sidebarDropdown.classList.remove("open");
        sidebarToggle?.setAttribute("aria-expanded", "false");
      }
    });
  },

  selectLanguage(langCode, container) {
    this._currentLang = langCode;
    const nativeName = this._langNames[langCode] || langCode;

    /* Update active states in the given container */
    container?.querySelectorAll(".lang-option").forEach((opt) => {
      const isActive = opt.dataset.lang === langCode;
      opt.classList.toggle("active", isActive);
      opt.setAttribute("aria-selected", isActive);
      /* Toggle checkmark */
      let check = opt.querySelector(".lang-check");
      if (isActive && !check) {
        check = document.createElement("span");
        check.className = "lang-check";
        check.textContent = "✓";
        opt.appendChild(check);
      }
    });

    /* Update sidebar label */
    const label = document.getElementById("lang-current-label");
    if (label) label.textContent = nativeName;

    /* Set lang attribute on html element */
    document.documentElement.lang = langCode;

    /* Close sidebar dropdown */
    const dropdown = document.getElementById("lang-dropdown-sidebar");
    dropdown?.classList.remove("open");
    document.getElementById("lang-toggle-sidebar")?.setAttribute("aria-expanded", "false");

    /* Close mobile modal if open */
    document.getElementById("lang-modal-overlay")?.remove();

    if (langCode === "en") {
      this.showToast("🌐 Language: English (default)");
    } else {
      this.showToast(`🌐 Language set to ${nativeName} — translation support coming soon!`);
    }
  },

  showMobileLangModal() {
    if (document.getElementById("lang-modal-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "lang-modal-overlay";
    overlay.className = "lang-modal-overlay";

    const langEntries = Object.entries(this._langNames)
      .map(([code, native]) => {
        const isActive = code === this._currentLang;
        const flag = code === "en" ? "🇬🇧" : "🇮🇳";
        const engLabel = code === "en" ? "" : `<span class="lang-label">${
          { hi: "Hindi", ml: "Malayalam", ta: "Tamil", kn: "Kannada",
            te: "Telugu", bn: "Bengali", mr: "Marathi" }[code] || ""
        }</span>`;
        return `<button type="button" class="lang-option ${isActive ? 'active' : ''}" data-lang="${code}" role="option" aria-selected="${isActive}">
          <span class="lang-flag">${flag}</span>
          <span class="lang-native">${native}</span>
          ${engLabel}
          ${isActive ? '<span class="lang-check">✓</span>' : ''}
        </button>`;
      })
      .join("");

    overlay.innerHTML = `
      <div class="lang-modal-panel">
        <div class="lang-dropdown-header">
          <span>🌐 Interface language</span>
          <span class="lang-dropdown-badge">Accessibility</span>
        </div>
        ${langEntries}
        <div class="lang-dropdown-footer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          Translation support coming soon
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    /* Tap on backdrop to close */
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });

    /* Wire lang buttons */
    overlay.querySelectorAll(".lang-option").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.selectLanguage(btn.dataset.lang, overlay.querySelector(".lang-modal-panel"));
      });
    });
  },

  /**
   * Initialize Miniature Map on Overview tab (Traced color segments)
   */
  initMiniMap() {
    if (window._overviewMapInit && this.miniMap) {
      setTimeout(() => this.miniMap?.invalidateSize(), 100);
      return;
    }
    if (this.miniMap) return;
    if (typeof L === "undefined" || !window.RoadDatabase) {
      this.renderMapFallback("overview-mini-map", "Map preview is unavailable while the mapping library is offline.");
      return;
    }

    this.miniMap = L.map("overview-mini-map", {
      center: [20.5937, 78.9629],
      zoom: 4,
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: false,
    });

    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 19 }
    ).addTo(this.miniMap);

    const bounds = [];
    window.RoadDatabase.roads.forEach((road) => {
      if (road.path?.length) {
        L.polyline(road.path, {
          color: road.statusColor,
          weight: 5,
          opacity: 0.85,
          lineCap: "round",
        }).addTo(this.miniMap);
        bounds.push(...road.path);
      }
      L.circleMarker(road.coordinates, {
        radius: 5,
        fillColor: road.statusColor,
        color: "#ffffff",
        weight: 2,
        fillOpacity: 1,
      }).addTo(this.miniMap);
      bounds.push(road.coordinates);
    });

    if (bounds.length) {
      this.miniMap.fitBounds(bounds, { padding: [24, 24], maxZoom: 5 });
    }
    window._overviewMapInit = true;
  },

  /**
   * Handle dynamic tab switching
   */
  async loadBudgetDashboard() {
    const formatCr = v => `₹${(v/10000000).toFixed(2)} Cr`;
    const formatCrDirect = (cr) => `₹${Number(cr || 0).toLocaleString()} Cr`;
    try {
      const data = await APIService.request('/audit/budget');
      const sector = data.national_budget_road_sector || [];
      const latest = [...sector].reverse().find((y) => y.actual_spent_cr != null) || sector[sector.length - 1];
      if (latest) {
        document.getElementById('bkpi-allocated').textContent = formatCrDirect(latest.budget_allocated_cr);
        document.getElementById('bkpi-spent').textContent = formatCrDirect(latest.actual_spent_cr);
        const rem = (latest.budget_allocated_cr || 0) - (latest.actual_spent_cr || 0);
        document.getElementById('bkpi-remaining').textContent = formatCrDirect(rem);
        document.getElementById('bkpi-utilization').textContent = (latest.utilization_percent ?? '—') + (latest.utilization_percent != null ? '%' : '');
      } else if (data.summary) {
        const s = data.summary;
        document.getElementById('bkpi-allocated').textContent = formatCr(s.totalSanctioned);
        document.getElementById('bkpi-spent').textContent = formatCr(s.totalSpent);
        document.getElementById('bkpi-remaining').textContent = formatCr(s.totalRemaining || (s.totalSanctioned - s.totalSpent));
        document.getElementById('bkpi-utilization').textContent = (s.utilizationPercent || 0) + '%';
      }
      const s = data.summary;
      if (!latest && !s) return;

      // Chart
      const canvas = document.getElementById('chart-budget-detail');
      if (canvas && typeof Chart !== 'undefined') {
        if (this.activeCharts.budgetDetail) this.activeCharts.budgetDetail.destroy();
        const fyRows = sector.filter((y) => y.actual_spent_cr != null);
        const labels = fyRows.length ? fyRows.map((y) => y.fiscal_year) : (data.roads || []).map(r => r.id);
        const allocated = fyRows.length ? fyRows.map((y) => y.budget_allocated_cr) : (data.roads || []).map(r => r.sanctionedBudget / 10000000);
        const spent = fyRows.length ? fyRows.map((y) => y.actual_spent_cr) : (data.roads || []).map(r => r.spentBudget / 10000000);
        this.activeCharts.budgetDetail = new Chart(canvas.getContext('2d'), {
          type: 'bar',
          data: {
            labels,
            datasets: [
              { label: 'Allocated (₹Cr)', data: allocated, backgroundColor: 'rgba(56,189,248,0.35)', borderColor: 'var(--tertiary)', borderWidth: 1.5, borderRadius: 5 },
              { label: 'Spent (₹Cr)', data: spent,
                backgroundColor: spent.map((v,i) => v > allocated[i] ? 'rgba(248,113,113,0.5)' : 'rgba(45,212,191,0.4)'),
                borderColor: spent.map((v,i) => v > allocated[i] ? 'var(--accent-red)' : 'var(--primary)'),
                borderWidth: 1.5, borderRadius: 5 }
            ]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans' } } } },
            scales: {
              x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#94a3b8' } },
              y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#94a3b8' } }
            }
          }
        });
      }

      // Table
      const tableEl = document.getElementById('budget-roads-table');
      if (tableEl && data.roads?.length) {
        tableEl.innerHTML = data.roads.map(r => {
          const statusStyle = r.statusLabel === 'Over Budget'
            ? { badge: 'badge-warn', bar: 'var(--accent-red)' }
            : r.statusLabel === 'Under-utilized'
            ? { badge: 'badge-sh', bar: 'var(--secondary)' }
            : { badge: 'badge-good', bar: 'var(--primary)' };
          const pct = Math.min(r.utilizationPercent || 0, 130);
          return `
            <div class="glass-card" style="padding:12px; cursor:pointer;" onclick="window.App.showRoadBudgetDetail('${r.id}')">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; flex-wrap:wrap;">
                <div style="flex:1; min-width:0;">
                  <p style="font-weight:700; font-size:13px; color:var(--text-white); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${r.name}</p>
                  <p style="font-size:11px; color:var(--text-muted); margin-top:2px;">${r.contractorName || ''}</p>
                </div>
                <span class="badge ${statusStyle.badge}" style="flex-shrink:0; font-size:10px;">${r.statusLabel}</span>
              </div>
              <div style="display:flex; gap:16px; margin-top:8px; font-size:12px; flex-wrap:wrap;">
                <span style="color:var(--text-muted);">Allocated: <strong style="color:var(--text-white);">${formatCr(r.sanctionedBudget)}</strong></span>
                <span style="color:var(--text-muted);">Spent: <strong style="color:var(--text-white);">${formatCr(r.spentBudget)}</strong></span>
              </div>
              <!-- Mini progress bar -->
              <div style="margin-top:8px; height:4px; background:rgba(255,255,255,0.06); border-radius:2px; overflow:hidden;">
                <div style="height:100%; width:${Math.min(pct,100)}%; background:${statusStyle.bar}; border-radius:2px; transition:width 0.6s;"></div>
              </div>
              <p style="font-size:10px; color:var(--text-muted); margin-top:3px;">${r.utilizationPercent}% utilization</p>
            </div>
          `;
        }).join('');
      } else if (tableEl && sector.length) {
        tableEl.innerHTML = sector
          .filter((y) => y.actual_spent_cr != null)
          .map(
            (y) => `
          <div class="glass-card" style="padding:12px;">
            <p style="font-weight:700;color:var(--text-white);">FY ${y.fiscal_year}</p>
            <p style="font-size:11px;color:var(--text-muted);">Allocated ₹${y.budget_allocated_cr?.toLocaleString()} Cr · Spent ₹${y.actual_spent_cr?.toLocaleString()} Cr</p>
            <span class="source-badge">${y.source || "Union Budget"}</span>
          </div>`
          )
          .join("");
      }

      // Load contractor dashboard alongside budget data
      this.loadContractorDashboard();
    } catch(e) {
      this.showToast('Budget data unavailable — check backend.');
    }
  },

  async loadContractorDashboard() {
    const formatCr = v => `₹${(v/10000000).toFixed(2)} Cr`;
    const listEl = document.getElementById('contractor-dashboard-list');
    if (!listEl) return;
    try {
      const contractors = await APIService.request('/contractors/dashboard');
      const highRisk = contractors.filter(c => c.riskLevel === 'High');
      if (highRisk.length) {
        listEl.insertAdjacentHTML('beforebegin', `
          <div style="padding:10px 14px; background:rgba(248,113,113,0.08); border:1px solid rgba(248,113,113,0.3); border-radius:var(--border-radius-md); margin-bottom:12px; font-size:12px; color:var(--accent-red);">
            ⚠️ <strong>${highRisk.length} HIGH-RISK contractor${highRisk.length>1?'s':''}</strong> flagged: ${highRisk.map(c=>c.name).join(', ')}
          </div>
        `);
      }
      listEl.innerHTML = contractors.map(c => {
        const riskStyle = c.riskLevel === 'High' ? 'badge-warn' : c.riskLevel === 'Medium' ? 'badge-sh' : 'badge-good';
        const utilPct = Math.min(c.budgetUtilization, 130);
        const utilColor = c.budgetUtilization > 100 ? 'var(--accent-red)' : 'var(--primary)';
        const stars = '★'.repeat(Math.round(c.rating)) + '☆'.repeat(5 - Math.round(c.rating));
        return `
          <div class="glass-card" style="padding:14px;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
              <div>
                <p style="font-weight:700; font-size:13px; color:var(--text-white);">${c.name}</p>
                <p style="font-size:11px; color:var(--secondary); margin-top:2px;">${stars} ${c.rating}/5</p>
              </div>
              <span class="badge ${riskStyle}" style="font-size:10px;">${c.riskLevel} Risk</span>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:10px; font-size:11px;">
              <span style="color:var(--text-muted);">Roads: <strong style="color:var(--text-white);">${c.roadsManaged}</strong></span>
              <span style="color:var(--text-muted);">Complaints: <strong style="color:var(--text-white);">${c.totalComplaints}</strong></span>
              <span style="color:var(--text-muted);">Allocated: <strong style="color:var(--text-white);">${formatCr(c.totalAllocated)}</strong></span>
              <span style="color:var(--text-muted);">Resolution: <strong style="color:var(--text-white);">${c.resolutionRate}%</strong></span>
            </div>
            <!-- Budget utilisation mini bar -->
            <div style="margin-top:10px;">
              <div style="display:flex; justify-content:space-between; font-size:10px; color:var(--text-muted); margin-bottom:3px;">
                <span>Budget utilisation</span><span style="color:${utilColor};">${c.budgetUtilization}%</span>
              </div>
              <div style="height:4px; background:rgba(255,255,255,0.06); border-radius:2px; overflow:hidden;">
                <div style="height:100%; width:${Math.min(utilPct,100)}%; background:${utilColor}; border-radius:2px;"></div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    } catch(e) {
      if (listEl) listEl.innerHTML = '<p style="color:var(--text-muted); font-size:12px;">Contractor data unavailable.</p>';
    }
  },

  showRoadBudgetDetail(roadId) {
    const road = window.RoadDatabase?.getRoadById(roadId);
    if (!road) return;
    const formatCr = v => `₹${(v/10000000).toFixed(2)} Cr`;
    const overrun = road.spentBudget > road.sanctionedBudget;
    alert(`${road.name}\n\nFunding: ${road.fundingSource}\nContractor: ${road.contractorName} (${road.contractorPerformance}/5★)\nAllocated: ${formatCr(road.sanctionedBudget)}\nSpent: ${formatCr(road.spentBudget)}\n${overrun ? '⚠️ BUDGET OVERRUN: ' + formatCr(road.spentBudget - road.sanctionedBudget) + ' over budget' : '✅ Within budget'}\nLast relayed: ${road.lastRelayingDate}\nGuarantee period: ${road.maintenanceGuaranteePeriod} years`);
  },

  _alertsData: [],

  async loadAlertsTab() {
    const listEl = document.getElementById('alerts-list');
    if (!listEl) return;
    listEl.innerHTML = '<p style="color:var(--text-muted); font-size:13px;">Loading alerts…</p>';
    try {
      this._alertsData = await APIService.request('/alerts/roads');
      this.renderAlertsList(this._alertsData);
    } catch(e) {
      listEl.innerHTML = '<p style="color:var(--text-muted);">Alerts unavailable — check backend connection.</p>';
    }
  },

  filterAlerts(level) {
    if (!this._alertsData.length) return;
    const filtered = level === 'all' ? this._alertsData : this._alertsData.filter(r => r.overallRisk === level);
    this.renderAlertsList(filtered);
  },

  renderAlertsList(data) {
    const listEl = document.getElementById('alerts-list');
    if (!listEl) return;
    const ICONS = { BUDGET_OVERRUN:'💸', EXCESSIVE_POTHOLES:'🕳️', HIGH_COMPLAINTS:'📋', LOW_CONTRACTOR_RATING:'⭐', POOR_SAFETY:'🛡️', GUARANTEE_EXPIRED:'📅' };
    const RISK_BADGE = { Critical:'badge-warn', High:'badge-sh', Medium:'badge-nh', Low:'badge-good' };
    if (!data.length) { listEl.innerHTML = '<p style="color:var(--text-muted); font-size:13px;">No alerts match this filter.</p>'; return; }
    listEl.innerHTML = data.map(r => `
      <div class="glass-card ${r.overallRisk === 'Critical' ? 'highlight-orange' : ''}" style="padding:14px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; flex-wrap:wrap;">
          <div style="flex:1;">
            <p style="font-weight:700; font-size:13px; color:var(--text-white);">${r.roadName}</p>
            <p style="font-size:11px; color:var(--text-muted);">Risk Score: ${r.riskScore}/100</p>
          </div>
          <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
            <span class="badge ${RISK_BADGE[r.overallRisk] || 'badge-sh'}" style="font-size:10px;">${r.overallRisk}</span>
            <button class="btn btn-secondary btn-sm" style="font-size:10px;" onclick="window.App.focusRoadOnMap('${r.roadId}')">🗺️ View</button>
          </div>
        </div>
        <div style="margin-top:10px; display:flex; flex-direction:column; gap:6px;">
          ${r.alerts.map(a => `
            <div style="display:flex; gap:8px; align-items:center; padding:6px 10px; background:rgba(255,255,255,0.03); border-radius:var(--border-radius-sm);">
              <span style="font-size:14px;">${ICONS[a.type] || '⚠️'}</span>
              <div>
                <span class="badge ${a.severity === 'Critical' ? 'badge-warn' : 'badge-sh'}" style="font-size:9px; margin-right:6px;">${a.severity}</span>
                <span style="font-size:12px; color:var(--text-muted);">${a.message}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  },


  async loadAccountabilityTab() {
    const listEl = document.getElementById('accountability-list');
    if (!listEl) return;
    listEl.innerHTML = '<p style="color:var(--text-muted); font-size:13px; padding:20px 0;">Loading scores…</p>';
    try {
      const lb = await APIService.request('/accountability/leaderboard');
      const all = await APIService.request('/accountability/scores');
      this._accountabilityData = all;

      // Animate national gauge
      const arc = document.getElementById('gauge-arc');
      const scoreText = document.getElementById('national-score-text');
      const totalEl = document.getElementById('national-total-roads');
      if (arc && scoreText) {
        const pct = lb.nationalAverage / 100;
        arc.style.strokeDashoffset = 314 - (314 * pct);
        arc.style.stroke = pct >= 0.75 ? 'var(--primary)' : pct >= 0.5 ? 'var(--secondary)' : 'var(--accent-red)';
        scoreText.textContent = lb.nationalAverage;
        if (totalEl) totalEl.textContent = `${lb.totalRoads} roads monitored`;
      }

      this.renderAccountabilityList(all);
    } catch(e) {
      if (listEl) listEl.innerHTML = '<p style="color:var(--text-muted);">Accountability data unavailable — check backend.</p>';
    }
  },

  filterAccountability(filter) {
    if (!this._accountabilityData.length) return;
    let filtered = this._accountabilityData;
    if (filter === 'A') filtered = filtered.filter(r => r.grade === 'A' || r.grade === 'A+');
    else if (filter === 'B') filtered = filtered.filter(r => r.grade === 'B');
    else if (filter === 'needs') filtered = filtered.filter(r => ['C','D','F'].includes(r.grade));
    this.renderAccountabilityList(filtered);
  },

  renderAccountabilityList(data) {
    const listEl = document.getElementById('accountability-list');
    if (!listEl) return;
    if (!data.length) { listEl.innerHTML = '<p style="color:var(--text-muted); font-size:13px;">No roads match this filter.</p>'; return; }

    const GRADE_STYLE = {
      'A+': { color:'#fbbf24', bg:'rgba(251,191,36,0.12)', border:'rgba(251,191,36,0.3)' },
      'A':  { color:'#10b981', bg:'rgba(16,185,129,0.12)', border:'rgba(16,185,129,0.3)' },
      'B':  { color:'var(--tertiary)', bg:'rgba(56,189,248,0.1)', border:'rgba(56,189,248,0.25)' },
      'C':  { color:'var(--secondary)', bg:'rgba(251,191,36,0.1)', border:'rgba(251,191,36,0.25)' },
      'D':  { color:'var(--accent-red)', bg:'rgba(248,113,113,0.1)', border:'rgba(248,113,113,0.25)' },
      'F':  { color:'#ef4444', bg:'rgba(239,68,68,0.15)', border:'rgba(239,68,68,0.35)' },
    };

    listEl.innerHTML = data.map((r, idx) => {
      const gs = GRADE_STYLE[r.grade] || GRADE_STYLE['C'];
      const pct = r.accountabilityScore;
      const barColor = pct >= 75 ? 'var(--primary)' : pct >= 50 ? 'var(--secondary)' : 'var(--accent-red)';
      const breakdown = r.scoreBreakdown || {};
      return `
        <div class="glass-card" style="padding:14px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <!-- Rank -->
            <div style="font-size:11px; font-weight:700; color:var(--text-muted); width:24px; text-align:center;">#${idx+1}</div>
            <!-- Grade circle -->
            <div style="width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:15px; font-weight:800; flex-shrink:0; color:${gs.color}; background:${gs.bg}; border:2px solid ${gs.border};">${r.grade}</div>
            <!-- Name + score -->
            <div style="flex:1; min-width:0;">
              <p style="font-weight:700; font-size:13px; color:var(--text-white); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${r.roadName}</p>
              <p style="font-size:11px; color:var(--text-muted);">Score: <strong style="color:${barColor};">${r.accountabilityScore}/100</strong></p>
            </div>
            <!-- Share button -->
            <button class="btn btn-secondary btn-sm" style="font-size:10px; flex-shrink:0;" onclick="window.App.shareAccountabilityScore('${r.roadId}','${r.roadName}',${r.accountabilityScore},'${r.grade}')">📤</button>
          </div>

          <!-- Score bar -->
          <div style="margin:10px 0 6px; height:4px; background:rgba(255,255,255,0.06); border-radius:2px; overflow:hidden;">
            <div style="height:100%; width:${pct}%; background:${barColor}; border-radius:2px; transition:width 0.8s ease;"></div>
          </div>

          <!-- 5 metric rows -->
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px 16px; font-size:11px; margin-top:6px;">
            <span style="color:var(--text-muted);">Resolution Rate: <strong style="color:var(--text-white);">${r.resolutionRate}%</strong></span>
            <span style="color:var(--text-muted);">Avg Time: <strong style="color:var(--text-white);">${r.avgResolutionTimeHours}h</strong></span>
            <span style="color:var(--text-muted);">Budget Util: <strong style="color:var(--text-white);">${r.budgetUtilization}%</strong></span>
            <span style="color:var(--text-muted);">Satisfaction: <strong style="color:var(--text-white);">${r.citizenSatisfaction}%</strong></span>
            <span style="color:var(--text-muted);">Spending Eff: <strong style="color:var(--text-white);">${r.spendingEfficiency}%</strong></span>
          </div>
        </div>
      `;
    }).join('');
  },

  shareAccountabilityScore(roadId, roadName, score, grade) {
    const text = `🏆 Road Accountability Score\n${roadName}\nScore: ${score}/100 | Grade: ${grade}\n\n#RoadWatch #YathraRaksha #RoadSafety`;
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => {
        this.showToast('Score copied to clipboard!');
      });
    }
  },

  switchTab(tabId) {
    this.activeTab = tabId;
    
    // Update both Desktop sidebar links and Mobile bottom navigation active states
    document.querySelectorAll(".nav-link, .mobile-nav-link").forEach(link => {
      if (link.getAttribute("data-tab") === tabId) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });

    // Update Content Panel visibility
    document.querySelectorAll(".tab-content").forEach(content => {
      if (content.id === `${tabId}-tab`) {
        content.classList.add("active");
      } else {
        content.classList.remove("active");
      }
    });

    // On-demand Map Hub Loader (Fixes hidden Leaflet projection bugs!)
    if (tabId === "map") {
      setTimeout(() => {
        if (!window.MapHub || typeof L === "undefined") {
          this.renderMapFallback("map-container", "Satellite map is unavailable while the mapping library is offline.");
          return;
        }

        window.MapHub.init("map-container", (lat, lng) => {
          this.coordsLockedByUser = true;
          this.applyCoordinates(lat, lng, { updateMap: false, silent: true });
        });
        if (window.RoadDatabase?.roads?.length) {
          window.MapHub.plotDatabaseRoads();
          window.MapHub.plotSeededComplaints?.(window._SEEDED_COMPLAINTS);
        }
        if (window.MapHub.map) {
          window.MapHub.map.invalidateSize();
          if (window.LocationService?.lastPosition && !this.coordsLockedByUser) {
            const p = window.LocationService.lastPosition;
            window.MapHub.updateLivePosition(p.lat, p.lng, {
              movePicker: true,
              accuracy: p.accuracy,
            });
          }
        }
      }, 200);
    }

    if (tabId === "capture" || tabId === "map") {
      if (window.LocationService?.lastPosition && !this.coordsLockedByUser) {
        const p = window.LocationService.lastPosition;
        this.applyCoordinates(p.lat, p.lng, { silent: true, movePicker: tabId === "map" });
      }
    }

    if (tabId === "transparency") {
      this.loadBudgetDashboard();
      window.TransparencyPanel?.render?.();
    }

    if (tabId === "contractors") {
      window.ContractorHub?.render?.();
    }

    if (tabId === 'alerts') { this.renderAlerts('all'); }

    if (tabId === 'score') { this.renderScoreboard(); }

    if (tabId === "overview") {
      setTimeout(() => {
        if (!this._miniMapReady) {
          this.initMiniMap();
          this._miniMapReady = true;
        } else if (this.miniMap) {
          this.miniMap.invalidateSize();
        }
        this.initCharts();
        window.BudgetDashboard?.render?.();
        this.activeCharts.budgetLeakage?.resize?.();
        this.activeCharts.contractorPerformance?.resize?.();
      }, 150);
    }

    document.body.classList.remove("mobile-nav-open");
    window.dispatchEvent(new CustomEvent("tabchanged", { detail: { tabId } }));
  },

  checkNetworkStatus() {
    const badge = document.getElementById("network-badge");
    const isOnline = navigator.onLine;

    if (isOnline) {
      badge.textContent = "Online";
      badge.classList.remove("offline");
    } else {
      badge.textContent = "Offline";
      badge.classList.add("offline");
    }
  },

  renderMapFallback(containerId, message) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `<div class="map-fallback">${this.escapeHTML(message)}</div>`;
  },

  handleLiveLocationUpdate(pos) {
    if (!pos) return;

    this.updateLocationUI("active", pos);
    window.MapHub?.updateGpsDisplay?.(pos.lat, pos.lng, pos.accuracy);

    if (!this.coordsLockedByUser) {
      this.applyCoordinates(pos.lat, pos.lng, {
        silent: true,
        movePicker: true,
        accuracy: pos.accuracy,
        centerMap:
          this.activeTab === "map" &&
          window.MapHub?.map &&
          (window.MapHub.map.getZoom() < 14 || pos.accuracy <= 50),
      });
    } else if (window.MapHub?.map) {
      window.MapHub.updateLivePosition(pos.lat, pos.lng, {
        movePicker: false,
        accuracy: pos.accuracy,
      });
    }
  },

  startLiveLocation() {
    if (!window.LocationService) return;

    if (this._locationUnsubscribe) this._locationUnsubscribe();

    const started = window.LocationService.start();
    if (!started) {
      this.updateLocationUI("unsupported");
      return;
    }

    this.updateLocationUI("acquiring");

    this._locationUnsubscribe = window.LocationService.onUpdate((pos, err) => {
      if (err || !pos) {
        const denied = err && err.code === 1;
        this.updateLocationUI(denied ? "denied" : "error");
        if (this.tripActive) {
          this.setTripStatusMessage("GPS lost — check location permissions.");
        }
        return;
      }

      if (this.tripActive && window.TripTracker?.active) {
        const tripState = window.TripTracker.handlePosition(pos);
        if (tripState) this.onTripProgress(tripState);
        return;
      }

      this.handleLiveLocationUpdate(pos);
    });
  },

  async useLiveGpsLocation(showToast = false) {
    this.coordsLockedByUser = false;
    this.updateLocationUI("acquiring");

    if (!window.LocationService) {
      this.showToast("Location service is not available.");
      return;
    }

    window.LocationService.stop();
    window.LocationService.lastPosition = null;
    window.LocationService.start();

    const applyPos = (pos) => {
      this.applyCoordinates(pos.lat, pos.lng, {
        silent: !showToast,
        movePicker: true,
        accuracy: pos.accuracy,
        centerMap: true,
      });
      window.MapHub?.updateGpsDisplay?.(pos.lat, pos.lng, pos.accuracy);
      if (showToast) {
        const acc =
          pos.accuracy <= 20
            ? `±${pos.accuracy}m`
            : pos.accuracy <= 50
              ? `±${pos.accuracy}m (good)`
              : pos.accuracy <= 100
                ? `±${pos.accuracy}m (fair)`
                : `±${pos.accuracy}m (approximate — hold still for better fix)`;
        this.showToast(`📍 GPS fix: ${pos.lat}, ${pos.lng} (${acc})`);
      }
    };

    try {
      const pos = await window.LocationService.requestBestFix({ fresh: true });
      applyPos(pos);
      if (pos.accuracy > 40) {
        this.showToast("⚠️ GPS fix is still approximate. Hold still for a better location and tap Use live GPS again.");
      }
    } catch (err) {
      this.updateLocationUI(err?.code === 1 ? "denied" : "error");
      this.showToast(
        err?.code === 1
          ? "Allow location access in your browser, then try again."
          : "Could not get GPS fix. Move near a window or outdoors and retry."
      );
    }
  },

  applyCoordinates(lat, lng, options = {}) {
    const {
      silent = false,
      updateMap = true,
      movePicker = true,
      accuracy = null,
      centerMap = false,
    } = options;

    this.selectedCoords = [lat, lng];

    const latEl = document.getElementById("report-lat");
    const lngEl = document.getElementById("report-lng");
    if (latEl) latEl.value = lat;
    if (lngEl) lngEl.value = lng;

    const nearest = window.RoadDatabase?.findNearestRoad?.(lat, lng);
    const nearEl = document.getElementById("location-nearest-road");
    if (nearEl && nearest?.road) {
      nearEl.textContent = `${nearest.road.id} · ${nearest.distanceKm} km away`;
    }

    if (this.activeAIReport) {
      this.updateActiveReportLocation();
      this.renderAIResultsCard(this.activeAIReport);
    }

    if (updateMap && window.MapHub?.map) {
      window.MapHub.updatePinDisplay?.(lat, lng);
      window.MapHub.updateLivePosition(lat, lng, {
        movePicker,
        accuracy,
        centerMap,
      });
    }

    if (!silent) {
      this.showToast(`📌 Location set: ${lat}, ${lng}`);
    }
  },

  updateActiveReportLocation() {
    if (!this.activeAIReport || !this.selectedCoords) return;

    const [lat, lng] = this.selectedCoords;
    this.activeAIReport.coordinates = [lat, lng];

    const nearest = window.RoadDatabase?.findNearestRoad?.(lat, lng);
    if (nearest?.road) {
      this.activeAIReport.matchedRoad = nearest.road;
      this.activeAIReport.distanceToRoadKm = nearest.distanceKm;
    }
  },

  updateLocationUI(status, pos = null) {
    this.liveLocationStatus = status;
    const badge = document.getElementById("location-status-badge");
    const detail = document.getElementById("location-status-detail");
    if (!badge) return;

    badge.classList.remove("active", "denied", "pending", "manual");

    if (status === "active") {
      badge.classList.add("active");
      badge.textContent = "Live GPS";
      if (detail && pos) {
        const quality =
          pos.accuracy <= 20
            ? "High accuracy"
            : pos.accuracy <= 80
              ? "Good fix"
              : pos.accuracy <= 200
                ? "Approximate"
                : "Low accuracy — move outdoors for better fix";
        detail.textContent = `±${pos.accuracy} m · ${quality} · ${new Date(pos.timestamp).toLocaleTimeString()}`;
      }
    } else if (status === "manual") {
      badge.classList.add("manual");
      badge.textContent = "Manual pin";
      if (detail) detail.textContent = "Drag the map pin or pick a road to override GPS";
    } else if (status === "denied") {
      badge.classList.add("denied");
      badge.textContent = "GPS blocked";
      if (detail) {
        detail.textContent =
          "Location permission denied. Open browser settings → Site permissions → Location → Allow, then tap “Use live GPS”.";
      }
    } else if (status === "unsupported") {
      badge.classList.add("denied");
      badge.textContent = "No GPS";
      if (detail) detail.textContent = "This browser does not support geolocation";
    } else if (status === "error") {
      badge.classList.add("denied");
      badge.textContent = "GPS error";
      if (detail) detail.textContent = "Could not read location — try again outdoors";
    } else {
      badge.classList.add("pending");
      badge.textContent = "Acquiring GPS…";
      if (detail) detail.textContent = "Waiting for satellite fix…";
    }
  },

  onMapCoordsChanged(lat, lng, silent = false) {
    this.coordsLockedByUser = true;
    this.applyCoordinates(lat, lng, { updateMap: false, silent });
    this.updateLocationUI("manual");
  },

  async setRouteFromGps() {
    const apply = (pos) => {
      const label = `${pos.lat}, ${pos.lng}`;
      const input = document.getElementById("route-from");
      if (input) input.value = label;
      this.showToast("Start point set from your GPS");
    };
    if (window.LocationService?.lastPosition) {
      apply(window.LocationService.lastPosition);
      return;
    }
    try {
      const pos = await window.LocationService.requestBestFix();
      apply(pos);
    } catch {
      this.showToast("Enable location to use GPS as start point.");
    }
  },

  async planSafeRoute() {
    const fromEl = document.getElementById("route-from");
    const toEl = document.getElementById("route-to");
    const resultsEl = document.getElementById("route-results");
    if (!fromEl || !toEl || !resultsEl) return;

    const fromQ = fromEl.value.trim();
    const toQ = toEl.value.trim();
    if (!fromQ || !toQ) {
      this.showToast("Enter both From and To locations.");
      return;
    }

    if (!window.RoutePlanner) {
      this.showToast("Route planner module not loaded.");
      return;
    }

    resultsEl.innerHTML =
      '<p class="route-loading">Fetching authority accident data and comparing routes…</p>';

    if (this.activeTab !== "map") this.switchTab("map");

    try {
      const plan = await window.RoutePlanner.planRoute(fromQ, toQ);
      this.activeRoutePlan = plan;
      this.selectedRouteId = plan.routes[0]?.id || null;
      this.enableTripButton(true);
      this.renderRouteResults(plan);

      setTimeout(() => {
        if (!window.MapHub || typeof L === "undefined") return;
        window.MapHub.init("map-container", (lat, lng) => {
          this.onMapCoordsChanged(lat, lng, true);
        });
        if (window.MapHub.map) {
          window.MapHub.map.invalidateSize();
          window.MapHub.displayRoutePlan(plan);
        }
      }, 350);

      this.showToast(`Compared ${plan.routes.length} routes — safest highlighted in teal.`);
    } catch (err) {
      resultsEl.innerHTML = `<p class="route-error">${this.escapeHTML(err.message || "Routing failed")}</p>`;
      this.showToast("Could not plan route. Check place names and connection.");
    }
  },

  renderRouteResults(plan) {
    const resultsEl = document.getElementById("route-results");
    if (!resultsEl || !plan?.routes?.length) return;

    const corridorNote = plan.corridorKey
      ? `<p class="route-corridor-note">📋 <strong>Authority corridor:</strong> ${plan.corridorKey.replace(/-/g, " ")} — full audit from NHAI, PWD & RAIB registries.</p>`
      : `<p class="route-corridor-note">📋 Routes scored using nearest DOT/PWD/NHAI accident records along the OSM driving network.</p>`;

    resultsEl.innerHTML = `
      ${corridorNote}
      <div class="route-results-list">
        ${plan.routes
          .map(
            (r, i) => `
          <button type="button" class="route-result-card ${r.isRecommended ? "recommended" : ""}" data-route-id="${r.id}" onclick="window.App.selectRouteResult('${r.id}')">
            <div class="route-result-top">
              <span class="route-rank">#${i + 1}</span>
              <strong>${this.escapeHTML(r.name)}</strong>
              ${r.isRecommended ? '<span class="badge badge-good">Fewest accidents</span>' : ""}
            </div>
            <div class="route-result-stats">
              <span>🚨 ${r.accidentCount} accidents/yr</span>
              <span>💀 ${r.fatalities} fatalities</span>
              <span>📏 ${r.distanceKm} km</span>
              <span>⏱ ${r.travelTimeHours}h</span>
              <span>⭐ ${r.safetyScore}/10</span>
            </div>
            <p class="route-result-source">${this.escapeHTML(r.dataSource || "")}</p>
            <p class="route-result-msg">${this.escapeHTML(r.ratingMessage || "")}</p>
          </button>
        `
          )
          .join("")}
      </div>
      <p class="route-trip-hint">Select a route above, then tap <strong>Start live trip</strong> to track your full journey with GPS.</p>
    `;
  },

  selectRouteResult(routeId) {
    if (!this.activeRoutePlan) return;
    const route = this.activeRoutePlan.routes.find((r) => r.id === routeId);
    if (!route) return;
    this.selectedRouteId = routeId;
    if (window.MapHub?.map) {
      window.MapHub.highlightRoute(routeId);
      const idx = this.activeRoutePlan.routes.findIndex((r) => r.id === routeId);
      if (window.MapHub.routePolylines[idx]) {
        window.MapHub.routePolylines[idx].openPopup();
      }
    }
    document.querySelectorAll(".route-result-card").forEach((el) => {
      el.classList.toggle("active", el.getAttribute("data-route-id") === routeId);
    });
  },

  enableTripButton(enabled) {
    const btn = document.getElementById("btn-start-trip");
    if (btn) btn.disabled = !enabled || this.tripActive;
  },

  getSelectedRoute() {
    if (!this.activeRoutePlan?.routes?.length) return null;
    const id = this.selectedRouteId || this.activeRoutePlan.routes[0].id;
    return this.activeRoutePlan.routes.find((r) => r.id === id) || this.activeRoutePlan.routes[0];
  },

  startLiveTrip() {
    if (!this.activeRoutePlan || !window.TripTracker) {
      this.showToast("Plan a route first, then start live trip.");
      return;
    }
    const route = this.getSelectedRoute();
    if (!route?.path?.length) {
      this.showToast("Selected route has no path data.");
      return;
    }

    const dest = {
      lat: this.activeRoutePlan.to.lat,
      lng: this.activeRoutePlan.to.lng,
    };

    this.tripActive = true;
    this.coordsLockedByUser = true;
    this.enableTripButton(false);

    const panel = document.getElementById("trip-tracking-panel");
    const hud = document.getElementById("trip-map-hud");
    if (panel) panel.hidden = false;
    if (hud) hud.hidden = false;

    this.setTripStatusMessage("Live tracking started — keep this tab open while traveling.");
    this.showToast("Live trip tracking started.");

    if (this.activeTab !== "map") this.switchTab("map");

    setTimeout(() => {
      if (window.MapHub?.map) {
        window.MapHub.startTripNavigation(route, this.activeRoutePlan);
      } else {
        window.MapHub?.init("map-container", () => {});
        setTimeout(() => window.MapHub?.startTripNavigation(route, this.activeRoutePlan), 300);
      }

      window.TripTracker.start(route.path, dest);

      if (window.LocationService?.lastPosition) {
        window.TripTracker.handlePosition(window.LocationService.lastPosition);
      } else {
        window.LocationService?.requestOnce().then((pos) => {
          window.TripTracker.handlePosition(pos);
        });
      }
    }, 200);
  },

  stopLiveTrip(arrived = false) {
    this.tripActive = false;
    if (this._tripWatchId != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this._tripWatchId);
      this._tripWatchId = null;
    }
    window.TripTracker?.stop();
    window.MapHub?.stopTripNavigation();

    const panel = document.getElementById("trip-tracking-panel");
    const hud = document.getElementById("trip-map-hud");
    if (panel) panel.hidden = true;
    if (hud) hud.hidden = true;

    this.enableTripButton(!!this.activeRoutePlan);
    this.setTripStatusMessage(arrived ? "You have arrived at your destination." : "Trip tracking ended.");
    this.showToast(arrived ? "Destination reached." : "Live trip tracking stopped.");
  },

  onTripProgress(state) {
    if (window.MapHub?.map) window.MapHub.updateTripNavigation(state);
    this.updateTripPanel(state);

    this.applyCoordinates(state.raw.lat, state.raw.lng, {
      silent: true,
      movePicker: false,
      accuracy: state.accuracy,
    });

    if (state.offRoute) {
      this.setTripStatusMessage(
        `Off route by ~${Math.round(state.snap.offRouteMeters)}m — return to highlighted path.`
      );
    } else if (state.arrived) {
      this.setTripStatusMessage("Destination reached. Trip complete.");
      setTimeout(() => this.stopLiveTrip(true), 2500);
    } else {
      this.setTripStatusMessage("On route — following your live GPS position.");
    }
  },

  updateTripPanel(state) {
    const fill = document.getElementById("trip-progress-fill");
    const label = document.getElementById("trip-progress-label");
    const hudPct = document.getElementById("trip-map-hud-pct");

    if (fill) fill.style.width = `${state.progressPct}%`;
    if (label) label.textContent = `${state.progressPct}% complete · ${state.traveledKm} / ${state.totalKm} km`;
    if (hudPct) hudPct.textContent = `${Math.round(state.progressPct)}%`;

    const set = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    set("trip-stat-traveled", `${state.traveledKm} km`);
    set("trip-stat-remaining", `${state.remainingKm} km`);
    set("trip-stat-eta", window.TripTracker.formatDuration(state.etaSeconds));
    set("trip-stat-speed", state.speedKmh > 0 ? `${state.speedKmh} km/h` : "—");
    set("trip-stat-dest", `${state.distToDestKm} km`);
    set("trip-stat-accuracy", state.accuracy ? `±${state.accuracy} m` : "—");
  },

  setTripStatusMessage(msg) {
    const el = document.getElementById("trip-status-msg");
    if (el) el.textContent = msg;
  },

  clearRoutes() {
    if (this.tripActive) this.stopLiveTrip(false);
    this.activeRoutePlan = null;
    this.selectedRouteId = null;
    this.enableTripButton(false);
    const resultsEl = document.getElementById("route-results");
    if (resultsEl) resultsEl.innerHTML = "";
    if (window.MapHub?.map) window.MapHub.clearRouteDisplay();
    this.showToast("Routes cleared.");
  },

  selectRoadForReport(roadId) {
    const road = window.RoadDatabase.getRoadById(roadId);
    if (!road) return;
    
    this.switchTab("capture");
    
    this.coordsLockedByUser = true;
    this.applyCoordinates(road.coordinates[0], road.coordinates[1], { silent: true, movePicker: false });
    this.updateLocationUI("manual");

    setTimeout(() => {
      if (!window.MapHub || typeof L === "undefined") return;

      window.MapHub.init("map-container", (lat, lng) => {
        this.coordsLockedByUser = true;
        this.applyCoordinates(lat, lng, { updateMap: false, silent: true });
        this.updateLocationUI("manual");
      });
      if (window.MapHub.map) window.MapHub.setUserPicker(road.coordinates[0], road.coordinates[1]);
    }, 300);

    this.showToast(`🛣️ Selected Road: ${road.name}`);
  },

  async triggerSampleUpload(sampleType) {
    const fileData = this.sampleMediaFiles[sampleType];
    if (!fileData) return;

    this.showToast(`📂 Loading sample asset: ${fileData.name}`);

    this.coordsLockedByUser = true;
    this.applyCoordinates(fileData.coords[0], fileData.coords[1], { silent: true, movePicker: false });
    this.updateLocationUI("manual");

    const urls = {
      cat: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=60",
      coffee: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&fit=crop&q=60",
      pothole: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?w=600&auto=format&fit=crop&q=60",
      crack: "https://images.unsplash.com/photo-1584467541268-b040f83be3fd?w=600&auto=format&fit=crop&q=60",
      marking: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=600&auto=format&fit=crop&q=60",
      light: "https://images.unsplash.com/photo-1596450514735-111a2fe02935?w=600&auto=format&fit=crop&q=60",
    };

    const dropInstructions = document.getElementById("drop-instructions");
    const previewContainer = document.getElementById("preview-media-container");
    const previewImg = document.getElementById("preview-img");

    dropInstructions.style.display = "none";
    previewContainer.style.display = "block";
    previewImg.src = urls[sampleType] || urls.light;

    document.getElementById("user-desc").value = fileData.description;

    try {
      const res = await fetch(previewImg.src);
      const blob = await res.blob();
      const file = new File([blob], fileData.name, { type: blob.type || "image/jpeg" });
      this.runAIScanSequence(file);
    } catch {
      this.showToast("Could not load sample image.");
    }
  },

  async handleFileSelected(file) {
    // Validate image
    const validation = ImageCompressor.isValidImage(file);
    if (!validation.valid) {
      this.showToast(`❌ ${validation.error}`);
      alert(validation.error);
      return;
    }

    const dropInstructions = document.getElementById("drop-instructions");
    const previewContainer = document.getElementById("preview-media-container");
    const previewImg = document.getElementById("preview-img");

    dropInstructions.style.display = "none";
    previewContainer.style.display = "block";

    // Compress image
    this.showToast("🖼️ Compressing image...");
    try {
      const compressed = await ImageCompressor.compress(file);
      previewImg.src = compressed.dataUrl;
      this.runAIScanSequence(compressed.blob);
    } catch (error) {
      console.error("Image compression failed:", error);
      this.showToast(`❌ Compression failed: ${error.message}`);
      
      // Fallback to original
      const reader = new FileReader();
      reader.onload = (e) => {
        previewImg.src = e.target.result;
      };
      reader.readAsDataURL(file);
      this.runAIScanSequence(file);
    }
  },

  runAIScanSequence(file) {
    const logContainer = document.getElementById("ai-logger-logs");
    const scanOverlay = document.getElementById("ai-scan-overlay");
    const boundingBox = document.getElementById("ai-scan-bounding-box");
    const resultsCard = document.getElementById("ai-results-card");
    const rejectionCard = document.getElementById("ai-rejection-card");
    const fileSubmitBtn = document.getElementById("file-complaint-btn");

    logContainer.innerHTML = "";
    resultsCard.style.display = "none";
    if (rejectionCard) rejectionCard.style.display = "none";
    fileSubmitBtn.disabled = true;
    scanOverlay.style.display = "block";
    boundingBox.style.display = "block";

    const enableIfManual = () => {
      const desc = document.getElementById("user-desc")?.value?.trim();
      const contact = document.getElementById("user-contact")?.value?.trim();
      if (desc && contact) {
        fileSubmitBtn.disabled = false;
        fileSubmitBtn.title = "Unverified — AI scan not completed";
      }
    };
    setTimeout(enableIfManual, 3000);
    document.getElementById("user-desc")?.addEventListener("input", enableIfManual);

    const addLog = (message, cssClass = "") => {
      const el = document.createElement("div");
      el.className = `log-entry ${cssClass}`;
      el.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
      logContainer.appendChild(el);
      logContainer.scrollTop = logContainer.scrollHeight;
    };

    window.AIEngine.analyzeMedia(file, this.selectedCoords, (progress) => {
      if (progress.step === "init") addLog(progress.message, "cyan");
      else if (progress.step === "preprocessing") addLog(progress.message);
      else if (progress.step === "detection") addLog(progress.message);
      else if (progress.step === "validation") addLog(progress.message);
      else if (progress.step === "validation_result") addLog(progress.message);
      else if (progress.step === "confirmed") addLog(progress.message, "success");
      else if (progress.step === "rejected") addLog(progress.message, "failed");
      else if (progress.step === "segmentation") addLog(progress.message);
      else if (progress.step === "profiling") addLog(progress.message);
      else if (progress.step === "geolocating") addLog(progress.message);
      else if (progress.step === "success") addLog(progress.message, "success");
    })
    .then((result) => {
      scanOverlay.style.display = "none";
      boundingBox.style.display = "none";

      if (!result.success || result.rejected) {
        this.activeAIReport = null;
        fileSubmitBtn.disabled = true;
        resultsCard.style.display = "block";
        resultsCard.classList.add("highlight-orange");
        if (rejectionCard) rejectionCard.style.display = "none";
        document.getElementById("ai-class").textContent =
          `⛔ Rejected: ${result.rejection_reason || result.reason || result.error || "Not a road defect"}`;
        document.getElementById("ai-id").textContent = "—";
        boundingBox.style.display = "none";
        this.showToast("❌ Image rejected — not a road defect.");
        return;
      }

      // ── Road validated + defect analyzed ──
      resultsCard.style.display = "block";
      resultsCard.classList.remove("highlight-orange");
      if (rejectionCard) rejectionCard.style.display = "none";
      fileSubmitBtn.disabled = false;

      this.activeAIReport = result;
      this.renderAIResultsCard(result);
      this._positionAiBoundingBox(result.bounding_box);
      this.showToast("⚡ YatraRaksha AI verified road issue!");
    })
    .catch((err) => {
      scanOverlay.style.display = "none";
      boundingBox.style.display = "none";
      this.activeAIReport = null;

      alert(err.message);
      this.showToast("❌ Analysis failed.");

      document.getElementById("drop-instructions").style.display = "block";
      document.getElementById("preview-media-container").style.display = "none";
      document.getElementById("user-desc").value = "";
    });
  },

  _positionAiBoundingBox(box) {
    const el = document.getElementById("ai-scan-bounding-box");
    const img = document.getElementById("preview-img");
    if (!el || !img || !box) {
      if (el) el.style.display = "none";
      return;
    }
    const rect = img.getBoundingClientRect();
    const nw = img.naturalWidth || rect.width;
    const nh = img.naturalHeight || rect.height;
    const scaleX = rect.width / nw;
    const scaleY = rect.height / nh;
    el.style.display = "block";
    el.style.left = `${box.x * scaleX}px`;
    el.style.top = `${box.y * scaleY}px`;
    el.style.width = `${box.w * scaleX}px`;
    el.style.height = `${box.h * scaleY}px`;
  },

  /**
   * Render the rejection card when road validation fails.
   */
  renderRejectionCard(rejection) {
    const card = document.getElementById("ai-rejection-card");
    if (!card) return;

    const objectsList = (rejection.detectedObjects || []).map(
      obj => `<li style="color:var(--text-muted); font-size:12px; padding:2px 0;">• ${this.escapeHTML(obj)}</li>`
    ).join('');

    card.innerHTML = `
      <div style="text-align:center; padding:8px 0 12px;">
        <div style="font-size:36px; margin-bottom:8px;">🚫</div>
        <h3 style="color:var(--accent-red); font-size:16px; font-weight:800; margin:0;">Analysis Rejected</h3>
        <p style="color:var(--text-muted); font-size:13px; margin-top:6px;">No road infrastructure detected.</p>
      </div>

      <div style="background:rgba(248,113,113,0.06); border:1px solid rgba(248,113,113,0.2); border-radius:var(--border-radius-md); padding:12px 14px; margin:8px 0;">
        <p style="font-size:12px; font-weight:700; color:var(--text-white); margin-bottom:8px;">Detected:</p>
        <ul style="list-style:none; padding:0; margin:0;">${objectsList}</ul>
      </div>

      <div style="background:rgba(255,255,255,0.03); border-radius:var(--border-radius-md); padding:10px 14px; margin:8px 0;">
        <div class="popup-row" style="font-size:12px;">
          <strong>Road Confidence:</strong>
          <span style="color:var(--accent-red); font-weight:700;">${((rejection.roadConfidence || 0) * 100).toFixed(1)}%</span>
        </div>
        <div class="popup-row" style="font-size:12px; margin-top:4px;">
          <strong>Reason:</strong>
          <span style="color:var(--text-muted);">${this.escapeHTML(rejection.reason || '')}</span>
        </div>
      </div>

      <p style="text-align:center; font-size:12px; color:var(--secondary); margin-top:12px; font-weight:600;">
        Please upload a valid road image.
      </p>
    `;

    card.style.display = "block";
  },

  renderAIResultsCard(report) {
    const card = document.getElementById("ai-results-card");
    if (card) card.classList.remove("highlight-orange");

    document.getElementById("ai-id").textContent =
      report.integrityVerificationId || report.detection_id || "—";
    document.getElementById("ai-class").textContent = report.defectType || report.defect_class || "—";
    document.getElementById("ai-confidence").textContent = report.aiConfidence || "—";

    const score = report.urgencyScore ?? report.severity_score ?? 0;
    const sevEl = document.getElementById("ai-severity");
    sevEl.textContent = `${score}/10`;
    let sevClass = "badge-good";
    if (score >= 9) sevClass = "badge-warn";
    else if (score >= 7) sevClass = "badge-warn";
    else if (score >= 4) sevClass = "badge-sh";
    sevEl.className = `badge ${sevClass}`;
    sevEl.style.color =
      score >= 9 ? "#ef4444" : score >= 7 ? "#f97316" : score >= 4 ? "#f59e0b" : "#10b981";

    document.getElementById("ai-dimensions").textContent = report.defectArea || "—";
    document.getElementById("ai-depth").textContent = report.estimatedDepth || "—";

    const riskEl = document.getElementById("ai-risk");
    riskEl.textContent = report.risk_level || report.severity || `${score}/10`;
    riskEl.style.color =
      report.risk_level === "Critical" || score >= 9
        ? "#ef4444"
        : report.risk_level === "High" || score >= 7
          ? "#f97316"
          : "#f59e0b";

    const repairEl = document.getElementById("ai-repair-priority");
    if (repairEl) repairEl.textContent = report.repair_priority || report.repairBudgetEstimate || "—";

    const sugEl = document.getElementById("ai-suggestions");
    if (sugEl && report.suggestions?.length) {
      sugEl.innerHTML = report.suggestions.map((s) => `<li>${this.escapeHTML(s)}</li>`).join("");
    } else if (sugEl) {
      sugEl.innerHTML = "<li>—</li>";
    }

    // Road Validation Confidence field
    const roadValEl = document.getElementById("ai-road-validation");
    if (roadValEl) {
      const conf = ((report.roadValidationConfidence || 0) * 100).toFixed(1);
      roadValEl.textContent = `${conf}%`;
      roadValEl.style.color = report.roadValidationConfidence >= 0.8 ? 'var(--primary)' : 'var(--secondary)';
    }

    if (report.matchedRoad) {
      const routing = window.RoadTracker.determineRoutingDetails(report.matchedRoad);
      document.getElementById("ai-road").textContent = `${report.matchedRoad.name} (${report.distanceToRoadKm} km away)`;
      document.getElementById("ai-authority").textContent = report.matchedRoad.authority;
      document.getElementById("ai-engineer").textContent = `${report.matchedRoad.executiveEngineer} (${report.matchedRoad.engineerPhone})`;
      document.getElementById("ai-route-to").textContent = routing.routeTo;
      document.getElementById("ai-escalation-hierarchy").textContent = routing.escalationHierarchy.join(" → ");
    } else {
      document.getElementById("ai-road").textContent = "No registered roadway matching coordinates.";
      document.getElementById("ai-authority").textContent = "Local District PWD / Municipal Council";
      document.getElementById("ai-engineer").textContent = "TBD - Regional Administrative Division";
      document.getElementById("ai-route-to").textContent = "Local grievance office / Municipal Works division";
      document.getElementById("ai-escalation-hierarchy").textContent = "Executive Engineer → Superintending Engineer → Chief Engineer";
    }
  },

  async submitComplaint() {
    if (!this.activeAIReport) return;

    const userDesc = document.getElementById("user-desc").value;
    const userContact = document.getElementById("user-contact").value;

    this.updateActiveReportLocation();

    // Check for nearby duplicates via API (non-blocking, warn only)
    if (navigator.onLine && this.activeAIReport) {
      try {
        const dupCheck = await APIService.checkDuplicate(
          this.activeAIReport.coordinates[0],
          this.activeAIReport.coordinates[1],
          this.activeAIReport.defectType
        );
        if (dupCheck.isDuplicate && dupCheck.nearbyComplaints.length > 0) {
          const nearest = dupCheck.nearbyComplaints[0];
          const proceed = confirm(
            `⚠️ A similar ${nearest.defectType} complaint already exists ${nearest.distanceKm} km away (ID: ${nearest.id}).\n\n` +
            `Tap "OK" to file anyway, or "Cancel" to support the existing complaint instead.`
          );
          if (!proceed) {
            // Support the existing complaint instead
            await APIService.supportComplaint(nearest.id);
            this.showToast(`✅ You've confirmed the existing complaint ${nearest.id}!`);
            this.switchTab('tracker');
            return; // Don't file a new complaint
          }
        }
      } catch(e) {
        console.warn('Duplicate check failed (non-fatal):', e);
      }
    }

    // File complaint locally first
    const complaint = window.RoadTracker.fileComplaint(this.activeAIReport, userDesc, userContact);

    this.showToast(`🎉 Complaint Filed! Reference ID: ${complaint.id}`);
    
    // Try to sync with backend API
    if (navigator.onLine) {
      try {
        const apiComplaint = {
          ...complaint,
          userId: AuthModule.getUser()?.id
        };
        
        await APIService.fileComplaint(apiComplaint);
        this.showToast("✅ Complaint synced with server!");
        
        // Send notification
        await PushNotificationService.notifyComplaintUpdate(
          complaint.id,
          "Submitted",
          "Your complaint has been received and verified by YatraRaksha AI."
        );
      } catch (error) {
        console.warn("API sync failed, will retry when online:", error);
      }
    } else {
      this.showToast("📵 Offline - Will sync when online");
    }
    
    // Register details in MapHub
    setTimeout(() => {
      if (!window.MapHub || typeof L === "undefined") return;

      window.MapHub.init("map-container", (lat, lng) => {
        this.onMapCoordsChanged(lat, lng);
      });
      if (window.MapHub.map) window.MapHub.plotReportedIssue(complaint);
    }, 300);

    // Reset Form
    document.getElementById("complaint-form").reset();
    document.getElementById("drop-instructions").style.display = "block";
    document.getElementById("preview-media-container").style.display = "none";
    document.getElementById("ai-results-card").style.display = "none";
    document.getElementById("ai-logger-logs").innerHTML = "<div class='log-entry text-muted'>System waiting for media stream upload...</div>";
    this.activeAIReport = null;

    this.renderReportsList();
    this.switchTab("tracker");
    this.viewComplaintDetails(complaint.id);
  },

  renderReportsList() {
    const listContainer = document.getElementById("complaints-list");
    const reports = window.RoadTracker.getAllReports();

    const totalReports = reports.length;
    const resolvedReports = reports.filter(r => r.status === "Resolved").length;

    if (document.getElementById("overview-total")) document.getElementById("overview-total").textContent = totalReports;
    if (document.getElementById("overview-resolved")) document.getElementById("overview-resolved").textContent = resolvedReports;
    
    let totalFundsTracked = 0;
    window.RoadDatabase.roads.forEach(r => totalFundsTracked += r.spentBudget);
    
    // INR Scale Crores formatting
    if (document.getElementById("overview-budget")) {
      const crores = totalFundsTracked / 10000000;
      document.getElementById("overview-budget").textContent = `₹${crores.toFixed(1)} Cr`;
    }

    if (!listContainer) return;

    if (reports.length === 0) {
      listContainer.innerHTML = `
        <div class="glass-card text-center" style="padding: 40px 20px;">
          <div style="font-size: 36px; margin-bottom: 12px;">📂</div>
          <h3>No Complaints Logged</h3>
          <p class="text-muted" style="font-size: 13px; margin-top: 6px;">You haven't filed any road safety complaints yet. Go to the "AI Verification Capture" tab to file your first report!</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = reports.map(report => {
      let syncIcon = report.synced ? "⚡" : "⏳";
      let syncText = report.synced ? "Synced" : "Offline Outbox";
      let statusClass = "badge-sh";
      if (report.status === "Submitted") statusClass = "badge-mdr";
      if (report.status === "Engineer Assigned" || report.status === "Budget Allocated") statusClass = "badge-nh";
      if (report.status === "Resolved") statusClass = "badge-good";

      return `
        <div class="glass-card highlight-orange" style="padding: 16px; display: flex; justify-content: space-between; align-items: center; gap: 16px; cursor: pointer;" onclick="window.App.viewComplaintDetails('${report.id}')">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="badge ${statusClass}">${report.status}</span>
              ${report.status.startsWith("Escalated") ? `<span class="badge badge-warn" style="font-size:10px;">⚠️ Escalated</span>` : ''}
              ${report.repairVerified ? `<span class="badge badge-good" style="font-size:10px;">✅ Verified</span>` : ''}
              ${report.priorityCategory ? (() => {
                const s = window.App.getPriorityStyle(report.priorityCategory);
                return `<span style="display:inline-block; padding:2px 8px; border-radius:6px; font-size:10px; font-weight:700; background:${s.bg}; color:${s.color}; border:${s.border}; margin-left:4px;">
                  P: ${report.priorityCategory} ${report.priorityScore ? '(' + report.priorityScore + ')' : ''}
                </span>`;
              })() : ''}
              <span style="font-size: 11px; color: var(--text-muted);">REF: ${report.id}</span>
            </div>
            <h4 style="margin-top: 6px; font-size: 15px;">${report.defectType}</h4>
            <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">📍 ${report.matchedRoad ? report.matchedRoad.name : 'Unknown Road'}</p>
            ${report.supportCount > 0 ? `<p style="font-size:11px; color:var(--primary); margin-top:4px;">👥 ${report.supportCount} citizen${report.supportCount > 1 ? 's' : ''} confirmed</p>` : ''}
            ${!['Resolved','Closed','Merged'].includes(report.status) ? `
              <button onclick="event.stopPropagation(); window.App.supportExistingComplaint('${report.id}')"
                class="btn btn-secondary btn-sm" style="margin-top:8px; font-size:11px;">
                👍 Confirm Issue
              </button>
            ` : ''}
          </div>
          <div style="text-align: right;">
            <span class="badge" style="background: rgba(255,255,255,0.03); color: var(--text-muted);">${new Date(report.timestamp).toLocaleDateString()}</span>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 6px; display: flex; align-items: center; gap: 4px; justify-content: flex-end;">
              <span>${syncIcon}</span><span>${syncText}</span>
            </div>
            <button onclick="event.stopPropagation(); window.App.openPublicTimeline('${report.id}')"
              class="btn btn-secondary btn-sm"
              style="margin-top:8px; font-size:11px;">📋 Timeline</button>
          </div>
        </div>
      `;
    }).join("");
  },

  async supportExistingComplaint(complaintId) {
    try {
      if (navigator.onLine) {
        await APIService.supportComplaint(complaintId);
      }
      // Also update local storage
      window.RoadTracker.updateComplaintStatus(complaintId, 'Community Support',
        'You confirmed this issue exists. Thank you for validating!');
      this.showToast('👍 Thank you! Your confirmation has been recorded.');
      this.renderReportsList();
    } catch(e) {
      this.showToast('Could not submit confirmation — try again.');
    }
  },

  openPublicTimeline(complaintId) {
    const reports = window.RoadTracker.getAllReports();
    const c = reports.find(r => r.id === complaintId);
    if (!c) return;

    const ALL_STEPS = [
      { key: "Submitted",         icon: "📤", color: "var(--tertiary)" },
      { key: "Accepted",          icon: "✅", color: "var(--primary)" },
      { key: "Engineer Assigned", icon: "👷", color: "var(--secondary)" },
      { key: "Budget Allocated",  icon: "💰", color: "var(--secondary)" },
      { key: "Work Commenced",    icon: "🚧", color: "var(--primary)" },
      { key: "Resolved",          icon: "🏁", color: "#10b981" },
      { key: "Closed",            icon: "🔒", color: "var(--text-muted)" },
    ];

    const logs = c.statusLogs || [];
    const logMap = {};
    logs.forEach(l => { logMap[l.status] = l; });

    // Find current step index
    const currentIdx = ALL_STEPS.findIndex(s => s.key === c.status);

    const stepsHtml = ALL_STEPS.map((step, idx) => {
      const done  = idx < currentIdx || c.status === step.key;
      const active = c.status === step.key;
      const log   = logMap[step.key];
      const time  = log ? new Date(log.timestamp).toLocaleString() : null;
      const msg   = log ? log.message : null;
      const dotStyle = done
        ? `background:${step.color}; box-shadow: 0 0 8px ${step.color};`
        : `background: var(--bg-surface); border:2px solid var(--glass-border);`;

      return `
        <div style="display:flex; gap:14px; margin-bottom:${idx < ALL_STEPS.length-1 ? '0' : '0'};">
          <div style="display:flex; flex-direction:column; align-items:center;">
            <div style="width:32px; height:32px; border-radius:50%; ${dotStyle} display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0;">
              ${done ? step.icon : ''}
            </div>
            ${idx < ALL_STEPS.length - 1 ? `<div style="width:2px; flex:1; min-height:24px; background:${done ? step.color : 'var(--glass-border)'}; margin:4px 0;"></div>` : ''}
          </div>
          <div style="padding-bottom:20px; flex:1;">
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span style="font-weight:700; font-size:14px; color:${done ? 'var(--text-white)' : 'var(--text-dim)'};">${step.key}</span>
              ${active ? `<span class="badge badge-good" style="font-size:10px; animation: pulse 2s infinite;">CURRENT</span>` : ''}
              ${time ? `<span style="font-size:11px; color:var(--text-muted);">${time}</span>` : ''}
            </div>
            ${msg ? `<p style="font-size:12px; color:var(--text-muted); margin-top:4px;">${msg}</p>` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Escalation entries appended below
    const escalationLogs = logs.filter(l => l.status === 'Escalated');
    const escalHtml = escalationLogs.length ? `
      <div style="margin-top:16px; padding:12px; background:rgba(248,113,113,0.08); border:1px solid rgba(248,113,113,0.2); border-radius:var(--border-radius-md);">
        <p style="font-size:12px; font-weight:700; color:var(--accent-red); margin-bottom:8px;">⚠️ ESCALATION HISTORY</p>
        ${escalationLogs.map(l => `
          <div style="font-size:12px; color:var(--text-muted); margin-bottom:4px;">
            <strong style="color:var(--text-white);">${l.authority || 'Engineer'}</strong> — ${new Date(l.timestamp).toLocaleString()}<br/>${l.message}
          </div>
        `).join('')}
      </div>
    ` : '';

    document.getElementById('public-timeline-content').innerHTML = `
      <div style="margin-bottom:16px; padding:12px; background:var(--bg-surface); border-radius:var(--border-radius-md);">
        <p style="font-size:11px; color:var(--text-muted);">REF: ${c.id}</p>
        <p style="font-size:15px; font-weight:700; color:var(--text-white); margin-top:2px;">${c.defectType}</p>
        <p style="font-size:12px; color:var(--text-muted);">📍 ${c.matchedRoad ? c.matchedRoad.name : 'Unregistered Road'}</p>
      </div>
      ${stepsHtml}
      ${escalHtml}
    `;

    document.getElementById('public-timeline-modal').style.display = 'block';
  },

  getPriorityStyle(category) {
    const map = {
      Critical: { bg: 'rgba(248,113,113,0.15)', color: 'var(--accent-red)', border: '1px solid rgba(248,113,113,0.3)' },
      High:     { bg: 'rgba(251,191,36,0.15)',  color: 'var(--secondary)',  border: '1px solid rgba(251,191,36,0.3)' },
      Medium:   { bg: 'rgba(56,189,248,0.12)',  color: 'var(--tertiary)',   border: '1px solid rgba(56,189,248,0.3)' },
      Low:      { bg: 'rgba(148,163,184,0.1)',  color: 'var(--text-muted)', border: '1px solid rgba(148,163,184,0.2)' },
    };
    return map[category] || map.Low;
  },

  renderRepairComparison(complaint) {
    const before = complaint.beforeImageUrl || complaint.imageUrl;
    const after   = complaint.afterImageUrl;
    const verified = complaint.repairVerified;

    const el = document.getElementById('repair-comparison-panel');
    if (!el) return;

    if (!before && !after) { el.style.display = 'none'; return; }
    el.style.display = 'block';

    if (before && after) {
      el.innerHTML = `
        <p style="font-size:11px; font-weight:700; color:var(--primary); margin-bottom:10px; letter-spacing:0.05em;">✅ BEFORE / AFTER COMPARISON</p>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <div>
            <p style="font-size:10px; color:var(--text-muted); text-align:center; margin-bottom:4px;">BEFORE</p>
            <img src="${before}" alt="Before repair" style="width:100%; border-radius:var(--border-radius-sm); object-fit:cover; max-height:150px;" onerror="this.style.display='none'"/>
          </div>
          <div>
            <p style="font-size:10px; color:var(--primary); text-align:center; margin-bottom:4px;">AFTER ✓</p>
            <img src="${after}" alt="After repair" style="width:100%; border-radius:var(--border-radius-sm); object-fit:cover; max-height:150px;" onerror="this.style.display='none'"/>
          </div>
        </div>
        ${verified ? `<p style="font-size:10px; color:#10b981; margin-top:8px;">✅ Repair officially verified on ${new Date(complaint.verificationTimestamp).toLocaleDateString()}</p>` : ''}
      `;
    } else if (before) {
      el.innerHTML = `
        <p style="font-size:11px; font-weight:700; color:var(--text-muted); margin-bottom:8px; letter-spacing:0.05em;">COMPLAINT PHOTO</p>
        <img src="${before}" alt="Complaint photo" style="width:100%; border-radius:var(--border-radius-sm); object-fit:cover; max-height:180px;" onerror="this.style.display='none'"/>
        <p style="font-size:11px; color:var(--text-muted); margin-top:8px;">⏳ Awaiting repair verification photo</p>
      `;
    }
  },

  viewComplaintDetails(complaintId) {
    const reports = window.RoadTracker.getAllReports();
    const complaint = reports.find(c => c.id === complaintId);
    if (!complaint) return;

    document.getElementById("tracker-details-panel").style.display = "block";
    document.getElementById("active-tracker-container").setAttribute("data-id", complaintId);

    document.getElementById("details-ref-id").textContent = complaint.id;
    document.getElementById("details-defect-type").textContent = complaint.defectType;
    document.getElementById("details-road").textContent = complaint.matchedRoad ? complaint.matchedRoad.name : "Unregistered Road Asset";
    document.getElementById("details-routing").textContent = complaint.routeTo ? `Routed to ${complaint.routeTo}` : "Routed to local grievance authority.";
    document.getElementById("details-escalation").textContent = complaint.escalationHierarchy ? `Escalation path: ${complaint.escalationHierarchy.join(" → ")}` : "Escalation path: Engineer → Superintending Engineer → Chief Engineer";

    document.getElementById("details-notice").textContent = complaint.formalNoticeText;

    this.renderRepairComparison(complaint);

    const priorityEl = document.getElementById('details-priority-card');
    if (priorityEl && complaint.priorityScore) {
      const s = this.getPriorityStyle(complaint.priorityCategory);
      priorityEl.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
          <div style="font-size:28px; font-weight:800; color:${s.color};">${complaint.priorityScore}</div>
          <div>
            <div style="font-size:11px; color:var(--text-muted);">PRIORITY SCORE</div>
            <span style="padding:3px 10px; border-radius:6px; font-size:11px; font-weight:700; background:${s.bg}; color:${s.color}; border:${s.border};">${complaint.priorityCategory}</span>
          </div>
        </div>
      `;
      priorityEl.style.display = 'block';
    }

    const steps = [
      { name: "Submitted", desc: "Defect logged and visual telemetry verified." },
      { name: "Accepted", desc: "Regional Public Works intake confirmed. Authority audit started." },
      { name: "Engineer Assigned", desc: "Site jurisdiction assigned to Chief Division Engineer for field review." },
      { name: "Escalated to Superintending Engineer", desc: "Escalation to the supervising engineering authority for secondary review." },
      { name: "Escalated to Chief Engineer", desc: "Escalation to the chief engineering authority for final oversight." },
      { name: "Budget Allocated", desc: "Scope validated. Repair budget sanctioned under guarantee." },
      { name: "Work Commenced", desc: "Contractor mobilized on coordinates. Site barricaded." },
      { name: "Resolved", desc: "Asphalt relaid. Core testing complete. Road signed off." }
    ];

    const currentStatusIndex = steps.findIndex(s => s.name === complaint.status);
    const logs = complaint.statusLogs;

    const timelineHtml = steps.map((step, idx) => {
      let isCompleted = idx <= currentStatusIndex;
      let isActive = idx === currentStatusIndex + 1 && complaint.status !== "Resolved";
      
      const matchedLog = logs.find(l => l.status === step.name);
      const timeStr = matchedLog ? new Date(matchedLog.timestamp).toLocaleTimeString() : "";
      const customMessage = matchedLog ? matchedLog.message : step.desc;

      return `
        <div class="timeline-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}">
          <div class="timeline-bullet">
            <div class="bullet-dot"></div>
            <div class="bullet-line"></div>
          </div>
          <div class="timeline-content">
            <div class="timeline-header">
              <h4>${step.name}</h4>
              <span class="timeline-time">${timeStr}</span>
            </div>
            <p class="timeline-desc">${customMessage}</p>
          </div>
        </div>
      `;
    }).join("");

    function buildLiveEventFeed(logs) {
      if (!logs || logs.length === 0) return '';
      const sorted = [...logs].sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
      return `
        <div class="live-event-feed" style="margin-top:20px;">
          <h4 style="font-size:13px; color:var(--text-muted); margin-bottom:10px; letter-spacing:0.05em;">LIVE AUDIT TRAIL</h4>
          ${sorted.map(log => {
            const isEscalated = log.status === 'Escalated';
            const dotColor = isEscalated ? 'var(--accent-red)' : 'var(--primary)';
            const time = new Date(log.timestamp).toLocaleString();
            return `
              <div style="display:flex; gap:12px; margin-bottom:12px; align-items:flex-start;">
                <div style="width:8px; height:8px; border-radius:50%; background:${dotColor}; flex-shrink:0; margin-top:4px;"></div>
                <div>
                  <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                    <span style="font-size:12px; font-weight:700; color:var(--text-white);">${log.status}</span>
                    ${log.authority ? `<span class="badge badge-warn" style="font-size:10px;">${log.authority}</span>` : ''}
                    <span style="font-size:11px; color:var(--text-muted);">${time}</span>
                  </div>
                  <p style="font-size:12px; color:var(--text-muted); margin-top:2px;">${log.message}</p>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    document.getElementById("timeline-tracker-box").innerHTML = timelineHtml + buildLiveEventFeed(logs);
  },

  focusRoadOnMap(roadId) {
    const road = window.RoadDatabase.getRoadById(roadId);
    if (!road) return;

    this.switchTab("map");
    setTimeout(() => {
      if (!window.MapHub?.map) return;
      window.MapHub.focusRoad(roadId);
    }, 450);
  },

  showToast(text) {
    let toast = document.getElementById("app-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "app-toast";
      toast.style.cssText =
        "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:rgba(15,25,35,0.95);border:1px solid rgba(13,148,136,0.4);color:var(--text-white);padding:12px 24px;border-radius:var(--border-radius-md);z-index:9999;font-size:13px;font-weight:600;max-width:90vw;text-align:center;";
      document.body.appendChild(toast);
    }
    toast.textContent = text;
    toast.style.opacity = "1";
    setTimeout(() => {
      toast.style.opacity = "0";
    }, 4000);
  },

  initCharts(retry = 0) {
    const canvas1 = document.getElementById("chart-budget-leakage");
    const canvas2 = document.getElementById("chart-contractor-quality");
    if (!canvas1 || !canvas2) return;

    if (typeof Chart === "undefined") {
      if (retry < 12) {
        setTimeout(() => this.initCharts(retry + 1), 200);
        return;
      }
      this.renderChartFallback(canvas1, "Charts could not load. Hard-refresh the page.");
      this.renderChartFallback(canvas2, "Charts could not load. Hard-refresh the page.");
      return;
    }

    if (!window.RoadDatabase?.roads?.length) {
      if (retry < 12) {
        setTimeout(() => this.initCharts(retry + 1), 200);
        return;
      }
      return;
    }

    this.clearChartFallback(canvas1);
    this.clearChartFallback(canvas2);

    if (window._budgetChart) {
      window._budgetChart.destroy();
      window._budgetChart = null;
    }
    if (this.activeCharts.budgetLeakage) this.activeCharts.budgetLeakage.destroy();
    if (this.activeCharts.contractorPerformance) this.activeCharts.contractorPerformance.destroy();

    const roads = window.RoadDatabase.roads;
    const roadLabels = roads.map((r) => r.id);
    const sanctionedData = roads.map((r) => r.sanctionedBudget / 1e7);
    const spentData = roads.map((r) => r.spentBudget / 1e7);
    const contractorLabels = roads.map((r) => r.contractorName.substring(0, 15) + "...");
    const performanceScores = roads.map((r) => r.contractorPerformance);

    window._budgetChart = this.activeCharts.budgetLeakage = new Chart(canvas1.getContext("2d"), {
      type: "bar",
      data: {
        labels: roadLabels,
        datasets: [
          {
            label: "Allocated Budget (₹ Crores)",
            data: sanctionedData,
            backgroundColor: "rgba(56, 189, 248, 0.4)",
            borderColor: "#38bdf8",
            borderWidth: 1.5,
            borderRadius: 6,
          },
          {
            label: "Actual Spent (₹ Crores)",
            data: spentData,
            backgroundColor: (ctx) =>
              spentData[ctx.dataIndex] > sanctionedData[ctx.dataIndex]
                ? "rgba(239, 68, 68, 0.5)"
                : "rgba(13, 148, 136, 0.5)",
            borderColor: (ctx) =>
              spentData[ctx.dataIndex] > sanctionedData[ctx.dataIndex] ? "#ef4444" : "#0d9488",
            borderWidth: 1.5,
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: "#94a3b8" } } },
        scales: {
          x: { grid: { color: "rgba(255,255,255,0.03)" }, ticks: { color: "#94a3b8" } },
          y: { grid: { color: "rgba(255,255,255,0.03)" }, ticks: { color: "#94a3b8" } },
        },
      },
    });

    this.activeCharts.contractorPerformance = new Chart(canvas2.getContext("2d"), {
      type: "bar",
      data: {
        labels: contractorLabels,
        datasets: [
          {
            label: "Performance (★)",
            data: performanceScores,
            backgroundColor: "rgba(13, 148, 136, 0.25)",
            borderColor: "#0d9488",
            borderWidth: 1.5,
            borderRadius: 8,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { max: 5, grid: { color: "rgba(255,255,255,0.03)" }, ticks: { color: "#94a3b8" } },
          y: { grid: { display: false }, ticks: { color: "#94a3b8" } },
        },
      },
    });

    window._charts = this.activeCharts;

    if (!this._chartResizeObserver) {
      this._chartResizeObserver = new ResizeObserver(() => {
        if (this.activeCharts.budgetLeakage) this.activeCharts.budgetLeakage.resize();
        if (this.activeCharts.contractorPerformance) this.activeCharts.contractorPerformance.resize();
      });
      this._chartResizeObserver.observe(canvas1.parentElement);
      this._chartResizeObserver.observe(canvas2.parentElement);
    }
  },

  renderChartFallback(canvas, message) {
    const wrapper = canvas.parentElement;
    if (!wrapper) return;
    canvas.style.display = "none";
    let fallback = wrapper.querySelector(".chart-fallback");
    if (!fallback) {
      fallback = document.createElement("div");
      fallback.className = "chart-fallback";
      wrapper.appendChild(fallback);
    }
    fallback.textContent = message;
  },

  clearChartFallback(canvas) {
    const wrapper = canvas.parentElement;
    if (!wrapper) return;
    canvas.style.display = "block";
    wrapper.querySelector(".chart-fallback")?.remove();
  },

  async monitorStorageQuota() {
    if (!window.StorageOptimizer) return;
    const quota = await StorageOptimizer.getStorageQuota();
    if (quota?.percentUsed > 80) {
      this.showToast(`⚠️ Storage low: ${quota.percentUsed}% used`);
      await StorageOptimizer.clearOldCache(7);
    }
  },

  getComplaintsForContext() {
    return (window.RoadTracker?.getAllReports?.() || []).map((c) => ({
      refId: c.id,
      defectClass: c.defectType,
      road: c.matchedRoad?.name || c.matchedRoad?.id || "Unknown",
    }));
  },

  highlightTenderRow(roadId) {
    this.switchTab("transparency");
    setTimeout(() => {
      const row = document.querySelector(`.tender-row[data-road-id="${roadId}"]`);
      row?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (row) {
        row.style.background = "rgba(13, 148, 136, 0.15)";
        setTimeout(() => {
          row.style.background = "";
        }, 3000);
      }
    }, 300);
  },

  appendChatMessage(role, text, options = {}) {
    const box = document.getElementById("chat-box");
    if (!box) return;
    const wrap = document.createElement("div");
    wrap.className = `chat-bubble chat-bubble--${role}${options.error ? " chat-bubble--error" : ""}`;
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    wrap.innerHTML = `<div class="chat-bubble-meta"><span class="chat-time">${time}</span></div><div class="chat-bubble-body">${this.escapeHTML(text).replace(/\n/g, "<br>")}</div>`;
    box.appendChild(wrap);
    box.scrollTop = box.scrollHeight;
  },

  createStreamingBubble() {
    const box = document.getElementById("chat-box");
    if (!box) return null;
    window.App?.hideTypingIndicator?.();
    const wrap = document.createElement("div");
    wrap.className = "chat-bubble chat-bubble--assistant";
    wrap.innerHTML = `<div class="chat-bubble-meta"><span class="chat-time">YatraGPT</span></div><div class="chat-bubble-body"></div>`;
    box.appendChild(wrap);
    box.scrollTop = box.scrollHeight;
    return wrap;
  },

  showTypingIndicator() {
    const el = document.getElementById("typing-indicator");
    const box = document.getElementById("chat-box");
    if (el && box) {
      el.style.display = "flex";
      box.appendChild(el);
      box.scrollTop = box.scrollHeight;
    }
  },

  hideTypingIndicator() {
    const el = document.getElementById("typing-indicator");
    if (el) el.style.display = "none";
  },

  handleUserChatMessage() {
    const inputEl = document.getElementById("chat-input");
    const text = inputEl?.value?.trim();
    if (!text) return;
    if (inputEl) inputEl.value = "";
    if (window.YatraGPT) {
      window.YatraGPT.sendMessage(text);
    } else if (window.YatraChatbot) {
      window.YatraChatbot.handleUserChatMessage();
    }
  },

  sendBotMessage(text) {
    const inputEl = document.getElementById("chat-input");
    if (inputEl) inputEl.value = text;
    this.handleUserChatMessage();
  },
};

window.App = App;
window.onload = () =>
  window.App.showWelcome(async () => {
    if (window.RealDataLoader?.init) {
      await window.RealDataLoader.init();
    }
    window.App.init();
    window.TransparencyPanel?.render?.();
    window.ContractorHub?.render?.();
    window.BudgetDashboard?.render?.();
    if (window.MapHub?.map) {
      window.MapHub.plotDatabaseRoads();
      window.MapHub.plotSeededComplaints?.(window._SEEDED_COMPLAINTS);
    }
  });
