/**
 * YatraRaksha PWA Service Worker (sw.js)
 * Caches essential shell scripts, stylesheets, interactive chart resources,
 * map styles, and static vectors to deliver offline capability.
 */

const CACHE_NAME = "yatra-raksha-cache-v1";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/styles.css",
  "./js/app.js",
  "./js/database.js",
  "./js/ai-engine.js",
  "./js/map-hub.js",
  "./js/tracker.js",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
  "https://cdn.jsdelivr.net/npm/chart.js"
];

// Install Event
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Pre-caching Web Shell & Assets");
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Removing deprecated cache:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Interceptor (Offline-First strategy)
self.addEventListener("fetch", (e) => {
  // Bypassing network log caches or third party tile servers that might fail offline dynamically
  if (e.request.url.includes("tile.openstreetmap.org") || e.request.url.includes("basemaps.cartocdn.com")) {
    // Serve from cache if exists, otherwise try network but don't crash
    e.respondWith(
      caches.match(e.request).then((cachedResponse) => {
        return cachedResponse || fetch(e.request).catch(() => {
          // Serve a silent mock grid tile or fall back quietly
          return new Response("", { status: 404 });
        });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse; // Return cached asset
      }
      return fetch(e.request).then((networkResponse) => {
        // Cache dynamic third party scripts if loaded successfully
        if (
          networkResponse.status === 200 &&
          (e.request.url.includes("leaflet") || e.request.url.includes("chart.js"))
        ) {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, networkResponse.clone());
            return networkResponse;
          });
        }
        return networkResponse;
      });
    }).catch(() => {
      // Offline fallback for main page
      if (e.request.mode === "navigate") {
        return caches.match("./index.html");
      }
    })
  );
});
