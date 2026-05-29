/**
 * YatraRaksha Environment & Config Security Hardening Layer
 * Validates frontend environment settings and dynamically checks for credential leaks.
 */

function resolveApiBaseUrl() {
  if (window.ENV_API_URL) return window.ENV_API_URL;
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return "http://127.0.0.1:8000/v1";
  }
  return "https://api.yatra-raksha.local/v1";
}

const AppConfig = {
  API_BASE_URL: resolveApiBaseUrl(),
  APP_ENV: window.ENV_MODE || "production",
  
  // Security validation checks on boot
  validate() {
    console.log("🔒 Running YatraRaksha Startup Configuration Audit...");
    
    // Check if any secrets are leaked in client code namespaces
    const forbiddenPatterns = [
      /supabaseKey/i, /supabaseSecret/i, /api_key/i, /private_key/i,
      /secret/i, /password/i, /token/i
    ];
    
    let leaksDetected = false;
    
    // Scan global window object properties for potential leaks
    for (const key in window) {
      if (forbiddenPatterns.some(p => p.test(key))) {
        const val = window[key];
        if (val && typeof val === 'string' && val.length > 8) {
          console.warn(`🚨 SECURITY WARNING: Potential secret leak detected in global namespace: "${key}"`);
          leaksDetected = true;
        }
      }
    }
    
    if (leaksDetected) {
      console.warn("⚠️ Security Audit: Hardcoded credential patterns found in runtime. Ensure secrets are kept in secure backend environments.");
    } else {
      console.log("✅ Startup Audit: No global namespace secret leaks detected.");
    }
    
    // Enforce HTTPS in production environments
    if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      console.warn("🚨 insecure connection: Redirecting to HTTPS...");
      window.location.replace(`https://${window.location.host}${window.location.pathname}${window.location.search}`);
    }
  }
};

window.AppConfig = AppConfig;
AppConfig.validate();
