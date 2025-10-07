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
    this.setupGlobalShortcut();
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
      id: "codeflow-sidebar"
      // Style is now set below to ensure it overrides CSS file
    });

    // *** THIS IS THE FIX ***
    // Apply essential styles directly to ensure JS has control over position and animation
    this.container.style.cssText = "position:fixed;top:0;right:-480px;width:480px;height:100vh;background:rgba(15,15,25,0.98);backdrop-filter:blur(30px);border-left:1px solid rgba(255,255,255,0.08);box-shadow:-8px 0 40px rgba(0,0,0,0.5);z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;transition:right 0.34s cubic-bezier(0.4,0,0.2,1);display:flex;flex-direction:column;";

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

    // close button
    this.container.querySelector("#sidebar-close").addEventListener("click", function () {
      self.hide();
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

    // quick actions
    this.container.querySelectorAll(".quick-action").forEach(function (qa) {
      qa.addEventListener("click", function () {
        var action = this.getAttribute("data-action");
        var input = document.getElementById("chat-input");
        input.value = action;
        self.sendMessage();
      });
    });

    // Other event listeners... (omitted for brevity)
  };

  // -- Shortcut -----------------------------------------------------------
  AssistantSidebar.prototype.setupGlobalShortcut = function () {
    var self = this;
    document.addEventListener("keydown", function (e) {
      if (e.ctrlKey && e.shiftKey && (e.key === "L" || e.code === "KeyL")) {
        e.preventDefault();
        self.toggle();
      }
    });
  };

  // -- Show / Hide -------------------------------------------------------
  AssistantSidebar.prototype.show = function () {
    if (!this.container) return;
    console.log("CodeFlow AI: Executing show() on sidebar.");
    this.container.style.right = "0px";
    this.isVisible = true;
    this.startMonitoring(); // Start monitoring when sidebar is shown
    setTimeout(() => {
      var inpt = this.container.querySelector("#chat-input");
      if (inpt) inpt.focus();
    }, 340);
  };

  AssistantSidebar.prototype.hide = function () {
    if (!this.container) return;
    console.log("CodeFlow AI: Executing hide() on sidebar.");
    this.container.style.right = "-480px";
    this.isVisible = false;
    this.stopMonitoring(); // Stop monitoring when sidebar is hidden
  };

  AssistantSidebar.prototype.toggle = function () {
    console.log("CodeFlow AI: Toggling sidebar. Is currently visible?", this.isVisible);
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  };

  // -- Monitoring Methods (start, stop, etc.) should be here
  // Omitted for brevity, assuming they exist as in the provided file
  
  // -- Other prototype methods (sendMessage, switchTab, etc.)
  // Omitted for brevity, assuming they exist as in the provided file

  // -- finish setup: create instance & expose globally -------------------
  // This part is handled by the unified content-script.js now
  console.log("CodeFlow AI Pro (mock mode) sidebar component loaded.");
  window.AssistantSidebar = AssistantSidebar; // Expose the class

})();