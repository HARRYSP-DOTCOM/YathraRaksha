/**
 * Live geolocation — watchPosition with throttled callbacks for complaint pins.
 */
const LocationService = {
  watchId: null,
  lastPosition: null,
  listeners: [],
  minMoveMeters: 8,
  lastEmitTime: 0,
  minIntervalMs: 2000,
  tripMode: false,
  tripMinMoveMeters: 3,
  tripMinIntervalMs: 800,

  setTripMode(enabled) {
    this.tripMode = !!enabled;
  },

  onUpdate(fn) {
    if (typeof fn === "function") this.listeners.push(fn);
    if (this.lastPosition) fn(this.lastPosition, null);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  },

  _emit(pos, err) {
    this.listeners.forEach((fn) => {
      try {
        fn(pos, err);
      } catch (e) {
        console.warn("Location listener error:", e);
      }
    });
  },

  _distanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  },

  _shouldEmit(next) {
    const now = Date.now();
    if (!this.lastPosition) return true;
    const minInterval = this.tripMode ? this.tripMinIntervalMs : this.minIntervalMs;
    const minMove = this.tripMode ? this.tripMinMoveMeters : this.minMoveMeters;
    if (now - this.lastEmitTime < minInterval) return false;
    const moved = this._distanceMeters(
      this.lastPosition.lat,
      this.lastPosition.lng,
      next.lat,
      next.lng
    );
    return moved >= minMove;
  },

  _parsePosition(pos) {
    return {
      lat: parseFloat(pos.coords.latitude.toFixed(6)),
      lng: parseFloat(pos.coords.longitude.toFixed(6)),
      accuracy: Math.round(pos.coords.accuracy),
      heading: pos.coords.heading,
      speed: pos.coords.speed,
      timestamp: pos.timestamp,
    };
  },

  start() {
    if (!navigator.geolocation) {
      this._emit(null, { code: "UNSUPPORTED", message: "Geolocation not supported" });
      return false;
    }
    if (this.watchId !== null) return true;

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const parsed = this._parsePosition(pos);
        if (!this._shouldEmit(parsed) && this.lastPosition) return;
        this.lastPosition = parsed;
        this.lastEmitTime = Date.now();
        this._emit(parsed, null);
      },
      (err) => {
        this._emit(null, err);
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 }
    );
    return true;
  },

  stop() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  },

  requestOnce() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject({ code: "UNSUPPORTED", message: "Geolocation not supported" });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const parsed = this._parsePosition(pos);
          this.lastPosition = parsed;
          this.lastEmitTime = Date.now();
          resolve(parsed);
        },
        (err) => reject(err),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
      );
    });
  },
};

window.LocationService = LocationService;
