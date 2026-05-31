import re

with open('js/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# I will find the end of the App object
idx = content.rfind('};')
if idx != -1:
    print('Found }; at the end')
    new_funcs = '''
  conversationHistory: [],

  handleUserChatMessage() {
    const inputEl = document.getElementById("chat-input");
    const message = inputEl.value.trim();
    if (!message) return;

    this.addUserMessage(message);
    inputEl.value = "";

    this.conversationHistory.push({ role: 'user', content: message });
    this.addTypingIndicator();

    // The systemPrompt is generated dynamically before the call
    const detectedLang = window.ChatbotResponses.detectLanguage(message);
    const systemContent = `You are YatraGPT, the AI assistant for YatraRaksha — an AI-powered road safety and public infrastructure transparency platform built for Kerala and India.

You have expert knowledge of the following data:

ROADS IN DATABASE:
  - NH-48  : NH Golden Quadrilateral (Chennai–Bengaluru)
  - SH-17  : Bengaluru–Mysuru Expressway Link
  - MDR-12 : Tambaram–Velachery Main Road
  - US-I95 : Interstate 95 (New York Bronx Corridor)
  - US-CA101 : US Route 101 (Silicon Valley Expressway)
  - DE-A8  : A8 Autobahn (München–Salzburg)
  - DE-L190 : L190 Landesstraße (Schwarzwald Link)

CONTRACTORS:
  - Infratech Builders Group Ltd.  — Rating ★3.4 — manages NH-48
  - KNR Constructions Ltd.         — Rating ★4.5 — manages SH-17
  - Sri Balaji Roadworks Co.       — Rating ★2.1 — manages MDR-12 ⚠️ LOW RATED
  - Tully Construction Co.         — Rating ★3.9 — manages US-I95
  - Granite Construction Co.       — Rating ★4.8 — manages US-CA101
  - Hochtief AG                    — Rating ★4.7 — manages DE-A8
  - Strabag AG                     — Rating ★4.1 — manages DE-L190

BUDGET DATA (Sanctioned vs Actual Spent in INR):
  - NH-48   : ₹120.0 Cr sanctioned | ₹135.0 Cr spent  ⚠️ OVERRUN
  - SH-17   : ₹85.0 Cr sanctioned  | ₹82.5 Cr spent   ✅ UNDER BUDGET
  - MDR-12  : ₹32.0 Cr sanctioned  | ₹45.0 Cr spent   ⚠️ OVERRUN
  - US-I95  : ₹185.0 Cr sanctioned | ₹198.0 Cr spent  ⚠️ OVERRUN
  - US-CA101: ₹94.0 Cr sanctioned  | ₹91.2 Cr spent   ✅ UNDER BUDGET
  - DE-A8   : ₹220.0 Cr sanctioned | ₹218.5 Cr spent  ✅ UNDER BUDGET
  - DE-L190 : ₹55.0 Cr sanctioned  | ₹62.0 Cr spent   ⚠️ OVERRUN

EXECUTIVE ENGINEERS:
  - NH-48   : Er. Rajesh K. Vardhan       | +91-98402-12345
  - SH-17   : Er. Manjunath Swamy         | +91-94480-56789
  - MDR-12  : Er. Selvakumar Arumugam     | +91-94440-98765
  - US-I95  : Eng. Sarah Jenkins          | +1-518-555-0195
  - US-CA101: Eng. David Vance            | +1-510-555-2345
  - DE-A8   : Dipl.-Ing. Hans-D. Weber   | +49-89-5456-7890
  - DE-L190 : Dipl.-Ing. Brigitte Müller | +49-721-926-0

LAST REPAIR DATES:
  - NH-48: 2024 | SH-17: 2025 | MDR-12: 2023
  - US-I95: 2023 | US-CA101: 2024 | DE-A8: 2025 | DE-L190: 2022

COMPLAINT PROCESS:
  Step 1 — Go to AI Defect Capture tab
  Step 2 — Upload a photo of the road defect
  Step 3 — AI analyzes and identifies the defect type
  Step 4 — Fill in remarks and contact (can be anonymous)
  Step 5 — Click "File Formal Complaint Notice"
  Step 6 — Track status in the Outbox Tracker tab
  Offline — complaints queue locally and auto-sync when online

YOUR BEHAVIOR RULES:
1. Answer naturally like a helpful government transparency assistant.
2. If the user mentions a location (e.g. "Medical College", "Kannur", "Tambaram"), extract it, identify the nearest road from the database, identify the responsible authority and contractor, and offer to draft a formal complaint.
3. Auto-generate a formal complaint notice when requested (see format below).
4. Always respond in the SAME LANGUAGE the user writes in. Malayalam → respond in Malayalam. Hindi → Hindi. English → English.
5. For budget questions, show sanctioned vs spent and flag overruns clearly.
6. For contractor questions, show rating, road managed, and overrun status.
7. Guide users step by step — never dump all information at once.
8. Be concise, civic-minded, professional but friendly.
9. If asked something unrelated to road safety/infrastructure, politely redirect back to your purpose.
10. When showing data for a road with overrun, automatically add: "⚠️ WARNING: This road has a budget overrun of ₹[X] Cr. This may indicate contractor overcharging. Would you like to file a transparency complaint?"

COMPLAINT NOTICE FORMAT (generate this when user wants to file):
--------------------------------------------------------------
FORMAL CIVIL GRIEVANCE NOTICE
Reference No : RWAI-[6 random digits]
Date         : [today's date]
Road         : [identified road name and code]
Defect Type  : [extracted from user message]
Location     : [extracted landmark or area]
Contractor   : [name + star rating]
Engineer     : [name + phone]
Authority    : [PWD / NHAI / NYSDOT / Caltrans / etc.]
Citizen Notes: [user's original description]
Status       : Filed — Pending Acknowledgement
--------------------------------------------------------------

${detectedLang !== 'en' ? `IMPORTANT: The user is writing in ${detectedLang === 'ml' ? 'Malayalam' : 'Hindi'}. You MUST respond entirely in that language.` : ''}`;

    const systemMessage = { role: 'system', content: systemContent };

    window.ChatbotResponses.getChatbotResponse([systemMessage, ...this.conversationHistory])
      .then(botReply => {
        this.removeTypingIndicator();
        this.conversationHistory.push({ role: 'assistant', content: botReply });
        
        if (this.conversationHistory.length > 10) {
          this.conversationHistory = this.conversationHistory.slice(this.conversationHistory.length - 10);
        }

        // Generate quick pills based on response
        let pillsHtml = "";
        if (botReply.includes("FORMAL CIVIL")) {
          pillsHtml = `<div class="msg-quick-pills">
            <button onclick="window.App.switchTab('capture')" class="msg-quick-pill">✅ Go to Capture Tab</button>
            <button onclick="window.App.sendBotMessage('Edit Details')" class="msg-quick-pill">🔄 Edit Details</button>
            <button onclick="window.App.sendBotMessage('Copy Notice')" class="msg-quick-pill">📋 Copy Notice</button>
          </div>`;
        } else if (botReply.includes("NH-48") || botReply.includes("SH-17") || botReply.includes("MDR-12")) {
          pillsHtml = `<div class="msg-quick-pills">
            <button onclick="window.App.sendBotMessage('File Complaint')" class="msg-quick-pill">📄 File Complaint</button>
            <button onclick="window.App.sendBotMessage('Budget details')" class="msg-quick-pill">💰 Budget</button>
            <button onclick="window.App.sendBotMessage('Contact Engineer')" class="msg-quick-pill">📞 Contact Engineer</button>
          </div>`;
        } else if (botReply.includes("contractor") || botReply.includes("Contractor") || botReply.includes("★")) {
          pillsHtml = `<div class="msg-quick-pills">
            <button onclick="window.App.sendBotMessage('See Their Roads')" class="msg-quick-pill">🛣️ See Their Roads</button>
            <button onclick="window.App.sendBotMessage('Report Issue')" class="msg-quick-pill">⚠️ Report Issue</button>
            <button onclick="window.App.sendBotMessage('Compare Contractors')" class="msg-quick-pill">📊 Compare Contractors</button>
          </div>`;
        }

        this.addBotMessage(botReply + pillsHtml);
      });
  },

  sendBotMessage(text) {
    const inputEl = document.getElementById("chat-input");
    inputEl.value = text;
    this.handleUserChatMessage();
  },

  initChatbot() {
    const latEl = document.getElementById("report-lat");
    const lngEl = document.getElementById("report-lng");
    
    if (latEl && lngEl && latEl.value && lngEl.value) {
      const lat = parseFloat(latEl.value);
      const lng = parseFloat(lngEl.value);
      const nearest = window.RoadDatabase?.findNearestRoad?.(lat, lng);
      const roadName = nearest?.road ? nearest.road.name : "unknown road";
      
      this.addBotMessage(`📍 I can see you're near ${lat}, ${lng}. The nearest registered road in our database is ${roadName}. Want to report a road issue or check its audit status?`);
    } else {
      this.addBotMessage("👋 Hi! I'm YatraGPT. Ask me about any road, contractor, or budget — or tell me about a pothole and I'll help you file a complaint.");
    }
  }
'''

    # Modify switchTab to call initChatbot when switching to chatbot tab
    # Find switchTab definition
    st_idx = content.rfind('switchTab(tabId) {')
    
    # insert the new functions before };
    final_content = content[:idx] + ',' + new_funcs + content[idx:]
    
    # Now patch switchTab to call initChatbot
    st_body_idx = final_content.find('{', st_idx)
    patched_content = final_content[:st_body_idx+1] + '\n    if (tabId === "chatbot" && this.activeTab !== "chatbot") { setTimeout(() => this.initChatbot(), 100); }' + final_content[st_body_idx+1:]
    
    with open('js/app.js', 'w', encoding='utf-8') as f:
        f.write(patched_content)
    print('Patched app.js successfully')
