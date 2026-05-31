/**
 * YATHRA RAKSHA — Main Application Orchestrator v3
 * Handles navigation, dark mode, map, AI detect, spendings, complaints, chatbot.
 */
const App = {
  currentScreen: 'map',
  map: null,
  mapTileLayer: null,
  roadLayers: [],
  roadInfoPanel: null,
  selectedRoad: null,
  userCoords: null,
  userMarker: null,
  aiAnalysisResult: null,
  chatHistory: [],
  contractorChart: null,

  // ─── Init ─────────────────────────────────────────────
  init() {
    this.initNav();
    this.initTheme();
    this.initMap();
    this.initAIDetect();
    this.initSpendings();
    this.initComplaints();
    this.initChatbot();
    console.log('✅ Yathra Raksha v3 ready');
  },

  // ─── Toast ────────────────────────────────────────────
  showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  },

  apiBase() {
    if (window.AppConfig?.API_BASE_URL) return window.AppConfig.API_BASE_URL;
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return 'http://127.0.0.1:8000/v1';
    return `${window.location.origin}/v1`;
  },

  // ─── Navigation ───────────────────────────────────────
  initNav() {
    // Desktop sidebar nav
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => this.switchScreen(btn.dataset.screen));
    });
    // Mobile bottom nav
    document.querySelectorAll('.mobile-nav-item').forEach(btn => {
      btn.addEventListener('click', () => this.switchScreen(btn.dataset.screen));
    });
    document.querySelectorAll('.mobile-sheet-item').forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchScreen(btn.dataset.screen);
        this.closeMobileSheet();
      });
    });
    document.getElementById('hamburger-btn')?.addEventListener('click', () => this.openMobileSheet());
    document.getElementById('mobile-sheet-backdrop')?.addEventListener('click', () => this.closeMobileSheet());
  },

  switchScreen(screenId) {
    this.currentScreen = screenId;
    // Update nav active states
    document.querySelectorAll('.nav-item, .mobile-nav-item, .mobile-sheet-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.screen === screenId);
    });
    // Update screen visibility
    document.querySelectorAll('.screen').forEach(s => {
      s.classList.toggle('active', s.id === `screen-${screenId}`);
    });
    // Map needs invalidateSize after becoming visible
    if (screenId === 'map' && this.map) {
      setTimeout(() => this.map.invalidateSize(), 100);
    }
    // Spendings needs chart resize
    if (screenId === 'spendings' && this.contractorChart) {
      setTimeout(() => this.contractorChart.resize(), 100);
    }
  },

  openMobileSheet() {
    document.getElementById('mobile-sheet')?.classList.add('open');
    document.getElementById('mobile-sheet-backdrop')?.classList.add('open');
    document.getElementById('hamburger-btn')?.setAttribute('aria-expanded', 'true');
  },

  closeMobileSheet() {
    document.getElementById('mobile-sheet')?.classList.remove('open');
    document.getElementById('mobile-sheet-backdrop')?.classList.remove('open');
    document.getElementById('hamburger-btn')?.setAttribute('aria-expanded', 'false');
  },

  // ─── Theme ────────────────────────────────────────────
  initTheme() {
    const toggle = document.getElementById('theme-toggle');
    const moonIcon = document.getElementById('theme-icon-moon');
    const sunIcon = document.getElementById('theme-icon-sun');
    const saved = localStorage.getItem('yr-theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    this._updateThemeIcon(saved, moonIcon, sunIcon);

    toggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('yr-theme', next);
      this._updateThemeIcon(next, moonIcon, sunIcon);
      // Re-render map tiles
      if (this.map) this.setMapMode(document.querySelector('.map-mode-btn.active')?.dataset.mode || 'road');
    });
  },

  _updateThemeIcon(theme, moonIcon, sunIcon) {
    if (theme === 'dark') {
      if (moonIcon) moonIcon.style.display = 'none';
      if (sunIcon) sunIcon.style.display = '';
    } else {
      if (moonIcon) moonIcon.style.display = '';
      if (sunIcon) sunIcon.style.display = 'none';
    }
  },

  // ═══════════════════════════════════════════════════════
  // SCREEN 1: MAP
  // ═══════════════════════════════════════════════════════
  initMap() {
    if (typeof L === 'undefined') return;

    this.map = L.map('map-container', {
      center: [20.5937, 78.9629],
      zoom: 5,
      zoomControl: true,
      attributionControl: true,
    });

    this.setMapMode('road');
    this.plotRoads();

    // Map mode switcher
    document.querySelectorAll('.map-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.map-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.setMapMode(btn.dataset.mode);
      });
    });

    // Search
    document.getElementById('map-search-btn')?.addEventListener('click', () => this.searchMap());
    document.getElementById('map-search-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') this.searchMap();
    });

    // Locate
    document.getElementById('map-locate-btn')?.addEventListener('click', () => this.locateUser());

    // Panel close
    document.getElementById('panel-close')?.addEventListener('click', () => this.closeRoadPanel());
  },

  setMapMode(mode) {
    if (this.mapTileLayer) this.map.removeLayer(this.mapTileLayer);
    const tiles = {
      road: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      night: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    };
    const attr = {
      road: '&copy; OpenStreetMap contributors',
      satellite: '&copy; Esri',
      night: '&copy; CARTO',
    };
    this.mapTileLayer = L.tileLayer(tiles[mode] || tiles.road, {
      maxZoom: 19,
      attribution: attr[mode] || attr.road,
    }).addTo(this.map);
  },

  plotRoads() {
    const data = window.MOCK_DATA;
    if (!data) return;

    data.roads.forEach(road => {
      const color = data.getConditionColor(road.condition);

      // Plot polyline
      if (road.coordinates.length > 1) {
        const polyline = L.polyline(road.coordinates, {
          color: color,
          weight: 5,
          opacity: 0.8,
          lineCap: 'round',
        }).addTo(this.map);
        polyline.on('click', () => this.showRoadInfo(road));
        this.roadLayers.push(polyline);
      }

      // Plot start marker
      const marker = L.circleMarker(road.coordinates[0], {
        radius: 7,
        fillColor: color,
        color: '#ffffff',
        weight: 2,
        fillOpacity: 1,
      }).addTo(this.map);

      marker.bindTooltip(road.name, {
        permanent: false,
        direction: 'top',
        className: '',
        offset: [0, -10],
      });

      marker.on('click', () => this.showRoadInfo(road));
      this.roadLayers.push(marker);
    });
  },

  searchMap() {
    const query = document.getElementById('map-search-input')?.value?.trim().toLowerCase();
    if (!query) return;

    const data = window.MOCK_DATA;
    const found = data.roads.find(r =>
      r.name.toLowerCase().includes(query) ||
      data.getContractorById(r.contractor_id)?.name.toLowerCase().includes(query)
    );

    if (found) {
      this.map.setView(found.coordinates[0], 8, { animate: true });
      this.showRoadInfo(found);
      this.showToast(`📍 Found: ${found.name}`);
    } else {
      this.showToast('No road found matching your search');
    }
  },

  locateUser() {
    if (!navigator.geolocation) {
      this.showToast('Geolocation not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        this.userCoords = [lat, lng];
        this.map.setView([lat, lng], 12, { animate: true });

        if (this.userMarker) this.map.removeLayer(this.userMarker);
        this.userMarker = L.marker([lat, lng], {
          icon: L.divIcon({
            className: '',
            html: '<div style="width:16px;height:16px;background:#1D9E75;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          }),
        }).addTo(this.map);

        // Show coords badge
        const badge = document.getElementById('map-coords-badge');
        const text = document.getElementById('map-coords-text');
        if (badge && text) {
          badge.style.display = 'block';
          text.textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        }

        this.showToast(`📍 Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      },
      err => {
        this.showToast('Could not get your location. Check permissions.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  },

  showRoadInfo(road) {
    this.selectedRoad = road;
    const data = window.MOCK_DATA;
    const contractor = data.getContractorById(road.contractor_id);
    const complaints = data.getComplaintsByRoad(road.id);
    const tender = data.getTenderByRoad(road.id);
    const budgetPct = road.budget_allocated > 0 ? Math.round((road.budget_spent / road.budget_allocated) * 100) : 0;
    const condClass = road.condition.toLowerCase();
    const typeLabel = { NH: 'National Highway', SH: 'State Highway', MDR: 'Major District Road', EXP: 'Expressway' }[road.type] || road.type;

    // Score ring color
    const scoreColor = road.ai_damage_score > 60 ? '#E24B4A' : road.ai_damage_score > 35 ? '#EF9F27' : '#639922';
    const scoreOffset = 126 - (126 * road.ai_damage_score / 100);

    const content = document.getElementById('road-panel-content');
    content.innerHTML = `
      <div class="panel-header">
        <h2 class="panel-road-name">${road.name}</h2>
        <div class="panel-badges">
          <span class="badge badge-${road.type.toLowerCase()}">${typeLabel}</span>
          <span class="badge badge-${condClass}">${road.condition}</span>
        </div>
      </div>

      <div class="panel-details">
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-item-label">Length</span>
            <span class="detail-item-value">${road.length_km} km</span>
          </div>
          <div class="detail-item">
            <span class="detail-item-label">Construction Date</span>
            <span class="detail-item-value">${road.construction_date}</span>
          </div>
          <div class="detail-item">
            <span class="detail-item-label">Last Relaying</span>
            <span class="detail-item-value">${road.last_relay_date}</span>
          </div>
          <div class="detail-item">
            <span class="detail-item-label">Road Age</span>
            <span class="detail-item-value">${data.getRoadAge(road.construction_date)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-item-label">Contractor</span>
            <span class="detail-item-value">${contractor?.name || '—'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-item-label">Executive Engineer</span>
            <span class="detail-item-value">${road.engineer_name}</span>
          </div>
          <div class="detail-item">
            <span class="detail-item-label">Department</span>
            <span class="detail-item-value">${road.department}</span>
          </div>
          <div class="detail-item">
            <span class="detail-item-label">AI Damage Score</span>
            <div style="display:flex;align-items:center;gap:8px;">
              <div class="score-ring">
                <svg viewBox="0 0 44 44">
                  <circle cx="22" cy="22" r="20" fill="none" stroke="var(--border)" stroke-width="4"/>
                  <circle cx="22" cy="22" r="20" fill="none" stroke="${scoreColor}" stroke-width="4" stroke-dasharray="126" stroke-dashoffset="${scoreOffset}" stroke-linecap="round"/>
                </svg>
                <span class="score-ring-text" style="color:${scoreColor}">${road.ai_damage_score}</span>
              </div>
            </div>
          </div>
          <div class="detail-item">
            <span class="detail-item-label">Complaints</span>
            <span class="detail-item-value">${road.complaint_count}</span>
          </div>
          <div class="detail-item">
            <span class="detail-item-label">Next Maintenance</span>
            <span class="detail-item-value">${road.next_maintenance}</span>
          </div>
          <div class="detail-item">
            <span class="detail-item-label">Budget Allocated</span>
            <span class="detail-item-value">${data.formatINR(road.budget_allocated)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-item-label">Budget Used</span>
            <span class="detail-item-value" style="color:${budgetPct > 100 ? 'var(--danger)' : 'var(--text)'}">${budgetPct}%</span>
          </div>
        </div>

        <!-- Repair History -->
        <h3 style="font-size:14px;font-weight:600;margin:20px 0 10px;">Repair History</h3>
        <div class="repair-timeline">
          ${road.repair_history.map(r => `
            <div class="repair-entry">
              <div class="repair-date">${r.date}</div>
              <div class="repair-desc">${r.description}</div>
              <div class="repair-cost">${r.contractor} — ${data.formatINR(r.cost)}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Actions -->
      <div class="panel-actions">
        <button class="btn btn-primary btn-sm" onclick="App.reportIssueFromMap()">🚨 Report an Issue</button>
        <button class="btn btn-secondary btn-sm" onclick="App.viewNearbyComplaints()">📋 View Complaints</button>
      </div>

      <!-- Budget bar -->
      <div class="panel-budget-bar">
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-bottom:4px;">
          <span>Budget: ${data.formatINR(road.budget_allocated)}</span>
          <span style="color:${budgetPct > 100 ? 'var(--danger)' : 'var(--primary)'}">${budgetPct}% used</span>
        </div>
        <div class="progress ${budgetPct > 100 ? 'progress-red' : budgetPct > 90 ? 'progress-amber' : 'progress-green'}">
          <div class="progress-fill" style="width:${Math.min(budgetPct, 100)}%"></div>
        </div>
      </div>
    `;

    document.getElementById('road-info-panel').classList.add('open');
  },

  closeRoadPanel() {
    document.getElementById('road-info-panel').classList.remove('open');
  },

  reportIssueFromMap() {
    this.switchScreen('ai-detect');
    if (this.selectedRoad) {
      document.getElementById('ai-location-name').value = this.selectedRoad.name;
      const coords = this.selectedRoad.coordinates[0];
      document.getElementById('ai-lat').value = coords[0];
      document.getElementById('ai-lng').value = coords[1];
    }
  },

  viewNearbyComplaints() {
    this.switchScreen('complaints');
    if (this.selectedRoad) {
      document.getElementById('complaints-search').value = this.selectedRoad.name;
      this.filterComplaints();
    }
  },

  // ═══════════════════════════════════════════════════════
  // SCREEN 2: AI DETECT
  // ═══════════════════════════════════════════════════════
  initAIDetect() {
    const uploadArea = document.getElementById('ai-upload-area');
    const fileInput = document.getElementById('ai-file-input');
    const cameraInput = document.getElementById('ai-camera-input');
    const analyzeBtn = document.getElementById('ai-analyze-btn');

    // Upload click
    document.getElementById('ai-upload-btn')?.addEventListener('click', () => fileInput.click());
    document.getElementById('ai-capture-btn')?.addEventListener('click', () => cameraInput.click());
    uploadArea?.addEventListener('click', () => fileInput.click());

    // Drag & drop
    uploadArea?.addEventListener('dragover', e => { e.preventDefault(); uploadArea.style.borderColor = 'var(--primary)'; });
    uploadArea?.addEventListener('dragleave', () => { uploadArea.style.borderColor = ''; });
    uploadArea?.addEventListener('drop', e => {
      e.preventDefault();
      uploadArea.style.borderColor = '';
      if (e.dataTransfer.files[0]) this.handleAIImage(e.dataTransfer.files[0]);
    });

    // File selected
    fileInput?.addEventListener('change', e => { if (e.target.files[0]) this.handleAIImage(e.target.files[0]); });
    cameraInput?.addEventListener('change', e => { if (e.target.files[0]) this.handleAIImage(e.target.files[0]); });

    // Retake
    document.getElementById('ai-retake-btn')?.addEventListener('click', () => this.resetAIDetect());

    // Use location
    document.getElementById('ai-use-location-btn')?.addEventListener('click', () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          document.getElementById('ai-lat').value = lat.toFixed(6);
          document.getElementById('ai-lng').value = lng.toFixed(6);
          this.reverseGeocode(lat, lng).then(place => {
            if (place) document.getElementById('ai-location-name').value = place;
          });
          this.showToast('📍 Location captured');
        }, () => this.showToast('Could not get location'));
      }
    });

    // Analyze
    analyzeBtn?.addEventListener('click', () => this.analyzeImage());

    // File complaint from AI
    document.getElementById('ai-file-complaint-btn')?.addEventListener('click', () => this.openComplaintModal());
    document.getElementById('ai-cancel-btn')?.addEventListener('click', () => this.resetAIDetect());

    // Modal
    document.getElementById('modal-cancel-btn')?.addEventListener('click', () => {
      document.getElementById('complaint-modal').classList.remove('open');
    });
    document.getElementById('complaint-submit-form')?.addEventListener('submit', e => {
      e.preventDefault();
      this.submitComplaintFromModal();
    });
  },

  handleAIImage(file) {
    this._aiFile = file;
    const preview = document.getElementById('ai-preview-img');
    const placeholder = document.getElementById('ai-upload-placeholder');
    const retakeBtn = document.getElementById('ai-retake-btn');
    const analyzeBtn = document.getElementById('ai-analyze-btn');
    const area = document.getElementById('ai-upload-area');

    const reader = new FileReader();
    reader.onload = e => {
      preview.src = e.target.result;
      preview.style.display = 'block';
      placeholder.style.display = 'none';
      retakeBtn.style.display = 'block';
      analyzeBtn.disabled = false;
      area.classList.add('has-image');
    };
    reader.readAsDataURL(file);
  },

  resetAIDetect() {
    this._aiFile = null;
    this.aiAnalysisResult = null;
    document.getElementById('ai-preview-img').style.display = 'none';
    document.getElementById('ai-upload-placeholder').style.display = '';
    document.getElementById('ai-retake-btn').style.display = 'none';
    document.getElementById('ai-analyze-btn').disabled = true;
    document.getElementById('ai-upload-area').classList.remove('has-image');
    document.getElementById('ai-empty-state').style.display = '';
    document.getElementById('ai-loading-state').style.display = 'none';
    document.getElementById('ai-results').style.display = 'none';
    document.getElementById('ai-action-buttons').style.display = 'none';
    document.getElementById('ai-file-input').value = '';
    document.getElementById('ai-camera-input').value = '';
  },

  async analyzeImage() {
    if (!this._aiFile) return;

    document.getElementById('ai-empty-state').style.display = 'none';
    document.getElementById('ai-loading-state').style.display = '';
    document.getElementById('ai-results').style.display = 'none';
    document.getElementById('ai-analyze-btn').disabled = true;

    const lat = document.getElementById('ai-lat').value || '12.9716';
    const lng = document.getElementById('ai-lng').value || '77.5946';
    const locationName = document.getElementById('ai-location-name').value || 'Unknown location';

    try {
      // Convert image to base64
      const base64 = await this.fileToBase64(this._aiFile);

      // Call backend AI endpoint
      const response = await fetch(`${this.apiBase()}/ai/analyze-road`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: base64,
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          location_name: locationName,
        }),
      });

      let result;
      if (response.ok) {
        result = await response.json();
      } else {
        // Fallback mock analysis if backend unavailable
        result = this.mockAIAnalysis(locationName);
      }

      this.aiAnalysisResult = result;
      this.renderAIResults(result);
    } catch (err) {
      console.warn('AI analysis error, using mock:', err);
      const result = this.mockAIAnalysis(locationName);
      this.aiAnalysisResult = result;
      this.renderAIResults(result);
    }
  },

  mockAIAnalysis(locationName) {
    const damages = ['Pothole', 'Alligator Cracking'];
    const severity = 6;
    return {
      detected_damages: damages,
      severity_score: severity,
      ai_complaint_text: `To the Executive Engineer, Public Works Department,\n\nThis is to formally report road damage observed at ${locationName}. The AI analysis has detected the following issues: ${damages.join(', ')}. The severity is rated ${severity}/10, indicating significant damage requiring prompt attention. The road surface shows signs of structural failure that poses a safety risk to commuters, particularly two-wheeler riders.\n\nImmediate repair action is requested to prevent accidents and further deterioration.\n\nRegards,\nCitizen via Yathra Raksha Platform`,
    };
  },

  renderAIResults(result) {
    document.getElementById('ai-loading-state').style.display = 'none';
    document.getElementById('ai-results').style.display = '';
    document.getElementById('ai-action-buttons').style.display = 'flex';

    const allDamageTypes = ['Pothole', 'Alligator Cracking', 'Longitudinal Crack', 'Transverse Crack', 'Rutting', 'Good Condition'];
    const detected = result.detected_damages || [];

    const checklist = document.getElementById('ai-checklist');
    checklist.innerHTML = allDamageTypes.map(type => {
      const found = detected.includes(type);
      return `<div class="detection-item ${found ? 'detected' : 'not-detected'}">
        <span>${found ? '✅' : '❌'}</span>
        <span>${type}</span>
      </div>`;
    }).join('');

    // Severity
    const score = result.severity_score || 0;
    const severityColor = score > 7 ? 'var(--danger)' : score > 4 ? 'var(--warning)' : 'var(--success)';
    document.getElementById('ai-severity-fill').style.width = `${score * 10}%`;
    document.getElementById('ai-severity-fill').style.background = severityColor;
    document.getElementById('ai-severity-value').textContent = score;
    document.getElementById('ai-severity-value').style.color = severityColor;

    // Complaint text
    document.getElementById('ai-complaint-text').value = result.ai_complaint_text || '';
  },

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const maxSide = 1280;
          const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.78).split(',')[1]);
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  async reverseGeocode(lat, lng) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;
      const response = await fetch(url);
      if (!response.ok) return '';
      const data = await response.json();
      return data.display_name || '';
    } catch {
      return '';
    }
  },

  openComplaintModal() {
    const modal = document.getElementById('complaint-modal');
    document.getElementById('modal-location').value = document.getElementById('ai-location-name').value;
    document.getElementById('modal-lat').value = document.getElementById('ai-lat').value;
    document.getElementById('modal-lng').value = document.getElementById('ai-lng').value;
    document.getElementById('modal-description').value = document.getElementById('ai-complaint-text').value;
    modal.classList.add('open');
  },

  submitComplaintFromModal() {
    const name = document.getElementById('modal-name').value.trim();
    const aadhaar = document.getElementById('modal-aadhaar').value.trim();
    if (!name) { this.showToast('Please enter your name'); return; }

    const refId = 'YR-2026-' + String(Math.floor(Math.random() * 99999)).padStart(5, '0');

    // Add to mock complaints
    const newComplaint = {
      id: 'CMP' + Date.now(),
      road_id: this.selectedRoad?.id || 'R000',
      road_name: document.getElementById('modal-location').value || 'Unknown Road',
      location: document.getElementById('modal-location').value,
      lat: parseFloat(document.getElementById('modal-lat').value) || 0,
      lng: parseFloat(document.getElementById('modal-lng').value) || 0,
      type: this.aiAnalysisResult?.detected_damages?.[0] || 'Pothole',
      description: document.getElementById('modal-description').value,
      submitted_by: name,
      aadhaar_masked: aadhaar ? 'XXXX-XXXX-' + aadhaar.slice(-4) : 'XXXX-XXXX-XXXX',
      date: new Date().toISOString().split('T')[0],
      status: 'Filed',
      reference_id: refId,
      photo_url: null,
      upvote_count: 0,
    };

    window.MOCK_DATA.complaints.unshift(newComplaint);

    document.getElementById('complaint-modal').classList.remove('open');
    this.showToast(`✅ Complaint submitted! Reference: ${refId}`);
    this.resetAIDetect();
    this.renderComplaintsList();
  },

  // ═══════════════════════════════════════════════════════
  // SCREEN 3: SPENDINGS
  // ═══════════════════════════════════════════════════════
  initSpendings() {
    this.renderSpendingsSummary();
    this.renderSpendingsTable();
    this.renderContractorRankings('best');
    this.renderContractorChart();
    this.populateSpendingsFilters();

    // Search
    document.getElementById('spendings-search')?.addEventListener('input', () => this.renderSpendingsTable());

    // Filters
    ['spendings-state', 'spendings-district', 'spendings-year', 'spendings-source'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', () => {
        if (id === 'spendings-state') this.populateDistrictFilter();
        this.renderSpendingsTable();
      });
    });

    // Contractor tabs
    document.querySelectorAll('.contractor-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.contractor-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.renderContractorRankings(tab.dataset.tab);
      });
    });

    // Table sorting
    document.querySelectorAll('#spendings-table th[data-sort]').forEach(th => {
      th.addEventListener('click', () => this.sortSpendingsTable(th.dataset.sort));
    });
  },

  populateSpendingsFilters() {
    const data = window.MOCK_DATA;
    const states = [...new Set(data.roads.map(r => r.state))].sort();
    const sources = [...new Set(data.tenders.map(t => t.source))].sort();

    const stateSelect = document.getElementById('spendings-state');
    states.forEach(s => { const opt = document.createElement('option'); opt.value = s; opt.textContent = s; stateSelect.appendChild(opt); });

    const sourceSelect = document.getElementById('spendings-source');
    sources.forEach(s => { const opt = document.createElement('option'); opt.value = s; opt.textContent = s; sourceSelect.appendChild(opt); });
  },

  populateDistrictFilter() {
    const data = window.MOCK_DATA;
    const stateFilter = document.getElementById('spendings-state')?.value || '';
    const districtSelect = document.getElementById('spendings-district');
    if (!districtSelect) return;

    // Clear existing options
    districtSelect.innerHTML = '<option value="">All Districts</option>';

    let roads = data.roads;
    if (stateFilter) roads = roads.filter(r => r.state === stateFilter);

    const districts = [...new Set(roads.map(r => r.district))].sort();
    districts.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = d;
      districtSelect.appendChild(opt);
    });
  },

  renderSpendingsSummary() {
    const stats = window.MOCK_DATA.getSummaryStats();
    const fmt = window.MOCK_DATA.formatINR;

    document.getElementById('spendings-summary').innerHTML = `
      <div class="card summary-card"><div class="summary-card-label">Total Allocated</div><div class="summary-card-value primary">${fmt(stats.totalAllocated)}</div></div>
      <div class="card summary-card"><div class="summary-card-label">Funds Released</div><div class="summary-card-value">${fmt(stats.totalReleased)}</div></div>
      <div class="card summary-card"><div class="summary-card-label">Amount Spent</div><div class="summary-card-value amber">${fmt(stats.totalSpent)}</div></div>
      <div class="card summary-card"><div class="summary-card-label">Remaining Balance</div><div class="summary-card-value ${stats.totalBalance < 0 ? 'red' : 'green'}">${fmt(Math.abs(stats.totalBalance))}${stats.totalBalance < 0 ? ' (deficit)' : ''}</div></div>
    `;
  },

  _spendingsSortKey: null,
  _spendingsSortAsc: true,

  sortSpendingsTable(key) {
    if (this._spendingsSortKey === key) {
      this._spendingsSortAsc = !this._spendingsSortAsc;
    } else {
      this._spendingsSortKey = key;
      this._spendingsSortAsc = true;
    }
    this.renderSpendingsTable();
  },

  renderSpendingsTable() {
    const data = window.MOCK_DATA;
    const search = document.getElementById('spendings-search')?.value?.toLowerCase() || '';
    const stateFilter = document.getElementById('spendings-state')?.value || '';
    const districtFilter = document.getElementById('spendings-district')?.value || '';
    const sourceFilter = document.getElementById('spendings-source')?.value || '';

    let tenders = [...data.tenders];

    // Filter
    if (search) {
      tenders = tenders.filter(t => {
        const contractor = data.getContractorById(t.contractor_id);
        return t.road_name.toLowerCase().includes(search) ||
               contractor?.name.toLowerCase().includes(search);
      });
    }
    if (stateFilter) {
      tenders = tenders.filter(t => {
        const road = data.getRoadById(t.road_id);
        return road?.state === stateFilter;
      });
    }
    if (districtFilter) {
      tenders = tenders.filter(t => {
        const road = data.getRoadById(t.road_id);
        return road?.district === districtFilter;
      });
    }
    if (sourceFilter) {
      tenders = tenders.filter(t => t.source === sourceFilter);
    }

    // Sort
    const key = this._spendingsSortKey;
    const asc = this._spendingsSortAsc;
    if (key) {
      const getVal = (t) => {
        switch(key) {
          case 'road_name': return t.road_name;
          case 'date': return t.date;
          case 'allocated': return t.budget_allocated;
          case 'spent': return t.spent;
          case 'balance': return t.balance;
          case 'completion': return t.completion_pct;
          default: return '';
        }
      };
      tenders.sort((a, b) => {
        const va = getVal(a), vb = getVal(b);
        const cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
        return asc ? cmp : -cmp;
      });
    }

    const fmt = data.formatINR;
    const tbody = document.getElementById('spendings-tbody');
    tbody.innerHTML = tenders.map(t => {
      const contractor = data.getContractorById(t.contractor_id);
      const rowClass = t.balance < 0 ? 'row-red' : t.completion_pct > 90 && t.balance > 0 ? 'row-green' : t.spent / t.budget_allocated > 0.9 ? 'row-amber' : '';

      return `<tr class="${rowClass}">
        <td>
          <div style="font-weight:600;font-size:13px;">${t.road_name}</div>
          ${t.anomaly_flag ? `<span class="anomaly-flag" title="${t.anomaly_reason}">⚠️</span>` : ''}
        </td>
        <td>${t.date}</td>
        <td>${fmt(t.budget_allocated)}</td>
        <td>${fmt(t.spent)}</td>
        <td style="color:${t.balance < 0 ? 'var(--danger)' : 'var(--text)'}">${fmt(Math.abs(t.balance))}${t.balance < 0 ? ' ⚠️' : ''}</td>
        <td><a class="source-link" href="${t.source_url}" target="_blank">${t.source} ↗</a></td>
        <td>
          <div style="display:flex;align-items:center;gap:6px;">
            <div class="progress" style="flex:1;height:4px;">
              <div class="progress-fill" style="width:${t.completion_pct}%;background:${t.completion_pct > 80 ? 'var(--success)' : t.completion_pct > 50 ? 'var(--warning)' : 'var(--danger)'}"></div>
            </div>
            <span style="font-size:12px;font-weight:600;">${t.completion_pct}%</span>
          </div>
        </td>
        <td style="font-size:12px;">${contractor?.name || '—'}</td>
      </tr>`;
    }).join('');
  },

  renderContractorRankings(tab) {
    const data = window.MOCK_DATA;
    let contractors = [...data.contractors];

    if (tab === 'best') {
      contractors.sort((a, b) => b.avg_health_score - a.avg_health_score);
    } else {
      contractors.sort((a, b) => a.avg_health_score - b.avg_health_score);
    }

    const list = document.getElementById('contractor-list');
    list.innerHTML = contractors.slice(0, 5).map((c, i) => {
      const isBest = tab === 'best';
      return `<div class="card contractor-card" style="margin-bottom:8px;${!isBest && c.avg_health_score < 75 ? 'border-left:3px solid var(--danger);' : ''}">
        <div class="contractor-rank">
          <div class="rank-badge" style="${isBest ? '' : 'background:rgba(226,75,74,0.1);color:var(--danger);'}">#${i + 1}</div>
          <span class="contractor-name">${c.name}</span>
        </div>
        <div class="contractor-stats">
          <span>Projects: <strong>${c.projects_completed}</strong></span>
          <span>Health: <strong>${c.avg_health_score}/100</strong></span>
          <span>Complaints: <strong>${c.complaints_count}</strong></span>
          <span>Completion: <strong>${c.completion_rate}%</strong></span>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;margin-top:4px;">
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);">
            <span>Budget efficiency</span><span>${c.budget_efficiency}%</span>
          </div>
          <div class="progress progress-primary"><div class="progress-fill" style="width:${c.budget_efficiency}%"></div></div>
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);">
            <span>Completion rate</span><span>${c.completion_rate}%</span>
          </div>
          <div class="progress ${c.completion_rate > 85 ? 'progress-green' : 'progress-amber'}"><div class="progress-fill" style="width:${c.completion_rate}%"></div></div>
        </div>
      </div>`;
    }).join('');
  },

  renderContractorChart() {
    const canvas = document.getElementById('contractor-chart');
    if (!canvas || typeof Chart === 'undefined') return;

    // Destroy existing chart if re-rendering
    if (this.contractorChart) {
      this.contractorChart.destroy();
      this.contractorChart = null;
    }

    const data = window.MOCK_DATA;
    const sorted = [...data.contractors].sort((a, b) => b.avg_health_score - a.avg_health_score).slice(0, 10);
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
    const tickColor = isDark ? '#999' : '#666';

    this.contractorChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: sorted.map(c => c.name.split(' ').slice(0, 2).join(' ')),
        datasets: [{
          label: 'Health Score',
          data: sorted.map(c => c.avg_health_score),
          backgroundColor: sorted.map(c => c.avg_health_score >= 80 ? 'rgba(29,158,117,0.75)' : c.avg_health_score >= 70 ? 'rgba(239,159,39,0.75)' : 'rgba(226,75,74,0.75)'),
          borderRadius: 6,
          barThickness: 20,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10, family: 'Inter' }, color: tickColor } },
          y: { beginAtZero: true, max: 100, grid: { color: gridColor }, ticks: { color: tickColor } },
        },
      },
    });
  },

  // ═══════════════════════════════════════════════════════
  // SCREEN 4: COMPLAINTS
  // ═══════════════════════════════════════════════════════
  initComplaints() {
    this.renderComplaintsList();
    this.populateRoadSuggestions();

    // Search
    document.getElementById('complaints-search')?.addEventListener('input', () => this.filterComplaints());

    // New complaint form
    document.getElementById('new-complaint-form')?.addEventListener('submit', e => {
      e.preventDefault();
      this.submitNewComplaint();
    });

    // Mobile FAB
    document.getElementById('complaint-fab')?.addEventListener('click', () => {
      document.getElementById('new-complaint-panel').classList.toggle('mobile-open');
    });
  },

  populateRoadSuggestions() {
    const datalist = document.getElementById('road-suggestions');
    if (!datalist) return;
    window.MOCK_DATA.roads.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r.name;
      datalist.appendChild(opt);
    });
  },

  renderComplaintsList() {
    const search = document.getElementById('complaints-search')?.value?.toLowerCase() || '';
    let complaints = [...window.MOCK_DATA.complaints];

    if (search) {
      complaints = complaints.filter(c => c.road_name.toLowerCase().includes(search));
    }

    const list = document.getElementById('complaints-list');
    list.innerHTML = complaints.map(c => {
      const statusSteps = ['Filed', 'Assigned', 'In Review', 'Resolved'];
      const currentIdx = statusSteps.indexOf(c.status);

      return `<div class="card complaint-card">
        <div class="complaint-road">${c.road_name}</div>
        <div class="complaint-location">📍 ${c.location}</div>
        <div class="complaint-meta">
          <span class="badge badge-${c.type === 'Pothole' ? 'critical' : c.type.includes('Crack') ? 'fair' : 'poor'}">${c.type}</span>
          <span>👤 ${c.submitted_by} (${c.aadhaar_masked})</span>
          <span>📅 ${c.date}</span>
        </div>
        <div class="status-tracker" style="margin-top:8px;">
          ${statusSteps.map((step, i) => {
            const cls = i < currentIdx ? 'completed' : i === currentIdx ? 'current' : '';
            return `<div class="status-step ${cls}"><span class="status-dot"></span><span style="font-size:10px;">${step}</span></div>${i < statusSteps.length - 1 ? '<div class="status-line" style="' + (i < currentIdx ? 'background:var(--primary);' : '') + '"></div>' : ''}`;
          }).join('')}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
          <span class="complaint-ref">${c.reference_id}</span>
          <button class="upvote-btn" onclick="App.upvoteComplaint('${c.id}', event)">👍 ${c.upvote_count}</button>
        </div>
      </div>`;
    }).join('');
  },

  filterComplaints() {
    this.renderComplaintsList();
  },

  upvoteComplaint(id, event) {
    const c = window.MOCK_DATA.complaints.find(x => x.id === id);
    if (c) {
      c.upvote_count++;
      // Find the button and animate it
      if (event && event.target) {
        const btn = event.target.closest('.upvote-btn');
        if (btn) {
          btn.style.transform = 'scale(1.2)';
          btn.style.color = 'var(--primary)';
          btn.style.borderColor = 'var(--primary)';
          setTimeout(() => { btn.style.transform = ''; }, 200);
        }
      }
      this.renderComplaintsList();
    }
  },

  submitNewComplaint() {
    const road = document.getElementById('nc-road').value.trim();
    const desc = document.getElementById('nc-description').value.trim();
    const name = document.getElementById('nc-name').value.trim();

    if (!road || !desc || !name) {
      this.showToast('Please fill in road name, description, and your name');
      return;
    }

    const refId = 'YR-2026-' + String(Math.floor(Math.random() * 99999)).padStart(5, '0');
    const aadhaar = document.getElementById('nc-aadhaar').value.trim();

    window.MOCK_DATA.complaints.unshift({
      id: 'CMP' + Date.now(),
      road_id: 'R000',
      road_name: road,
      location: document.getElementById('nc-location').value || road,
      lat: parseFloat(document.getElementById('nc-lat').value) || 0,
      lng: parseFloat(document.getElementById('nc-lng').value) || 0,
      type: 'Pothole',
      description: desc,
      submitted_by: name,
      aadhaar_masked: aadhaar ? 'XXXX-XXXX-' + aadhaar.slice(-4) : 'XXXX-XXXX-XXXX',
      date: new Date().toISOString().split('T')[0],
      status: 'Filed',
      reference_id: refId,
      photo_url: null,
      upvote_count: 0,
    });

    this.showToast(`✅ Complaint filed! Reference: ${refId}`);
    document.getElementById('new-complaint-form').reset();
    document.getElementById('new-complaint-panel').classList.remove('mobile-open');
    this.renderComplaintsList();
  },

  // ═══════════════════════════════════════════════════════
  // SCREEN 5: AI CHATBOT
  // ═══════════════════════════════════════════════════════
  initChatbot() {
    // Send button
    document.getElementById('chat-send-btn')?.addEventListener('click', () => this.sendChatMessage());
    document.getElementById('chat-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendChatMessage(); }
    });

    // Prompt chips
    document.querySelectorAll('.chat-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.getElementById('chat-input').value = chip.dataset.prompt;
        this.sendChatMessage();
      });
    });

    // Voice input
    document.getElementById('chat-voice-btn')?.addEventListener('click', () => this.startVoiceInput());

    // Welcome message
    this.appendChatMessage('assistant', '👋 Hi! I\'m the Yathra Raksha AI Assistant. Ask me about road conditions, contractor performance, budget utilization, tender details, complaint status, or maintenance schedules. I can respond in your selected language.');
  },

  appendChatMessage(role, text) {
    const messages = document.getElementById('chat-messages');
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble chat-bubble-${role}`;
    bubble.innerHTML = text.replace(/\n/g, '<br>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
  },

  async sendChatMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    this.appendChatMessage('user', text);
    this.chatHistory.push({ role: 'user', content: text });

    // Show typing
    document.getElementById('typing-indicator').classList.add('show');
    document.getElementById('chat-messages').scrollTop = document.getElementById('chat-messages').scrollHeight;

    // Hide chips after first message
    document.getElementById('chat-chips').style.display = 'none';

    try {
      // Build context from mock data
      const context = this.buildChatContext();
      const lang = document.getElementById('lang-select')?.value || 'en';

      const response = await fetch(`${this.apiBase()}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: this.chatHistory.slice(-20),
          context: context,
          language: lang,
        }),
      });

      let reply;
      if (response.ok) {
        const data = await response.json();
        reply = data.reply || data.response || 'I could not process your request. Please try again.';
      } else {
        reply = this.localChatResponse(text);
      }

      document.getElementById('typing-indicator').classList.remove('show');
      this.appendChatMessage('assistant', reply);
      this.chatHistory.push({ role: 'assistant', content: reply });
    } catch (err) {
      document.getElementById('typing-indicator').classList.remove('show');
      const reply = this.localChatResponse(text);
      this.appendChatMessage('assistant', reply);
      this.chatHistory.push({ role: 'assistant', content: reply });
    }
  },

  buildChatContext() {
    const data = window.MOCK_DATA;
    const roads = data.roads.map(r => `${r.name} (${r.type}): ${r.condition}, ${r.length_km}km, ${r.state}, contractor: ${data.getContractorById(r.contractor_id)?.name}, damage: ${r.ai_damage_score}/100, complaints: ${r.complaint_count}, budget: ${data.formatINR(r.budget_allocated)}, spent: ${data.formatINR(r.budget_spent)}`).join('\n');
    const contractors = data.contractors.map(c => `${c.name}: health ${c.avg_health_score}/100, projects ${c.projects_completed}, complaints ${c.complaints_count}, efficiency ${c.budget_efficiency}%, completion ${c.completion_rate}%`).join('\n');
    const lang = document.getElementById('lang-select')?.value || 'en';

    return `You are Yathra Raksha AI — an expert assistant on Indian road infrastructure, budget transparency, and public accountability. You have access to the following data:

ROADS:
${roads}

CONTRACTORS:
${contractors}

TOTAL TENDERS: ${data.tenders.length} | TOTAL COMPLAINTS: ${data.complaints.length}
ANOMALIES: ${data.tenders.filter(t => t.anomaly_flag).length} flagged projects
OVERSPENT: ${data.tenders.filter(t => t.balance < 0).length} projects over budget

Respond in ${lang === 'en' ? 'English' : lang === 'hi' ? 'Hindi' : lang === 'ml' ? 'Malayalam' : lang === 'ta' ? 'Tamil' : 'Telugu'}. Be concise, factual, and helpful. Use specific numbers from the data. Format important points with **bold**.`;
  },

  localChatResponse(query) {
    const q = query.toLowerCase();
    const data = window.MOCK_DATA;

    if (q.includes('worst') || q.includes('critical') || q.includes('bad')) {
      const worst = data.roads.filter(r => r.condition === 'Critical' || r.condition === 'Poor');
      return `The roads in **worst condition** are:\n${worst.map(r => `• **${r.name}** — ${r.condition} (Damage score: ${r.ai_damage_score}/100, ${r.complaint_count} complaints)`).join('\n')}\n\nThese roads need urgent attention.`;
    }
    if (q.includes('overspent') || q.includes('overrun') || q.includes('budget')) {
      const over = data.tenders.filter(t => t.balance < 0);
      return `**${over.length} projects are over budget:**\n${over.map(t => `• **${t.road_name}** — overspent by ${data.formatINR(Math.abs(t.balance))} (${t.completion_pct}% complete)`).join('\n')}\n\nThese projects have been flagged for audit.`;
    }
    if (q.includes('contractor') || q.includes('complaint')) {
      const worst = [...data.contractors].sort((a, b) => b.complaints_count - a.complaints_count);
      return `**Contractors by complaint count:**\n${worst.slice(0, 5).map((c, i) => `${i + 1}. **${c.name}** — ${c.complaints_count} complaints (Health: ${c.avg_health_score}/100)`).join('\n')}`;
    }
    if (q.includes('file') || q.includes('report') || q.includes('how')) {
      return `To file a complaint:\n1. Go to **AI Detect** tab\n2. Upload a photo of the road damage\n3. Let AI analyze the image\n4. Review and edit the complaint\n5. Click **File Complaint**\n\nOr go to **Public Complaints** tab and fill the form directly.\n\nYour complaint will be auto-routed to the responsible Executive Engineer.`;
    }
    if (q.includes('best') || q.includes('good') || q.includes('excellent')) {
      const best = data.roads.filter(r => r.condition === 'Excellent');
      return `**Roads in excellent condition:**\n${best.map(r => `• **${r.name}** — Damage score: ${r.ai_damage_score}/100, only ${r.complaint_count} complaints`).join('\n')}`;
    }

    return `I can help you with:\n• **Road conditions** — ask about specific roads or regions\n• **Budget transparency** — overspent projects, allocations\n• **Contractor performance** — rankings, complaints\n• **Filing complaints** — step-by-step guidance\n\nTry asking: "Which roads are in critical condition?" or "Show me overspent projects"`;
  },

  startVoiceInput() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      this.showToast('Voice input not supported in this browser');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = document.getElementById('lang-select')?.value === 'hi' ? 'hi-IN' : 'en-IN';
    recognition.interimResults = false;

    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript;
      document.getElementById('chat-input').value = text;
      this.showToast('🎤 Voice captured');
    };

    recognition.onerror = () => this.showToast('Voice input error. Try again.');
    recognition.start();
    this.showToast('🎤 Listening...');
  },
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
window.App = App;
