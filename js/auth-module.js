/**
 * Lightweight client session for YatraRaksha (guest citizen profile).
 */

const AuthModule = {
  SESSION_KEY: "yatra_raksha_user_session",

  currentUser: null,

  init() {
    this.restoreSession();
  },

  restoreSession() {
    const raw = localStorage.getItem(this.SESSION_KEY);
    if (raw) {
      try {
        this.currentUser = JSON.parse(raw);
        return true;
      } catch {
        localStorage.removeItem(this.SESSION_KEY);
      }
    }
    this.currentUser = {
      id: "citizen_guest",
      name: "Citizen",
      role: "citizen",
    };
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(this.currentUser));
    return true;
  },

  isAuthenticated() {
    return this.currentUser !== null;
  },

  getUser() {
    return this.currentUser;
  },

  getToken() {
    return localStorage.getItem("yatra_raksha_auth_token") || "";
  },
};

window.AuthModule = AuthModule;
AuthModule.init();
