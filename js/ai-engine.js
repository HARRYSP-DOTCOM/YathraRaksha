/**
 * YatraRaksha AI Vision Engine — calls backend POST /v1/ai/analyze (Gemini Vision)
 */
const AIEngine = {
  _logTime() {
    return new Date().toLocaleTimeString();
  },

  _addLog(container, message, cssClass = "") {
    if (!container) return;
    const el = document.createElement("div");
    el.className = `log-entry ${cssClass}`;
    el.textContent = `[${this._logTime()}] ${message}`;
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
  },

  async analyzeRoadImage(file, coords, logContainer) {
    const base =
      (window.AppConfig && window.AppConfig.API_BASE_URL) || "http://127.0.0.1:8000/v1";

    this._addLog(logContainer, "Uploading media to YatraRaksha Vision API...", "cyan");
    this._addLog(logContainer, "Running Gemini Vision analysis on road image...");

    const formData = new FormData();
    formData.append("file", file, file.name || "upload.jpg");
    if (coords && coords.length >= 2) {
      formData.append("lat", String(coords[0]));
      formData.append("lng", String(coords[1]));
    }

    const res = await fetch(`${base}/ai/analyze`, {
      method: "POST",
      body: formData,
    });

    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error("Invalid response from vision API");
    }

    if (data.rejected) {
      this._addLog(logContainer, `Rejected — ${data.rejection_reason || "not a road defect"}`, "failed");
      return {
        success: false,
        rejected: true,
        error: data.rejection_reason,
        rejection_reason: data.rejection_reason,
        roadConfidence: 0,
        detectedObjects: ["non-road image"],
        reason: data.rejection_reason,
      };
    }

    const confPct = ((data.confidence || 0) * 100).toFixed(1);
    this._addLog(
      logContainer,
      `Detection complete — class: ${data.defect_class}, confidence: ${confPct}%`,
      "success"
    );
    this._addLog(
      logContainer,
      `Severity score: ${data.severity_score}/10 — Risk: ${data.risk_level}`,
      "success"
    );

    const nearest = window.RoadDatabase?.findNearestRoad?.(coords[0], coords[1]);
    const roadName = nearest?.road?.name || data.matchedRoad?.name || "Unknown corridor";
    this._addLog(logContainer, `Nearest road corridor identified: ${roadName}`);
    this._addLog(logContainer, "Complaint form ready — fill notes and submit.", "success");

    return this._mapApiToReport(data, coords, nearest);
  },

  _mapApiToReport(data, coords, nearest) {
    const road = data.matchedRoad || nearest?.road;
    const conf = data.confidence ?? 0;

    return {
      success: true,
      rejected: false,
      timestamp: new Date().toISOString(),
      integrityVerificationId: data.detection_id || data.integrityVerificationId,
      detection_id: data.detection_id,
      defect_class: data.defect_class,
      defectType: data.defect_class || data.defectType,
      severity: data.risk_level || data.severity,
      severity_score: data.severity_score,
      aiConfidence: `${(conf * 100).toFixed(1)}%`,
      confidence: conf,
      defectArea: `${data.damage_area_m2 ?? 0} m²`,
      damage_area_m2: data.damage_area_m2,
      estimatedDepth: `${data.avg_depth_cm ?? 0} cm`,
      avg_depth_cm: data.avg_depth_cm,
      urgencyScore: data.severity_score,
      risk_level: data.risk_level,
      repair_priority: data.repair_priority,
      repairBudgetEstimate: data.repair_priority,
      suggestions: data.suggestions || [],
      bounding_box: data.bounding_box,
      model_version: data.model_version,
      coordinates: coords,
      matchedRoad: road,
      distanceToRoadKm: data.distanceToRoadKm ?? nearest?.distanceKm,
      roadValidationConfidence: conf,
      roadValidationObjects: ["road surface"],
    };
  },

  /**
   * Main entry — used by App.runAIScanSequence
   */
  async analyzeMedia(fileObj, coords, onProgress) {
    const logContainer = document.getElementById("ai-logger-logs");

    onProgress?.({ step: "init", message: "⚡ Initializing YatraRaksha Vision API..." });

    try {
      const result = await this.analyzeRoadImage(fileObj, coords, logContainer);
      if (result.success) {
        onProgress?.({ step: "success", message: "🚀 Visual analysis finalized!" });
      } else {
        onProgress?.({ step: "rejected", message: `❌ ${result.reason || result.error}` });
      }
      return result;
    } catch (err) {
      onProgress?.({ step: "rejected", message: `❌ ${err.message}` });
      throw err;
    }
  },

  /** Client-side rejection for cat/coffee sandbox demos */
  mockRejection(reason) {
    return {
      success: false,
      rejected: true,
      error: reason,
      rejection_reason: reason,
      roadConfidence: 0,
      detectedObjects: ["non-road subject"],
      reason,
    };
  },
};

window.AIEngine = AIEngine;


document.addEventListener("DOMContentLoaded", async () => {
  try {
    const base = (window.AppConfig && window.AppConfig.API_BASE_URL) || "/v1";
    const data = await fetch(`${base}/ai/defect-classes`).then(r => r.json());
    
    const classListEl = document.getElementById("ai-defect-class-list");
    if (classListEl && data.defect_classes) {
       classListEl.innerHTML = data.defect_classes
         .map(c => `<li><strong>${c.class_name}:</strong> ${c.description}</li>`).join("");
       const card = document.getElementById("ai-model-benchmarks-card");
       if (card) card.style.display = "block";
    }

    const benchEl = document.getElementById("ai-benchmark-scores");
    if (benchEl && data.model_performance_benchmarks) {
       benchEl.innerHTML = `<strong>Gemini 3.5 Flash:</strong> Industry-leading speed | 
                            <strong>Dataset:</strong> RDD2022 Integrated`;
    }
  } catch (err) {
    console.error("Failed to load AI classes", err);
  }
});
