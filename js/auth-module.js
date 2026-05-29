/**
 * YatraRaksha Access Gate — captcha verification (replaces email/password login).
 * Keeps AuthModule name so the rest of the app continues to work.
 */

const AuthModule = {
  currentUser: null,
  SESSION_KEY: "yatra_raksha_captcha_session",
  TOKEN_KEY: "yatra_raksha_access_token",

  get apiBase() {
    return (window.AppConfig && window.AppConfig.API_BASE_URL) || "http://127.0.0.1:8000/v1";
  },

  init() {
    this.restoreSession();
    window.addEventListener("access:verified", () => {
      console.log("Human verification passed");
    });
    window.addEventListener("access:revoked", () => {
      console.log("Access revoked");
    });
  },

  restoreSession() {
    const session = localStorage.getItem(this.SESSION_KEY);
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (session && token) {
      try {
        this.currentUser = JSON.parse(session);
        return true;
      } catch {
        this.logout();
      }
    }
    return false;
  },

  isAuthenticated() {
    return this.currentUser !== null && !!this.getToken();
  },

  getUser() {
    return this.currentUser;
  },

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  async fetchChallenge() {
    const response = await fetch(`${this.apiBase}/captcha/challenge`);
    if (!response.ok) throw new Error("Could not load captcha");
    return response.json();
  },

  async verifyCaptcha(challengeId, answer, honeypot = "") {
    try {
      const response = await fetch(`${this.apiBase}/captcha/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, answer, honeypot }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const detail = err.detail;
        throw new Error(typeof detail === "string" ? detail : "Verification failed");
      }

      const data = await response.json();
      this.setSession(data.token);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  setSession(token) {
    this.currentUser = {
      id: "citizen_" + Date.now(),
      name: "Verified Citizen",
      role: "citizen",
      verifiedAt: new Date().toISOString(),
    };
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(this.currentUser));
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem("yatra_raksha_auth_token", token);
    window.dispatchEvent(new CustomEvent("access:verified", { detail: { user: this.currentUser } }));
  },

  logout() {
    this.currentUser = null;
    localStorage.removeItem(this.SESSION_KEY);
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem("yatra_raksha_auth_token");
    localStorage.removeItem("yatra_raksha_user_session");
    window.dispatchEvent(new CustomEvent("access:revoked"));
  },
};

window.AuthModule = AuthModule;
AuthModule.init();
