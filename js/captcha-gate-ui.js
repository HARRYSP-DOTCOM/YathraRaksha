/**
 * Captcha verification gate — blocks dashboard until verified.
 */

const CaptchaGateUI = {
  challengeId: null,
  loading: false,

  init() {
    this.overlay = document.getElementById("captcha-gate");
    if (!this.overlay) return;

    this.svgHost = document.getElementById("captcha-svg-host");
    this.input = document.getElementById("captcha-answer");
    this.errorEl = document.getElementById("captcha-error");
    this.submitBtn = document.getElementById("captcha-submit");
    this.refreshBtn = document.getElementById("captcha-refresh");
    this.honeypot = document.getElementById("captcha-honeypot");

    this.refreshBtn?.addEventListener("click", () => this.loadChallenge());
    this.submitBtn?.addEventListener("click", () => this.submit());
    this.input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.submit();
    });

    window.addEventListener("access:revoked", () => this.onAccessRevoked());

    if (AuthModule.isAuthenticated()) {
      this.grantAccess();
      this.hide();
    } else {
      this.show();
      this.loadChallenge();
    }
  },

  grantAccess() {
    document.body.classList.add("access-granted");
  },

  revokeAccess() {
    document.body.classList.remove("access-granted");
  },

  onAccessRevoked() {
    this.revokeAccess();
    this.show();
    this.loadChallenge();
  },

  show() {
    if (!this.overlay) return;
    this.overlay.removeAttribute("hidden");
    this.overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("captcha-active");
    this.revokeAccess();
  },

  hide() {
    if (!this.overlay) return;
    this.overlay.setAttribute("hidden", "");
    this.overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("captcha-active");
  },

  setError(message) {
    if (!this.errorEl) return;
    this.errorEl.textContent = message || "";
    this.errorEl.hidden = !message;
    this.overlay?.classList.toggle("captcha-gate--error", !!message);
  },

  setLoading(on) {
    this.loading = on;
    if (this.submitBtn) this.submitBtn.disabled = on;
    if (this.refreshBtn) this.refreshBtn.disabled = on;
    if (this.input) this.input.disabled = on;
    this.overlay?.classList.toggle("captcha-gate--loading", on);
  },

  async loadChallenge() {
    this.setError("");
    this.setLoading(true);
    if (this.svgHost) {
      this.svgHost.innerHTML = '<div class="captcha-skeleton" aria-hidden="true"></div>';
    }

    try {
      const data = await AuthModule.fetchChallenge();
      this.challengeId = data.challengeId;
      if (this.svgHost) this.svgHost.innerHTML = data.svg;
      if (this.input) {
        this.input.value = "";
        this.input.focus();
      }
    } catch {
      this.setError("Could not reach the verification server. Start the API and try again.");
      if (this.svgHost) {
        this.svgHost.innerHTML =
          '<p class="captcha-fallback-msg">Offline — start backend at <code>127.0.0.1:8000</code></p>';
      }
    } finally {
      this.setLoading(false);
    }
  },

  async submit() {
    if (this.loading || !this.challengeId) return;

    const answer = this.input?.value?.trim();
    if (!answer) {
      this.setError("Enter the characters shown in the image.");
      return;
    }

    this.setLoading(true);
    this.setError("");

    const honeypot = this.honeypot?.value || "";
    const result = await AuthModule.verifyCaptcha(this.challengeId, answer, honeypot);

    this.setLoading(false);

    if (result.success) {
      this.grantAccess();
      this.hide();
      window.App?.showToast?.("Verified — opening dashboard.");
      if (window.App?.launchDashboard) {
        window.App.launchDashboard();
      }
      return;
    }

    this.setError(result.error || "Verification failed.");
    this.overlay?.querySelector(".captcha-card")?.classList.add("shake");
    setTimeout(() => {
      this.overlay?.querySelector(".captcha-card")?.classList.remove("shake");
    }, 500);
    await this.loadChallenge();
  },

  requireVerification() {
    this.show();
    if (!this.challengeId) this.loadChallenge();
  },
};

window.CaptchaGateUI = CaptchaGateUI;

document.addEventListener("DOMContentLoaded", () => CaptchaGateUI.init());
