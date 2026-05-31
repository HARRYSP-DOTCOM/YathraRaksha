/**
 * YatraRaksha Global Infrastructure Database (INR & Routing-Enabled)
 * Consolidates pre-seeded road telemetry and authority accident records
 * from the Regional Accident Investigation Board (RAIB).
 */

const RoadDatabase = {
  roads: [],

  // Preseeded alternative routing database (Chennai - Bengaluru)
  // Maps all three routes, color-coded based on accidents and issues
  alternativeRoutes: {},

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
      (road.contractorName && road.contractorName.toLowerCase().includes(q)) ||
      road.id.toLowerCase().includes(q) ||
      (road.authority && road.authority.toLowerCase().includes(q))
    );
  }
};

window.RoadDatabase = RoadDatabase;
