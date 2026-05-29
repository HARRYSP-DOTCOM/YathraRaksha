/**
 * Live trip tracking — GPS progress along a planned route from source to destination.
 */
const TripTracker = {
  active: false,
  routePath: [],
  destination: null,
  totalMeters: 0,
  traveledMeters: 0,
  segmentIndex: 0,
  breadcrumb: [],
  startedAt: null,
  onProgress: null,
  arrivalRadiusM: 350,
  offRouteThresholdM: 200,

  start(routePath, destination, onProgress) {
    if (!routePath?.length || !destination) {
      throw new Error("Invalid route for trip tracking.");
    }
    this.stop();
    this.active = true;
    this.routePath = routePath;
    this.destination = destination;
    this.totalMeters = this.pathLengthMeters(routePath);
    this.traveledMeters = 0;
    this.segmentIndex = 0;
    this.breadcrumb = [];
    this.startedAt = Date.now();
    this.onProgress = onProgress;

    if (window.LocationService) {
      window.LocationService.setTripMode(true);
      window.LocationService.start();
    }

    if (window.LocationService?.lastPosition) {
      this.handlePosition(window.LocationService.lastPosition);
    }
  },

  stop() {
    this.active = false;
    if (window.LocationService) window.LocationService.setTripMode(false);
    this.onProgress = null;
  },

  handlePosition(pos) {
    if (!this.active || !pos) return;

    const snap = this.snapToPath(pos.lat, pos.lng);
    this.traveledMeters = Math.min(snap.distanceAlongMeters, this.totalMeters);
    this.segmentIndex = snap.segmentIndex;

    this.breadcrumb.push({
      lat: pos.lat,
      lng: pos.lng,
      t: pos.timestamp || Date.now(),
    });
    if (this.breadcrumb.length > 500) this.breadcrumb.shift();

    const db = window.RoadDatabase;
    const distToDestKm = db
      ? db.getHaversineDistance(pos.lat, pos.lng, this.destination.lat, this.destination.lng)
      : 999;
    const distToDestM = distToDestKm * 1000;

    const progressPct = this.totalMeters > 0
      ? Math.min(100, (this.traveledMeters / this.totalMeters) * 100)
      : 0;
    const remainingM = Math.max(0, this.totalMeters - this.traveledMeters);

    const elapsedSec = (Date.now() - this.startedAt) / 1000;
    const speedMps =
      pos.speed != null && pos.speed > 0
        ? pos.speed
        : elapsedSec > 5
          ? this.traveledMeters / elapsedSec
          : 0;

    const etaSeconds =
      speedMps > 0.8 ? Math.round(remainingM / speedMps) : null;

    const arrived = distToDestM <= this.arrivalRadiusM || progressPct >= 98;
    const offRoute = snap.offRouteMeters > this.offRouteThresholdM;

    const state = {
      raw: pos,
      snap,
      progressPct: parseFloat(progressPct.toFixed(1)),
      traveledKm: parseFloat((this.traveledMeters / 1000).toFixed(2)),
      remainingKm: parseFloat((remainingM / 1000).toFixed(2)),
      totalKm: parseFloat((this.totalMeters / 1000).toFixed(1)),
      distToDestKm: parseFloat(distToDestKm.toFixed(2)),
      elapsedSec: Math.round(elapsedSec),
      etaSeconds,
      speedKmh: speedMps > 0 ? parseFloat((speedMps * 3.6).toFixed(1)) : 0,
      offRoute,
      arrived,
      heading: pos.heading,
      accuracy: pos.accuracy,
      breadcrumb: [...this.breadcrumb],
    };

    if (this.onProgress) this.onProgress(state);
    return state;
  },

  pathLengthMeters(path) {
    const db = window.RoadDatabase;
    if (!db || path.length < 2) return 0;
    let m = 0;
    for (let i = 0; i < path.length - 1; i++) {
      m += db.getHaversineDistance(path[i][0], path[i][1], path[i + 1][0], path[i + 1][1]) * 1000;
    }
    return m;
  },

  snapToPath(lat, lng) {
    const path = this.routePath;
    const db = window.RoadDatabase;
    if (!db || path.length < 2) {
      return {
        lat,
        lng,
        distanceAlongMeters: 0,
        segmentIndex: 0,
        offRouteMeters: 0,
      };
    }

    let bestOffKm = Infinity;
    let bestAlongM = 0;
    let bestLat = lat;
    let bestLng = lng;
    let bestSeg = 0;
    let accumulatedM = 0;

    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];
      const proj = this._projectOnSegment(lat, lng, a[0], a[1], b[0], b[1]);
      const offKm = db.getHaversineDistance(lat, lng, proj.lat, proj.lng);
      const segLenM =
        db.getHaversineDistance(a[0], a[1], b[0], b[1]) * 1000;
      const alongSegM =
        db.getHaversineDistance(a[0], a[1], proj.lat, proj.lng) * 1000;
      const alongM = accumulatedM + Math.min(alongSegM, segLenM);

      if (offKm < bestOffKm) {
        bestOffKm = offKm;
        bestAlongM = alongM;
        bestLat = proj.lat;
        bestLng = proj.lng;
        bestSeg = i;
      }
      accumulatedM += segLenM;
    }

    return {
      lat: bestLat,
      lng: bestLng,
      distanceAlongMeters: bestAlongM,
      segmentIndex: bestSeg,
      offRouteMeters: bestOffKm * 1000,
    };
  },

  _projectOnSegment(lat, lng, lat1, lng1, lat2, lng2) {
    const dx = lng2 - lng1;
    const dy = lat2 - lat1;
    if (dx === 0 && dy === 0) {
      return { lat: lat1, lng: lng1, t: 0 };
    }
    const t = Math.max(
      0,
      Math.min(1, ((lng - lng1) * dx + (lat - lat1) * dy) / (dx * dx + dy * dy))
    );
    return {
      lat: lat1 + t * dy,
      lng: lng1 + t * dx,
      t,
    };
  },

  getTraveledPath(snap) {
    const path = this.routePath;
    if (!snap || path.length < 2) return [];
    const traveled = path.slice(0, snap.segmentIndex + 1);
    traveled.push([snap.lat, snap.lng]);
    return traveled;
  },

  getRemainingPath(snap) {
    const path = this.routePath;
    if (!snap || !path.length) return path;
    const remaining = [[snap.lat, snap.lng]];
    for (let i = snap.segmentIndex + 1; i < path.length; i++) {
      remaining.push(path[i]);
    }
    return remaining;
  },

  formatDuration(seconds) {
    if (seconds == null || seconds < 0) return "—";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m} min`;
  },
};

window.TripTracker = TripTracker;
