/**
 * YatraRaksha PWA Service Worker
 * App shell caching, offline navigation, API network-only, push notifications.
 */

const CACHE_VERSION = "yatra-raksha-v2";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./offline.html",
  "./manifest.json",
  "./css/styles.css",
  "./css/welcome.css",
  "./css/captcha-gate.css",
  "./js/captcha-gate-ui.js",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./js/config-env.js",
  "./js/database.js",
  "./js/storage-optimizer.js",
  "./js/auth-module.js",
  "./js/api-service.js",
  "./js/image-compressor.js",
  "./js/push-notifications.js",
  "./js/pwa-install.js",
  "./js/ai-engine.js",
  "./js/location-service.js",
  "./js/chatbot-responses.js",
  "./js/route-planner.js",
  "./js/trip-tracker.js",
  "./js/map-hub.js",
  "./js/tracker.js",
  "./js/app.js",
];

const CDN_ASSETS = [
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
  "https://cdn.jsdelivr.net/npm/chart.js",
];

const isApiRequest = (url) =>
  url.includes("/v1/") ||
  url.includes("127.0.0.1:8000") ||
  url.includes("localhost:8000") ||
  url.includes("api.yatra-raksha.local");

const isMapTile = (url) =>
  url.includes("tile.openstreetmap.org") ||
  url.includes("basemaps.cartocdn.com") ||
  url.includes("arcgisonline.com");

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll([...APP_SHELL, ...CDN_ASSETS]))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn("[SW] precache partial fail:", err))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("yatra-raksha") && !key.includes(CACHE_VERSION))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok && request.method === "GET") {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === "navigate") {
      return (await caches.match("./index.html")) || (await caches.match("./offline.html"));
    }
    throw new Error("offline");
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = request.url;

  if (request.method !== "GET") return;

  if (isApiRequest(url)) {
    event.respondWith(fetch(request).catch(() => new Response(JSON.stringify({ offline: true }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    })));
    return;
  }

  if (isMapTile(url)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).catch(() => new Response("", { status: 404 })))
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (
    url.includes(self.location.origin) ||
    url.includes("leaflet") ||
    url.includes("chart.js") ||
    url.endsWith(".js") ||
    url.endsWith(".css") ||
    url.endsWith(".png") ||
    url.endsWith(".svg")
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});

self.addEventListener("push", (event) => {
  let data = { title: "YatraRaksha", body: "You have a new update." };
  try {
    if (event.data) data = event.data.json();
  } catch {
    if (event.data) data.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "YatraRaksha", {
      body: data.body || "",
      icon: "./icons/icon-192.png",
      badge: "./icons/icon-192.png",
      tag: data.tag || "yatra-raksha",
      data: data.data || {},
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "./index.html";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-complaints") {
    event.waitUntil(
      clients.matchAll().then((list) => {
        list.forEach((client) => client.postMessage({ type: "SYNC_OFFLINE_QUEUE" }));
      })
    );
  }
});
