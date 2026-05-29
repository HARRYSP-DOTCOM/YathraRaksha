/**
 * YatraRaksha Global Infrastructure Database (INR & Routing-Enabled)
 * Consolidates pre-seeded road telemetry and authority accident records
 * from the Regional Accident Investigation Board (RAIB).
 */

const RoadDatabase = {
  roads: [
    // --- INDIA ---
    {
      id: "IN-NH48",
      name: "NH-48 Golden Quadrilateral (Chennai-Bengaluru Section)",
      country: "India",
      type: "National Highway (NH)",
      authority: "NHAI - National Highways Authority of India",
      executiveEngineer: "Er. Rajesh K. Vardhan",
      engineerEmail: "ee.nh48.south@nhai.gov.in",
      engineerPhone: "+91-98402-12345",
      contractorName: "Infratech Builders Group Ltd.",
      contractorPerformance: 3.4,
      sanctionedBudget: 1200000000,
      spentBudget: 1350000000,
      fundingSource: "National Highway Development Project (NHDP) Fund",
      lastRelayingDate: "2024-03-15",
      maintenanceGuaranteePeriod: 5,
      statusColor: "#ff9f1c", // Warning
      path: [
        [13.0827, 80.2707], // Chennai
        [12.9716, 79.1588], // Vellore
        [12.9716, 77.5946]  // Bengaluru
      ],
      accidentRecords: {
        annualAccidents: 142,
        fatalities: 28,
        potholesPerKm: 1.4,
        safetyRating: 6.5,
        primaryCauses: "Heavy freighter traffic, speed violations at junctions."
      },
      coordinates: [12.9716, 79.1588],
      jurisdiction: "Vellore Executive Division, Tamil Nadu"
    },
    {
      id: "IN-SH17",
      name: "SH-17 (Bengaluru-Mysuru Expressway Link)",
      country: "India",
      type: "State Highway (SH)",
      authority: "PWD - Karnataka Public Works Department",
      executiveEngineer: "Er. Manjunath Swamy",
      engineerEmail: "ee.mysorediv.pwd@karnataka.gov.in",
      engineerPhone: "+91-94480-56789",
      contractorName: "KNR Constructions Ltd.",
      contractorPerformance: 4.5,
      sanctionedBudget: 850000000,
      spentBudget: 825000000,
      fundingSource: "State Road Development Fund (SRDF)",
      lastRelayingDate: "2025-01-10",
      maintenanceGuaranteePeriod: 3,
      statusColor: "#00f5d4", // Green
      path: [
        [12.9716, 77.5946], // Bengaluru
        [12.7209, 77.2783], // Ramanagara
        [12.2958, 76.6394]  // Mysuru
      ],
      accidentRecords: {
        annualAccidents: 18,
        fatalities: 2,
        potholesPerKm: 0.1,
        safetyRating: 9.4,
        primaryCauses: "Minor shoulder drifts under bad weather."
      },
      coordinates: [12.7209, 77.2783],
      jurisdiction: "Ramanagara Subdivision, Karnataka"
    },
    {
      id: "IN-MDR12",
      name: "MDR-12 Tambaram-Velachery Main Road",
      country: "India",
      type: "Major District Road (MDR)",
      authority: "Chennai Metropolitan Development Authority (CMDA)",
      executiveEngineer: "Er. Selvakumar Arumugam",
      engineerEmail: "ee.tambaram.highways@tn.gov.in",
      engineerPhone: "+91-94440-98765",
      contractorName: "Sri Balaji Roadworks Co.",
      contractorPerformance: 2.1,
      sanctionedBudget: 320000000,
      spentBudget: 450000000,
      fundingSource: "Municipal Infrastructure Development Scheme (MIDS)",
      lastRelayingDate: "2023-08-20",
      maintenanceGuaranteePeriod: 2,
      statusColor: "#ff3b30", // Red
      path: [
        [12.9229, 80.1239], // Tambaram
        [12.9550, 80.1700], // Medavakkam
        [12.9790, 80.2190]  // Velachery
      ],
      accidentRecords: {
        annualAccidents: 94,
        fatalities: 12,
        potholesPerKm: 6.8,
        safetyRating: 2.4,
        primaryCauses: "Heavy logging, severe waterlogging during monsoon, missing streetlights."
      },
      coordinates: [12.9229, 80.1239],
      jurisdiction: "Tambaram Division, Tamil Nadu Highways"
    },

    // --- UNITED STATES ---
    {
      id: "US-I95",
      name: "Interstate 95 (New York Bronx Corridor)",
      country: "United States",
      type: "Interstate (I)",
      authority: "NYSDOT - New York State Department of Transportation",
      executiveEngineer: "Eng. Sarah Jenkins",
      engineerEmail: "sjenkins@dot.ny.gov",
      engineerPhone: "+1-518-555-0195",
      contractorName: "Tully Construction Co. Inc.",
      contractorPerformance: 3.9,
      sanctionedBudget: 1850000000,
      spentBudget: 1980000000,
      fundingSource: "Federal Highway Trust Fund (90%) / NY State Match (10%)",
      lastRelayingDate: "2023-11-02",
      maintenanceGuaranteePeriod: 7,
      statusColor: "#ff9f1c",
      path: [
        [40.8000, -73.9000],
        [40.8501, -73.8407],
        [40.9000, -73.7800]
      ],
      accidentRecords: {
        annualAccidents: 195,
        fatalities: 18,
        potholesPerKm: 1.8,
        safetyRating: 6.2,
        primaryCauses: "Severe traffic bottleneck congestion, winter ice damage."
      },
      coordinates: [40.8501, -73.8407],
      jurisdiction: "NYSDOT Region 11 (New York City)"
    },
    {
      id: "US-CA101",
      name: "US Route 101 (Silicon Valley Expressway Section)",
      country: "United States",
      type: "US Highway (US)",
      authority: "Caltrans - California Department of Transportation",
      executiveEngineer: "Eng. David Vance",
      engineerEmail: "david.vance@dot.ca.gov",
      engineerPhone: "+1-510-555-2345",
      contractorName: "Granite Construction Co.",
      contractorPerformance: 4.8,
      sanctionedBudget: 940000000,
      spentBudget: 912000000,
      fundingSource: "SB1 Road Repair and Accountability Act of 2017",
      lastRelayingDate: "2024-08-30",
      maintenanceGuaranteePeriod: 5,
      statusColor: "#00f5d4",
      path: [
        [37.3382, -121.8863],
        [37.3861, -122.0839],
        [37.4419, -122.1430]
      ],
      accidentRecords: {
        annualAccidents: 24,
        fatalities: 1,
        potholesPerKm: 0.1,
        safetyRating: 9.7,
        primaryCauses: "Minor fender benders at exit junctions."
      },
      coordinates: [37.3861, -122.0839],
      jurisdiction: "Caltrans District 4 (Bay Area)"
    }
  ],

  // Preseeded alternative routing database (Chennai - Bengaluru)
  // Maps all three routes, color-coded based on accidents and issues
  alternativeRoutes: {
    "IN-CHENNAI-BENGALURU": [
      {
        id: "route-beta",
        name: "SafeRoute Path (via SH-17 Expressway Link)",
        safetyScore: 9.6,
        distanceKm: 368,
        travelTimeHours: 5.8,
        potholeCount: 4,
        accidentCount: 14,
        fatalities: 1,
        statusColor: "#00f5d4", // Glowing Teal (Best Path!)
        ratingMessage: "🟢 OPTIMAL SAFETY PATH: Traced via newly relaid SH-17. Zero pavement distress, active contractor guarantee, and continuous utility monitoring.",
        path: [
          [13.0827, 80.2707], // Chennai
          [13.1500, 79.9000],
          [12.9800, 79.2000], // Bypass Medavakkam link
          [12.7209, 77.2783], // Ramanagara node
          [12.9716, 77.5946]  // Bengaluru
        ]
      },
      {
        id: "route-alpha",
        name: "Arterial Highway (via NH-48 Direct)",
        safetyScore: 6.5,
        distanceKm: 345,
        travelTimeHours: 6.2,
        potholeCount: 82,
        accidentCount: 142,
        fatalities: 28,
        statusColor: "#ff9f1c", // Glowing Orange (Warning)
        ratingMessage: "🟡 MODERATE DANGER: High freight traffic. Active pothole clusters logged at KM 120 and KM 184 bypass junctions.",
        path: [
          [13.0827, 80.2707], // Chennai
          [13.0067, 80.2206],
          [12.9716, 79.1588], // Vellore central
          [12.9716, 77.5946]  // Bengaluru
        ]
      },
      {
        id: "route-gamma",
        name: "District Bypass (via Local Rural MDR Links)",
        safetyScore: 2.1,
        distanceKm: 310,
        travelTimeHours: 7.5,
        potholeCount: 295,
        accidentCount: 320,
        fatalities: 64,
        statusColor: "#ff3b30", // Glowing Red (Deteriorated / High Danger)
        ratingMessage: "🔴 CRITICAL SAFETY HAZARD: Broken pavement segments, lack of lane markings, and frequent monsoon waterlogging. Restrict passage.",
        path: [
          [13.0827, 80.2707], // Chennai
          [12.9229, 80.1239], // Tambaram
          [12.5000, 78.5000], // Rural Tamil Nadu
          [12.8000, 77.8000],
          [12.9716, 77.5946]  // Bengaluru
        ]
      }
    ]
  },

  getRoadById(id) {
    return this.roads.find(r => r.id === id) || null;
  },

  findNearestRoad(lat, lng) {
    let nearestRoad = null;
    let minDistance = Infinity;

    this.roads.forEach(road => {
      const dist = this.getHaversineDistance(lat, lng, road.coordinates[0], road.coordinates[1]);
      if (dist < minDistance) {
        minDistance = dist;
        nearestRoad = road;
      }
    });

    return { road: nearestRoad, distanceKm: parseFloat(minDistance.toFixed(2)) };
  },

  getHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  searchRoads(query) {
    const q = query.toLowerCase();
    return this.roads.filter(road => 
      road.name.toLowerCase().includes(q) ||
      road.country.toLowerCase().includes(q) ||
      road.contractorName.toLowerCase().includes(q) ||
      road.id.toLowerCase().includes(q) ||
      road.authority.toLowerCase().includes(q)
    );
  }
};

window.RoadDatabase = RoadDatabase;
