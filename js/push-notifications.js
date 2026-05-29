/**
 * YatraRaksha Push Notifications Module
 * Handles Web Push API for real-time status updates on complaints.
 */

const PushNotificationService = {
  NOTIFICATION_PERMISSION_KEY: "yatra_raksha_push_permission",
  SERVICE_WORKER_READY: false,

  /**
   * Initialize push notifications
   */
  async init() {
    if (!("serviceWorker" in navigator)) {
      console.warn("Service Workers not supported");
      return false;
    }

    if (!("PushManager" in window)) {
      console.warn("Push notifications not supported");
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      this.SERVICE_WORKER_READY = true;
      console.log("✅ Push Notifications initialized");
      return true;
    } catch (error) {
      console.error("Failed to initialize push notifications:", error);
      return false;
    }
  },

  /**
   * Request notification permission
   */
  async requestPermission() {
    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission !== "denied") {
      try {
        const permission = await Notification.requestPermission();
        localStorage.setItem(this.NOTIFICATION_PERMISSION_KEY, permission);
        return permission === "granted";
      } catch (error) {
        console.error("Failed to request notification permission:", error);
        return false;
      }
    }

    return false;
  },

  /**
   * Send local notification
   */
  async sendNotification(title, options = {}) {
    if (Notification.permission !== "granted") {
      console.warn("Notification permission not granted");
      return false;
    }

    try {
      const defaults = {
        icon: "https://cdn-icons-png.flaticon.com/512/1048/1048329.png",
        badge: "https://cdn-icons-png.flaticon.com/512/1048/1048329.png",
        tag: "yatra-raksha-notification",
        requireInteraction: true,
        ...options
      };

      if (this.SERVICE_WORKER_READY) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, defaults);
      } else {
        new Notification(title, defaults);
      }

      return true;
    } catch (error) {
      console.error("Failed to send notification:", error);
      return false;
    }
  },

  /**
   * Subscribe to push notifications (for server-side pushes)
   */
  async subscribeToPush(publicKey) {
    if (!this.SERVICE_WORKER_READY) {
      throw new Error("Service Worker not ready");
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(publicKey)
      });

      console.log("✅ Subscribed to push notifications");
      return subscription;
    } catch (error) {
      console.error("Failed to subscribe to push:", error);
      throw error;
    }
  },

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribFromPush() {
    if (!this.SERVICE_WORKER_READY) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        console.log("✅ Unsubscribed from push notifications");
        return true;
      }
    } catch (error) {
      console.error("Failed to unsubscribe:", error);
    }

    return false;
  },

  /**
   * Notify complaint status change
   */
  async notifyComplaintUpdate(complaintId, status, message) {
    const title = "🎉 Complaint Update";
    const options = {
      body: `[${complaintId.substring(0, 8)}] Status: ${status}\n${message}`,
      tag: `complaint-${complaintId}`,
      data: { complaintId, status }
    };

    return this.sendNotification(title, options);
  },

  /**
   * Notify defect verified
   */
  async notifyDefectVerified(defectType, location) {
    const title = "✅ Defect Verified";
    const options = {
      body: `${defectType} detected at ${location}. File your complaint now!`,
      tag: "defect-verified"
    };

    return this.sendNotification(title, options);
  },

  /**
   * Notify sync complete
   */
  async notifySyncComplete(syncedCount) {
    const title = "⚡ Offline Queue Synced";
    const options = {
      body: `${syncedCount} complaint(s) synced successfully!`,
      tag: "sync-complete"
    };

    return this.sendNotification(title, options);
  },

  /**
   * Notify network status
   */
  async notifyNetworkStatus(isOnline) {
    if (isOnline) {
      const title = "🟢 Back Online";
      const options = {
        body: "Connection restored. Syncing offline queue...",
        tag: "network-status"
      };
      return this.sendNotification(title, options);
    } else {
      const title = "🔴 Offline Mode";
      const options = {
        body: "No internet connection. Your data is saved locally.",
        tag: "network-status"
      };
      return this.sendNotification(title, options);
    }
  },

  /**
   * Utility: Convert URL base64 to Uint8Array
   */
  urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }
};

window.PushNotificationService = PushNotificationService;
PushNotificationService.init();
