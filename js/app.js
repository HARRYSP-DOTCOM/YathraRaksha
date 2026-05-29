/**
 * YatraRaksha Application Orchestrator - INR & Satellite Enabled
 * Coordinates navigation grids, on-demand double satellite map loads,
 * Chart.js Crores diagrams, YOLO edge diagnostic logs, and conversational chatbot guides.
 */

const App = {
  activeTab: "overview",
  selectedCoords: [12.9716, 79.1588], // Default Vellore NH48 coord
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
      name: "highway_pothole_cracks_nh48.jpg",
      coords: [12.9716, 79.1588],
      description: "Severe Class-III structural failure forming in the middle lane of the NH-48 expressway. Creating hazardous swerving for high-speed traffic."
    },
    crack: {
      name: "alligator_cracking_ca101.png",
      coords: [37.3861, -122.0839],
      description: "Extensive alligator structural cracking near the CA-101 highway offramp. Surface aggregate is completely loose."
    },
    marking: {
      name: "faded_lane_stripes_mdr12.jpg",
      coords: [12.9229, 80.1239],
      description: "Center line and shoulder markings have faded completely on MDR-12, causing dangerous driving lanes during night hours."
    },
    light: {
      name: "damaged_utility_streetlight.jpg",
      coords: [30.2672, -97.7431],
      description: "Streetlight knocked down due to utility accident, leaving the intersection in complete darkness."
    },
    cat: {
      name: "office_cat_playing.png",
      coords: [48.4682, 8.2439],
      description: "Just a cute office kitten sitting on a keyboard."
    },
    coffee: {
      name: "coffee_mug_on_desk.jpg",
      coords: [40.8501, -73.8407],
      description: "My morning espresso coffee cup."
    }
  },

  /**
   * Application Bootstrapper
   */
  init() {
    // Check authentication
    if (!AuthModule.isAuthenticated()) {
      console.log("⚠️ Not authenticated. Showing login...");
      this.showLoginModal();
      return;
    }

    console.log("✅ User authenticated:", AuthModule.getUser()?.email);

    // Initialize core services
    this.registerEventListeners();
    this.checkNetworkStatus();
    this.requestNotificationPermission();
    this.renderReportsList();
    this.initCharts();
    
    // 1. Initialize miniature Map Widget on Overview Dashboard immediately
    setTimeout(() => {
      this.initMiniMap();
    }, 400);

    // Set default input fields
    document.getElementById("report-lat").value = this.selectedCoords[0];
    document.getElementById("report-lng").value = this.selectedCoords[1];

    // Add initial bot greeting
    this.addBotMessage("👋 Namaste! I am **YatraGPT**, your AI Transparency Assistant. I can help you inspect contractor scores, verify road budgets in ₹ Crores, find executive engineer contact details, or guide you through filing a complaint. What would you like to know today?");

    // Monitor storage quota
    this.monitorStorageQuota();
  },

  registerEventListeners() {
    // Navigation Tabs (Supports both Desktop sidebar and Mobile bottom tabs)
    document.querySelectorAll(".nav-link, .mobile-nav-link").forEach(link => {
      link.addEventListener("click", (e) => {
        // Handle clicking direct element or parent grid link
        const target = e.currentTarget;
        const tab = target.getAttribute("data-tab");
        this.switchTab(tab);
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

    // Chat Interface input
    document.getElementById("chat-input").addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.handleUserChatMessage();
      }
    });

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

    // Ambient PWA Install Prompter
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      
      // Display install card in sidebar
      const installCard = document.getElementById("pwa-install-card");
      if (installCard) {
        installCard.style.display = "block";
      }
    });

    const installBtn = document.getElementById("btn-pwa-install");
    if (installBtn) {
      installBtn.addEventListener("click", () => {
        if (this.deferredInstallPrompt) {
          this.deferredInstallPrompt.prompt();
          this.deferredInstallPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === "accepted") {
              this.showToast("🚀 YatraRaksha PWA installation accepted!");
              document.getElementById("pwa-install-card").style.display = "none";
            }
            this.deferredInstallPrompt = null;
          });
        }
      });
    }
  },

  /**
   * Initialize Miniature Map on Overview tab (Traced color segments)
   */
  initMiniMap() {
    if (this.miniMap) return;

    this.miniMap = L.map("overview-mini-map", {
      center: [20.5937, 78.9629],
      zoom: 4,
      zoomControl: false,
      attributionControl: false
    });

    // Add satellite layer
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19
    }).addTo(this.miniMap);

    // Plot preseeded roads (polylines & nodes)
    const roads = window.RoadDatabase.roads;
    roads.forEach(road => {
      if (road.path && road.path.length > 0) {
        L.polyline(road.path, {
          color: road.statusColor,
          weight: 4,
          opacity: 0.8
        }).addTo(this.miniMap);
      }

      L.circleMarker(road.coordinates, {
        radius: 4,
        fillColor: road.statusColor,
        color: "#ffffff",
        weight: 1.5,
        fillOpacity: 1
      }).addTo(this.miniMap);
    });
  },

  /**
   * Handle dynamic tab switching
   */
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
        window.MapHub.init("map-container", (lat, lng) => {
          this.selectedCoords = [lat, lng];
          document.getElementById("report-lat").value = lat;
          document.getElementById("report-lng").value = lng;
        });
        window.MapHub.map.invalidateSize();
      }, 200);
    }

    if (tabId === "overview") {
      this.initCharts();
      setTimeout(() => {
        if (this.miniMap) this.miniMap.invalidateSize();
      }, 200);
    }
  },

  checkNetworkStatus() {
    const badge = document.getElementById("network-badge");
    const isOnline = navigator.onLine;

    if (isOnline) {
      badge.textContent = "🟢 Online";
      badge.classList.remove("offline");
    } else {
      badge.textContent = "🔴 Offline Mode";
      badge.classList.add("offline");
      this.showToast("⚠️ Network lost. YatraRaksha is running in Offline-First mode.");
    }
  },

  onMapCoordsChanged(lat, lng) {
    this.selectedCoords = [lat, lng];
    document.getElementById("report-lat").value = lat;
    document.getElementById("report-lng").value = lng;
    this.showToast(`📌 Geolocation pinned to: ${lat}, ${lng}`);
  },

  selectRoadForReport(roadId) {
    const road = window.RoadDatabase.getRoadById(roadId);
    if (!road) return;
    
    this.switchTab("capture");
    
    this.selectedCoords = [road.coordinates[0], road.coordinates[1]];
    document.getElementById("report-lat").value = road.coordinates[0];
    document.getElementById("report-lng").value = road.coordinates[1];
    
    // Focus the GPS marker on the map internally (triggers Leaflet init if needed)
    setTimeout(() => {
      window.MapHub.init("map-container", (lat, lng) => {
        this.selectedCoords = [lat, lng];
      });
      window.MapHub.setUserPicker(road.coordinates[0], road.coordinates[1]);
    }, 300);

    this.showToast(`🛣️ Selected Road: ${road.name}`);
  },

  triggerSampleUpload(sampleType) {
    const fileData = this.sampleMediaFiles[sampleType];
    if (!fileData) return;

    this.showToast(`📂 Loading sample asset: ${fileData.name}`);
    
    const fileObj = {
      name: fileData.name,
      type: "image/jpeg"
    };

    this.selectedCoords = fileData.coords;
    document.getElementById("report-lat").value = fileData.coords[0];
    document.getElementById("report-lng").value = fileData.coords[1];
    
    // Focus the GPS marker on map tab
    setTimeout(() => {
      window.MapHub.init("map-container", (lat, lng) => {
        this.selectedCoords = [lat, lng];
      });
      window.MapHub.setUserPicker(fileData.coords[0], fileData.coords[1]);
    }, 100);

    const dropZone = document.getElementById("drop-zone");
    const dropInstructions = document.getElementById("drop-instructions");
    const previewContainer = document.getElementById("preview-media-container");
    const previewImg = document.getElementById("preview-img");

    dropInstructions.style.display = "none";
    previewContainer.style.display = "block";
    
    if (sampleType === "cat") {
      previewImg.src = "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=60";
    } else if (sampleType === "coffee") {
      previewImg.src = "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&fit=crop&q=60";
    } else if (sampleType === "pothole") {
      previewImg.src = "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?w=600&auto=format&fit=crop&q=60";
    } else if (sampleType === "crack") {
      previewImg.src = "https://images.unsplash.com/photo-1584467541268-b040f83be3fd?w=600&auto=format&fit=crop&q=60";
    } else if (sampleType === "marking") {
      previewImg.src = "https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=600&auto=format&fit=crop&q=60";
    } else {
      previewImg.src = "https://images.unsplash.com/photo-1596450514735-111a2fe02935?w=600&auto=format&fit=crop&q=60";
    }

    document.getElementById("user-desc").value = fileData.description;
    this.runAIScanSequence(fileObj);
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
    const fileSubmitBtn = document.getElementById("file-complaint-btn");

    logContainer.innerHTML = "";
    resultsCard.style.display = "none";
    fileSubmitBtn.disabled = true;
    scanOverlay.style.display = "block";
    boundingBox.style.display = "block";

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
      else if (progress.step === "segmentation") addLog(progress.message);
      else if (progress.step === "profiling") addLog(progress.message);
      else if (progress.step === "geolocating") addLog(progress.message);
      else if (progress.step === "success") addLog(progress.message, "success");
      else if (progress.step === "failed") addLog(progress.message, "failed");
    })
    .then((report) => {
      scanOverlay.style.display = "none";
      boundingBox.style.display = "none";
      resultsCard.style.display = "block";
      fileSubmitBtn.disabled = false;
      
      this.activeAIReport = report;
      this.renderAIResultsCard(report);
      this.showToast("⚡ YatraRaksha AI verified road issue!");
    })
    .catch((err) => {
      scanOverlay.style.display = "none";
      boundingBox.style.display = "none";
      this.activeAIReport = null;

      alert(err.message);
      this.showToast("❌ Media validation failed.");
      
      document.getElementById("drop-instructions").style.display = "block";
      document.getElementById("preview-media-container").style.display = "none";
      document.getElementById("user-desc").value = "";
    });
  },

  renderAIResultsCard(report) {
    document.getElementById("ai-id").textContent = report.integrityVerificationId;
    document.getElementById("ai-class").textContent = report.defectType;
    document.getElementById("ai-confidence").textContent = report.aiConfidence;
    document.getElementById("ai-severity").textContent = report.severity;
    document.getElementById("ai-severity").className = `badge ${report.severity === 'Critical' ? 'badge-warn' : 'badge-sh'}`;
    document.getElementById("ai-dimensions").textContent = report.defectArea;
    document.getElementById("ai-depth").textContent = report.estimatedDepth;
    document.getElementById("ai-risk").textContent = `${report.urgencyScore} / 10`;
    
    if (report.matchedRoad) {
      document.getElementById("ai-road").textContent = `${report.matchedRoad.name} (${report.distanceToRoadKm} km away)`;
      document.getElementById("ai-authority").textContent = report.matchedRoad.authority;
      document.getElementById("ai-engineer").textContent = `${report.matchedRoad.executiveEngineer} (${report.matchedRoad.engineerPhone})`;
    } else {
      document.getElementById("ai-road").textContent = "No registered roadway matching coordinates.";
      document.getElementById("ai-authority").textContent = "Local District PWD / Municipal Council";
      document.getElementById("ai-engineer").textContent = "TBD - Regional Administrative Division";
    }
  },

  async submitComplaint() {
    if (!this.activeAIReport) return;

    const userDesc = document.getElementById("user-desc").value;
    const userContact = document.getElementById("user-contact").value;

    // File complaint locally first
    const complaint = window.RoadTracker.fileComplaint(this.activeAIReport, userDesc, userContact);

    this.showToast(`🎉 Complaint Filed! Reference ID: ${complaint.id}`);
    
    // Try to sync with backend API
    if (navigator.onLine) {
      try {
        const apiComplaint = {
          ...complaint,
          userId: AuthModule.getUser()?.id,
          email: AuthModule.getUser()?.email
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
      window.MapHub.init("map-container", (lat, lng) => {
        this.selectedCoords = [lat, lng];
      });
      window.MapHub.plotReportedIssue(complaint);
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
              <span style="font-size: 11px; color: var(--text-muted);">REF: ${report.id}</span>
            </div>
            <h4 style="margin-top: 6px; font-size: 15px;">${report.defectType}</h4>
            <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">📍 ${report.matchedRoad ? report.matchedRoad.name : 'Unknown Road'}</p>
          </div>
          <div style="text-align: right;">
            <span class="badge" style="background: rgba(255,255,255,0.03); color: var(--text-muted);">${new Date(report.timestamp).toLocaleDateString()}</span>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 6px; display: flex; align-items: center; gap: 4px; justify-content: flex-end;">
              <span>${syncIcon}</span><span>${syncText}</span>
            </div>
          </div>
        </div>
      `;
    }).join("");
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

    document.getElementById("details-notice").textContent = complaint.formalNoticeText;

    const steps = [
      { name: "Submitted", desc: "Defect logged and visual telemetry verified." },
      { name: "Accepted", desc: "Regional Public Works intake confirmed. Authority audit started." },
      { name: "Engineer Assigned", desc: "Site jurisdiction assigned to Chief Division Engineer for field review." },
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

    document.getElementById("timeline-tracker-box").innerHTML = timelineHtml;
  },

  focusRoadOnMap(roadId) {
    const road = window.RoadDatabase.getRoadById(roadId);
    if (!road) return;
    
    this.switchTab("map");
    setTimeout(() => {
      window.MapHub.focusOnCoordinates(road.coordinates[0], road.coordinates[1], 14);
      
      window.MapHub.markers.forEach(marker => {
        const pos = marker.getLatLng();
        if (parseFloat(pos.lat.toFixed(4)) === parseFloat(road.coordinates[0].toFixed(4)) &&
            parseFloat(pos.lng.toFixed(4)) === parseFloat(road.coordinates[1].toFixed(4))) {
          marker.openPopup();
        }
      });
    }, 400);
  },

  handleUserChatMessage() {
    const inputEl = document.getElementById("chat-input");
    const message = inputEl.value.trim();
    if (!message) return;

    this.addUserMessage(message);
    inputEl.value = "";

    this.addTypingIndicator();

    setTimeout(() => {
      this.removeTypingIndicator();
      const response = this.computeBotResponse(message);
      this.addBotMessage(response);
    }, 1200);
  },

  addUserMessage(text) {
    const box = document.getElementById("chat-box");
    const el = document.createElement("div");
    el.className = "chat-bubble user";
    el.textContent = text;
    box.appendChild(el);
    box.scrollTop = box.scrollHeight;
  },

  addBotMessage(htmlContent) {
    const box = document.getElementById("chat-box");
    const el = document.createElement("div");
    el.className = "chat-bubble bot";
    el.innerHTML = htmlContent;
    box.appendChild(el);
    box.scrollTop = box.scrollHeight;
  },

  addTypingIndicator() {
    const box = document.getElementById("chat-box");
    const el = document.createElement("div");
    el.className = "chat-bubble bot typing-indicator-el";
    el.innerHTML = "<em>YatraGPT is thinking...</em>";
    box.appendChild(el);
    box.scrollTop = box.scrollHeight;
  },

  removeTypingIndicator() {
    const els = document.querySelectorAll(".typing-indicator-el");
    els.forEach(el => el.remove());
  },

  computeBotResponse(input) {
    const lower = input.toLowerCase();
    
    if (lower.includes("tambaram") || lower.includes("in-mdr12") || lower.includes("mdr12")) {
      const road = window.RoadDatabase.getRoadById("IN-MDR12");
      return `
        <h4>📍 Tambaram-Velachery Main Road (IN-MDR12)</h4>
        <p style="margin-top: 6px;">Here is the active transparency data retrieved from Chennai PWD database:</p>
        <ul style="margin: 10px 0; padding-left: 20px; font-size:12px;">
          <li><strong>Authority:</strong> ${road.authority}</li>
          <li><strong>Executive Engineer:</strong> ${road.executiveEngineer} (${road.engineerPhone})</li>
          <li><strong>Registered Contractor:</strong> ${road.contractorName}</li>
          <li><strong>Performance Rating:</strong> ⚠️ <strong>2.1 / 5.0 (Poor Audit Score)</strong></li>
          <li><strong>Sanctioned Budget:</strong> ₹32.0 Cr</li>
          <li><strong>Spent Cost:</strong> ₹45.0 Cr</li>
          <li><strong>Status:</strong> 🚨 Cost overrun of 40% detected. Guarantee relicensed in 2023.</li>
        </ul>
        <button onclick="window.App.selectRoadForReport('IN-MDR12')" class="btn btn-secondary" style="padding: 6px 12px; font-size:11px; margin-top:6px;">Report Pothole on this Road</button>
      `;
    }

    if (lower.includes("budget") || lower.includes("overrun") || lower.includes("spent") || lower.includes("leakage")) {
      return `
        <h4>💰 Budget Leakage & Overrun Audits (INR ₹)</h4>
        <p style="margin-top: 6px;">Based on public ledger cross-referencing, here are the projects with the highest financial overruns:</p>
        <ol style="margin: 10px 0; padding-left: 20px; font-size:12px;">
          <li style="margin-bottom:6px;"><strong>MDR-12 Tambaram-Velachery Road (India):</strong><br>Sanctioned: ₹32 Cr | Spent: ₹45 Cr <span style="color:var(--accent-red); font-weight:700;">(+40.6%)</span></li>
          <li style="margin-bottom:6px;"><strong>Congress Avenue Road (USA):</strong><br>Sanctioned: ₹15 Cr | Spent: ₹21 Cr <span style="color:var(--accent-red); font-weight:700;">(+40.0%)</span></li>
          <li style="margin-bottom:6px;"><strong>NH-48 Golden Quadrilateral (India):</strong><br>Sanctioned: ₹120 Cr | Spent: ₹135 Cr <span style="color:var(--accent-red); font-weight:700;">(+12.5%)</span></li>
          <li style="margin-bottom:6px;"><strong>L190 Black Forest Link (Germany):</strong><br>Sanctioned: ₹55 Cr | Spent: ₹62 Cr <span style="color:var(--accent-red); font-weight:700;">(+12.7%)</span></li>
        </ol>
        <p style="font-size:11px; color:var(--text-muted);">Citizen complaints automatically file audits demanding contractors justify cost overruns.</p>
      `;
    }

    if (lower.includes("contractor") || lower.includes("performance") || lower.includes("ranking")) {
      return `
        <h4>🛠️ Contractor Integrity Index Rankings</h4>
        <p style="margin-top: 6px;">A consolidated rating of active contractors based on average relaying guarantee compliance and audit overruns:</p>
        <ul style="margin: 10px 0; padding-left: 20px; font-size:12px;">
          <li style="margin-bottom:4px;">🟢 <strong>Granite Construction Co. (USA):</strong> 4.8 / 5.0 (High Integrity)</li>
          <li style="margin-bottom:4px;">🟢 <strong>Hochtief AG (Germany):</strong> 4.7 / 5.0 (High Integrity)</li>
          <li style="margin-bottom:4px;">🟡 <strong>KNR Constructions (India):</strong> 4.5 / 5.0 (Excellent Quality)</li>
          <li style="margin-bottom:4px;">🟡 <strong>Balfour Beatty plc (UK):</strong> 4.2 / 5.0 (Reliable)</li>
          <li style="margin-bottom:4px;">🔴 <strong>Texas Paving Solutions (USA):</strong> 2.8 / 5.0 (Audit Warning)</li>
          <li style="margin-bottom:4px;">🔴 <strong>Sri Balaji Roadworks (India):</strong> 2.1 / 5.0 (⚠️ High Risk Alert)</li>
        </ul>
      `;
    }

    if (lower.includes("offline")) {
      return `
        <h4>📶 Offline Capability Guide</h4>
        <p style="margin-top: 6px;">YatraRaksha has robust offline support using Service Workers and Local Outbox sync:</p>
        <ul style="margin: 10px 0; padding-left: 20px; font-size:12px; line-height:1.4;">
          <li><strong>Offline Verification:</strong> If you lose connection in rural grids, YatraRaksha AI runs local heuristic validations on image parameters to check defect contours.</li>
          <li><strong>Outbox Queue:</strong> Your filed complaint notice is stored securely in your browser's local storage database.</li>
          <li><strong>Auto-Sync:</strong> As soon as your device registers a 3G/4G/Wi-Fi connection, the outbox queue automatically pushes reports to PWD, triggers emails, and assigns engineers!</li>
        </ul>
      `;
    }

    if (lower.includes("how to report") || lower.includes("pothole") || lower.includes("file")) {
      return `
        <h4>📝 How to File a Verified Road Complaint:</h4>
        <ol style="margin: 10px 0; padding-left: 20px; font-size:12px; line-height:1.4;">
          <li>Go to the <strong>AI Verification Capture</strong> tab.</li>
          <li>Tap the <strong>Camera Outbox</strong> or drag-drop a photo/video showing a road defect (potholes, cracks, faded lane markings).</li>
          <li>The **YOLO AI Vision** will automatically scan the media. It verifies the defect class, measures width/depth, and computes an urgency priority rating.</li>
          <li>The AI geolocates your coordinate map pin to locate the exact contractor responsible and matching engineer.</li>
          <li>Add a short field description and click **File Complaint**. The platform routes the formal audit notice instantly!</li>
        </ol>
      `;
    }

    return `
      <p>I processed your query: <em>"${this.escapeHTML(input)}"</em></p>
      <p style="margin-top:6px;">I didn't find an exact keyword match. Try asking one of these popular questions:</p>
      <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:8px;">
        <button onclick="window.App.sendBotMessage('Show contractor performance rankings')" class="quick-action-pill" style="border:1px solid rgba(0,187,249,0.3)">Rankings</button>
        <button onclick="window.App.sendBotMessage('Who is responsible for Tambaram Road (IN-MDR12)?')" class="quick-action-pill" style="border:1px solid rgba(0,187,249,0.3)">Tambaram Road</button>
        <button onclick="window.App.sendBotMessage('Which roads are over budget?')" class="quick-action-pill" style="border:1px solid rgba(0,187,249,0.3)">Over Budget</button>
        <button onclick="window.App.sendBotMessage('How does offline sync work?')" class="quick-action-pill" style="border:1px solid rgba(0,187,249,0.3)">Offline Support</button>
      </div>
    `;
  },

  sendBotMessage(text) {
    this.addUserMessage(text);
    this.addTypingIndicator();
    setTimeout(() => {
      this.removeTypingIndicator();
      const response = this.computeBotResponse(text);
      this.addBotMessage(response);
    }, 800);
  },

  showToast(text) {
    let toast = document.getElementById("toast-notification");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "toast-notification";
      toast.style.position = "fixed";
      toast.style.bottom = "24px";
      toast.style.right = "24px";
      toast.style.background = "rgba(10, 15, 29, 0.95)";
      toast.style.border = "1px solid var(--primary)";
      toast.style.color = "var(--text-white)";
      toast.style.padding = "12px 24px";
      toast.style.borderRadius = "var(--border-radius-md)";
      toast.style.zIndex = "9999";
      toast.style.fontSize = "13px";
      toast.style.fontFamily = "var(--font-body)";
      toast.style.fontWeight = "600";
      toast.style.boxShadow = "0 8px 32px rgba(0, 245, 212, 0.15)";
      toast.style.transition = "var(--transition-smooth)";
      document.body.appendChild(toast);
    }
    
    toast.textContent = text;
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
    }, 4000);
  },

  initCharts() {
    if (this.activeCharts.budgetLeakage) {
      this.activeCharts.budgetLeakage.destroy();
    }
    if (this.activeCharts.contractorPerformance) {
      this.activeCharts.contractorPerformance.destroy();
    }

    const ctx1 = document.getElementById("chart-budget-leakage");
    const ctx2 = document.getElementById("chart-contractor-quality");
    if (!ctx1 || !ctx2) return;

    const roads = window.RoadDatabase.roads;
    const roadLabels = roads.map(r => r.id);
    const sanctionedData = roads.map(r => r.sanctionedBudget / 10000000); // Scale to ₹ Crores
    const spentData = roads.map(r => r.spentBudget / 10000000);

    const contractorLabels = roads.map(r => r.contractorName.substring(0, 15) + "...");
    const performanceScores = roads.map(r => r.contractorPerformance);

    // Chart 1: Sanctioned vs Spent Budget in ₹ Crores
    this.activeCharts.budgetLeakage = new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: roadLabels,
        datasets: [
          {
            label: 'Allocated Budget (₹ Crores)',
            data: sanctionedData,
            backgroundColor: 'rgba(0, 187, 249, 0.4)',
            borderColor: '#00bbf9',
            borderWidth: 1.5,
            borderRadius: 6
          },
          {
            label: 'Actual Spent (₹ Crores)',
            data: spentData,
            backgroundColor: (context) => {
              const index = context.dataIndex;
              const val = spentData[index];
              const sanc = sanctionedData[index];
              return val > sanc ? 'rgba(255, 59, 48, 0.5)' : 'rgba(0, 245, 212, 0.5)';
            },
            borderColor: (context) => {
              const index = context.dataIndex;
              const val = spentData[index];
              const sanc = sanctionedData[index];
              return val > sanc ? '#ff3b30' : '#00f5d4';
            },
            borderWidth: 1.5,
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', weight: '600' } }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.03)' },
            ticks: { color: '#94a3b8' }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.03)' },
            ticks: { color: '#94a3b8' }
          }
        }
      }
    });

    // Chart 2: Contractor Quality
    this.activeCharts.contractorPerformance = new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: contractorLabels,
        datasets: [{
          label: 'Performance Score (Out of 5★)',
          data: performanceScores,
          backgroundColor: 'rgba(0, 245, 212, 0.2)',
          borderColor: '#00f5d4',
          borderWidth: 1.5,
          borderRadius: 8
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.03)' },
            ticks: { color: '#94a3b8' },
            max: 5
          },
          y: {
            grid: { display: false },
            ticks: { color: '#94a3b8' }
          }
        }
      }
    });
  },

  /**
   * Show login modal for authentication
   */
  showLoginModal() {
    const modal = document.createElement("div");
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      font-family: 'Outfit', sans-serif;
    `;

    modal.innerHTML = `
      <div style="background: #0a0f1d; border: 1px solid #00f5d4; border-radius: 12px; padding: 32px; width: 90%; max-width: 400px; box-shadow: 0 8px 32px rgba(0,245,212,0.2);">
        <h2 style="color: #00f5d4; margin-bottom: 24px;">YatraRaksha Authentication</h2>
        
        <div style="margin-bottom: 16px;">
          <input type="email" id="login-email" placeholder="Email address" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid #00f5d4; border-radius: 8px; color: #fff; box-sizing: border-box;" />
        </div>
        
        <div style="margin-bottom: 24px;">
          <input type="password" id="login-password" placeholder="Password" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid #00f5d4; border-radius: 8px; color: #fff; box-sizing: border-box;" />
        </div>
        
        <button id="login-btn" style="width: 100%; padding: 12px; background: #00f5d4; color: #0a0f1d; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; margin-bottom: 12px;">Login</button>
        
        <button id="signup-btn" style="width: 100%; padding: 12px; background: transparent; color: #00f5d4; border: 1px solid #00f5d4; border-radius: 8px; font-weight: 700; cursor: pointer;">Create Account</button>
        
        <p style="color: #94a3b8; font-size: 12px; margin-top: 16px; text-align: center;">
          Demo: Use any email and password (mock authentication)
        </p>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById("login-btn").addEventListener("click", async () => {
      const email = document.getElementById("login-email").value;
      const password = document.getElementById("login-password").value;

      if (!email || !password) {
        alert("Please enter email and password");
        return;
      }

      const result = await AuthModule.login(email, password);
      if (result.success) {
        modal.remove();
        location.reload();
      } else {
        alert("Login failed: " + result.error);
      }
    });

    document.getElementById("signup-btn").addEventListener("click", async () => {
      const email = document.getElementById("login-email").value;
      const password = document.getElementById("login-password").value;

      if (!email || !password) {
        alert("Please enter email and password");
        return;
      }

      const result = await AuthModule.signup(email, password, email.split("@")[0]);
      if (result.success) {
        modal.remove();
        location.reload();
      } else {
        alert("Signup failed: " + result.error);
      }
    });
  },

  /**
   * Request notification permission from user
   */
  async requestNotificationPermission() {
    if (Notification.permission === "default") {
      const granted = await PushNotificationService.requestPermission();
      if (granted) {
        this.showToast("✅ Notifications enabled!");
      }
    }
  },

  /**
   * Monitor storage quota and warn if running low
   */
  async monitorStorageQuota() {
    const quota = await StorageOptimizer.getStorageQuota();
    if (quota) {
      console.log(`📊 Storage: ${quota.formattedUsage} / ${quota.formattedQuota} (${quota.percentUsed}% used)`);

      if (quota.percentUsed > 80) {
        this.showToast(`⚠️ Storage low: ${quota.percentUsed}% used`);
        await StorageOptimizer.clearOldCache(7);
      }
    }
  }
};

window.App = App;
window.onload = () => window.App.init();
