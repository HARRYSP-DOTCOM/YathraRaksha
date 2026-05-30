/**
 * Live geolocation — high-accuracy watch with smart filtering.
 */
const LocationService = {
  watchId: null,
  lastPosition: null,
  listeners: [],
  minMoveMeters: 3,
  lastEmitTime: 0,
  minIntervalMs: 1000,
  tripMode: false,
  tripMinMoveMeters: 2,
  tripMinIntervalMs: 500,
  /** Reject fixes worse than this unless we have nothing better */
  maxAcceptableAccuracyM: 150,

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
    if (pos) {
      window.dispatchEvent(new CustomEvent("yatra_live_location", { detail: pos }));
    }
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

  _isBetterFix(next, prev) {
    if (!prev) return true;
    const accNext = next.accuracy ?? 9999;
    const accPrev = prev.accuracy ?? 9999;
    // Sharper fix while standing still — still sync coords & nearest road
    if (accNext < accPrev - 3) return true;
    if (accNext > accPrev + 15) return false;
    const moved = this._distanceMeters(prev.lat, prev.lng, next.lat, next.lng);
    const minMove = this.tripMode ? this.tripMinMoveMeters : this.minMoveMeters;
    return moved >= minMove;
  },

  _shouldEmit(next, force = false) {
    if (force) return true;
    const now = Date.now();
    const minInterval = this.tripMode ? this.tripMinIntervalMs : this.minIntervalMs;
    if (!this.lastPosition) return true;
    if (!this._isBetterFix(next, this.lastPosition)) return false;
    if (now - this.lastEmitTime < minInterval) return false;
    return true;
  },

  _parsePosition(pos) {
    const acc = pos.coords.accuracy;
    return {
      lat: parseFloat(pos.coords.latitude.toFixed(6)),
      lng: parseFloat(pos.coords.longitude.toFixed(6)),
      accuracy: Number.isFinite(acc) ? Math.round(acc) : 9999,
      heading: Number.isFinite(pos.coords.heading) ? pos.coords.heading : null,
      speed: Number.isFinite(pos.coords.speed) ? pos.coords.speed : null,
      altitude: Number.isFinite(pos.coords.altitude) ? pos.coords.altitude : null,
      timestamp: pos.timestamp,
    };
  },

  _geoOptions(fresh = false) {
    return {
      enableHighAccuracy: true,
      maximumAge: fresh ? 0 : 500,
      timeout: fresh ? 25000 : 20000,
    };
  },

  _acceptAccuracy(parsed) {
    return parsed.accuracy <= this.maxAcceptableAccuracyM;
  },

  _handlePosition(pos, force = false) {
    const parsed = this._parsePosition(pos);
    if (!this._acceptAccuracy(parsed) && this.lastPosition && !force) {
      if (this.lastPosition.accuracy <= parsed.accuracy) return;
    }
    if (!this._shouldEmit(parsed, force) && this.lastPosition) return;
    this.lastPosition = parsed;
    this.lastEmitTime = Date.now();
    this._emit(parsed, null);
  },

  start() {
    if (!navigator.geolocation) {
      this._emit(null, { code: "UNSUPPORTED", message: "Geolocation not supported" });
      return false;
    }
    if (this.watchId !== null) return true;

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this._handlePosition(pos, false),
      (err) => this._emit(null, err),
      this._geoOptions(false)
    );
    return true;
  },

  stop() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  },

  /** Fresh high-accuracy fix (use when user taps "Use live GPS") */
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
          this._emit(parsed, null);
          resolve(parsed);
        },
        (err) => reject(err),
        this._geoOptions(true)
      );
    });
  },

  /** Try watch briefly then fall back to getCurrentPosition for best fix */
  async requestBestFix() {
    if (!navigator.geolocation) {
      throw { code: "UNSUPPORTED", message: "Geolocation not supported" };
    }

    try {
      const pos = await this.requestOnce();
      if (pos.accuracy <= 50) return pos;
    } catch {
      /* continue to watch fallback */
    }

    return new Promise((resolve, reject) => {
      let watchId = null;
      let best = null;
      const deadline = setTimeout(() => {
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        if (best) resolve(best);
        else reject({ code: "TIMEOUT", message: "Could not get accurate GPS fix" });
      }, 22000);

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const parsed = this._parsePosition(pos);
          if (!best || parsed.accuracy < best.accuracy) {
            best = parsed;
            this._handlePosition(pos, true);
          }
          if (parsed.accuracy <= 25) {
            clearTimeout(deadline);
            navigator.geolocation.clearWatch(watchId);
            resolve(parsed);
          }
        },
        (err) => {
          clearTimeout(deadline);
          if (watchId !== null) navigator.geolocation.clearWatch(watchId);
          if (best) resolve(best);
          else reject(err);
        },
        this._geoOptions(true)
      );
    });
  },
};

window.LocationService = LocationService;
