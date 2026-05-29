/**
 * YatraRaksha PWA — install prompt, updates, offline UI, iOS hints.
 */

const PWAManager = {
  deferredInstallPrompt: null,

  init() {
    this.registerServiceWorkerUpdates();
    this.bindInstallPrompt();
    this.bindOfflineSync();
    this.detectStandalone();
    this.showIosInstallHint();
  },

  registerServiceWorkerUpdates() {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "SYNC_OFFLINE_QUEUE" && window.RoadTracker?.syncOfflineQueue) {
        window.RoadTracker.syncOfflineQueue();
      }
    });

    navigator.serviceWorker.ready.then((reg) => {
      reg.addEventListener("updatefound", () => {
        const worker = reg.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            this.showUpdateBar(reg);
          }
        });
      });
    });
  },

  showUpdateBar(registration) {
    let bar = document.getElementById("pwa-update-bar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "pwa-update-bar";
      bar.className = "pwa-update-bar";
      bar.innerHTML = `
        <span>A new version of YatraRaksha is ready.</span>
        <button type="button" class="btn btn-primary btn-sm" id="pwa-update-btn">Update</button>
      `;
      document.body.appendChild(bar);
      document.getElementById("pwa-update-btn").addEventListener("click", () => {
        registration.waiting?.postMessage({ type: "SKIP_WAITING" });
        window.location.reload();
      });
    }
    bar.hidden = false;
  },

  bindInstallPrompt() {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      const card = document.getElementById("pwa-install-card");
      if (card) card.style.display = "block";
    });

    window.addEventListener("appinstalled", () => {
      this.deferredInstallPrompt = null;
      const card = document.getElementById("pwa-install-card");
      if (card) card.style.display = "none";
      window.App?.showToast?.("YatraRaksha installed on your device.");
    });

    const btn = document.getElementById("btn-pwa-install");
    if (btn) {
      btn.addEventListener("click", () => this.promptInstall());
    }
  },

  async promptInstall() {
    if (!this.deferredInstallPrompt) {
      window.App?.showToast?.("Use your browser menu: Install app / Add to Home Screen.");
      return;
    }
    this.deferredInstallPrompt.prompt();
    const { outcome } = await this.deferredInstallPrompt.userChoice;
    if (outcome === "accepted") {
      document.getElementById("pwa-install-card").style.display = "none";
      window.App?.showToast?.("Installing YatraRaksha…");
    }
    this.deferredInstallPrompt = null;
  },

  bindOfflineSync() {
    const setOnline = () => {
      document.documentElement.classList.remove("is-offline");
      if (navigator.onLine && window.RoadTracker?.syncOfflineQueue) {
        window.RoadTracker.syncOfflineQueue();
      }
      if ("serviceWorker" in navigator && "sync" in window.ServiceWorkerRegistration?.prototype) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.sync?.register("sync-complaints").catch(() => {});
        });
      }
    };

    const setOffline = () => {
      document.documentElement.classList.add("is-offline");
    };

    window.addEventListener("online", setOnline);
    window.addEventListener("offline", setOffline);
    if (!navigator.onLine) setOffline();
    else setOnline();

    document.getElementById("pwa-offline-bar")?.remove();
  },

  detectStandalone() {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    if (standalone) {
      document.documentElement.classList.add("pwa-standalone");
      const card = document.getElementById("pwa-install-card");
      if (card) card.style.display = "none";
    }
  },

  showIosInstallHint() {
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = window.navigator.standalone === true;
    if (!isIos || standalone) return;

    const card = document.getElementById("pwa-install-card");
    if (card) {
      card.style.display = "block";
      const p = card.querySelector("p");
      if (p) {
        p.textContent =
          "Tap Share, then “Add to Home Screen” to install YatraRaksha on iOS.";
      }
    }
  },
};

window.PWAManager = PWAManager;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => PWAManager.init());
} else {
  PWAManager.init();
}
