/**
 * YatraRaksha Storage Optimization Module
 * Implements efficient localStorage/IndexedDB management with compression.
 */

const StorageOptimizer = {
  DB_NAME: "yatra_raksha_db",
  DB_VERSION: 1,
  STORES: {
    reports: "reports",
    media: "media",
    cache: "cache"
  },
  db: null,

  /**
   * Initialize IndexedDB
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        this.db = request.result;
        console.log("✅ IndexedDB initialized");
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores
        if (!db.objectStoreNames.contains(this.STORES.reports)) {
          db.createObjectStore(this.STORES.reports, { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains(this.STORES.media)) {
          db.createObjectStore(this.STORES.media, { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains(this.STORES.cache)) {
          db.createObjectStore(this.STORES.cache, { keyPath: "key" });
        }

        console.log("✅ IndexedDB stores created");
      };
    });
  },

  /**
   * Save to IndexedDB
   */
  async saveToIDB(storeName, data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve(data);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Get from IndexedDB
   */
  async getFromIDB(storeName, key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Get all from IndexedDB
   */
  async getAllFromIDB(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Delete from IndexedDB
   */
  async deleteFromIDB(storeName, key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Compress string using LZ compression (simple implementation)
   */
  compressString(str) {
    // Simple LZ compression
    let result = "";
    let dict = {};
    let dictSize = 256;

    for (let i = 0; i < 256; i++) {
      dict[String.fromCharCode(i)] = i;
    }

    let w = "";
    for (let i = 0; i < str.length; i++) {
      const c = str.charAt(i);
      const wc = w + c;
      if (dict.hasOwnProperty(wc)) {
        w = wc;
      } else {
        result += String.fromCharCode(dict[w]);
        dict[wc] = dictSize;
        dictSize++;
        w = String(c);
      }
    }

    if (w !== "") {
      result += String.fromCharCode(dict[w]);
    }

    return result;
  },

  /**
   * Decompress string
   */
  decompressString(str) {
    let dict = {};
    let dictSize = 256;

    for (let i = 0; i < 256; i++) {
      dict[i] = String.fromCharCode(i);
    }

    let result = "";
    let w = dict[str.charCodeAt(0)];
    result += w;

    for (let i = 1; i < str.length; i++) {
      const k = str.charCodeAt(i);
      let entry = "";

      if (dict.hasOwnProperty(k)) {
        entry = dict[k];
      } else if (k === dictSize) {
        entry = w + w.charAt(0);
      }

      result += entry;
      dict[dictSize] = w + entry.charAt(0);
      dictSize++;
      w = entry;
    }

    return result;
  },

  /**
   * Get storage quota
   */
  async getStorageQuota() {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage;
      const quota = estimate.quota;
      const percentUsed = ((usage / quota) * 100).toFixed(2);

      return {
        usage,
        quota,
        percentUsed,
        available: quota - usage,
        formattedUsage: this.formatBytes(usage),
        formattedQuota: this.formatBytes(quota),
        formattedAvailable: this.formatBytes(quota - usage)
      };
    }
    return null;
  },

  /**
   * Clear old cached data
   */
  async clearOldCache(daysOld = 7) {
    const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;
    const items = await this.getAllFromIDB(this.STORES.cache);

    let cleared = 0;
    for (const item of items) {
      if (item.timestamp && item.timestamp < cutoffTime) {
        await this.deleteFromIDB(this.STORES.cache, item.key);
        cleared++;
      }
    }

    console.log(`🗑️ Cleared ${cleared} old cache items`);
    return cleared;
  },

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  }
};

// Initialize storage optimizer
StorageOptimizer.init().catch(console.error);

window.StorageOptimizer = StorageOptimizer;
