/**
 * YatraRaksha Backend API Service
 * Handles all REST API communication with the backend server.
 * Includes retry logic, request queuing, and error handling.
 */

const APIService = {
  get BASE_URL() {
    return (window.AppConfig && window.AppConfig.API_BASE_URL) || "http://127.0.0.1:8000/v1";
  },
  TIMEOUT: 30000,
  MAX_RETRIES: 3,
  requestQueue: [],
  isOnline: navigator.onLine,

  /**
   * Initialize API service
   */
  init() {
    console.log("🔧 API Service base URL:", this.BASE_URL);
    window.addEventListener("online", () => {
      this.isOnline = true;
      this.processQueue();
      console.log("🟢 API Service: Online - Processing queued requests");
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
      console.log("🔴 API Service: Offline - Queueing requests");
    });
  },

  /**
   * Generic fetch wrapper with retry logic
   */
  async request(endpoint, options = {}) {
    const url = `${this.BASE_URL}${endpoint}`;
    const config = {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.getAuthToken()}`,
        ...options.headers
      },
      timeout: this.TIMEOUT,
      ...options
    };

    // Remove body for GET requests
    if (config.method === "GET") {
      delete config.body;
    }

    let lastError;
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, config);

        if (!response.ok) {
          if (response.status === 401) {
            this.clearAuthToken();
            throw new Error("Session expired — please sign in again");
          }
          throw new Error(`API Error: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        lastError = error;
        console.warn(`API request attempt ${attempt}/${this.MAX_RETRIES} failed:`, error.message);

        if (attempt < this.MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    // If offline, queue the request
    if (!this.isOnline) {
      this.requestQueue.push({ endpoint, options, retries: 0 });
      throw new Error("Request queued - will retry when online");
    }

    throw lastError || new Error("API request failed");
  },

  /**
   * Process queued requests when online
   */
  async processQueue() {
    while (this.requestQueue.length > 0 && this.isOnline) {
      const { endpoint, options } = this.requestQueue.shift();
      try {
        await this.request(endpoint, options);
      } catch (error) {
        console.error("Queued request failed:", error);
      }
    }
  },

  async checkDuplicate(lat, lng, defectType) {
    return this.request('/complaints/check-duplicate', {
      method: 'POST',
      body: JSON.stringify({ lat, lng, defectType })
    });
  },
  async supportComplaint(complaintId) {
    return this.request(`/complaints/${complaintId}/support`, { method: 'POST' });
  },

  /**
   * File complaint with AI report
   */
  async fileComplaint(complaint) {
    return this.request("/complaints", {
      method: "POST",
      body: JSON.stringify(complaint)
    });
  },

  /**
   * Get all complaints for user
   */
  async getComplaints(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    return this.request(`/complaints?${query}`);
  },

  /**
   * Get complaint details
   */
  async getComplaintDetails(complaintId) {
    return this.request(`/complaints/${complaintId}`);
  },

  /**
   * Update complaint status
   */
  async updateComplaintStatus(complaintId, status, message) {
    return this.request(`/complaints/${complaintId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, message })
    });
  },

  /**
   * Upload media to server
   */
  async uploadMedia(file, complaintId = null) {
    const formData = new FormData();
    formData.append("file", file);
    if (complaintId) formData.append("complaintId", complaintId);

    return fetch(`${this.BASE_URL}/media/upload`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.getAuthToken()}`
      },
      body: formData
    }).then(r => r.json());
  },

  /**
   * Get road database
   */
  async getRoads(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    return this.request(`/roads?${query}`);
  },

  /**
   * Get contractor rankings
   */
  async getContractors(sortBy = "rating") {
    return this.request(`/contractors?sortBy=${sortBy}`);
  },

  /**
   * Get budget audit data
   */
  async getBudgetAudit(roadId = null) {
    return this.request(`/audit/budget${roadId ? `?roadId=${roadId}` : ""}`);
  },

  /**
   * Sync offline queue with backend
   */
  async syncOfflineQueue() {
    const queue = JSON.parse(localStorage.getItem("yatra_raksha_offline_sync_queue") || "[]");
    if (queue.length === 0) return [];

    const synced = [];
    for (const item of queue) {
      try {
        const result = await this.request("/complaints/sync", {
          method: "POST",
          body: JSON.stringify(item)
        });
        synced.push(result);
      } catch (error) {
        console.error("Sync failed for item:", item, error);
      }
    }

    if (synced.length > 0) {
      const newQueue = queue.slice(synced.length);
      localStorage.setItem("yatra_raksha_offline_sync_queue", JSON.stringify(newQueue));
    }

    return synced;
  },

  /**
   * Auth token management
   */
  setAuthToken(token) {
    localStorage.setItem("yatra_raksha_auth_token", token);
  },

  getAuthToken() {
    return localStorage.getItem("yatra_raksha_auth_token") || "";
  },

  clearAuthToken() {
    localStorage.removeItem("yatra_raksha_auth_token");
  },
};

window.APIService = APIService;
APIService.init();
