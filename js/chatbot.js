/**
 * YatraGPT — Groq-backed chat via FastAPI POST /v1/chat
 */
const YatraChatbot = {
  conversationHistory: [],
  maxHistory: 20,

  _formatTime() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  },

  _markdownLite(text) {
    if (!text) return "";
    const escaped = String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return escaped
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br>");
  },

  appendMessage(role, text, options = {}) {
    const box = document.getElementById("chat-box");
    if (!box) return;

    const isError = options.error === true;
    const wrap = document.createElement("div");
    wrap.className = `chat-bubble chat-bubble--${role}${isError ? " chat-bubble--error" : ""}`;

    const meta = document.createElement("div");
    meta.className = "chat-bubble-meta";
    meta.innerHTML = `<span class="chat-time">${this._formatTime()}</span>`;

    if (role === "assistant" && !isError) {
      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "chat-copy-btn";
      copyBtn.title = "Copy";
      copyBtn.textContent = "📋";
      copyBtn.addEventListener("click", () => {
        navigator.clipboard?.writeText(text).then(() => {
          window.App?.showToast?.("Copied to clipboard");
        });
      });
      meta.appendChild(copyBtn);
    }

    const body = document.createElement("div");
    body.className = "chat-bubble-body";
    body.innerHTML = this._markdownLite(text);

    wrap.appendChild(meta);
    wrap.appendChild(body);
    box.appendChild(wrap);
    box.scrollTop = box.scrollHeight;
  },

  showTypingIndicator() {
    const el = document.getElementById("typing-indicator");
    const box = document.getElementById("chat-box");
    if (el && box) {
      el.style.display = "flex";
      box.appendChild(el);
      box.scrollTop = box.scrollHeight;
    }
  },

  hideTypingIndicator() {
    const el = document.getElementById("typing-indicator");
    if (el) el.style.display = "none";
  },

  async sendToGroq(userMessage) {
    this.conversationHistory.push({ role: "user", content: userMessage });
    if (this.conversationHistory.length > this.maxHistory) {
      this.conversationHistory = this.conversationHistory.slice(-this.maxHistory);
    }

    const base =
      (window.AppConfig && window.AppConfig.API_BASE_URL) || "http://127.0.0.1:8000/v1";

    try {
      const res = await fetch(`${base}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: this.conversationHistory }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const reply = data.reply || data.response || "";
      this.conversationHistory.push({ role: "assistant", content: reply });
      if (this.conversationHistory.length > this.maxHistory) {
        this.conversationHistory = this.conversationHistory.slice(-this.maxHistory);
      }
      return reply;
    } catch (err) {
      console.warn("YatraGPT error:", err);
      return "YatraGPT is temporarily offline. Please try again in a moment.";
    }
  },

  async handleUserChatMessage() {
    const inputEl = document.getElementById("chat-input");
    if (!inputEl) return;

    const text = inputEl.value.trim();
    if (!text) return;
    if (text.length > 500) {
      window.App?.showToast?.("Message too long (max 500 characters)");
      return;
    }

    this.appendMessage("user", text);
    inputEl.value = "";
    this.updateCharCounter();
    this.showTypingIndicator();

    const reply = await this.sendToGroq(text);
    this.hideTypingIndicator();

    const isOffline = reply.includes("temporarily offline");
    this.appendMessage("assistant", reply, { error: isOffline });
  },

  updateCharCounter() {
    const inputEl = document.getElementById("chat-input");
    const counter = document.getElementById("chat-char-counter");
    if (!inputEl || !counter) return;
    counter.textContent = `${inputEl.value.length} / 500`;
  },

  clearChat() {
    this.conversationHistory = [];
    const box = document.getElementById("chat-box");
    if (box) box.innerHTML = "";
    this.showWelcome();
  },

  showWelcome() {
    this.appendMessage(
      "assistant",
      "👋 Hi! I'm YatraGPT. Ask me about road quality, contractor budgets, filing complaints, or safe routes."
    );
  },

  sendBotMessage(text) {
    const inputEl = document.getElementById("chat-input");
    if (inputEl) inputEl.value = text;
    this.handleUserChatMessage();
  },

  init() {
    const inputEl = document.getElementById("chat-input");
    if (inputEl) {
      inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.handleUserChatMessage();
        }
      });
      inputEl.addEventListener("input", () => this.updateCharCounter());
      this.updateCharCounter();
    }

    document.getElementById("chat-clear-btn")?.addEventListener("click", () => this.clearChat());

    const box = document.getElementById("chat-box");
    if (box && !box.children.length) {
      this.showWelcome();
    }
  },
};

window.YatraChatbot = YatraChatbot;

document.addEventListener("DOMContentLoaded", () => {
  if (window.YatraChatbot) window.YatraChatbot.init();
});
