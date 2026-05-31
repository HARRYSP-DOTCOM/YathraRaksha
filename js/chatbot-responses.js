/**
 * YatraGPT — Groq API streaming chatbot (proxied via backend)
 */
window.YatraGPT = (() => {
  let chatHistory = [];
  let isStreaming = false;

  function apiBase() {
    return (window.AppConfig && window.AppConfig.API_BASE_URL) || "http://127.0.0.1:8000/v1";
  }

  async function streamGroqResponse(messages, onToken, onDone, onError) {
    try {
      const res = await fetch(`${apiBase()}/ai/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          context: window.ROADS_DATA?.buildGroqContext?.() || "",
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n");
        buffer = parts.pop() || "";
        for (const line of parts) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") {
            onDone();
            return;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) throw new Error(parsed.error);
            const token = parsed.choices?.[0]?.delta?.content;
            if (token) onToken(token);
          } catch (e) {
            if (line.includes('"delta"')) {
              try {
                const parsed = JSON.parse(data);
                const token = parsed.choices?.[0]?.delta?.content;
                if (token) onToken(token);
              } catch {
                /* passthrough SSE chunks from Groq */
              }
            }
          }
        }
      }
      if (buffer.trim()) {
        const line = buffer.trim();
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") {
            onDone();
            return;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) throw new Error(parsed.error);
            const token = parsed.choices?.[0]?.delta?.content;
            if (token) onToken(token);
          } catch (e) {
            if (line.includes('"delta"')) {
              try {
                const parsed = JSON.parse(data);
                const token = parsed.choices?.[0]?.delta?.content;
                if (token) onToken(token);
              } catch {
                /* passthrough SSE chunks from Groq */
              }
            }
          }
        }
      }
      onDone();
    } catch (err) {
      onError(err);
    }
  }

  async function sendMessage(userText) {
    if (isStreaming || !userText.trim()) return;
    isStreaming = true;
    chatHistory.push({ role: "user", content: userText });

    if (window.App?.appendChatMessage) {
      window.App.appendChatMessage("user", userText);
    }
    window.App?.showTypingIndicator?.();

    const messageDiv = window.App?.createStreamingBubble?.() || null;
    let fullResponse = "";

    await streamGroqResponse(
      chatHistory,
      (token) => {
        fullResponse += token;
        if (messageDiv) {
          const body = messageDiv.querySelector(".chat-bubble-body") || messageDiv;
          body.innerHTML = window.App?.escapeHTML?.(fullResponse)?.replace(/\n/g, "<br>") || fullResponse;
        }
        const box = document.getElementById("chat-box");
        if (box) box.scrollTop = box.scrollHeight;
      },
      () => {
        chatHistory.push({ role: "assistant", content: fullResponse });
        if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);
        window.App?.hideTypingIndicator?.();
        isStreaming = false;
      },
      () => {
        const msg =
          "⚠️ Service temporarily unavailable. Please try again.";
        if (messageDiv) {
          const body = messageDiv.querySelector(".chat-bubble-body") || messageDiv;
          body.textContent = msg;
          messageDiv.classList.add("chat-bubble--error");
        } else if (window.App?.appendChatMessage) {
          window.App.appendChatMessage("assistant", msg, { error: true });
        }
        window.App?.hideTypingIndicator?.();
        isStreaming = false;
      }
    );
  }

  function reset() {
    chatHistory = [];
    const box = document.getElementById("chat-box");
    if (box) box.innerHTML = "";
    const welcomeMessage =
      "👋 Hi! I'm YatraGPT. Ask me about road quality, contractor budgets, filing complaints, or safe routes.";
    if (window.App?.appendChatMessage) {
      window.App.appendChatMessage("assistant", welcomeMessage);
    } else if (box) {
      const wrap = document.createElement("div");
      wrap.className = "chat-bubble chat-bubble--assistant";
      wrap.innerHTML = `<div class="chat-bubble-meta"><span class="chat-time">${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div><div class="chat-bubble-body">${welcomeMessage}</div>`;
      box.appendChild(wrap);
    }
  }

  return { sendMessage, reset, streamGroqResponse };
})();
