/**
 * YATHRA RAKSHA — Mock Data Layer
 * Realistic Indian road infrastructure data for all screens.
 */

window.MOCK_DATA = (() => {
  // ── Contractors ──────────────────────────────────────────
  const contractors = [
    { id: "C001", name: "L&T Infrastructure", projects_completed: 47, avg_health_score: 88, complaints_count: 12, budget_efficiency: 94, completion_rate: 96 },
    { id: "C002", name: "Dilip Buildcon Ltd", projects_completed: 62, avg_health_score: 82, complaints_count: 28, budget_efficiency: 87, completion_rate: 89 },
    { id: "C003", name: "Ashoka Buildcon", projects_completed: 38, avg_health_score: 79, complaints_count: 19, budget_efficiency: 83, completion_rate: 85 },
    { id: "C004", name: "PNC Infratech", projects_completed: 29, avg_health_score: 91, complaints_count: 7, budget_efficiency: 96, completion_rate: 98 },
    { id: "C005", name: "IRB Infrastructure", projects_completed: 34, avg_health_score: 74, complaints_count: 34, budget_efficiency: 78, completion_rate: 80 },
    { id: "C006", name: "GR Infraprojects", projects_completed: 25, avg_health_score: 85, complaints_count: 11, budget_efficiency: 91, completion_rate: 93 },
    { id: "C007", name: "Sadbhav Engineering", projects_completed: 21, avg_health_score: 68, complaints_count: 42, budget_efficiency: 72, completion_rate: 74 },
    { id: "C008", name: "KRIDL (Kerala)", projects_completed: 18, avg_health_score: 76, complaints_count: 22, budget_efficiency: 81, completion_rate: 82 },
    { id: "C009", name: "NCC Limited", projects_completed: 31, avg_health_score: 83, complaints_count: 15, budget_efficiency: 88, completion_rate: 90 },
    { id: "C010", name: "HG Infra Engineering", projects_completed: 16, avg_health_score: 71, complaints_count: 31, budget_efficiency: 75, completion_rate: 77 }
  ];

  // ── Roads ────────────────────────────────────────────────
  const roads = [
    {
      id: "R001", name: "NH-48 Delhi-Jaipur Expressway", type: "NH", state: "Rajasthan", district: "Jaipur",
      length_km: 270, construction_date: "2005-03-15", last_relay_date: "2023-08-20",
      condition: "Good", contractor_id: "C001", engineer_name: "Er. Rajesh Kumar Sharma",
      department: "NHAI", ai_damage_score: 22, complaint_count: 8,
      next_maintenance: "2025-08-01", budget_allocated: 850000000, budget_spent: 720000000,
      repair_history: [
        { date: "2023-08-20", contractor: "L&T Infrastructure", cost: 12000000, description: "Surface resurfacing — 15km stretch near Manesar" },
        { date: "2021-05-10", contractor: "L&T Infrastructure", cost: 8500000, description: "Pothole repair and drainage improvement" },
        { date: "2019-11-02", contractor: "Dilip Buildcon Ltd", cost: 25000000, description: "Major overlay — Dharuhera to Shahpura section" }
      ],
      coordinates: [
        [28.6139, 77.2090], [28.4595, 76.9688], [28.0229, 76.3507],
        [27.5530, 76.0346], [26.9124, 75.7873]
      ]
    },
    {
      id: "R002", name: "NH-44 Nagpur-Hyderabad", type: "NH", state: "Telangana", district: "Hyderabad",
      length_km: 500, construction_date: "2001-06-01", last_relay_date: "2022-12-15",
      condition: "Fair", contractor_id: "C002", engineer_name: "Er. Venkat Reddy",
      department: "NHAI", ai_damage_score: 48, complaint_count: 23,
      next_maintenance: "2025-06-01", budget_allocated: 1120000000, budget_spent: 1050000000,
      repair_history: [
        { date: "2022-12-15", contractor: "Dilip Buildcon Ltd", cost: 35000000, description: "Full-width resurfacing — 30km Adilabad section" },
        { date: "2020-07-22", contractor: "GR Infraprojects", cost: 18000000, description: "Shoulder repair and guard rail installation" }
      ],
      coordinates: [
        [21.1458, 79.0882], [20.4625, 78.7108], [19.7515, 78.3506],
        [18.5679, 78.5048], [17.3850, 78.4867]
      ]
    },
    {
      id: "R003", name: "NH-66 Kozhikode-Kochi Coastal Highway", type: "NH", state: "Kerala", district: "Ernakulam",
      length_km: 190, construction_date: "2008-09-10", last_relay_date: "2024-01-05",
      condition: "Excellent", contractor_id: "C004", engineer_name: "Er. Suresh Menon",
      department: "NHAI", ai_damage_score: 12, complaint_count: 3,
      next_maintenance: "2026-01-01", budget_allocated: 720000000, budget_spent: 580000000,
      repair_history: [
        { date: "2024-01-05", contractor: "PNC Infratech", cost: 9000000, description: "Preventive maintenance — microsurfacing" }
      ],
      coordinates: [
        [11.2588, 75.7804], [10.8505, 75.9512], [10.5276, 76.2144],
        [10.1632, 76.2310], [9.9312, 76.2673]
      ]
    },
    {
      id: "R004", name: "SH-21 Kannur-Kozhikode Road", type: "SH", state: "Kerala", district: "Kannur",
      length_km: 92, construction_date: "2010-04-20", last_relay_date: "2021-11-30",
      condition: "Poor", contractor_id: "C008", engineer_name: "Er. Anil Kumar P",
      department: "Kerala PWD", ai_damage_score: 72, complaint_count: 45,
      next_maintenance: "2025-03-01", budget_allocated: 180000000, budget_spent: 195000000,
      repair_history: [
        { date: "2021-11-30", contractor: "KRIDL (Kerala)", cost: 15000000, description: "Emergency pothole patching — monsoon damage" },
        { date: "2020-03-15", contractor: "KRIDL (Kerala)", cost: 22000000, description: "Full resurfacing — Thalassery bypass" },
        { date: "2018-09-01", contractor: "KRIDL (Kerala)", cost: 8000000, description: "Flood damage repair" }
      ],
      coordinates: [
        [11.8745, 75.3704], [11.7282, 75.4380], [11.5449, 75.5610],
        [11.3410, 75.6900], [11.2588, 75.7804]
      ]
    },
    {
      id: "R005", name: "NH-19 Grand Trunk Road (Varanasi Section)", type: "NH", state: "Uttar Pradesh", district: "Varanasi",
      length_km: 320, construction_date: "1998-01-01", last_relay_date: "2020-06-10",
      condition: "Critical", contractor_id: "C007", engineer_name: "Er. Amit Singh",
      department: "NHAI", ai_damage_score: 89, complaint_count: 67,
      next_maintenance: "2025-01-15", budget_allocated: 680000000, budget_spent: 780000000,
      repair_history: [
        { date: "2020-06-10", contractor: "Sadbhav Engineering", cost: 45000000, description: "Emergency repairs — multiple sections collapsed" },
        { date: "2018-04-01", contractor: "Sadbhav Engineering", cost: 30000000, description: "Overlay and drainage work" },
        { date: "2016-12-15", contractor: "L&T Infrastructure", cost: 55000000, description: "Major reconstruction — Allahabad junction" }
      ],
      coordinates: [
        [25.4358, 81.8463], [25.3884, 82.1433], [25.3176, 82.5515],
        [25.2911, 82.8568], [25.3176, 83.0106]
      ]
    },
    {
      id: "R006", name: "Mumbai-Pune Expressway", type: "EXP", state: "Maharashtra", district: "Pune",
      length_km: 94.5, construction_date: "1997-04-01", last_relay_date: "2023-05-20",
      condition: "Good", contractor_id: "C005", engineer_name: "Er. Prashant Deshmukh",
      department: "MSRDC", ai_damage_score: 25, complaint_count: 11,
      next_maintenance: "2025-05-01", budget_allocated: 163000000, budget_spent: 140000000,
      repair_history: [
        { date: "2023-05-20", contractor: "IRB Infrastructure", cost: 18000000, description: "Lane markings and safety barrier repair" },
        { date: "2021-08-15", contractor: "IRB Infrastructure", cost: 12000000, description: "Ghat section resurfacing" }
      ],
      coordinates: [
        [19.0330, 73.0297], [18.8485, 73.2428], [18.7165, 73.3875],
        [18.5913, 73.5893], [18.5204, 73.8567]
      ]
    },
    {
      id: "R007", name: "Yamuna Expressway", type: "EXP", state: "Uttar Pradesh", district: "Gautam Buddh Nagar",
      length_km: 165, construction_date: "2008-12-01", last_relay_date: "2024-02-10",
      condition: "Excellent", contractor_id: "C006", engineer_name: "Er. Sunil Verma",
      department: "YEIDA", ai_damage_score: 8, complaint_count: 2,
      next_maintenance: "2026-06-01", budget_allocated: 1270000000, budget_spent: 1100000000,
      repair_history: [
        { date: "2024-02-10", contractor: "GR Infraprojects", cost: 7000000, description: "Routine crack sealing and joint repair" }
      ],
      coordinates: [
        [28.4744, 77.5040], [28.1956, 77.5890], [27.8354, 77.7210],
        [27.5124, 77.8350], [27.1767, 78.0081]
      ]
    },
    {
      id: "R008", name: "Chennai-Bengaluru Highway (NH-48)", type: "NH", state: "Tamil Nadu", district: "Vellore",
      length_km: 350, construction_date: "2003-07-01", last_relay_date: "2022-09-15",
      condition: "Fair", contractor_id: "C003", engineer_name: "Er. Karthik Raman",
      department: "NHAI", ai_damage_score: 42, complaint_count: 18,
      next_maintenance: "2025-09-01", budget_allocated: 920000000, budget_spent: 850000000,
      repair_history: [
        { date: "2022-09-15", contractor: "Ashoka Buildcon", cost: 28000000, description: "Resurfacing near Ambur toll plaza" },
        { date: "2020-11-01", contractor: "Ashoka Buildcon", cost: 15000000, description: "Median repair and lighting upgrade" }
      ],
      coordinates: [
        [13.0827, 80.2707], [12.8456, 79.6990], [12.5631, 79.1428],
        [12.9716, 77.5946]
      ]
    },
    {
      id: "R009", name: "MDR-12 Tambaram Link Road", type: "MDR", state: "Tamil Nadu", district: "Chennai",
      length_km: 18, construction_date: "2015-02-01", last_relay_date: "2020-04-10",
      condition: "Poor", contractor_id: "C010", engineer_name: "Er. Deepa Krishnan",
      department: "Tamil Nadu Highways", ai_damage_score: 65, complaint_count: 38,
      next_maintenance: "2025-04-01", budget_allocated: 45000000, budget_spent: 52000000,
      repair_history: [
        { date: "2020-04-10", contractor: "HG Infra Engineering", cost: 6000000, description: "Patch repair after monsoon damage" },
        { date: "2018-07-20", contractor: "HG Infra Engineering", cost: 4500000, description: "Drain cleaning and surface dressing" }
      ],
      coordinates: [
        [12.9249, 80.1278], [12.9350, 80.1450], [12.9450, 80.1590],
        [12.9560, 80.1720]
      ]
    },
    {
      id: "R010", name: "SH-29 Thalassery-Mananthavady", type: "SH", state: "Kerala", district: "Wayanad",
      length_km: 106, construction_date: "2012-06-01", last_relay_date: "2023-03-20",
      condition: "Fair", contractor_id: "C008", engineer_name: "Er. Biju Thomas",
      department: "Kerala PWD", ai_damage_score: 45, complaint_count: 20,
      next_maintenance: "2025-07-01", budget_allocated: 124000000, budget_spent: 110000000,
      repair_history: [
        { date: "2023-03-20", contractor: "KRIDL (Kerala)", cost: 11000000, description: "Ghat section safety improvements" },
        { date: "2021-01-10", contractor: "KRIDL (Kerala)", cost: 8000000, description: "Landslide repair — Kalpetta approach" }
      ],
      coordinates: [
        [11.7486, 75.4943], [11.6800, 75.6100], [11.6200, 75.7800],
        [11.6300, 75.9900]
      ]
    },
    {
      id: "R011", name: "Delhi-Meerut Expressway", type: "EXP", state: "Uttar Pradesh", district: "Meerut",
      length_km: 96, construction_date: "2018-05-01", last_relay_date: "2024-03-01",
      condition: "Excellent", contractor_id: "C002", engineer_name: "Er. Pradeep Gupta",
      department: "NHAI", ai_damage_score: 10, complaint_count: 4,
      next_maintenance: "2026-03-01", budget_allocated: 847600000, budget_spent: 720000000,
      repair_history: [
        { date: "2024-03-01", contractor: "Dilip Buildcon Ltd", cost: 5000000, description: "Joint sealant replacement" }
      ],
      coordinates: [
        [28.6315, 77.2736], [28.7120, 77.3800], [28.8200, 77.4900],
        [28.9200, 77.6100], [28.9845, 77.7064]
      ]
    },
    {
      id: "R012", name: "NH-27 Lucknow-Varanasi Section", type: "NH", state: "Uttar Pradesh", district: "Lucknow",
      length_km: 290, construction_date: "2006-11-01", last_relay_date: "2021-07-15",
      condition: "Poor", contractor_id: "C007", engineer_name: "Er. Manoj Tiwari",
      department: "NHAI", ai_damage_score: 71, complaint_count: 52,
      next_maintenance: "2025-02-01", budget_allocated: 560000000, budget_spent: 610000000,
      repair_history: [
        { date: "2021-07-15", contractor: "Sadbhav Engineering", cost: 32000000, description: "Emergency repairs — road subsidence" },
        { date: "2019-05-20", contractor: "Sadbhav Engineering", cost: 20000000, description: "Overlay — Sultanpur section" },
        { date: "2017-09-10", contractor: "PNC Infratech", cost: 45000000, description: "Major rehabilitation — Pratapgarh district" }
      ],
      coordinates: [
        [26.8467, 80.9462], [26.6500, 81.3000], [26.4500, 81.7000],
        [26.1000, 82.2000], [25.4358, 82.9956]
      ]
    },
    {
      id: "R013", name: "SH-34 Kannur-Kalpetta", type: "SH", state: "Kerala", district: "Kannur",
      length_km: 78, construction_date: "2014-03-15", last_relay_date: "2022-06-10",
      condition: "Good", contractor_id: "C004", engineer_name: "Er. Ravi Varma",
      department: "Kerala PWD", ai_damage_score: 28, complaint_count: 9,
      next_maintenance: "2025-12-01", budget_allocated: 187000000, budget_spent: 158000000,
      repair_history: [
        { date: "2022-06-10", contractor: "PNC Infratech", cost: 14000000, description: "Resurfacing and road marking" }
      ],
      coordinates: [
        [11.8745, 75.3704], [11.8200, 75.5000], [11.7500, 75.6800],
        [11.6100, 75.9500]
      ]
    },
    {
      id: "R014", name: "Bengaluru-Mysuru Expressway", type: "EXP", state: "Karnataka", district: "Mysuru",
      length_km: 118, construction_date: "2019-08-01", last_relay_date: "2024-06-15",
      condition: "Excellent", contractor_id: "C001", engineer_name: "Er. Ashwin Gowda",
      department: "NHAI", ai_damage_score: 5, complaint_count: 1,
      next_maintenance: "2026-12-01", budget_allocated: 780000000, budget_spent: 650000000,
      repair_history: [
        { date: "2024-06-15", contractor: "L&T Infrastructure", cost: 3000000, description: "Routine maintenance inspection" }
      ],
      coordinates: [
        [12.9716, 77.5946], [12.7200, 77.2500], [12.5100, 76.9200],
        [12.3100, 76.6500]
      ]
    },
    {
      id: "R015", name: "NH-52 Bareilly-Tanakpur", type: "NH", state: "Uttarakhand", district: "Champawat",
      length_km: 196, construction_date: "2011-01-01", last_relay_date: "2021-10-05",
      condition: "Critical", contractor_id: "C010", engineer_name: "Er. Arvind Rawat",
      department: "NHAI", ai_damage_score: 85, complaint_count: 58,
      next_maintenance: "2025-01-01", budget_allocated: 340000000, budget_spent: 410000000,
      repair_history: [
        { date: "2021-10-05", contractor: "HG Infra Engineering", cost: 25000000, description: "Emergency landslide clearance and repair" },
        { date: "2019-08-15", contractor: "HG Infra Engineering", cost: 18000000, description: "Monsoon damage restoration" },
        { date: "2017-06-01", contractor: "GR Infraprojects", cost: 35000000, description: "Major resurfacing — Haldwani section" }
      ],
      coordinates: [
        [28.3670, 79.4304], [28.5800, 79.5200], [28.8100, 79.7500],
        [29.0800, 79.9500], [29.1700, 80.1000]
      ]
    }
  ];

  // ── Complaints ───────────────────────────────────────────
  const complaints = [
    { id: "CMP001", road_id: "R005", road_name: "NH-19 Grand Trunk Road (Varanasi Section)", location: "Near Allahabad Junction", lat: 25.4358, lng: 81.8463, type: "Pothole", description: "Large pothole approximately 2 feet wide causing vehicles to swerve dangerously. Multiple accidents reported in last week.", submitted_by: "Rakesh Gupta", aadhaar_masked: "XXXX-XXXX-4521", date: "2025-05-28", status: "Filed", reference_id: "YR-2025-00001", photo_url: null, upvote_count: 24 },
    { id: "CMP002", road_id: "R004", road_name: "SH-21 Kannur-Kozhikode Road", location: "Thalassery bypass curve", lat: 11.7282, lng: 75.4380, type: "Alligator Cracking", description: "Extensive alligator cracking across both lanes near the bypass. Surface breaking apart during monsoon.", submitted_by: "Priya Nair", aadhaar_masked: "XXXX-XXXX-7834", date: "2025-05-27", status: "Assigned", reference_id: "YR-2025-00002", photo_url: null, upvote_count: 18 },
    { id: "CMP003", road_id: "R009", road_name: "MDR-12 Tambaram Link Road", location: "Near Tambaram railway crossing", lat: 12.9249, lng: 80.1278, type: "Pothole", description: "Water-filled pothole invisible during rain. Two-wheeler accident occurred yesterday.", submitted_by: "Karthik S", aadhaar_masked: "XXXX-XXXX-1298", date: "2025-05-26", status: "In Review", reference_id: "YR-2025-00003", photo_url: null, upvote_count: 42 },
    { id: "CMP004", road_id: "R012", road_name: "NH-27 Lucknow-Varanasi Section", location: "Sultanpur district — KM marker 145", lat: 26.2648, lng: 82.0700, type: "Rutting", description: "Deep rutting in heavy vehicle lane. Trucks getting stuck during monsoon. Road needs complete relaying.", submitted_by: "Arun Yadav", aadhaar_masked: "XXXX-XXXX-5567", date: "2025-05-25", status: "Resolved", reference_id: "YR-2025-00004", photo_url: null, upvote_count: 31 },
    { id: "CMP005", road_id: "R015", road_name: "NH-52 Bareilly-Tanakpur", location: "Haldwani approach road", lat: 29.0800, lng: 79.9500, type: "Longitudinal Crack", description: "Long crack running parallel to traffic for about 500m. Edge of road crumbling into the valley.", submitted_by: "Deepak Rawat", aadhaar_masked: "XXXX-XXXX-9901", date: "2025-05-25", status: "Filed", reference_id: "YR-2025-00005", photo_url: null, upvote_count: 56 },
    { id: "CMP006", road_id: "R004", road_name: "SH-21 Kannur-Kozhikode Road", location: "Mahe junction", lat: 11.6990, lng: 75.5340, type: "Pothole", description: "Series of potholes at junction. School children crossing area is extremely dangerous.", submitted_by: "Suresh Nambiar", aadhaar_masked: "XXXX-XXXX-2234", date: "2025-05-24", status: "Assigned", reference_id: "YR-2025-00006", photo_url: null, upvote_count: 67 },
    { id: "CMP007", road_id: "R002", road_name: "NH-44 Nagpur-Hyderabad", location: "Adilabad toll plaza", lat: 19.6641, lng: 78.5320, type: "Transverse Crack", description: "Multiple transverse cracks near toll plaza. Heavy truck traffic worsening the damage daily.", submitted_by: "Venkat Rao", aadhaar_masked: "XXXX-XXXX-6612", date: "2025-05-23", status: "In Review", reference_id: "YR-2025-00007", photo_url: null, upvote_count: 15 },
    { id: "CMP008", road_id: "R005", road_name: "NH-19 Grand Trunk Road (Varanasi Section)", location: "Mughal Sarai bypass", lat: 25.2844, lng: 83.1167, type: "Pothole", description: "Crater-sized pothole on national highway. Bus broke axle here last week. Urgent repair needed.", submitted_by: "Anonymous", aadhaar_masked: "XXXX-XXXX-XXXX", date: "2025-05-22", status: "Filed", reference_id: "YR-2025-00008", photo_url: null, upvote_count: 89 },
    { id: "CMP009", road_id: "R008", road_name: "Chennai-Bengaluru Highway (NH-48)", location: "Ambur toll area", lat: 12.7900, lng: 78.7150, type: "Alligator Cracking", description: "Surface breaking apart in 200m stretch. Loose aggregate dangerous for two-wheelers.", submitted_by: "Mahalakshmi V", aadhaar_masked: "XXXX-XXXX-3345", date: "2025-05-21", status: "Assigned", reference_id: "YR-2025-00009", photo_url: null, upvote_count: 22 },
    { id: "CMP010", road_id: "R009", road_name: "MDR-12 Tambaram Link Road", location: "Chromepet junction", lat: 12.9450, lng: 80.1590, type: "Pothole", description: "Multiple potholes near bus stop. Passengers getting injured while alighting.", submitted_by: "Santhosh Kumar", aadhaar_masked: "XXXX-XXXX-7789", date: "2025-05-20", status: "Resolved", reference_id: "YR-2025-00010", photo_url: null, upvote_count: 35 },
    { id: "CMP011", road_id: "R015", road_name: "NH-52 Bareilly-Tanakpur", location: "Near Khatima", lat: 28.9200, lng: 79.9700, type: "Rutting", description: "Severe rutting along 2km stretch. Road surface has sunk 6 inches in places.", submitted_by: "Bharat Joshi", aadhaar_masked: "XXXX-XXXX-1123", date: "2025-05-19", status: "Filed", reference_id: "YR-2025-00011", photo_url: null, upvote_count: 41 },
    { id: "CMP012", road_id: "R001", road_name: "NH-48 Delhi-Jaipur Expressway", location: "Manesar industrial area", lat: 28.3596, lng: 76.9366, type: "Transverse Crack", description: "Wide crack across carriageway near factory entrance. Getting worse with heavy truck traffic.", submitted_by: "Ravi Malhotra", aadhaar_masked: "XXXX-XXXX-8856", date: "2025-05-18", status: "In Review", reference_id: "YR-2025-00012", photo_url: null, upvote_count: 12 },
    { id: "CMP013", road_id: "R004", road_name: "SH-21 Kannur-Kozhikode Road", location: "Peringathur stretch", lat: 11.8100, lng: 75.4100, type: "Pothole", description: "Road completely broken after last monsoon. No repair work initiated despite multiple complaints.", submitted_by: "Unnikrishnan K", aadhaar_masked: "XXXX-XXXX-4456", date: "2025-05-17", status: "Filed", reference_id: "YR-2025-00013", photo_url: null, upvote_count: 73 },
    { id: "CMP014", road_id: "R012", road_name: "NH-27 Lucknow-Varanasi Section", location: "Pratapgarh bypass", lat: 25.8857, lng: 81.9440, type: "Alligator Cracking", description: "Entire road surface showing fatigue cracking. Needs complete reconstruction.", submitted_by: "Shivam Mishra", aadhaar_masked: "XXXX-XXXX-2290", date: "2025-05-16", status: "Assigned", reference_id: "YR-2025-00014", photo_url: null, upvote_count: 29 },
    { id: "CMP015", road_id: "R010", road_name: "SH-29 Thalassery-Mananthavady", location: "Kalpetta ghat section", lat: 11.6200, lng: 75.7800, type: "Longitudinal Crack", description: "Edge cracking on ghat road. Risk of road collapse during heavy rains.", submitted_by: "Sreejith M", aadhaar_masked: "XXXX-XXXX-5501", date: "2025-05-15", status: "In Review", reference_id: "YR-2025-00015", photo_url: null, upvote_count: 38 },
    { id: "CMP016", road_id: "R006", road_name: "Mumbai-Pune Expressway", location: "Lonavala ghat section", lat: 18.7500, lng: 73.4000, type: "Pothole", description: "Pothole on fast lane at ghat section curve. Extremely dangerous at highway speeds.", submitted_by: "Amit Patil", aadhaar_masked: "XXXX-XXXX-6634", date: "2025-05-14", status: "Resolved", reference_id: "YR-2025-00016", photo_url: null, upvote_count: 55 },
    { id: "CMP017", road_id: "R005", road_name: "NH-19 Grand Trunk Road (Varanasi Section)", location: "Chandauli border", lat: 25.2600, lng: 83.2500, type: "Pothole", description: "Three large potholes in succession. Commercial vehicles forced to use wrong side.", submitted_by: "Mohammad Asif", aadhaar_masked: "XXXX-XXXX-9012", date: "2025-05-13", status: "Filed", reference_id: "YR-2025-00017", photo_url: null, upvote_count: 33 },
    { id: "CMP018", road_id: "R002", road_name: "NH-44 Nagpur-Hyderabad", location: "Nizamabad approach", lat: 18.6725, lng: 78.0941, type: "Rutting", description: "Heavy rutting on truck lane. Road uneven by 4-5 inches.", submitted_by: "Srinivas Reddy", aadhaar_masked: "XXXX-XXXX-3378", date: "2025-05-12", status: "Assigned", reference_id: "YR-2025-00018", photo_url: null, upvote_count: 19 },
    { id: "CMP019", road_id: "R009", road_name: "MDR-12 Tambaram Link Road", location: "Pallavaram intersection", lat: 12.9680, lng: 80.1500, type: "Alligator Cracking", description: "Road crumbling at intersection. Surface aggregate flying off and hitting pedestrians.", submitted_by: "Lakshmi Devi", aadhaar_masked: "XXXX-XXXX-7701", date: "2025-05-11", status: "Filed", reference_id: "YR-2025-00019", photo_url: null, upvote_count: 27 },
    { id: "CMP020", road_id: "R015", road_name: "NH-52 Bareilly-Tanakpur", location: "Sitarganj industrial zone", lat: 28.9300, lng: 79.7200, type: "Pothole", description: "Potholes every 50 meters. Road is practically unusable in current state.", submitted_by: "Naveen Kumar", aadhaar_masked: "XXXX-XXXX-1145", date: "2025-05-10", status: "In Review", reference_id: "YR-2025-00020", photo_url: null, upvote_count: 48 },
    { id: "CMP021", road_id: "R004", road_name: "SH-21 Kannur-Kozhikode Road", location: "Dharmadam Bridge approach", lat: 11.7800, lng: 75.4500, type: "Transverse Crack", description: "Bridge approach road cracked. Gap widening daily.", submitted_by: "Fathima Beevi", aadhaar_masked: "XXXX-XXXX-8823", date: "2025-05-09", status: "Resolved", reference_id: "YR-2025-00021", photo_url: null, upvote_count: 44 },
    { id: "CMP022", road_id: "R008", road_name: "Chennai-Bengaluru Highway (NH-48)", location: "Kanchipuram bypass", lat: 12.8300, lng: 79.7000, type: "Pothole", description: "Cluster of potholes at bypass entry. Accident black spot.", submitted_by: "Bala Murugan", aadhaar_masked: "XXXX-XXXX-5567", date: "2025-05-08", status: "Filed", reference_id: "YR-2025-00022", photo_url: null, upvote_count: 16 },
    { id: "CMP023", road_id: "R001", road_name: "NH-48 Delhi-Jaipur Expressway", location: "Shahpura stretch", lat: 27.3900, lng: 75.9600, type: "Longitudinal Crack", description: "Median-side cracking running for 300m. Needs immediate attention before monsoon.", submitted_by: "Harsh Sharma", aadhaar_masked: "XXXX-XXXX-4478", date: "2025-05-07", status: "Assigned", reference_id: "YR-2025-00023", photo_url: null, upvote_count: 8 },
    { id: "CMP024", road_id: "R012", road_name: "NH-27 Lucknow-Varanasi Section", location: "Rae Bareli junction", lat: 26.2100, lng: 81.2300, type: "Pothole", description: "Massive pothole at junction. No warning signs. Multiple near-miss incidents daily.", submitted_by: "Anita Verma", aadhaar_masked: "XXXX-XXXX-6690", date: "2025-05-06", status: "Filed", reference_id: "YR-2025-00024", photo_url: null, upvote_count: 51 },
    { id: "CMP025", road_id: "R010", road_name: "SH-29 Thalassery-Mananthavady", location: "Near Peruvannamuzhi Dam", lat: 11.5800, lng: 75.8500, type: "Rutting", description: "Deep ruts from construction vehicles. Tourist route badly affected.", submitted_by: "Vipin Kumar", aadhaar_masked: "XXXX-XXXX-3312", date: "2025-05-05", status: "Assigned", reference_id: "YR-2025-00025", photo_url: null, upvote_count: 20 }
  ];

  // ── Tenders ──────────────────────────────────────────────
  const tenders = [
    { id: "T001", road_id: "R001", road_name: "NH-48 Delhi-Jaipur Expressway", date: "2024-01-15", budget_allocated: 850000000, released: 820000000, spent: 720000000, balance: 100000000, source: "NHAI Fund", completion_pct: 92, contractor_id: "C001", anomaly_flag: false, anomaly_reason: null, source_url: "https://nhai.gov.in" },
    { id: "T002", road_id: "R002", road_name: "NH-44 Nagpur-Hyderabad", date: "2023-06-20", budget_allocated: 1120000000, released: 1100000000, spent: 1050000000, balance: 50000000, source: "Central Road Fund", completion_pct: 78, contractor_id: "C002", anomaly_flag: true, anomaly_reason: "Spending at 93.8% with only 78% completion — potential cost overrun risk", source_url: "https://morth.nic.in" },
    { id: "T003", road_id: "R003", road_name: "NH-66 Kozhikode-Kochi Coastal Highway", date: "2024-03-10", budget_allocated: 720000000, released: 700000000, spent: 580000000, balance: 120000000, source: "NHAI Fund", completion_pct: 88, contractor_id: "C004", anomaly_flag: false, anomaly_reason: null, source_url: "https://nhai.gov.in" },
    { id: "T004", road_id: "R004", road_name: "SH-21 Kannur-Kozhikode Road", date: "2023-09-05", budget_allocated: 180000000, released: 180000000, spent: 195000000, balance: -15000000, source: "State PWD", completion_pct: 65, contractor_id: "C008", anomaly_flag: true, anomaly_reason: "Budget exceeded by ₹1.5 Cr with only 65% work completed — severe overrun", source_url: "https://pwd.kerala.gov.in" },
    { id: "T005", road_id: "R005", road_name: "NH-19 Grand Trunk Road (Varanasi Section)", date: "2023-03-01", budget_allocated: 680000000, released: 680000000, spent: 780000000, balance: -100000000, source: "Central Road Fund", completion_pct: 55, contractor_id: "C007", anomaly_flag: true, anomaly_reason: "₹10 Cr overrun with only 55% completion — CAG audit recommended", source_url: "https://morth.nic.in" },
    { id: "T006", road_id: "R006", road_name: "Mumbai-Pune Expressway", date: "2024-02-12", budget_allocated: 163000000, released: 160000000, spent: 140000000, balance: 20000000, source: "MSRDC", completion_pct: 95, contractor_id: "C005", anomaly_flag: false, anomaly_reason: null, source_url: "https://msrdc.org" },
    { id: "T007", road_id: "R007", road_name: "Yamuna Expressway", date: "2024-04-20", budget_allocated: 1270000000, released: 1200000000, spent: 1100000000, balance: 100000000, source: "YEIDA", completion_pct: 97, contractor_id: "C006", anomaly_flag: false, anomaly_reason: null, source_url: "https://yeida.org" },
    { id: "T008", road_id: "R008", road_name: "Chennai-Bengaluru Highway (NH-48)", date: "2023-11-15", budget_allocated: 920000000, released: 900000000, spent: 850000000, balance: 50000000, source: "NHAI Fund", completion_pct: 82, contractor_id: "C003", anomaly_flag: true, anomaly_reason: "Spending at 92.4% but completion only 82% — slow progress flagged", source_url: "https://nhai.gov.in" },
    { id: "T009", road_id: "R009", road_name: "MDR-12 Tambaram Link Road", date: "2023-07-01", budget_allocated: 45000000, released: 45000000, spent: 52000000, balance: -7000000, source: "State Highway Fund", completion_pct: 70, contractor_id: "C010", anomaly_flag: true, anomaly_reason: "₹70 lakh overrun on a minor road — disproportionate overspending", source_url: "https://tnhighways.gov.in" },
    { id: "T010", road_id: "R010", road_name: "SH-29 Thalassery-Mananthavady", date: "2024-01-05", budget_allocated: 124000000, released: 120000000, spent: 110000000, balance: 10000000, source: "State PWD", completion_pct: 85, contractor_id: "C008", anomaly_flag: false, anomaly_reason: null, source_url: "https://pwd.kerala.gov.in" },
    { id: "T011", road_id: "R011", road_name: "Delhi-Meerut Expressway", date: "2024-05-10", budget_allocated: 847600000, released: 800000000, spent: 720000000, balance: 80000000, source: "NHAI Fund", completion_pct: 99, contractor_id: "C002", anomaly_flag: false, anomaly_reason: null, source_url: "https://nhai.gov.in" },
    { id: "T012", road_id: "R012", road_name: "NH-27 Lucknow-Varanasi Section", date: "2023-04-15", budget_allocated: 560000000, released: 560000000, spent: 610000000, balance: -50000000, source: "Central Road Fund", completion_pct: 60, contractor_id: "C007", anomaly_flag: true, anomaly_reason: "₹5 Cr overrun at 60% completion — investigation pending", source_url: "https://morth.nic.in" },
    { id: "T013", road_id: "R013", road_name: "SH-34 Kannur-Kalpetta", date: "2024-02-01", budget_allocated: 187000000, released: 180000000, spent: 158000000, balance: 22000000, source: "KIIFB", completion_pct: 90, contractor_id: "C004", anomaly_flag: false, anomaly_reason: null, source_url: "https://kiifb.org" },
    { id: "T014", road_id: "R014", road_name: "Bengaluru-Mysuru Expressway", date: "2024-06-01", budget_allocated: 780000000, released: 750000000, spent: 650000000, balance: 100000000, source: "NHAI Fund", completion_pct: 96, contractor_id: "C001", anomaly_flag: false, anomaly_reason: null, source_url: "https://nhai.gov.in" },
    { id: "T015", road_id: "R015", road_name: "NH-52 Bareilly-Tanakpur", date: "2023-05-20", budget_allocated: 340000000, released: 340000000, spent: 410000000, balance: -70000000, source: "Central Road Fund", completion_pct: 45, contractor_id: "C010", anomaly_flag: true, anomaly_reason: "₹7 Cr overrun at 45% completion — worst performing project in portfolio", source_url: "https://morth.nic.in" }
  ];

  // ── Helper functions ─────────────────────────────────────
  function getRoadById(id) { return roads.find(r => r.id === id); }
  function getContractorById(id) { return contractors.find(c => c.id === id); }
  function getComplaintsByRoad(roadId) { return complaints.filter(c => c.road_id === roadId); }
  function getTenderByRoad(roadId) { return tenders.find(t => t.road_id === roadId); }

  function getConditionColor(condition) {
    const map = { "Excellent": "#639922", "Good": "#639922", "Fair": "#EF9F27", "Poor": "#E68A00", "Critical": "#E24B4A" };
    return map[condition] || "#888780";
  }

  function formatINR(amount) {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
    return `₹${amount.toLocaleString("en-IN")}`;
  }

  function getRoadAge(constructionDate) {
    const built = new Date(constructionDate);
    const now = new Date();
    const years = Math.floor((now - built) / (365.25 * 24 * 60 * 60 * 1000));
    return `${years} years`;
  }

  function getSummaryStats() {
    const totalAllocated = tenders.reduce((s, t) => s + t.budget_allocated, 0);
    const totalReleased = tenders.reduce((s, t) => s + t.released, 0);
    const totalSpent = tenders.reduce((s, t) => s + t.spent, 0);
    const totalBalance = totalAllocated - totalSpent;
    return { totalAllocated, totalReleased, totalSpent, totalBalance };
  }

  return {
    roads, contractors, complaints, tenders,
    getRoadById, getContractorById, getComplaintsByRoad, getTenderByRoad,
    getConditionColor, formatINR, getRoadAge, getSummaryStats
  };
})();
