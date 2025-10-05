/* CodeFlow AI Pro - Complete Chrome Extension Content Script
   - Mock AI responses (no API keys required)
   - Chat, Image Gen, Web Research, Document Q&A
   - Live monitoring, voice input (simulated)
   - Ctrl+Shift+L toggles the sidebar
   - Chats are cleared on close and on page unload
*/

(function () {
  "use strict";

  // -- Utility helpers -----------------------------------------------------
  function el(tag, attrs, html) {
    var d = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "style") d.style.cssText = attrs[k];
        else if (k.startsWith("on") && typeof attrs[k] === "function")
          d.addEventListener(k.slice(2), attrs[k]);
        else d.setAttribute(k, attrs[k]);
      });
    }
    if (html !== undefined) d.innerHTML = html;
    return d;
  }

  function nowISO() {
    return new Date().toISOString();
  }

  // -- Sidebar constructor -------------------------------------------------
  var AssistantSidebar = function () {
    this.container = null;
    this.isVisible = false;
    this.currentTab = "chat";
    this.isMonitoring = false;
    this.currentContext = null;
    this.analysisInterval = null;
    this.uploadedDocuments = [];
    this.conversationHistory = [];
    this.isRecording = false;
    this.init();
  };

  AssistantSidebar.prototype.init = function () {
    this.createSidebar();
    this.setupEvents();
    // By default don't start monitoring until shown (but keep functions ready)
    // Start listening for keyboard shortcut
    this.setupGlobalShortcut();
    // Clear chats on page unload
    window.addEventListener("beforeunload", () => {
      try {
        this.clearAllChats();
        this.clearDocChat();
      } catch (e) {}
    });
  };

  // -- Build UI ------------------------------------------------------------
  AssistantSidebar.prototype.createSidebar = function () {
    if (document.getElementById("codeflow-sidebar")) {
      this.container = document.getElementById("codeflow-sidebar");
      return;
    }

    // container
    this.container = el("div", {
      id: "codeflow-sidebar",
      style:
        "position:fixed;top:0;right:-480px;width:480px;height:100vh;background:rgba(15,15,25,0.98);backdrop-filter:blur(30px);border-left:1px solid rgba(255,255,255,0.08);box-shadow:-8px 0 40px rgba(0,0,0,0.5);z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;transition:right 0.34s cubic-bezier(0.4,0,0.2,1);display:flex;flex-direction:column;"
    });

    // header
    var header = el(
      "div",
      {
        style:
          "padding:18px;background:linear-gradient(135deg,rgba(102,126,234,0.08),rgba(118,75,162,0.08));border-bottom:1px solid rgba(255,255,255,0.06);"
      },
      `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:44px;height:44px;background:linear-gradient(135deg,#667eea,#764ba2);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 6px 16px rgba(102,126,234,0.28);">🤖</div>
          <div>
            <div style="color:white;font-weight:700;font-size:17px;">CodeFlow AI Pro</div>
            <div style="color:rgba(255,255,255,0.55);font-size:11px;margin-top:2px;">All-in-one coding assistant</div>
          </div>
        </div>
        <button id="sidebar-close" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.06);color:rgba(255,255,255,0.75);font-size:20px;cursor:pointer;width:36px;height:36px;border-radius:10px;transition:all 0.2s;">×</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div style="padding:10px;background:rgba(74,222,128,0.1);border-radius:10px;display:flex;align-items:center;gap:8px;border:1px solid rgba(74,222,128,0.18);">
          <div id="status-dot" style="width:8px;height:8px;background:#4ade80;border-radius:50%;box-shadow:0 0 10px #4ade80;animation:pulse 2s infinite;"></div>
          <span style="color:#4ade80;font-size:11px;font-weight:700;">LIVE MONITORING</span>
        </div>
        <div style="padding:10px;background:rgba(59,130,246,0.08);border-radius:10px;display:flex;align-items:center;gap:8px;border:1px solid rgba(59,130,246,0.14);">
          <span style="color:#60a5fa;font-size:11px;font-weight:700;">🌐 MOCK MODE</span>
        </div>
      </div>`
    );

    // tabs
    var tabs = el(
      "div",
      {
        style:
          "display:grid;grid-template-columns:repeat(5,1fr);padding:10px;gap:6px;background:rgba(0,0,0,0.28);border-bottom:1px solid rgba(255,255,255,0.06);overflow-x:auto;"
      },
      ''
    );
    tabs.innerHTML = [
      '<button class="tab-btn active" data-tab="chat" style="padding:10px 8px;background:rgba(255,255,255,0.10);border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:white;font-size:12px;cursor:pointer;">💬 Chat</button>',
      '<button class="tab-btn" data-tab="image" style="padding:10px 8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:rgba(255,255,255,0.75);font-size:12px;cursor:pointer;">🎨 Image</button>',
      '<button class="tab-btn" data-tab="research" style="padding:10px 8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:rgba(255,255,255,0.75);font-size:12px;cursor:pointer;">🔍 Web</button>',
      '<button class="tab-btn" data-tab="docs" style="padding:10px 8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:rgba(255,255,255,0.75);font-size:12px;cursor:pointer;">📄 Docs</button>',
      '<button class="tab-btn" data-tab="monitor" style="padding:10px 8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:rgba(255,255,255,0.75);font-size:12px;cursor:pointer;">📊 Live</button>'
    ].join("");

    // content area (tabs content)
    var content = el("div", {
      id: "sidebar-content",
      style: "flex:1;overflow-y:auto;padding:16px;box-sizing:border-box;"
    });

    // chat tab
    var chatTab = el("div", { id: "chat-tab", class: "tab-content" }, "");
    chatTab.innerHTML = `
      <div id="chat-messages" style="display:flex;flex-direction:column;gap:12px;margin-bottom:16px;"></div>
      <div id="welcome" style="text-align:center;padding:30px 18px;">
        <div style="font-size:60px;margin-bottom:12px;">🚀</div>
        <h3 style="color:white;margin:0 0 8px 0;font-size:18px;">Welcome to CodeFlow AI Pro</h3>
        <p style="color:rgba(255,255,255,0.66);margin:0 0 16px 0;font-size:13px;line-height:1.6;">
          Mock AI assistant — Chat • Image Gen • Web Research • Document Chat • Live Monitoring
        </p>
        <div style="display:grid;gap:10px;">
          <button class="quick-action" data-action="Explain the code I am looking at in detail" style="padding:12px;background:linear-gradient(135deg,rgba(59,130,246,0.14),rgba(147,51,234,0.14));border-radius:10px;border:1px solid rgba(59,130,246,0.14);color:white;cursor:pointer;text-align:left;">📖 Explain this code</button>
          <button class="quick-action" data-action="Find all bugs and security issues in my code" style="padding:12px;background:linear-gradient(135deg,rgba(239,68,68,0.10),rgba(220,38,38,0.10));border-radius:10px;border:1px solid rgba(239,68,68,0.12);color:white;cursor:pointer;text-align:left;">🐛 Debug & fix issues</button>
          <button class="quick-action" data-action="Optimize this code for better performance and efficiency" style="padding:12px;background:linear-gradient(135deg,rgba(16,185,129,0.10),rgba(5,150,105,0.10));border-radius:10px;border:1px solid rgba(16,185,129,0.12);color:white;cursor:pointer;text-align:left;">⚡ Optimize performance</button>
        </div>
      </div>`;

    // image tab
    var imageTab = el("div", { id: "image-tab", class: "tab-content", style: "display:none;" }, "");
    imageTab.innerHTML = `
      <h3 style="color:white;margin:0 0 10px 0;font-size:15px;">🎨 Image Generation (Mock)</h3>
      <div style="background:rgba(255,255,255,0.03);padding:12px;border-radius:10px;margin-bottom:12px;">
        <p style="color:rgba(255,255,255,0.7);margin:0 0 8px 0;font-size:13px;">Describe your image — mock images will be generated locally.</p>
        <textarea id="image-prompt" placeholder="A futuristic desk with neon lights..." style="width:100%;min-height:88px;background:rgba(255,255,255,0.04);border-radius:8px;padding:10px;color:white;border:1px solid rgba(255,255,255,0.06);"></textarea>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <select id="image-style" style="flex:1;padding:8px;border-radius:8px;background:rgba(255,255,255,0.04);color:white;border:1px solid rgba(255,255,255,0.06);">
            <option value="realistic">Realistic</option>
            <option value="artistic">Artistic</option>
            <option value="digital">Digital Art</option>
            <option value="3d">3D Render</option>
            <option value="anime">Anime</option>
            <option value="cyber">Cyberpunk</option>
          </select>
          <select id="image-size" style="width:120px;padding:8px;border-radius:8px;background:rgba(255,255,255,0.04);color:white;border:1px solid rgba(255,255,255,0.06);">
            <option value="512">512x512</option>
            <option value="1024" selected>1024x1024</option>
            <option value="1920">1920x1080</option>
          </select>
        </div>
        <button id="generate-image-btn" style="width:100%;margin-top:10px;padding:10px;background:linear-gradient(135deg,#667eea,#764ba2);border:none;border-radius:8px;color:white;font-weight:700;cursor:pointer;">🎨 Generate Image</button>
      </div>
      <div id="generated-images" style="display:grid;gap:10px;"></div>
      <div id="image-placeholder" style="text-align:center;padding:24px;color:rgba(255,255,255,0.5);">No images yet.</div>
    `;

    // research tab
    var researchTab = el("div", { id: "research-tab", class: "tab-content", style: "display:none;" }, "");
    researchTab.innerHTML = `
      <h3 style="color:white;margin:0 0 10px 0;font-size:15px;">🔍 Web Research (Mock)</h3>
      <div style="background:rgba(255,255,255,0.03);padding:12px;border-radius:10px;margin-bottom:12px;">
        <input id="research-query" placeholder="Search tutorials, docs..." style="width:100%;padding:10px;border-radius:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);color:white;">
        <button id="research-btn" style="width:100%;margin-top:8px;padding:10px;background:linear-gradient(135deg,#3b82f6,#1e40af);border:none;border-radius:8px;color:white;font-weight:700;cursor:pointer;">🔍 Search Web</button>
      </div>
      <div id="research-results" style="display:flex;flex-direction:column;gap:10px;"></div>
      <div id="research-placeholder" style="text-align:center;padding:18px;color:rgba(255,255,255,0.5);">No searches yet.</div>
    `;

    // docs tab
    var docsTab = el("div", { id: "docs-tab", class: "tab-content", style: "display:none;" }, "");
    docsTab.innerHTML = `
      <h3 style="color:white;margin:0 0 10px 0;font-size:15px;">📄 Document Chat (Mock)</h3>
      <div style="background:rgba(255,255,255,0.03);padding:12px;border-radius:10px;margin-bottom:12px;">
        <div id="drop-zone" style="border:2px dashed rgba(255,255,255,0.06);border-radius:10px;padding:18px;text-align:center;cursor:pointer;">
          <div style="font-size:36px;">📁</div>
          <div style="color:rgba(255,255,255,0.7);margin-top:8px;">Drag & drop files here or click to browse</div>
          <input id="file-input" type="file" accept=".pdf,.txt,.md,.js,.py,.java,.cpp,.html,.css" multiple style="display:none;">
          <div style="margin-top:10px;"><button id="browse-files-btn" style="padding:8px 16px;border-radius:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);color:white;cursor:pointer;">Browse Files</button></div>
        </div>
        <div id="uploaded-files" style="margin-top:12px;display:flex;flex-direction:column;gap:8px;"></div>
      </div>
      <div id="doc-chat-area" style="display:none;">
        <div id="doc-messages" style="max-height:260px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;margin-bottom:10px;"></div>
        <div style="display:flex;gap:8px;">
          <input id="doc-question" placeholder="Ask about uploaded documents..." style="flex:1;padding:10px;border-radius:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);color:white;">
          <button id="ask-doc-btn" style="padding:10px 14px;border-radius:8px;background:linear-gradient(135deg,#8b5cf6,#6d28d9);border:none;color:white;cursor:pointer;">Ask</button>
        </div>
      </div>
    `;

    // monitor tab
    var monitorTab = el("div", { id: "monitor-tab", class: "tab-content", style: "display:none;" }, "");
    monitorTab.innerHTML = `
      <h3 style="color:white;margin:0 0 10px 0;font-size:15px;">📊 Live Code Monitor</h3>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:rgba(255,255,255,0.03);border-radius:10px;margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:10px;"><div id="monitor-status-dot" style="width:10px;height:10px;background:#4ade80;border-radius:50%;box-shadow:0 0 12px #4ade80;animation:pulse 2s infinite;"></div><div style="color:white;font-weight:700;">Real-time Monitoring</div></div>
        <button id="toggle-monitor-btn" style="padding:8px 14px;border-radius:8px;background:rgba(74,222,128,0.18);border:1px solid rgba(74,222,128,0.26);color:#4ade80;cursor:pointer;">ON</button>
      </div>

      <div style="display:grid;gap:10px;">
        <div style="padding:12px;background:linear-gradient(135deg,rgba(59,130,246,0.06),rgba(37,99,235,0.06));border-radius:10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;"><div style="color:rgba(255,255,255,0.75);font-weight:700;font-size:12px;">Code Quality Score</div><div id="quality-score" style="font-weight:900;color:#60a5fa;">0%</div></div>
          <div style="margin-top:8px;height:8px;background:rgba(255,255,255,0.06);border-radius:6px;overflow:hidden;"><div id="quality-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#3b82f6,#8b5cf6);transition:width 0.4s;"></div></div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div style="padding:10px;background:rgba(16,185,129,0.06);border-radius:8px;"><div style="color:rgba(255,255,255,0.66);font-size:11px;">COMPLEXITY</div><div id="complexity-level" style="font-weight:900;color:#10b981;">Low</div></div>
          <div style="padding:10px;background:rgba(245,158,11,0.06);border-radius:8px;"><div style="color:rgba(255,255,255,0.66);font-size:11px;">FUNCTIONS</div><div id="function-count" style="font-weight:900;color:#f59e0b;">0</div></div>
          <div style="padding:10px;background:rgba(139,92,246,0.06);border-radius:8px;"><div style="color:rgba(255,255,255,0.66);font-size:11px;">LINES</div><div id="code-lines-count" style="font-weight:900;color:#8b5cf6;">0</div></div>
          <div style="padding:10px;background:rgba(236,72,153,0.06);border-radius:8px;"><div style="color:rgba(255,255,255,0.66);font-size:11px;">COMMENTS</div><div id="comment-count" style="font-weight:900;color:#ec4899;">0</div></div>
        </div>

        <div>
          <h4 style="color:white;margin:10px 0 6px 0;font-size:13px;">🎯 Current Context</h4>
          <div style="padding:10px;background:rgba(255,255,255,0.03);border-radius:8px;">
            <div style="display:flex;justify-content:space-between;"><span style="color:rgba(255,255,255,0.66);">Platform:</span><span id="current-platform" style="font-weight:700">-</span></div>
            <div style="display:flex;justify-content:space-between;margin-top:6px;"><span style="color:rgba(255,255,255,0.66);">Language:</span><span id="current-language" style="font-weight:700">-</span></div>
            <div style="display:flex;justify-content:space-between;margin-top:6px;"><span style="color:rgba(255,255,255,0.66);">File:</span><span id="current-file" style="font-weight:700">-</span></div>
          </div>
        </div>

        <div>
          <h4 style="color:white;margin:10px 0 6px 0;font-size:13px;">⚠️ Live Issues</h4>
          <div id="live-issues" style="display:flex;flex-direction:column;gap:8px;"></div>
          <div id="no-issues" style="text-align:center;padding:12px;color:rgba(255,255,255,0.5);">
            <div style="font-size:28px;margin-bottom:6px;">✅</div>
            <div style="font-size:12px;">No issues detected!</div>
          </div>
        </div>
      </div>
    `;

    // footer / input
    var inputArea = el(
      "div",
      {
        style:
          "padding:14px;border-top:1px solid rgba(255,255,255,0.04);background:rgba(0,0,0,0.34);display:flex;flex-direction:column;gap:10px;"
      },
      ''
    );
    inputArea.innerHTML = `
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="context-chip" data-context="code" style="padding:7px 12px;background:rgba(59,130,246,0.12);border-radius:18px;border:1px solid rgba(59,130,246,0.12);color:#60a5fa;cursor:pointer;font-weight:700;">📋 Selected Code</button>
        <button class="context-chip" data-context="file" style="padding:7px 12px;background:rgba(147,51,234,0.12);border-radius:18px;border:1px solid rgba(147,51,234,0.12);color:#c084fc;cursor:pointer;font-weight:700;">📄 Current File</button>
        <button class="context-chip" data-context="error" style="padding:7px 12px;background:rgba(239,68,68,0.12);border-radius:18px;border:1px solid rgba(239,68,68,0.12);color:#f87171;cursor:pointer;font-weight:700;">🐛 Errors</button>
        <button id="voice-btn" style="padding:7px 12px;background:rgba(16,185,129,0.12);border-radius:18px;border:1px solid rgba(16,185,129,0.12);color:#10b981;cursor:pointer;font-weight:700;">🎤 Voice</button>
      </div>
      <div style="display:flex;gap:8px;align-items:flex-end;">
        <textarea id="chat-input" placeholder="Ask anything... (supports images, web search, documents)" style="flex:1;min-height:48px;max-height:120px;background:rgba(255,255,255,0.04);border-radius:10px;padding:10px;border:1px solid rgba(255,255,255,0.06);color:white;"></textarea>
        <button id="send-btn" style="width:48px;height:48px;background:linear-gradient(135deg,#667eea,#764ba2);border:none;border-radius:10px;color:white;font-weight:800;cursor:pointer;">↑</button>
      </div>
      <div style="font-size:11px;color:rgba(255,255,255,0.44);text-align:center;">Ctrl+Shift+L to toggle • Mock AI mode</div>
    `;

    // append all
    content.appendChild(chatTab);
    content.appendChild(imageTab);
    content.appendChild(researchTab);
    content.appendChild(docsTab);
    content.appendChild(monitorTab);

    this.container.appendChild(header);
    this.container.appendChild(tabs);
    this.container.appendChild(content);
    this.container.appendChild(inputArea);

    document.body.appendChild(this.container);

    // styles injection
    this.addStyles();
  };

  // -- Styles --------------------------------------------------------------
  AssistantSidebar.prototype.addStyles = function () {
    if (document.getElementById("codeflow-styles")) return;
    var styles = `
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
      @keyframes typing{0%,60%,100%{opacity:0.35;transform:scale(0.9)}30%{opacity:1;transform:scale(1)}}
      #codeflow-sidebar .message.user{align-self:flex-end}
      #codeflow-sidebar .message.ai{align-self:flex-start}
      #codeflow-sidebar .tab-btn:focus{outline:none}
      #codeflow-sidebar ::-webkit-scrollbar{width:8px}
      #codeflow-sidebar ::-webkit-scrollbar-thumb{background:linear-gradient(180deg,#667eea,#764ba2);border-radius:10px}
    `;
    var styleEl = document.createElement("style");
    styleEl.id = "codeflow-styles";
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
  };

  // -- Event wiring -------------------------------------------------------
  AssistantSidebar.prototype.setupEvents = function () {
    var self = this;

    // close button — hide & clear chats (user requested clearing on close)
    this.container.querySelector("#sidebar-close").addEventListener("click", function () {
      self.hide();
      // Clear chats and uploaded docs when user explicitly closes the sidebar (per request)
      self.clearAllChats();
      self.clearDocChat();
      self.stopMonitoring();
    });

    // send
    this.container.querySelector("#send-btn").addEventListener("click", function () {
      self.sendMessage();
    });
    this.container.querySelector("#chat-input").addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        self.sendMessage();
      }
    });

    // tab switching
    var tabBtns = this.container.querySelectorAll(".tab-btn");
    tabBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var target = this.getAttribute("data-tab");
        self.switchTab(target);
      });
    });

    // quick actions in chat welcome
    this.container.querySelectorAll(".quick-action").forEach(function (qa) {
      qa.addEventListener("click", function () {
        var action = this.getAttribute("data-action");
        var input = document.getElementById("chat-input");
        input.value = action;
        self.sendMessage();
      });
    });

    // context chips
    this.container.querySelectorAll(".context-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        var ctx = this.getAttribute("data-context");
        self.addContextToInput(ctx);
      });
    });

    // voice button (simulated)
    this.container.querySelector("#voice-btn").addEventListener("click", function () {
      self.toggleVoiceInput();
    });

    // image generation
    this.container.querySelector("#generate-image-btn").addEventListener("click", function () {
      self.generateImage();
    });

    // research
    this.container.querySelector("#research-btn").addEventListener("click", function () {
      self.performResearch();
    });
    this.container.querySelector("#research-query").addEventListener("keydown", function (e) {
      if (e.key === "Enter") self.performResearch();
    });

    // document upload / drag-drop
    var dropZone = this.container.querySelector("#drop-zone");
    var fileInput = this.container.querySelector("#file-input");
    var browseBtn = this.container.querySelector("#browse-files-btn");

    browseBtn.addEventListener("click", function () {
      fileInput.click();
    });

    fileInput.addEventListener("change", function (e) {
      self.handleFileUpload(e);
    });

    dropZone.addEventListener("click", function () {
      fileInput.click();
    });

    dropZone.addEventListener("dragover", function (e) {
      e.preventDefault();
      dropZone.style.borderColor = "rgba(102,126,234,0.6)";
      dropZone.style.background = "rgba(102,126,234,0.06)";
    });
    dropZone.addEventListener("dragleave", function (e) {
      dropZone.style.borderColor = "rgba(255,255,255,0.06)";
      dropZone.style.background = "transparent";
    });
    dropZone.addEventListener("drop", function (e) {
      e.preventDefault();
      dropZone.style.borderColor = "rgba(255,255,255,0.06)";
      dropZone.style.background = "transparent";
      self.handleFileDrop(e);
    });

    // document chat ask
    var askBtn = this.container.querySelector("#ask-doc-btn");
    askBtn.addEventListener("click", function () {
      self.askDocument();
    });
    var docInput = this.container.querySelector("#doc-question");
    docInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") self.askDocument();
    });

    // monitoring toggle
    this.container.querySelector("#toggle-monitor-btn").addEventListener("click", function () {
      self.toggleMonitoring();
    });
  };

  // -- Shortcut -----------------------------------------------------------
  AssistantSidebar.prototype.setupGlobalShortcut = function () {
    var self = this;
    document.addEventListener("keydown", function (e) {
      // Ctrl + Shift + L
      if (e.ctrlKey && e.shiftKey && (e.key === "L" || e.key === "l" || e.code === "KeyL")) {
        e.preventDefault();
        self.toggle();
      }
    });
  };

  // -- Show / Hide -------------------------------------------------------
  AssistantSidebar.prototype.show = function () {
    if (!this.container) return;
    this.container.style.right = "0px";
    this.isVisible = true;
    // start monitoring and reset chats so a fresh session on open
    this.clearAllChats();
    this.clearDocChat();
    this.startMonitoring();
    // focus input
    setTimeout(() => {
      var inpt = this.container.querySelector("#chat-input");
      if (inpt) inpt.focus();
    }, 320);
  };

  AssistantSidebar.prototype.hide = function () {
    if (!this.container) return;
    this.container.style.right = "-480px";
    this.isVisible = false;
    // When user hides/closes the extension UI we must clear chats per user request
    this.clearAllChats();
    this.clearDocChat();
    this.stopMonitoring();
  };

  AssistantSidebar.prototype.toggle = function () {
    if (this.isVisible) this.hide();
    else this.show();
  };

  // -- Tab switching -----------------------------------------------------
  AssistantSidebar.prototype.switchTab = function (tabName) {
    this.currentTab = tabName;
    // header buttons
    this.container.querySelectorAll(".tab-btn").forEach(function (btn) {
      if (btn.getAttribute("data-tab") === tabName) {
        btn.style.background = "rgba(255,255,255,0.10)";
        btn.style.color = "white";
        btn.style.borderColor = "rgba(255,255,255,0.12)";
      } else {
        btn.style.background = "rgba(255,255,255,0.04)";
        btn.style.color = "rgba(255,255,255,0.75)";
        btn.style.borderColor = "rgba(255,255,255,0.06)";
      }
    });

    // show/hide contents
    ["chat", "image", "research", "docs", "monitor"].forEach(function (t) {
      var elTab = document.getElementById(t + "-tab");
      if (elTab) elTab.style.display = t === tabName ? "block" : "none";
    });
  };

  // -- Chat system (mock) -----------------------------------------------
  AssistantSidebar.prototype.sendMessage = function () {
    var input = this.container.querySelector("#chat-input");
    if (!input) return;
    var message = input.value.trim();
    if (!message) return;
    // hide welcome
    var welcome = this.container.querySelector("#welcome");
    if (welcome) welcome.style.display = "none";

    // push user message
    this.addMessage(message, "user");
    this.conversationHistory.push({ role: "user", content: message, timestamp: nowISO() });
    input.value = "";

    // typing indicator
    this.addTypingIndicator();

    var self = this;
    setTimeout(function () {
      self.removeTypingIndicator();
      // generate mock response (prioritize commands: image:, search:, doc:)
      var lowered = message.toLowerCase();
      if (lowered.startsWith("image:") || lowered.includes("generate image") || lowered.includes("create image")) {
        // use internal image generator
        var prompt = message.replace(/^image:\s*/i, "");
        document.getElementById("image-prompt").value = prompt;
        self.switchTab("image");
        self.generateImage();
        self.addMessage("I've generated a mock image for your prompt. Check the Image tab.", "assistant");
      } else if (lowered.startsWith("search:") || lowered.includes("search") && lowered.length < 80) {
        var q = message.replace(/^search:\s*/i, "");
        document.getElementById("research-query").value = q;
        self.switchTab("research");
        self.performResearch();
        self.addMessage("Performed a mock web search — see the Web tab for results.", "assistant");
      } else if (lowered.startsWith("doc:") || lowered.includes("document")) {
        // Simulate doc Q&A
        var q2 = message.replace(/^doc:\s*/i, "");
        self.switchTab("docs");
        setTimeout(function () {
          self.addMessage("Answer from uploaded documents (mock): " + (q2 || message), "assistant");
        }, 700);
      } else {
        // Normal conversational/mock code helper
        var aiResponse = self.generateMockChatResponse(message);
        self.addMessage(aiResponse, "assistant");
        self.conversationHistory.push({ role: "assistant", content: aiResponse, timestamp: nowISO() });
      }
    }, 900);
  };

  AssistantSidebar.prototype.addMessage = function (text, sender, asHTML) {
    var messagesDiv = this.container.querySelector("#chat-messages");
    if (!messagesDiv) return;
    var msg = el("div", {
      class: "message",
      style:
        "padding:12px 14px;border-radius:12px;max-width:84%;font-size:13px;line-height:1.5;animation:slideIn 0.22s ease;word-wrap:break-word;"
    });
    if (sender === "user") {
      msg.style.background = "linear-gradient(135deg,#667eea,#764ba2)";
      msg.style.color = "white";
      msg.style.marginLeft = "auto";
      msg.style.borderBottomRightRadius = "6px";
      msg.style.boxShadow = "0 6px 18px rgba(102,126,234,0.18)";
    } else {
      msg.style.background = "rgba(255,255,255,0.06)";
      msg.style.color = "white";
      msg.style.border = "1px solid rgba(255,255,255,0.06)";
      msg.style.borderBottomLeftRadius = "6px";
    }
    if (asHTML === "html") msg.innerHTML = text;
    else msg.textContent = text;
    messagesDiv.appendChild(msg);
    // scroll
    var content = this.container.querySelector("#sidebar-content");
    if (content) content.scrollTop = content.scrollHeight;
  };

  AssistantSidebar.prototype.addTypingIndicator = function () {
    var messagesDiv = this.container.querySelector("#chat-messages");
    if (!messagesDiv) return;
    if (document.getElementById("typing-indicator")) return;
    var typingDiv = el("div", { id: "typing-indicator", style: "padding:10px;border-radius:10px;max-width:80%;background:rgba(255,255,255,0.04);display:flex;gap:6px;" }, "");
    typingDiv.innerHTML = '<div style="width:8px;height:8px;background:rgba(255,255,255,0.7);border-radius:50%;animation:typing 1.4s infinite;"></div><div style="width:8px;height:8px;background:rgba(255,255,255,0.7);border-radius:50%;animation:typing 1.4s infinite 0.2s;"></div><div style="width:8px;height:8px;background:rgba(255,255,255,0.7);border-radius:50%;animation:typing 1.4s infinite 0.4s;"></div>';
    messagesDiv.appendChild(typingDiv);
    var content = this.container.querySelector("#sidebar-content");
    if (content) content.scrollTop = content.scrollHeight;
  };

  AssistantSidebar.prototype.removeTypingIndicator = function () {
    var t = document.getElementById("typing-indicator");
    if (t) t.remove();
  };

  AssistantSidebar.prototype.clearAllChats = function () {
    var messagesDiv = this.container.querySelector("#chat-messages");
    if (messagesDiv) messagesDiv.innerHTML = "";
    this.conversationHistory = [];
    var welcome = this.container.querySelector("#welcome");
    if (welcome) welcome.style.display = "block";
  };

  // -- Mock chat response logic ------------------------------------------
  AssistantSidebar.prototype.generateMockChatResponse = function (message) {
    // basic heuristics to produce meaningful mock answers
    var m = message.toLowerCase();
    if (m.includes("explain")) {
      return "I'll explain the code conceptually: break it into main modules, identify inputs/outputs, and trace the control flow. If you paste code, I can annotate line-by-line (mock).";
    }
    if (m.includes("bug") || m.includes("error") || m.includes("debug")) {
      return "Common debugging steps: check stack traces, inspect variable values, add targeted logs, and create minimal reproducer. Mock suggestion: look for null/undefined and async/await issues.";
    }
    if (m.includes("optimize") || m.includes("performance")) {
      return "Optimization tips (mock): avoid nested loops, cache results, use maps/sets for lookup, and defer expensive I/O. Consider profiling to locate hot spots.";
    }
    if (m.includes("document") || m.includes("docs") || m.includes("comment")) {
      return "Documentation advice: add docstrings, function purpose, parameters, return types, and an example usage. I can generate JSDoc/Python docstrings (mock).";
    }
    // fallback conversational mock response
    var fallbacks = [
      "Nice — I can help with that. Do you want a code example or a step-by-step plan?",
      "I can do: explain code, debug, optimize, document, test — which do you want first?",
      "Got it. If you paste a snippet I'll give an inline mock review.",
      "Let's break this down — what's the exact input and expected output?"
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  };

  // -- Image generation (mock) -------------------------------------------
  AssistantSidebar.prototype.generateImage = function () {
    var prompt = (this.container.querySelector("#image-prompt") || {}).value || "";
    if (!prompt || prompt.trim().length === 0) {
      alert("Please enter an image description.");
      return;
    }
    var style = (this.container.querySelector("#image-style") || {}).value || "realistic";
    var size = (this.container.querySelector("#image-size") || {}).value || "1024";

    var placeholder = this.container.querySelector("#image-placeholder");
    if (placeholder) placeholder.style.display = "none";
    var genContainer = this.container.querySelector("#generated-images");

    // show loading card
    var loading = el("div", {
      id: "image-loading",
      style:
        "padding:20px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.04);text-align:center;"
    }, `<div style="width:56px;height:56px;border:4px solid rgba(255,255,255,0.08);border-top-color:#667eea;border-radius:999px;margin:0 auto 10px;animation:spin 1s linear infinite;"></div><div style="color:rgba(255,255,255,0.7);">Generating mock image...</div><style>@keyframes spin{to{transform:rotate(360deg)}}</style>`);
    genContainer.appendChild(loading);
    // generate demo SVG image (data URL) to simulate result
    setTimeout(function () {
      var loadingEl = document.getElementById("image-loading");
      if (loadingEl) loadingEl.remove();
      var colors = ["667eea", "764ba2", "3b82f6", "8b5cf6", "10b981", "f59e0b"];
      var col = colors[Math.floor(Math.random() * colors.length)];
      var col2 = colors[(colors.indexOf(col) + 2) % colors.length];
      var textSafe = encodeURIComponent(prompt.slice(0, 60));
      var svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='800'><rect width='100%' height='100%' fill='#${col}' /><text x='50%' y='48%' text-anchor='middle' font-size='20' fill='white' font-family='Arial'>Mock Image</text><text x='50%' y='56%' text-anchor='middle' font-size='12' fill='white' font-family='Arial' opacity='0.9'>${textSafe}</text></svg>`;
      var url = "data:image/svg+xml;utf8," + encodeURIComponent(svg);
      var card = el("div", { style: "padding:12px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.04);" }, "");
      card.innerHTML = `<img src="${url}" style="width:100%;border-radius:8px;margin-bottom:8px;" /><div style="display:flex;justify-content:space-between;align-items:center;"><div style="color:rgba(255,255,255,0.7);font-size:12px;">${style} • ${size}</div><button style="padding:6px 10px;border-radius:8px;background:rgba(102,126,234,0.12);border:1px solid rgba(102,126,234,0.12);color:#cfe;cursor:pointer;" class="download-mock">Open</button></div>`;
      genContainer.appendChild(card);
      // open image on click
      card.querySelector(".download-mock").addEventListener("click", function () {
        window.open(url);
      });
    }, 900 + Math.floor(Math.random() * 900));
  };

  // -- Web research (mock) ----------------------------------------------
  AssistantSidebar.prototype.performResearch = function () {
    var query = (this.container.querySelector("#research-query") || {}).value || "";
    if (!query || query.trim().length === 0) {
      alert("Please enter a search query.");
      return;
    }
    var placeholder = this.container.querySelector("#research-placeholder");
    if (placeholder) placeholder.style.display = "none";
    var container = this.container.querySelector("#research-results");
    container.innerHTML = "";
    // loading
    var loading = el("div", { style: "padding:12px;border-radius:8px;background:rgba(255,255,255,0.03);text-align:center;color:rgba(255,255,255,0.7);" }, "Mock searching the web...");
    container.appendChild(loading);

    var demoResults = this.generateDemoSearchResults(query);

    setTimeout(function () {
      loading.remove();
      demoResults.forEach(function (r) {
        var card = el("div", { style: "padding:12px;border-radius:8px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.04);cursor:pointer;" }, "");
        card.innerHTML = `<div style="font-size:14px;font-weight:700;color:white;margin-bottom:6px;">${r.title}</div><div style="font-size:12px;color:rgba(255,255,255,0.7);margin-bottom:8px;">${r.snippet}</div><a style="font-size:11px;color:#60a5fa;text-decoration:none;" href="${r.url}" target="_blank">${r.url}</a>`;
        card.addEventListener("click", function () {
          if (r.url) window.open(r.url, "_blank");
        });
        container.appendChild(card);
      });
    }, 700 + Math.random() * 700);
  };

  AssistantSidebar.prototype.generateDemoSearchResults = function (query) {
    var base = "https://example.com/";
    var q = query.replace(/\s+/g, "-").toLowerCase();
    return [
      { title: "Complete Guide to " + query, snippet: "Comprehensive tutorial covering basics to advanced topics.", url: base + "guide-" + q },
      { title: query + " Official Docs", snippet: "Official docs with API reference and examples.", url: base + "docs/" + q },
      { title: "Stack Overflow - " + query, snippet: "Community Q&A and solutions for common problems.", url: "https://stackoverflow.com/search?q=" + encodeURIComponent(query) },
      { title: "GitHub - Projects using " + query, snippet: "Explore open-source projects.", url: "https://github.com/search?q=" + encodeURIComponent(query) },
      { title: query + " Tutorial for Beginners", snippet: "Step-by-step beginner tutorial.", url: base + "tutorial-" + q }
    ];
  };

  // -- Document upload & Q&A (mock) -------------------------------------
  AssistantSidebar.prototype.handleFileUpload = function (e) {
    var files = e.target.files;
    this.processFiles(files);
  };

  AssistantSidebar.prototype.handleFileDrop = function (e) {
    var files = e.dataTransfer.files;
    this.processFiles(files);
  };

  AssistantSidebar.prototype.processFiles = function (files) {
    var self = this;
    var container = this.container.querySelector("#uploaded-files");
    if (!container) return;
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      this.uploadedDocuments.push(file);
      var fileCard = el("div", {
        style:
          "display:flex;justify-content:space-between;align-items:center;padding:10px;border-radius:8px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.04);"
      }, "");
      fileCard.innerHTML = `<div style="display:flex;gap:10px;align-items:center;"><div style="font-size:18px;">📄</div><div><div style="color:white;font-weight:700;font-size:13px;">${file.name}</div><div style="color:rgba(255,255,255,0.6);font-size:11px;">${(file.size/1024).toFixed(1)} KB</div></div></div><div><button data-filename="${file.name}" class="remove-file" style="padding:6px 10px;border-radius:8px;background:rgba(239,68,68,0.14);border:1px solid rgba(239,68,68,0.14);color:#f87171;cursor:pointer;">Remove</button></div>`;
      container.appendChild(fileCard);
    }
    // show doc chat area
    var chatArea = this.container.querySelector("#doc-chat-area");
    if (chatArea) chatArea.style.display = "block";

    // wire remove buttons
    container.querySelectorAll(".remove-file").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var filename = this.getAttribute("data-filename");
        self.removeDocument(filename);
        this.closest("div").remove();
      });
    });
  };

  AssistantSidebar.prototype.removeDocument = function (filename) {
    this.uploadedDocuments = this.uploadedDocuments.filter(function (f) {
      return f.name !== filename;
    });
    if (this.uploadedDocuments.length === 0) {
      var chatArea = this.container.querySelector("#doc-chat-area");
      if (chatArea) chatArea.style.display = "none";
    }
  };

  AssistantSidebar.prototype.askDocument = function () {
    var q = (this.container.querySelector("#doc-question") || {}).value || "";
    if (!q || q.trim().length === 0) return;
    var messagesDiv = this.container.querySelector("#doc-messages");
    var self = this;

    // user bubble
    var userMsg = el("div", { style: "align-self:flex-end;padding:10px;border-radius:8px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;max-width:78%;" }, q);
    messagesDiv.appendChild(userMsg);

    this.container.querySelector("#doc-question").value = "";

    // mock processing
    setTimeout(function () {
      var mockAnswer = "Mock answer based on uploaded documents: I found references that relate to '" + q + "'. Key points: (1) mock summary line A; (2) mock summary line B; (3) mock suggestion.";
      var aiMsg = el("div", { style: "padding:10px;border-radius:8px;background:rgba(255,255,255,0.04);color:white;max-width:78%;" }, mockAnswer);
      messagesDiv.appendChild(aiMsg);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }, 800 + Math.random() * 800);
  };

  AssistantSidebar.prototype.clearDocChat = function () {
    var messagesDiv = this.container.querySelector("#doc-messages");
    if (messagesDiv) messagesDiv.innerHTML = "";
    var uploadContainer = this.container.querySelector("#uploaded-files");
    if (uploadContainer) uploadContainer.innerHTML = "";
    this.uploadedDocuments = [];
    var chatArea = this.container.querySelector("#doc-chat-area");
    if (chatArea) chatArea.style.display = "none";
  };

  // -- Voice input (simulated) -------------------------------------------
  AssistantSidebar.prototype.toggleVoiceInput = function () {
    var btn = this.container.querySelector("#voice-btn");
    if (!this.isRecording) {
      this.isRecording = true;
      btn.style.background = "rgba(239,68,68,0.18)";
      btn.textContent = "⏹️ Stop";
      var self = this;
      // simulate recording and fill input after 2s
      setTimeout(function () {
        if (!self.isRecording) return;
        var simulatedText = "This is a simulated voice transcription for demo purposes.";
        var chatInput = self.container.querySelector("#chat-input");
        if (chatInput) chatInput.value = simulatedText;
        self.isRecording = false;
        btn.style.background = "rgba(16,185,129,0.12)";
        btn.textContent = "🎤 Voice";
      }, 2200 + Math.random() * 800);
    } else {
      // stop early
      this.isRecording = false;
      btn.style.background = "rgba(16,185,129,0.12)";
      btn.textContent = "🎤 Voice";
    }
  };

  // -- Live monitoring ---------------------------------------------------
  AssistantSidebar.prototype.startMonitoring = function () {
    var self = this;
    this.isMonitoring = true;
    // ensure only one interval
    if (this.analysisInterval) clearInterval(this.analysisInterval);
    // capture immediately and then periodic
    this.captureContext();
    this.analysisInterval = setInterval(function () {
      if (!self.isMonitoring) return;
      self.captureContext();
    }, 3000);
    this.updateMonitoringUI(true);
  };

  AssistantSidebar.prototype.stopMonitoring = function () {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
    this.isMonitoring = false;
    this.updateMonitoringUI(false);
  };

  AssistantSidebar.prototype.toggleMonitoring = function () {
    if (this.isMonitoring) this.stopMonitoring();
    else this.startMonitoring();
  };

  AssistantSidebar.prototype.updateMonitoringUI = function (active) {
    var btn = this.container.querySelector("#toggle-monitor-btn");
    var dot = this.container.querySelector("#monitor-status-dot");
    if (!btn || !dot) return;
    if (active) {
      btn.textContent = "ON";
      btn.style.background = "rgba(74,222,128,0.18)";
      btn.style.color = "#4ade80";
      dot.style.background = "#4ade80";
      dot.style.boxShadow = "0 0 12px #4ade80";
    } else {
      btn.textContent = "OFF";
      btn.style.background = "rgba(100,116,139,0.16)";
      btn.style.color = "#94a3b8";
      dot.style.background = "#64748b";
      dot.style.boxShadow = "none";
    }
  };

  AssistantSidebar.prototype.captureContext = function () {
    // detect code like elements on common sites (very best-effort)
    var codeElements = document.querySelectorAll("pre code, .view-line, .CodeMirror-line, .monaco-editor, textarea");
    var codeLines = 0;
    var codeContent = "";
    for (var i = 0; i < Math.min(codeElements.length, 200); i++) {
      var t = codeElements[i].textContent || codeElements[i].value || "";
      if (t && t.trim()) {
        // approximate number of lines
        var lines = (t.match(/\n/g) || []).length + 1;
        codeLines += Math.min(lines, 2000);
        codeContent += t + "\n";
      }
    }
    var ctx = {
      platform: window.location.hostname,
      language: this.detectLanguage(),
      codeLines: codeLines,
      hasCode: codeLines > 0
    };
    this.currentContext = ctx;
    this.updateMonitorDisplay(ctx, codeContent);
  };

  AssistantSidebar.prototype.detectLanguage = function () {
    var url = window.location.href.toLowerCase();
    if (url.match(/\.py|python/)) return "Python";
    if (url.match(/\.js|javascript/)) return "JavaScript";
    if (url.match(/\.java/)) return "Java";
    if (url.match(/\.cpp|\.c|c\+\+/)) return "C/C++";
    // try to inspect text
    var pageText = document.body.innerText.slice(0, 4000).toLowerCase();
    if (pageText.indexOf("import ") > -1 && pageText.indexOf("def ") > -1) return "Python";
    if (pageText.indexOf("function ") > -1 || pageText.indexOf("const ") > -1) return "JavaScript";
    return "Unknown";
  };

  AssistantSidebar.prototype.updateMonitorDisplay = function (context, code) {
    try {
      this.container.querySelector("#current-platform").textContent = context.platform || "-";
      this.container.querySelector("#current-language").textContent = context.language || "-";
      this.container.querySelector("#current-file").textContent = document.title || "-";
      this.container.querySelector("#code-lines-count").textContent = context.codeLines || "0";

      var functions = (code.match(/function\s+|def\s+|class\s+|=>/g) || []).length;
      var comments = (code.match(/\/\/|\/\*|\#|<!--/g) || []).length;
      var quality = Math.min(96, 60 + Math.floor(comments * 2) + (functions > 0 ? 12 : 0));
      var complexity = context.codeLines < 50 ? "Low" : context.codeLines < 200 ? "Medium" : "High";

      this.container.querySelector("#function-count").textContent = functions;
      this.container.querySelector("#comment-count").textContent = comments;
      this.container.querySelector("#quality-score").textContent = quality + "%";
      this.container.querySelector("#quality-bar").style.width = quality + "%";
      this.container.querySelector("#complexity-level").textContent = complexity;

      // random-ish live issues generation (mock)
      var liveIssues = this.container.querySelector("#live-issues");
      var noIssues = this.container.querySelector("#no-issues");
      liveIssues.innerHTML = "";
      if (Math.random() < 0.25 && context.hasCode) {
        var issue = el("div", { style: "padding:8px;border-radius:8px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.12);color:#f87171;" }, "⚠️ Mock: Potential undefined variable near line " + (Math.max(1, Math.floor(Math.random() * Math.max(1, context.codeLines || 10)))));
        liveIssues.appendChild(issue);
        noIssues.style.display = "none";
      } else {
        noIssues.style.display = "block";
      }
    } catch (e) {
      console.warn("updateMonitorDisplay failed", e);
    }
  };

  // -- Helpers: add context to input -------------------------------------
  AssistantSidebar.prototype.addContextToInput = function (contextType) {
    var input = this.container.querySelector("#chat-input");
    var map = {
      code: "Explain the currently selected code in detail",
      file: "Analyze the entire file I'm on and summarize key points",
      error: "Help me debug the following error: "
    };
    if (input) {
      input.value = map[contextType] || "";
      input.focus();
    }
  };

  // -- Helpers: clear doc and chat on page unload or close --------------
  // clearDocChat() and clearAllChats() defined above; they are used.

  // -- finish setup: create instance & expose globally -------------------
  var assistant = new AssistantSidebar();
  window.aiSidebarInstance = assistant;

  // By default do not auto-show; user toggles with Ctrl+Shift+L or call aiSidebarInstance.show()
  console.log("CodeFlow AI Pro (mock mode) content script loaded.");

  // Optionally expose a quick global command for testing in console:
  // window.aiSidebarInstance.show();

})();
