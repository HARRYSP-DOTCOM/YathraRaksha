/**
 * Safe route planner — geocoding + authority accident overlays + corridor alternatives.
 * Data sources: NHAI, PWD, NYSDOT, Caltrans, RAIB (Regional Accident Investigation Board).
 */
const RoutePlanner = {
  authorityRegistry: {
    IN: {
      name: "India — MoRTH / NHAI / State PWD",
      agencies: ["NHAI", "PWD", "CMDA", "MoRTH CRRI", "RAIB India"],
      keywords: ["india"]
    },
    US: {
      name: "United States — DOT / NHTSA",
      agencies: ["NYSDOT", "Caltrans", "FHWA", "NHTSA FARS"],
      keywords: ["united states", "usa"]
    },
    DE: {
      name: "Germany — BMVI / BASt",
      agencies: ["Autobahn GmbH", "BASt", "Landesstraßen"],
      keywords: ["germany"]
    },
    DEFAULT: {
      name: "OpenStreetMap + RoadWatch audit registry",
      agencies: ["RoadWatch consolidated audit", "RAIB"],
      keywords: []
    },
  },

  /**
   * Dynamically register or update a road authority for international deployment.
   * @param {string} countryCode - E.g., 'UK'
   * @param {object} config - { name: "...", agencies: ["..."], keywords: ["united kingdom", "uk"] }
   */
  registerAuthority(countryCode, config) {
    this.authorityRegistry[countryCode] = {
      name: config.name || `${countryCode} Authority`,
      agencies: config.agencies || [],
      keywords: config.keywords || []
    };
  },


  placePresets: [
    { label: "Chennai, Tamil Nadu", lat: 13.0827, lng: 80.2707, country: "IN" },
    { label: "Bengaluru, Karnataka", lat: 12.9716, lng: 77.5946, country: "IN" },
    { label: "Vellore, Tamil Nadu", lat: 12.9716, lng: 79.1588, country: "IN" },
    { label: "Mysuru, Karnataka", lat: 12.2958, lng: 76.6394, country: "IN" },
    { label: "Tambaram, Chennai", lat: 12.9229, lng: 80.1239, country: "IN" },
    { label: "New York, NY", lat: 40.8501, lng: -73.8407, country: "US" },
    { label: "San Jose, CA", lat: 37.3861, lng: -122.0839, country: "US" },
    { label: "Munich, Germany", lat: 48.1351, lng: 11.582, country: "DE" },
  ],

  corridors: [
    {
      key: "IN-CHENNAI-BENGALURU",
      fromAnchor: { lat: 13.0827, lng: 80.2707, radiusKm: 90 },
      toAnchor: { lat: 12.9716, lng: 77.5946, radiusKm: 90 },
      authorityKey: "IN",
    },
    {
      key: "US-NYC-SF-CORRIDOR",
      fromAnchor: { lat: 40.85, lng: -73.84, radiusKm: 120 },
      toAnchor: { lat: 37.39, lng: -122.08, radiusKm: 120 },
      authorityKey: "US",
    },
  ],

  async geocode(query) {
    const q = (query || "").trim();
    if (!q) throw new Error("Enter a place name or address.");

    const preset = this.placePresets.find(
      (p) => p.label.toLowerCase() === q.toLowerCase() || p.label.toLowerCase().includes(q.toLowerCase())
    );
    if (preset) {
      return { ...preset, displayName: preset.label, source: "RoadWatch preset" };
    }

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error("Geocoding service unavailable");
      const data = await res.json();
      if (!data?.length) throw new Error(`Could not find "${q}". Try a preset city name.`);
      const hit = data[0];
      return {
        label: hit.display_name,
        displayName: hit.display_name,
        lat: parseFloat(parseFloat(hit.lat).toFixed(6)),
        lng: parseFloat(parseFloat(hit.lon).toFixed(6)),
        country: this._countryFromDisplay(hit.display_name),
        source: "OpenStreetMap Nominatim",
      };
    } catch (err) {
      if (preset) return preset;
      throw err;
    }
  },

  _countryFromDisplay(name) {
    const n = (name || "").toLowerCase();
    for (const [key, config] of Object.entries(this.authorityRegistry)) {
      if (config.keywords && config.keywords.some(kw => n.includes(kw))) {
        return key;
      }
    }
    return "DEFAULT";
  },

  _nearAnchor(point, anchor) {
    const d = window.RoadDatabase.getHaversineDistance(
      point.lat,
      point.lng,
      anchor.lat,
      anchor.lng
    );
    return d <= anchor.radiusKm;
  },

  matchCorridor(from, to) {
    for (const c of this.corridors) {
      const fromOk = this._nearAnchor(from, c.fromAnchor);
      const toOk = this._nearAnchor(to, c.toAnchor);
      const fromOkRev = this._nearAnchor(from, c.toAnchor);
      const toOkRev = this._nearAnchor(to, c.fromAnchor);
      if ((fromOk && toOk) || (fromOkRev && toOkRev)) {
        return { ...c, reversed: fromOkRev && toOkRev };
      }
    }
    return null;
  },

  async fetchOsrmRoute(from, to, alternatives = true) {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&alternatives=${alternatives}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("OSRM routing failed");
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.length) {
      throw new Error("No drivable route found between these points.");
    }
    return data.routes.map((r, i) => ({
      id: `osrm-${i}`,
      name: i === 0 ? "Fastest (OSM driving network)" : `Alternative ${i} (OSM)`,
      path: r.geometry.coordinates.map((c) => [c[1], c[0]]),
      distanceKm: parseFloat((r.distance / 1000).toFixed(1)),
      travelTimeHours: parseFloat((r.duration / 3600).toFixed(2)),
      source: "OpenStreetMap / OSRM",
    }));
  },

  samplePath(path, count = 24) {
    if (!path?.length) return [];
    if (path.length <= count) return path;
    const out = [];
    for (let i = 0; i < count; i++) {
      const idx = Math.round((i / (count - 1)) * (path.length - 1));
      out.push(path[idx]);
    }
    return out;
  },

  scorePathWithAuthorityData(path) {
    const db = window.RoadDatabase;
    if (!db) return { accidentCount: 0, fatalities: 0, safetyScore: 5, potholeCount: 0, authorities: [] };

    const samples = this.samplePath(path, 28);
    let accidentExposure = 0;
    let fatalityExposure = 0;
    let potholeExposure = 0;
    let safetySum = 0;
    const authoritySet = new Set();

    samples.forEach(([lat, lng]) => {
      const { road, distanceKm } = db.findNearestRoad(lat, lng);
      if (!road) return;
      const w = 1 / (distanceKm + 0.5);
      if (road.accidentRecords) {
        accidentExposure += road.accidentRecords.annualAccidents * w * 0.02;
        fatalityExposure += road.accidentRecords.fatalities * w * 0.05;
        potholeExposure += (road.accidentRecords.potholesPerKm || 0) * w;
        safetySum += (road.accidentRecords.safetyRating || 5) * w;
      }
      if (road.authority) authoritySet.add(road.authority);
    });

    const safetyScore = Math.max(1, Math.min(10, safetySum / samples.length || 5));
    return {
      accidentCount: Math.round(accidentExposure),
      fatalities: Math.round(fatalityExposure),
      potholeCount: Math.round(potholeExposure),
      safetyScore: parseFloat(safetyScore.toFixed(1)),
      authorities: [...authoritySet],
    };
  },

  buildCorridorRoutes(corridor, authorityKey) {
    const routes = window.RoadDatabase.alternativeRoutes[corridor.key];
    if (!routes) return [];
    const auth = this.authorityRegistry[authorityKey] || this.authorityRegistry.DEFAULT;

    return routes
      .map((r) => ({
        ...r,
        distanceKm: r.distanceKm,
        travelTimeHours: r.travelTimeHours,
        accidentCount: r.accidentCount,
        fatalities: r.fatalities,
        potholeCount: r.potholeCount,
        safetyScore: r.safetyScore,
        authorityBundle: auth,
        dataSource: `${auth.name} — ${auth.agencies.join(", ")}`,
        source: "Authority corridor audit (RAIB + NHAI/PWD)",
        isRecommended: false,
      }))
      .sort((a, b) => a.accidentCount - b.accidentCount)
      .map((r, i) => ({
        ...r,
        isRecommended: i === 0,
        name: i === 0 ? `✅ Safest — ${r.name}` : r.name,
      }));
  },

  enrichOsrmRoutes(routes, countryKey) {
    const auth = this.authorityRegistry[countryKey] || this.authorityRegistry.DEFAULT;
    return routes
      .map((r) => {
        const scored = this.scorePathWithAuthorityData(r.path);
        const accidentCount = Math.max(r.accidentCount || 0, scored.accidentCount);
        const safetyScore = scored.safetyScore;
        let statusColor = "#00f5d4";
        if (safetyScore < 5) statusColor = "#ff3b30";
        else if (safetyScore < 7.5) statusColor = "#ff9f1c";

        return {
          ...r,
          ...scored,
          accidentCount,
          safetyScore,
          statusColor,
          authorityBundle: auth,
          dataSource: `${auth.name} + ${r.source}`,
          ratingMessage: this._ratingMessage(safetyScore, accidentCount, scored.fatalities),
        };
      })
      .sort((a, b) => a.accidentCount - b.accidentCount || b.safetyScore - a.safetyScore)
      .map((r, i) => ({
        ...r,
        isRecommended: i === 0,
        name: i === 0 ? `✅ Safest — ${r.name}` : r.name,
      }));
  },

  _ratingMessage(safetyScore, accidents, fatalities) {
    if (safetyScore >= 8) {
      return `🟢 Low accident exposure (${accidents} modeled incidents/yr along corridor). Authority data indicates stable pavement.`;
    }
    if (safetyScore >= 5) {
      return `🟡 Moderate risk — ${accidents} annualized accidents mapped from DOT/PWD registries. Drive with caution.`;
    }
    return `🔴 High risk — ${accidents} accidents, ${fatalities} fatalities (authority records). Consider alternate corridor.`;
  },

  async planRoute(fromQuery, toQuery) {
    const [from, to] = await Promise.all([
      this.geocode(fromQuery),
      this.geocode(toQuery),
    ]);

    const corridor = this.matchCorridor(from, to);
    let routes = [];

    if (corridor) {
      routes = this.buildCorridorRoutes(corridor, corridor.authorityKey);
      if (corridor.reversed) {
        routes = routes.map((r) => ({
          ...r,
          path: [...r.path].reverse(),
        }));
      }
    } else {
      const osrmRoutes = await this.fetchOsrmRoute(from, to, true);
      const countryKey = from.country || to.country || "DEFAULT";
      routes = this.enrichOsrmRoutes(osrmRoutes, countryKey);
    }

    return {
      from,
      to,
      routes,
      corridorKey: corridor?.key || null,
      comparedAt: new Date().toISOString(),
    };
  },
};

window.RoutePlanner = RoutePlanner;
