/**
 * YatraRaksha Environment & API configuration
 */

function resolveApiBaseUrl() {
  if (window.ENV_API_URL) return window.ENV_API_URL;
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return "http://127.0.0.1:8000/v1";
  }
  if (window.location.hostname.includes("vercel.app")) {
    return `${window.location.origin}/v1`;
  }
  return `${window.location.origin}/v1`;
}

const AppConfig = {
  API_BASE_URL: resolveApiBaseUrl(),
  APP_ENV: window.ENV_MODE || "production",

  validate() {
    console.log("🔒 YatraRaksha config — API:", this.API_BASE_URL);
    if (
      window.location.protocol === "http:" &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      console.warn("🚨 Insecure connection — prefer HTTPS in production.");
    }
  },
};

window.AppConfig = AppConfig;
AppConfig.validate();
