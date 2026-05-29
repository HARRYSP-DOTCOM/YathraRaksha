/**
 * YatraRaksha Authentication Module
 * Handles user authentication, session management, and role-based access.
 */

const AuthModule = {
  currentUser: null,
  SESSION_KEY: "yatra_raksha_user_session",
  TOKEN_KEY: "yatra_raksha_auth_token",

  /**
   * Initialize auth module
   */
  init() {
    this.restoreSession();
    this.setupAuthListeners();
  },

  /**
   * Restore session from storage
   */
  restoreSession() {
    const session = localStorage.getItem(this.SESSION_KEY);
    if (session) {
      try {
        this.currentUser = JSON.parse(session);
        return true;
      } catch (e) {
        console.error("Failed to restore session:", e);
        this.logout();
      }
    }
    return false;
  },

  /**
   * User login
   */
  async login(email, password) {
    try {
      // For MVP: Simulated backend call
      // In production, replace with actual API call
      const response = await fetch("https://api.yatra-raksha.local/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      }).catch(() => {
        // Fallback to mock authentication for demo
        return {
          ok: true,
          json: async () => ({
            user: {
              id: "user_" + Date.now(),
              email: email,
              name: email.split("@")[0],
              role: "citizen",
              createdAt: new Date().toISOString()
            },
            token: "mock_token_" + Date.now(),
            expiresIn: 86400
          })
        };
      });

      if (!response.ok) {
        throw new Error("Invalid credentials");
      }

      const data = await response.json();
      this.setSession(data.user, data.token);
      return { success: true, user: data.user };
    } catch (error) {
      console.error("Login failed:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * User signup
   */
  async signup(email, password, name) {
    try {
      const response = await fetch("https://api.yatra-raksha.local/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name })
      }).catch(() => {
        // Fallback to mock registration
        return {
          ok: true,
          json: async () => ({
            user: {
              id: "user_" + Date.now(),
              email: email,
              name: name,
              role: "citizen",
              createdAt: new Date().toISOString()
            },
            token: "mock_token_" + Date.now()
          })
        };
      });

      if (!response.ok) {
        throw new Error("Signup failed");
      }

      const data = await response.json();
      this.setSession(data.user, data.token);
      return { success: true, user: data.user };
    } catch (error) {
      console.error("Signup failed:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Set session
   */
  setSession(user, token) {
    this.currentUser = user;
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(user));
    localStorage.setItem(this.TOKEN_KEY, token);
    window.dispatchEvent(new CustomEvent("auth:login", { detail: { user } }));
  },

  /**
   * Logout user
   */
  logout() {
    this.currentUser = null;
    localStorage.removeItem(this.SESSION_KEY);
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem("yatra_raksha_auth_token");
    window.dispatchEvent(new CustomEvent("auth:logout"));
  },

  /**
   * Check if user is logged in
   */
  isAuthenticated() {
    return this.currentUser !== null && this.getToken() !== null;
  },

  /**
   * Get current user
   */
  getUser() {
    return this.currentUser;
  },

  /**
   * Get auth token
   */
  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  /**
   * Check if user has role
   */
  hasRole(role) {
    return this.currentUser && this.currentUser.role === role;
  },

  /**
   * Setup auth event listeners
   */
  setupAuthListeners() {
    window.addEventListener("auth:login", () => {
      console.log("✅ User logged in:", this.currentUser?.email);
    });

    window.addEventListener("auth:logout", () => {
      console.log("👋 User logged out");
    });
  },

  /**
   * Refresh token
   */
  async refreshToken() {
    try {
      const response = await fetch("https://api.yatra-raksha.local/v1/auth/refresh", {
        method: "POST",
        headers: { "Authorization": `Bearer ${this.getToken()}` }
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem(this.TOKEN_KEY, data.token);
        return true;
      }
    } catch (error) {
      console.error("Token refresh failed:", error);
    }
    return false;
  }
};

window.AuthModule = AuthModule;
AuthModule.init();
