/**
 * YatraRaksha AI Vision Engine (Simulated) - INR Scaled
 * Simulates deep neural network inference on uploaded images/videos.
 * Maps defects to estimated repair costs in Indian Rupees (₹).
 */

const AIEngine = {
  validKeywords: ["road", "pothole", "crack", "asphalt", "highway", "street", "driveway", "pavement", "damage", "infrastructure", "marking", "lane", "drain", "water", "light", "pavement", "concrete", "track", "route", "highway", "path", "bridge", "curb", "walkway", "sidewalk", "rut", "pothole_pic", "road_damage", "capture", "image", "photo", "pic", "img", "video", "upload"],
  invalidKeywords: ["dog", "cat", "laptop", "computer", "mug", "coffee", "person", "face", "selfie", "food", "drink", "office", "desk", "room", "interior", "chair", "plant", "flower", "document", "text", "book", "car_interior", "dashboard"],

  async analyzeMedia(fileObj, coords, onProgress) {
    return new Promise((resolve, reject) => {
      let fileName = fileObj.name || "captured_media.jpg";
      let fileLower = fileName.toLowerCase();

      onProgress({ step: "init", message: "⚡ Initializing YatraRaksha Visual AI Engine v2.4..." });
      
      setTimeout(() => {
        onProgress({ step: "preprocessing", message: "🔍 Preprocessing media: Normalizing contrast and resizing to 512x512px tensor..." });
        
        setTimeout(() => {
          onProgress({ step: "detection", message: "🧠 Executing object detection model (ResNet-101 Backboned YOLOv8)..." });
          
          setTimeout(() => {
            let isInvalid = false;
            
            for (const key of this.invalidKeywords) {
              if (fileLower.includes(key)) {
                isInvalid = true;
                break;
              }
            }

            if (isInvalid) {
              onProgress({ step: "failed", message: "❌ CRITICAL ERROR: Object class 'Non-Road Infrastructure' detected (Confidence: 98.4%). Filing rejected." });
              reject(new Error("Invalid Media: The uploaded media does not appear to be a road or street infrastructure. To keep data accurate, YatraRaksha AI only accepts images/videos of roads, highways, pathways, or related utility systems. Please upload a clear photo of the issue."));
              return;
            }

            onProgress({ step: "segmentation", message: "🎨 Performing semantic segmentation: Mapping pavement surface vs. surrounding features..." });
            
            setTimeout(() => {
              onProgress({ step: "profiling", message: "📊 Measuring defect contours: Calculating pothole depth and volume approximation..." });
              
              setTimeout(() => {
                onProgress({ step: "geolocating", message: "🛰️ Resolving coordinates with Global Infrastructure database..." });
                
                setTimeout(() => {
                  let nearestResult = window.RoadDatabase.findNearestRoad(coords[0], coords[1]);
                  let matchedRoad = nearestResult.road;
                  let distanceKm = nearestResult.distanceKm;

                  // Defect characteristics in INR
                  let defectType = "Pothole (Class-III structural failure)";
                  let severity = "Critical";
                  let confidence = "96.4%";
                  let defectArea = "0.78 sq meters";
                  let estimatedDepth = "14.2 cm";
                  let urgencyScore = 9.2;
                  let repairBudgetEstimate = "₹1,85,000";
                  
                  if (fileLower.includes("crack")) {
                    defectType = "Fatigue Cracking (Alligator Cracking)";
                    severity = "Medium";
                    confidence = "92.8%";
                    defectArea = "3.2 meters linear crack";
                    estimatedDepth = "2.8 cm";
                    urgencyScore = 6.4;
                    repairBudgetEstimate = "₹45,000";
                  } else if (fileLower.includes("marking") || fileLower.includes("lane")) {
                    defectType = "Faded Pavement Markings";
                    severity = "Low";
                    confidence = "95.1%";
                    defectArea = "45 meters faded paint line";
                    estimatedDepth = "N/A";
                    urgencyScore = 4.2;
                    repairBudgetEstimate = "₹12,500";
                  } else if (fileLower.includes("light")) {
                    defectType = "Broken Streetlight & Pole Damage";
                    severity = "Medium";
                    confidence = "99.0%";
                    defectArea = "1 utility unit affected";
                    estimatedDepth = "N/A";
                    urgencyScore = 7.1;
                    repairBudgetEstimate = "₹65,000";
                  } else if (fileLower.includes("drain") || fileLower.includes("water")) {
                    defectType = "Drainage Blockage & Waterlogging";
                    severity = "High";
                    confidence = "94.2%";
                    defectArea = "12 sq meters flooding";
                    estimatedDepth = "8.5 cm depth";
                    urgencyScore = 8.5;
                    repairBudgetEstimate = "₹2,20,000";
                  }

                  const report = {
                    timestamp: new Date().toISOString(),
                    defectType: defectType,
                    severity: severity,
                    aiConfidence: confidence,
                    defectArea: defectArea,
                    estimatedDepth: estimatedDepth,
                    urgencyScore: urgencyScore,
                    repairBudgetEstimate: repairBudgetEstimate,
                    coordinates: coords,
                    matchedRoad: matchedRoad,
                    distanceToRoadKm: distanceKm,
                    integrityVerificationId: "RWAI-" + Math.floor(100000 + Math.random() * 900000)
                  };

                  onProgress({ step: "success", message: "🚀 Visual analysis finalized! Infrastructure defect registered successfully." });
                  resolve(report);
                }, 1000);
              }, 1000);
            }, 800);
          }, 800);
        }, 800);
      }, 500);
    });
  }
};

window.AIEngine = AIEngine;
