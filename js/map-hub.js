/**
 * YatraRaksha Mapping Hub (Satellite-capable & Vector Road Lines)
 * Configures default Satellite imagery, layer switchers, and draws color-coded polylines
 * representing structural road qualities and budgets scaled to INR (₹).
 */

const MapHub = {
  map: null,
  markers: [],
  userPickerMarker: null,
  activePolylines: [],

  /**
   * Initializes Leaflet Map with default Satellite view and Dark tiles option
   */
  init(containerId, onCoordinatePick) {
    if (this.map) return;

    const defaultCenter = [20.5937, 78.9629]; // India center
    
    // Create map
    this.map = L.map(containerId, {
      center: defaultCenter,
      zoom: 5,
      zoomControl: true,
      attributionControl: true
    });

    // 1. Satellite Base Layer (Esri World Imagery)
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      maxZoom: 19
    }).addTo(this.map); // Active by default

    // 2. Premium Dark Matter Layer
    const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 20
    });

    // Layer Switcher Control
    const baseMaps = {
      "🛰️ Satellite View": satelliteLayer,
      "🌃 Obsidian Dark Mode": darkLayer
    };
    L.control.layers(baseMaps, null, { position: 'topright', collapsed: false }).addTo(this.map);

    // Map Click Picker
    this.map.on('click', (e) => {
      const lat = parseFloat(e.latlng.lat.toFixed(6));
      const lng = parseFloat(e.latlng.lng.toFixed(6));
      
      this.setUserPicker(lat, lng);
      
      if (onCoordinatePick) {
        onCoordinatePick(lat, lng);
      }
    });

    // Seed roads and polylines
    this.plotDatabaseRoads();
  },

  setUserPicker(lat, lng) {
    if (this.userPickerMarker) {
      this.userPickerMarker.setLatLng([lat, lng]);
    } else {
      const customPulsingIcon = L.divIcon({
        className: 'gps-picker-icon',
        html: '<div class="pulse-ring"></div><div class="center-dot"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      this.userPickerMarker = L.marker([lat, lng], {
        icon: customPulsingIcon,
        draggable: true
      }).addTo(this.map);

      this.userPickerMarker.on('dragend', (e) => {
        const marker = e.target;
        const position = marker.getLatLng();
        const dragLat = parseFloat(position.lat.toFixed(6));
        const dragLng = parseFloat(position.lng.toFixed(6));
        
        if (window.App && window.App.onMapCoordsChanged) {
          window.App.onMapCoordsChanged(dragLat, dragLng);
        }
      });
    }
    
    this.map.setView([lat, lng], 13, { animate: true });
  },

  /**
   * Plots both nodes (markers) and colored structural polylines representing health state
   */
  plotDatabaseRoads() {
    // Clear existing
    this.markers.forEach(m => this.map.removeLayer(m));
    this.markers = [];
    this.activePolylines.forEach(p => this.map.removeLayer(p));
    this.activePolylines = [];

    const roads = window.RoadDatabase.roads;

    roads.forEach(road => {
      const lat = road.coordinates[0];
      const lng = road.coordinates[1];

      // Draw Polyline representing the road segment
      // Color matches issue severity: Red (Critical Defect), Orange (Warning), Green (Healthy)
      if (road.path && road.path.length > 0) {
        const polyline = L.polyline(road.path, {
          color: road.statusColor,
          weight: 6,
          opacity: 0.85,
          lineJoin: 'round',
          dashArray: road.statusColor === "#ff3b30" ? "2, 8" : null // Dashed representation for broken roads!
        }).addTo(this.map);

        // Bind popup also to the line path click
        polyline.bindPopup(this.createPopupHtml(road), { maxWidth: 300, className: 'custom-leaflet-popup' });
        this.activePolylines.push(polyline);
      }

      // Draw glowing central node marker
      const roadDivIcon = L.divIcon({
        className: `road-node-marker`,
        html: `<div class="road-glow-core" style="background:${road.statusColor}; box-shadow:0 0 10px ${road.statusColor}"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      const marker = L.marker([lat, lng], { icon: roadDivIcon })
        .bindPopup(this.createPopupHtml(road), { maxWidth: 300, className: 'custom-leaflet-popup' })
        .addTo(this.map);

      this.markers.push(marker);
    });
  },

  /**
   * Standardizes popup HTML creation with INR metrics
   */
  createPopupHtml(road) {
    const ratingStars = '★'.repeat(Math.round(road.contractorPerformance)) + '☆'.repeat(5 - Math.round(road.contractorPerformance));
    const budgetOverrun = road.spentBudget > road.sanctionedBudget;
    const budgetStatusClass = budgetOverrun ? "text-danger" : "text-success";
    const financialEfficiency = ((road.sanctionedBudget / road.spentBudget) * 100).toFixed(0);

    // Format money in INR Crores
    const formatINR = (val) => {
      const crores = val / 10000000;
      return `₹${crores.toFixed(1)} Cr`;
    };

    let statusText = "🟢 Safe / Healthy";
    if (road.statusColor === "#ff9f1c") statusText = "🟡 Minor Defect Warnings";
    if (road.statusColor === "#ff3b30") statusText = "🔴 Critical Defects Registered";

    return `
      <div class="map-popup-card">
        <div class="popup-header" style="border-top: 3px solid ${road.statusColor}">
          <span class="popup-badge" style="background:${road.statusColor}22; color:${road.statusColor}; border-color:${road.statusColor}55">${road.type}</span>
          <h3 style="margin-top:4px;">${road.name}</h3>
          <div style="font-size:10px; font-weight:700; color:${road.statusColor}; margin-top:2px;">${statusText}</div>
        </div>
        <div class="popup-body">
          <div class="popup-row"><strong>📍 Jurisdiction:</strong> <span>${road.jurisdiction}</span></div>
          <div class="popup-row"><strong>🏢 Authority:</strong> <span>${road.authority}</span></div>
          <div class="popup-row"><strong>🛠️ Contractor:</strong> <span>${road.contractorName} (${ratingStars})</span></div>
          <hr class="popup-divider">
          <div class="popup-row"><strong>💰 Sanctioned Budget:</strong> <span>${formatINR(road.sanctionedBudget)}</span></div>
          <div class="popup-row"><strong>📈 Amount Spent:</strong> <span class="${budgetStatusClass}">${formatINR(road.spentBudget)}</span></div>
          <div class="popup-row"><strong>📊 Efficiency:</strong> <span class="badge ${budgetOverrun ? 'badge-warn' : 'badge-good'}">${financialEfficiency}%</span></div>
          <div class="popup-row"><strong>📅 Last Relayed:</strong> <span>${road.lastRelayingDate}</span></div>
          <div class="popup-row"><strong>👨‍💻 Executive Engineer:</strong> <span>${road.executiveEngineer} (${road.engineerPhone})</span></div>
        </div>
        <div class="popup-footer">
          <button onclick="window.App.selectRoadForReport('${road.id}')" class="btn-popup-action">📝 Report Issue Here</button>
        </div>
      </div>
    `;
  },

  plotReportedIssue(report) {
    const lat = report.coordinates[0];
    const lng = report.coordinates[1];
    
    let colorClass = "severity-critical";
    if (report.severity === "Medium") colorClass = "severity-medium";
    if (report.severity === "Low") colorClass = "severity-low";

    const issueIcon = L.divIcon({
      className: `reported-issue-marker ${colorClass}`,
      html: `<div class="issue-pulse"></div><div class="issue-core"></div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });

    const popupContent = `
      <div class="map-popup-card">
        <div class="popup-header warning-header" style="border-top: 3px solid #ff3b30">
          <span class="popup-badge badge-red">ISSUE REPORTED</span>
          <h3>${report.defectType}</h3>
        </div>
        <div class="popup-body">
          <div class="popup-row"><strong>🚨 Severity:</strong> <span class="badge badge-red-text">${report.severity}</span></div>
          <div class="popup-row"><strong>🤖 AI Verification:</strong> <span>Verified (ID: ${report.integrityVerificationId})</span></div>
          <div class="popup-row"><strong>📅 Filed On:</strong> <span>${new Date(report.timestamp).toLocaleDateString()}</span></div>
          <div class="popup-row"><strong>🛣️ Near Road:</strong> <span>${report.matchedRoad ? report.matchedRoad.name : 'Unknown Road'}</span></div>
          <div class="popup-row"><strong>🏢 Reps. Authority:</strong> <span>${report.matchedRoad ? report.matchedRoad.authority : 'Finding Department...'}</span></div>
        </div>
        <div class="popup-footer">
          <button onclick="window.App.viewComplaintDetails('${report.integrityVerificationId}')" class="btn-popup-action">🔍 View Resolution Tracker</button>
        </div>
      </div>
    `;

    const marker = L.marker([lat, lng], { icon: issueIcon })
      .bindPopup(popupContent, { maxWidth: 300, className: 'custom-leaflet-popup' })
      .addTo(this.map);

    this.markers.push(marker);
    this.map.setView([lat, lng], 13, { animate: true });
  },

  focusOnCoordinates(lat, lng, zoomLevel = 14) {
    this.map.setView([lat, lng], zoomLevel, { animate: true });
  }
};

window.MapHub = MapHub;
