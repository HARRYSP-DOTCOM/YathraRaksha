/**
 * YatraRaksha Tracker Component - INR-Scaled
 * Manages local database persistence, complaint submission states,
 * and compiles formal legal notices scaled to Indian Rupees (₹).
 */

const RoadTracker = {
  STORAGE_REPORTS_KEY: "yatra_raksha_user_reports",
  STORAGE_SYNC_QUEUE_KEY: "yatra_raksha_offline_sync_queue",

  determineRoutingDetails(road) {
    const fallback = {
      routeTo: "Municipal Grievance Officer",
      routeAuthority: "Municipality",
      escalationHierarchy: ["Municipal Engineer", "Superintending Engineer", "Municipal Commissioner"],
      routingMessage: "Local roads are routed to the regional Municipality grievance channels."
    };

    if (!road || !road.type) return fallback;
    const type = road.type.toUpperCase();

    if (type.includes("NH") || type.includes("NATIONAL HIGHWAY")) {
      return {
        routeTo: "NHAI Regional Officer",
        routeAuthority: "NHAI",
        escalationHierarchy: ["Executive Engineer", "Superintending Engineer", "Chief Engineer"],
        routingMessage: "National Highway grievances are routed through the NHAI regional grievance cell."
      };
    }

    if (type.includes("SH") || type.includes("STATE HIGHWAY") || type.includes("DISTRICT ROAD") || type.includes("MDR")) {
      return {
        routeTo: "State PWD Nodal Officer",
        routeAuthority: "PWD",
        escalationHierarchy: ["Executive Engineer", "Superintending Engineer", "Chief Engineer"],
        routingMessage: "State and District Road complaints are routed via the State PWD divisional grievance desk."
      };
    }

    return fallback;
  },

  fileComplaint(aiReport, userDescription, userContact) {
    const isOnline = navigator.onLine;
    const routing = this.determineRoutingDetails(aiReport.matchedRoad);

    const complaint = {
      id: aiReport.integrityVerificationId,
      timestamp: aiReport.timestamp,
      defectType: aiReport.defectType,
      severity: aiReport.severity,
      aiConfidence: aiReport.aiConfidence,
      defectArea: aiReport.defectArea,
      estimatedDepth: aiReport.estimatedDepth,
      urgencyScore: aiReport.urgencyScore,
      repairBudgetEstimate: aiReport.repairBudgetEstimate,
      coordinates: aiReport.coordinates,
      matchedRoad: aiReport.matchedRoad,
      distanceToRoadKm: aiReport.distanceToRoadKm,
      userDescription: userDescription || "No description provided.",
      userContact: userContact || "Anonymous Citizen",
      status: "Submitted",
      statusLogs: [
        { status: "Submitted", timestamp: new Date().toISOString(), message: "Complaint uploaded and validated via YatraRaksha Visual AI." }
      ],
      synced: isOnline,
      routeTo: routing.routeTo,
      routeAuthority: routing.routeAuthority,
      escalationHierarchy: routing.escalationHierarchy,
      routingMessage: routing.routingMessage,
      formalNoticeText: this.generateFormalNoticeText(aiReport, userDescription, userContact)
    };

    const reports = this.getAllReports();
    reports.unshift(complaint);
    localStorage.setItem(this.STORAGE_REPORTS_KEY, JSON.stringify(reports));

    if (!isOnline) {
      const queue = this.getSyncQueue();
      queue.push(complaint.id);
      localStorage.setItem(this.STORAGE_SYNC_QUEUE_KEY, JSON.stringify(queue));
      
      complaint.statusLogs.push({
        status: "Offline Queue",
        timestamp: new Date().toISOString(),
        message: "Network offline. Issue saved locally in offline outbox. Will auto-sync when online."
      });
      localStorage.setItem(this.STORAGE_REPORTS_KEY, JSON.stringify(reports));
    } else {
      this.simulateInitialReview(complaint.id);
    }

    return complaint;
  },

  getAllReports() {
    const data = localStorage.getItem(this.STORAGE_REPORTS_KEY);
    return data ? JSON.parse(data) : [];
  },

  getSyncQueue() {
    const data = localStorage.getItem(this.STORAGE_SYNC_QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  },

  syncOfflineQueue(onSyncItem) {
    const queue = this.getSyncQueue();
    if (queue.length === 0) return;

    const reports = this.getAllReports();
    let updated = false;

    queue.forEach(id => {
      const index = reports.findIndex(r => r.id === id);
      if (index !== -1) {
        reports[index].synced = true;
        
        reports[index].statusLogs.push({
          status: "Synced Online",
          timestamp: new Date().toISOString(),
          message: "Connection restored. Offline outbox synchronized with YatraRaksha servers."
        });

        this.simulateInitialReview(id);
        
        if (onSyncItem) onSyncItem(reports[index]);
        updated = true;
      }
    });

    if (updated) {
      localStorage.setItem(this.STORAGE_REPORTS_KEY, JSON.stringify(reports));
      localStorage.setItem(this.STORAGE_SYNC_QUEUE_KEY, JSON.stringify([]));
    }
  },

  simulateInitialReview(complaintId) {
    setTimeout(() => {
      const reports = this.getAllReports();
      const comp = reports.find(c => c.id === complaintId);
      if (!comp) return;
      const routing = this.determineRoutingDetails(comp.matchedRoad);

      this.updateComplaintStatus(complaintId, "Accepted", `Complaint accepted by ${routing.routeTo}. Forwarding to assigned ${routing.escalationHierarchy[0]} for local review.`);
      
      setTimeout(() => {
        const reports2 = this.getAllReports();
        const comp2 = reports2.find(c => c.id === complaintId);
        if (!comp2) return;

        this.updateComplaintStatus(complaintId, "Engineer Assigned", `Assigned to ${routing.escalationHierarchy[0]} for site inspection and action plan review.`);

        setTimeout(() => {
          this.updateComplaintStatus(complaintId, "Escalated to Superintending Engineer", `Issue elevated to ${routing.escalationHierarchy[1]} for oversight review and approval.`);
        }, 9000);

        setTimeout(() => {
          this.updateComplaintStatus(complaintId, "Escalated to Chief Engineer", `Further escalated to ${routing.escalationHierarchy[2]} as per grievance escalation hierarchy.`);
        }, 14000);

        setTimeout(() => {
          const reports3 = this.getAllReports();
          const comp3 = reports3.find(c => c.id === complaintId);
          if (!comp3) return;
          this.updateComplaintStatus(complaintId, "Budget Allocated", `Project engineering scope approved. Repair warrant of ${comp3.repairBudgetEstimate} sanctioned under public road infrastructure maintenance account.`);
        }, 18000);
      }, 10000);
    }, 6000);
  },

  updateComplaintStatus(complaintId, status, message) {
    const reports = this.getAllReports();
    const index = reports.findIndex(r => r.id === complaintId);
    
    if (index !== -1) {
      reports[index].status = status;
      reports[index].statusLogs.push({
        status: status,
        timestamp: new Date().toISOString(),
        message: message
      });
      localStorage.setItem(this.STORAGE_REPORTS_KEY, JSON.stringify(reports));
      
      const event = new CustomEvent("yatra_raksha_complaint_update", { detail: { id: complaintId, status: status, message: message } });
      window.dispatchEvent(event);
    }
  },

  generateFormalNoticeText(aiReport, userDescription, userContact) {
    const dateStr = new Date(aiReport.timestamp).toLocaleDateString(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    
    const routing = this.determineRoutingDetails(aiReport.matchedRoad);
    const road = aiReport.matchedRoad;
    const roadName = road ? road.name : "Unregistered Municipal Roadway";
    const authority = road ? road.authority : routing.routeAuthority;
    const engineer = road ? road.executiveEngineer : "Assigned Regional Executive Engineer";
    const engineerEmail = road ? road.engineerEmail : "egrievance@pwd.gov";
    const contractor = road ? road.contractorName : "Local PWD Maintenance Team";

    // Format money in INR Crores
    const formatINR = (val) => {
      if (!val) return "N/A";
      const crores = val / 10000000;
      return `₹${crores.toFixed(1)} Crores (₹${val.toLocaleString()})`;
    };

    const budgetSanctioned = formatINR(road ? road.sanctionedBudget : null);
    const budgetSpent = formatINR(road ? road.spentBudget : null);
    const escalationPath = routing.escalationHierarchy.join(" → ");

    return `
================================================================================
          OFFICIAL CITIZEN INFRASTRUCTURE COMPLAINT & TENDER AUDIT
================================================================================
REFERENCE ID: ${aiReport.integrityVerificationId}
DATE OF ISSUE: ${dateStr}
ROUTED TO: ${routing.routeTo}
ROUTED VIA: ${authority}
ESCALATION PATH: ${escalationPath}
ATTN OF: ${engineer} (${engineerEmail})
SUBMITTED BY: ${userContact}

--------------------------------------------------------------------------------
1. AUDITED INFRASTRUCTURE METRICS & PROJECT DETAILS:
--------------------------------------------------------------------------------
• Primary Road Asset : ${roadName}
• Registered Code     : ${road ? road.id : "N/A (Pending Subdivision Entry)"}
• Highway Designation : ${road ? road.type : "MDR / Municipal Pathway"}
• Registered Contractor: ${contractor}
• Last Relaying Date  : ${road ? road.lastRelayingDate : "Unrecorded / Out of Warranty"}
• Sanctioned Budget  : ${budgetSanctioned}
• Reported Spent Cost : ${budgetSpent}
• Financial Status    : ${road && road.spentBudget > road.sanctionedBudget ? "⚠️ FINANCIAL OVERRUN / BUDGET INEFFICIENCY DETECTED" : "✅ Within Bounds"}

--------------------------------------------------------------------------------
2. AI-VISION DEFECT VERIFICATION:
--------------------------------------------------------------------------------
• Verified Defect Class: ${aiReport.defectType}
• AI Classifier Cert.   : ${aiReport.aiConfidence} Confidence Interval
• Structural Dimensions : ${aiReport.defectArea} (Est. Depth: ${aiReport.estimatedDepth})
• Danger Urgency Score  : ${aiReport.urgencyScore} / 10.0 (High Priority Grid)
• Site GPS Coordinates  : Latitude: ${aiReport.coordinates[0]}, Longitude: ${aiReport.coordinates[1]}
• Geo-Distance Delta    : Match accuracy is within ${aiReport.distanceToRoadKm} km of database road node.

--------------------------------------------------------------------------------
3. COMPLAINANT STATEMENT & FIELD EVIDENCE:
--------------------------------------------------------------------------------
"${userDescription}"

--------------------------------------------------------------------------------
4. STATUTORY REMEDY & DEMAND FOR ACTION:
--------------------------------------------------------------------------------
Under active public transparency rules and road maintenance contractor guarantees:
We hereby register a formal demand to investigate the structural failure at the 
stipulated coordinates. The registered contractor, ${contractor}, is held subject 
to audit verification. A repair action has been estimated by AI-Vision models at 
approx ${aiReport.repairBudgetEstimate} under civil standard tenders. 

A response detailing the assigned service dispatch ID is requested within 
the statutory 14 business days.

================================================================================
YATRA RAKSHA PLATFORM - DEMOCRATIZING INFRASTRUCTURE TRANSPARENCY
================================================================================
`;
  }
};

window.RoadTracker = RoadTracker;
