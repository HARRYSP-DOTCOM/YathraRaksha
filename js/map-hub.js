/**
 * YatraRaksha / RoadWatch Mapping Hub
 * Satellite, streets, and dark basemaps with color-coded road health polylines,
 * citizen issue markers, geolocation, and audit side panel.
 */

const MapHub = {
  map: null,
  markers: [],
  userPickerMarker: null,
  liveLocationMarker: null,
  accuracyCircle: null,
  activePolylines: [],
  polylineByRoadId: {},
  highlightedPolyline: null,
  onCoordinatePick: null,
  layerControl: null,
  baseLayers: {},
  routePolylines: [],
  routeEndpointMarkers: [],
  activeRouteId: null,
  tripTraveledLine: null,
  tripRemainingLine: null,
  tripVehicleMarker: null,
  tripBreadcrumbLine: null,
  tripFollowEnabled: true,
  _lastTripPan: 0,

  init(containerId, onCoordinatePick) {
    if (this.map) {
      this.onCoordinatePick = onCoordinatePick;
      return;
    }
    if (typeof L === "undefined") {
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML =
          '<div class="map-fallback">Satellite map is unavailable while the mapping library is offline.</div>';
      }
      return;
    }

    this.onCoordinatePick = onCoordinatePick;
    const defaultCenter = [20.5937, 78.9629];

    this.map = L.map(containerId, {
      center: defaultCenter,
      zoom: 5,
      zoomControl: false,
      attributionControl: true,
    });

    L.control.zoom({ position: "bottomright" }).addTo(this.map);
    L.control.scale({ position: "bottomleft", imperial: false }).addTo(this.map);

    const satelliteLayer = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution:
          "Tiles &copy; Esri &mdash; Esri, USDA, USGS, AeroGRID, IGN, IGP",
        maxZoom: 19,
      }
    );

    const streetsLayer = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }
    );

    const darkLayer = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution: "&copy; OpenStreetMap &copy; CARTO",
        subdomains: "abcd",
        maxZoom: 20,
      }
    );

    const hybridLabels = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png",
      {
        attribution: "&copy; CARTO",
        subdomains: "abcd",
        maxZoom: 20,
        pane: "overlayPane",
      }
    );

    const hybridGroup = L.layerGroup([satelliteLayer, hybridLabels]);

    this.baseLayers = {
      satellite: satelliteLayer,
      streets: streetsLayer,
      dark: darkLayer,
      hybrid: hybridGroup,
    };

    hybridGroup.addTo(this.map);

    this.layerControl = L.control
      .layers(
        {
          "Satellite + Labels": hybridGroup,
          "Street Map": streetsLayer,
          "Dark Mode": darkLayer,
        },
        null,
        { position: "topright", collapsed: true }
      )
      .addTo(this.map);

    this.addLegend();
    this.addToolbar();
    this.wireToolbarButtons();

    this.map.on("click", (e) => {
      const lat = parseFloat(e.latlng.lat.toFixed(6));
      const lng = parseFloat(e.latlng.lng.toFixed(6));
      this.setUserPicker(lat, lng);
      if (window.App?.onMapCoordsChanged) {
        window.App.onMapCoordsChanged(lat, lng);
      } else if (this.onCoordinatePick) {
        this.onCoordinatePick(lat, lng);
      }
    });

    this.plotDatabaseRoads();
    this.fitAllRoads();
  },

  addLegend() {
    const LegendControl = L.Control.extend({
      options: { position: "bottomleft" },
      onAdd() {
        const div = L.DomUtil.create("div", "map-legend");
        div.innerHTML = `
          <div class="map-legend-title">Road condition</div>
          <div class="map-legend-item"><span class="legend-swatch legend-healthy"></span> Healthy</div>
          <div class="map-legend-item"><span class="legend-swatch legend-warning"></span> Minor defects</div>
          <div class="map-legend-item"><span class="legend-swatch legend-critical"></span> Critical</div>
          <div class="map-legend-item"><span class="legend-swatch legend-issue"></span> Citizen report</div>
        `;
        L.DomEvent.disableClickPropagation(div);
        return div;
      },
    });
    new LegendControl().addTo(this.map);
  },

  addToolbar() {
    const ToolbarControl = L.Control.extend({
      options: { position: "topleft" },
      onAdd() {
        const div = L.DomUtil.create("div", "map-toolbar");
        div.innerHTML = `
          <button type="button" class="map-tool-btn" id="map-btn-locate" title="My location">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
          </button>
          <button type="button" class="map-tool-btn" id="map-btn-fit" title="Show all roads">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
          </button>
          <button type="button" class="map-tool-btn" id="map-btn-report" title="Drop pin for complaint">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </button>
        `;
        L.DomEvent.disableClickPropagation(div);
        return div;
      },
    });
    new ToolbarControl().addTo(this.map);
  },

  wireToolbarButtons() {
    document.getElementById("map-btn-locate")?.addEventListener("click", () => this.locateUser());
    document.getElementById("map-btn-fit")?.addEventListener("click", () => this.fitAllRoads());
    document.getElementById("map-btn-report")?.addEventListener("click", () => {
      if (window.App) {
        window.App.switchTab("capture");
        window.App.showToast("Upload a photo or use the map tab to pin the defect location.");
      }
    });
  },

  locateUser() {
    if (window.App?.useLiveGpsLocation) {
      window.App.useLiveGpsLocation(true);
      return;
    }
    if (!navigator.geolocation) {
      window.App?.showToast("Geolocation is not supported on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        this.updateLivePosition(lat, lng, { movePicker: true, centerMap: true });
        if (this.onCoordinatePick) this.onCoordinatePick(lat, lng);
      },
      () => window.App?.showToast("Could not access your location. Check browser permissions."),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  },

  updateLivePosition(lat, lng, options = {}) {
    if (!this.map || typeof L === "undefined") return;

    const { movePicker = true, centerMap = false, accuracy = null } = options;

    if (!this.liveLocationMarker) {
      const liveIcon = L.divIcon({
        className: "live-gps-marker",
        html: '<div class="live-gps-halo"></div><div class="live-gps-dot"></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      this.liveLocationMarker = L.marker([lat, lng], {
        icon: liveIcon,
        zIndexOffset: 1200,
        interactive: false,
      }).addTo(this.map);
    } else {
      this.liveLocationMarker.setLatLng([lat, lng]);
    }

    if (accuracy && accuracy < 500) {
      if (this.accuracyCircle) {
        this.accuracyCircle.setLatLng([lat, lng]).setRadius(accuracy);
      } else {
        this.accuracyCircle = L.circle([lat, lng], {
          radius: accuracy,
          color: "#2dd4bf",
          fillColor: "#2dd4bf",
          fillOpacity: 0.08,
          weight: 1,
          interactive: false,
        }).addTo(this.map);
      }
    }

    if (movePicker) {
      this.setUserPicker(lat, lng, { panOnly: true });
    } else if (centerMap) {
      this.map.setView([lat, lng], 15, { animate: true });
    }
  },

  fitAllRoads() {
    if (!this.map || !window.RoadDatabase?.roads?.length) return;
    const bounds = [];
    window.RoadDatabase.roads.forEach((road) => {
      if (road.path?.length) bounds.push(...road.path);
      else if (road.coordinates) bounds.push(road.coordinates);
    });
    if (bounds.length) {
      this.map.fitBounds(bounds, { padding: [48, 48], maxZoom: 6, animate: true });
    }
  },

  setUserPicker(lat, lng, options = {}) {
    if (!this.map) return;

    const panOnly = options.panOnly === true;

    if (this.userPickerMarker) {
      this.userPickerMarker.setLatLng([lat, lng]);
    } else {
      const customPulsingIcon = L.divIcon({
        className: "gps-picker-icon",
        html: '<div class="pulse-ring"></div><div class="center-dot"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      this.userPickerMarker = L.marker([lat, lng], {
        icon: customPulsingIcon,
        draggable: true,
        zIndexOffset: 1000,
      }).addTo(this.map);

      this.userPickerMarker.on("dragend", (e) => {
        const position = e.target.getLatLng();
        const dragLat = parseFloat(position.lat.toFixed(6));
        const dragLng = parseFloat(position.lng.toFixed(6));
        if (window.App?.onMapCoordsChanged) {
          window.App.onMapCoordsChanged(dragLat, dragLng, true);
        }
      });
    }

    if (panOnly) {
      this.map.panTo([lat, lng], { animate: true });
    } else if (this.map.getZoom() < 12) {
      this.map.setView([lat, lng], 13, { animate: true });
    } else {
      this.map.panTo([lat, lng], { animate: true });
    }
  },

  plotDatabaseRoads() {
    if (!this.map || !window.RoadDatabase) return;

    this.markers.forEach((m) => this.map.removeLayer(m));
    this.markers = [];
    this.activePolylines.forEach((p) => this.map.removeLayer(p));
    this.activePolylines = [];
    this.polylineByRoadId = {};

    window.RoadDatabase.roads.forEach((road) => {
      const lat = road.coordinates[0];
      const lng = road.coordinates[1];

      if (road.path?.length > 0) {
        const polyline = L.polyline(road.path, {
          color: road.statusColor,
          weight: 7,
          opacity: 0.9,
          lineJoin: "round",
          lineCap: "round",
          dashArray: road.statusColor === "#ff3b30" ? "10, 14" : null,
        }).addTo(this.map);

        polyline.on("mouseover", function () {
          this.setStyle({ weight: 10, opacity: 1 });
        });
        polyline.on("mouseout", function () {
          this.setStyle({ weight: 7, opacity: 0.9 });
        });
        polyline.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          MapHub.highlightRoad(road.id);
          MapHub.showAuditPanel(road);
          MapHub.focusOnCoordinates(lat, lng, 12);
        });

        polyline.bindPopup(this.createPopupHtml(road), {
          maxWidth: 320,
          className: "custom-leaflet-popup",
        });
        this.activePolylines.push(polyline);
        this.polylineByRoadId[road.id] = polyline;
      }

      const roadDivIcon = L.divIcon({
        className: "road-node-marker",
        html: `<div class="road-glow-core" style="background:${road.statusColor}; box-shadow:0 0 12px ${road.statusColor}"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      const marker = L.marker([lat, lng], { icon: roadDivIcon })
        .bindPopup(this.createPopupHtml(road), {
          maxWidth: 320,
          className: "custom-leaflet-popup",
        })
        .on("click", () => {
          this.highlightRoad(road.id);
          this.showAuditPanel(road);
        })
        .addTo(this.map);

      this.markers.push(marker);
    });
  },

  highlightRoad(roadId) {
    if (this._highlightedRoadId && this.polylineByRoadId[this._highlightedRoadId]) {
      const prevRoad = window.RoadDatabase?.getRoadById?.(this._highlightedRoadId);
      if (prevRoad) {
        this.polylineByRoadId[this._highlightedRoadId].setStyle({
          color: prevRoad.statusColor,
          weight: 7,
          opacity: 0.9,
        });
      }
    }

    const poly = this.polylineByRoadId[roadId];
    if (poly) {
      poly.setStyle({ color: "#ffffff", weight: 9, opacity: 1 });
      poly.bringToFront();
      this.highlightedPolyline = poly;
      this._highlightedRoadId = roadId;
    }
  },

  showAuditPanel(road) {
    const panel = document.getElementById("map-audit-panel");
    const body = document.getElementById("map-panel-body");
    const idBadge = document.getElementById("map-panel-road-id");
    if (!panel || !body || !road) return;

    const formatINR = (val) => `₹${(val / 10000000).toFixed(1)} Cr`;
    const overrun = road.spentBudget > road.sanctionedBudget;
    const stars =
      "★".repeat(Math.round(road.contractorPerformance)) +
      "☆".repeat(5 - Math.round(road.contractorPerformance));

    let statusLabel = "Healthy";
    let statusClass = "status-healthy";
    if (road.statusColor === "#ff9f1c") {
      statusLabel = "Minor defects";
      statusClass = "status-warning";
    }
    if (road.statusColor === "#ff3b30") {
      statusLabel = "Critical";
      statusClass = "status-critical";
    }

    if (idBadge) {
      idBadge.textContent = road.id;
      idBadge.className = "badge " + (road.type?.includes("NH") || road.type?.includes("Interstate") || road.type?.includes("Autobahn") ? "badge-nh" : road.type?.includes("MDR") || road.type?.includes("District") ? "badge-mdr" : "badge-sh");
    }

    body.innerHTML = `
      <h3 class="audit-panel-title">${road.name}</h3>
      <p class="audit-panel-status ${statusClass}">${statusLabel} · ${road.jurisdiction}</p>
      <div class="audit-stats-row">
        <div class="audit-stat"><span class="audit-stat-label">Sanctioned</span><span class="audit-stat-value">${formatINR(road.sanctionedBudget)}</span></div>
        <div class="audit-stat"><span class="audit-stat-label">Spent</span><span class="audit-stat-value ${overrun ? "text-danger" : "text-success"}">${formatINR(road.spentBudget)}</span></div>
        <div class="audit-stat"><span class="audit-stat-label">Relaid</span><span class="audit-stat-value">${road.lastRelayingDate}</span></div>
      </div>
      <div class="audit-detail-list">
        <div class="audit-detail"><strong>Type</strong><span>${road.type}</span></div>
        <div class="audit-detail"><strong>Contractor</strong><span>${road.contractorName} (${stars})</span></div>
        <div class="audit-detail"><strong>Authority</strong><span>${road.authority}</span></div>
        <div class="audit-detail"><strong>Engineer</strong><span>${road.executiveEngineer}</span></div>
        <div class="audit-detail"><strong>Contact</strong><span>${road.engineerPhone}</span></div>
        <div class="audit-detail"><strong>Funding</strong><span>${road.fundingSource || "Public infrastructure fund"}</span></div>
      </div>
      <button type="button" class="btn btn-primary btn-sm audit-panel-cta" onclick="window.App.selectRoadForReport('${road.id}')">Report issue on this road</button>
    `;

    panel.style.display = "flex";
  },

  createPopupHtml(road) {
    const ratingStars =
      "★".repeat(Math.round(road.contractorPerformance)) +
      "☆".repeat(5 - Math.round(road.contractorPerformance));
    const budgetOverrun = road.spentBudget > road.sanctionedBudget;
    const budgetStatusClass = budgetOverrun ? "text-danger" : "text-success";
    const financialEfficiency = ((road.sanctionedBudget / road.spentBudget) * 100).toFixed(0);
    const formatINR = (val) => `₹${(val / 10000000).toFixed(1)} Cr`;

    let statusText = "Safe / Healthy";
    if (road.statusColor === "#ff9f1c") statusText = "Minor defect warnings";
    if (road.statusColor === "#ff3b30") statusText = "Critical defects registered";

    return `
      <div class="map-popup-card">
        <div class="popup-header" style="border-top: 3px solid ${road.statusColor}">
          <span class="popup-badge" style="background:${road.statusColor}22; color:${road.statusColor}; border-color:${road.statusColor}55">${road.type}</span>
          <h3 style="margin-top:4px;">${road.name}</h3>
          <div class="popup-status-line" style="color:${road.statusColor}">${statusText}</div>
        </div>
        <div class="popup-body">
          <div class="popup-row"><strong>Jurisdiction</strong> <span>${road.jurisdiction}</span></div>
          <div class="popup-row"><strong>Contractor</strong> <span>${road.contractorName} (${ratingStars})</span></div>
          <hr class="popup-divider">
          <div class="popup-row"><strong>Sanctioned</strong> <span>${formatINR(road.sanctionedBudget)}</span></div>
          <div class="popup-row"><strong>Spent</strong> <span class="${budgetStatusClass}">${formatINR(road.spentBudget)}</span></div>
          <div class="popup-row"><strong>Efficiency</strong> <span class="badge ${budgetOverrun ? "badge-warn" : "badge-good"}">${financialEfficiency}%</span></div>
          <div class="popup-row"><strong>Last relayed</strong> <span>${road.lastRelayingDate}</span></div>
          <div class="popup-row"><strong>Engineer</strong> <span>${road.executiveEngineer}</span></div>
        </div>
        <div class="popup-footer">
          <button type="button" onclick="window.MapHub.showAuditPanel(window.RoadDatabase.getRoadById('${road.id}'))" class="btn-popup-action btn-popup-secondary">View audit card</button>
          <button type="button" onclick="window.App.selectRoadForReport('${road.id}')" class="btn-popup-action">Report issue here</button>
        </div>
      </div>
    `;
  },

  plotReportedIssue(report) {
    if (!this.map) return;

    const lat = report.coordinates[0];
    const lng = report.coordinates[1];

    let colorClass = "severity-critical";
    if (report.severity === "Medium") colorClass = "severity-medium";
    if (report.severity === "Low") colorClass = "severity-low";

    const issueIcon = L.divIcon({
      className: `reported-issue-marker ${colorClass}`,
      html: `<div class="issue-pulse"></div><div class="issue-core"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const popupContent = `
      <div class="map-popup-card">
        <div class="popup-header warning-header" style="border-top: 3px solid #ff3b30">
          <span class="popup-badge badge-red">Issue reported</span>
          <h3>${report.defectType}</h3>
        </div>
        <div class="popup-body">
          <div class="popup-row"><strong>Severity</strong> <span class="badge badge-red-text">${report.severity}</span></div>
          <div class="popup-row"><strong>AI verification</strong> <span>${report.integrityVerificationId}</span></div>
          <div class="popup-row"><strong>Filed</strong> <span>${new Date(report.timestamp).toLocaleDateString()}</span></div>
          <div class="popup-row"><strong>Near road</strong> <span>${report.matchedRoad ? report.matchedRoad.name : "Unknown"}</span></div>
        </div>
        <div class="popup-footer">
          <button type="button" onclick="window.App.viewComplaintDetails('${report.integrityVerificationId}')" class="btn-popup-action">View tracker</button>
        </div>
      </div>
    `;

    const marker = L.marker([lat, lng], { icon: issueIcon, zIndexOffset: 900 })
      .bindPopup(popupContent, { maxWidth: 300, className: "custom-leaflet-popup" })
      .addTo(this.map);

    this.markers.push(marker);
    this.setUserPicker(lat, lng);
  },

  focusOnCoordinates(lat, lng, zoomLevel = 14) {
    if (!this.map) return;
    this.map.setView([lat, lng], zoomLevel, { animate: true });
  },

  focusRoad(roadId) {
    const road = window.RoadDatabase?.getRoadById?.(roadId);
    if (!road) return;
    this.highlightRoad(roadId);
    this.showAuditPanel(road);
    this.focusOnCoordinates(road.coordinates[0], road.coordinates[1], 11);
    this.markers.forEach((marker) => {
      const pos = marker.getLatLng();
      if (
        Math.abs(pos.lat - road.coordinates[0]) < 0.02 &&
        Math.abs(pos.lng - road.coordinates[1]) < 0.02
      ) {
        marker.openPopup();
      }
    });
  },

  clearRouteDisplay() {
    if (!this.map) return;
    this.stopTripNavigation();
    this.routePolylines.forEach((p) => this.map.removeLayer(p));
    this.routePolylines = [];
    this.routeEndpointMarkers.forEach((m) => this.map.removeLayer(m));
    this.routeEndpointMarkers = [];
    this.activeRouteId = null;
  },

  stopTripNavigation() {
    if (!this.map) return;
    [this.tripTraveledLine, this.tripRemainingLine, this.tripBreadcrumbLine].forEach((layer) => {
      if (layer) this.map.removeLayer(layer);
    });
    if (this.tripVehicleMarker) this.map.removeLayer(this.tripVehicleMarker);
    this.tripTraveledLine = null;
    this.tripRemainingLine = null;
    this.tripBreadcrumbLine = null;
    this.tripVehicleMarker = null;
  },

  startTripNavigation(route, plan) {
    if (!this.map || !route?.path) return;
    this.stopTripNavigation();
    this._activeTripRoute = route;
    this._tripPlan = plan;

    this.tripRemainingLine = L.polyline(route.path, {
      color: "#64748b",
      weight: 6,
      opacity: 0.45,
      dashArray: "10, 14",
      lineJoin: "round",
    }).addTo(this.map);

    this.tripTraveledLine = L.polyline([], {
      color: "#22c55e",
      weight: 9,
      opacity: 0.95,
      lineJoin: "round",
      lineCap: "round",
    }).addTo(this.map);

    this.tripBreadcrumbLine = L.polyline([], {
      color: "#3b82f6",
      weight: 3,
      opacity: 0.55,
      dashArray: "4, 6",
    }).addTo(this.map);

    const vehicleIcon = L.divIcon({
      className: "trip-vehicle-marker",
      html: '<div class="trip-vehicle-arrow">▲</div>',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
    this.tripVehicleMarker = L.marker(route.path[0], {
      icon: vehicleIcon,
      zIndexOffset: 2000,
    }).addTo(this.map);
  },

  updateTripNavigation(state) {
    if (!this.map || !state?.snap) return;

    const traveled = window.TripTracker?.getTraveledPath(state.snap) || [];
    const remaining = window.TripTracker?.getRemainingPath(state.snap) || [];

    if (this.tripTraveledLine) this.tripTraveledLine.setLatLngs(traveled);
    if (this.tripRemainingLine) this.tripRemainingLine.setLatLngs(remaining);

    if (this.tripBreadcrumbLine && state.breadcrumb?.length > 1) {
      this.tripBreadcrumbLine.setLatLngs(
        state.breadcrumb.map((b) => [b.lat, b.lng])
      );
    }

    if (this.tripVehicleMarker) {
      this.tripVehicleMarker.setLatLng([state.snap.lat, state.snap.lng]);
      const el = this.tripVehicleMarker.getElement();
      if (el && state.heading != null && !Number.isNaN(state.heading)) {
        const arrow = el.querySelector(".trip-vehicle-arrow");
        if (arrow) arrow.style.transform = `rotate(${state.heading}deg)`;
      }
    }

    if (this.tripFollowEnabled) {
      const now = Date.now();
      if (now - this._lastTripPan > 1200) {
        this._lastTripPan = now;
        this.map.setView([state.snap.lat, state.snap.lng], Math.max(this.map.getZoom(), 14), {
          animate: true,
        });
      }
    }

    this.updateLivePosition(state.snap.lat, state.snap.lng, {
      movePicker: false,
      accuracy: state.accuracy,
    });
  },

  displayRoutePlan(plan) {
    if (!this.map || !plan?.routes?.length) return;
    this.clearRouteDisplay();

    const fromIcon = L.divIcon({
      className: "route-endpoint-marker route-from",
      html: '<div class="route-pin">A</div>',
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    });
    const toIcon = L.divIcon({
      className: "route-endpoint-marker route-to",
      html: '<div class="route-pin">B</div>',
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    });

    const fromM = L.marker([plan.from.lat, plan.from.lng], { icon: fromIcon, zIndexOffset: 1300 })
      .bindPopup(`<strong>From</strong><br>${plan.from.displayName || plan.from.label}`)
      .addTo(this.map);
    const toM = L.marker([plan.to.lat, plan.to.lng], { icon: toIcon, zIndexOffset: 1300 })
      .bindPopup(`<strong>To</strong><br>${plan.to.displayName || plan.to.label}`)
      .addTo(this.map);
    this.routeEndpointMarkers.push(fromM, toM);

    const bounds = [[plan.from.lat, plan.from.lng], [plan.to.lat, plan.to.lng]];

    plan.routes.forEach((route, index) => {
      const isBest = route.isRecommended || index === 0;
      const poly = L.polyline(route.path, {
        color: route.statusColor || "#2dd4bf",
        weight: isBest ? 8 : 5,
        opacity: isBest ? 0.95 : 0.45,
        lineJoin: "round",
        lineCap: "round",
        dashArray: isBest ? null : "8, 12",
      }).addTo(this.map);

      poly.bindPopup(this.createRoutePopupHtml(route));
      poly.on("click", () => {
        this.highlightRoute(route.id);
        if (window.App?.selectRouteResult) window.App.selectRouteResult(route.id);
      });

      poly._routeMeta = route;
      this.routePolylines.push(poly);
      bounds.push(...route.path);
    });

    this.activeRouteId = plan.routes[0]?.id;
    this.map.fitBounds(bounds, { padding: [60, 60], maxZoom: 10, animate: true });
  },

  highlightRoute(routeId) {
    this.activeRouteId = routeId;
    this.routePolylines.forEach((poly, i) => {
      const route = poly._routeMeta;
      if (!route) return;
      const active = route.id === routeId;
      poly.setStyle({
        weight: active ? 9 : 5,
        opacity: active ? 1 : 0.35,
        dashArray: active ? null : "8, 12",
      });
      if (active) poly.bringToFront();
    });
  },

  createRoutePopupHtml(route) {
    return `
      <div class="map-popup-card">
        <div class="popup-header" style="border-top:3px solid ${route.statusColor}">
          <span class="popup-badge" style="color:${route.statusColor}">${route.isRecommended ? "RECOMMENDED" : "ALTERNATE"}</span>
          <h3>${route.name}</h3>
        </div>
        <div class="popup-body" style="font-size:12px;">
          <div class="popup-row"><strong>Distance</strong> <span>${route.distanceKm} km</span></div>
          <div class="popup-row"><strong>Est. time</strong> <span>${route.travelTimeHours} hrs</span></div>
          <div class="popup-row"><strong>Accidents/yr</strong> <span>${route.accidentCount}</span></div>
          <div class="popup-row"><strong>Fatalities/yr</strong> <span>${route.fatalities}</span></div>
          <div class="popup-row"><strong>Safety score</strong> <span>${route.safetyScore}/10</span></div>
          <div class="popup-row"><strong>Data source</strong> <span style="white-space:normal;max-width:140px;text-align:right">${route.dataSource}</span></div>
          <p style="margin-top:8px;font-size:11px;color:var(--text-muted)">${route.ratingMessage || ""}</p>
        </div>
      </div>
    `;
  },

};

window.MapHub = MapHub;
