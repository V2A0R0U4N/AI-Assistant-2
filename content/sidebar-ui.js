/* CodeFlow AI Pro - Fixed with Quick Actions & Reopen Functionality */
(function () {
  "use strict";

  var AssistantSidebar = function () {
    this.container = null;
    this.isVisible = false;
    this.isAwaitingResponse = false;
    this.selectedFiles = [];
    this.conversationHistory = [];
    this.init();
  };

  AssistantSidebar.prototype.init = function () {
    this.createDashboard();
    this.setupEvents();
    this.setupGlobalShortcut();
  };

  AssistantSidebar.prototype.createDashboard = function () {
    if (document.getElementById("codeflow-dashboard")) {
      this.container = document.getElementById("codeflow-dashboard");
      return;
    }

    // 🔷 MAIN WRAPPER
    this.container = document.createElement("div");
    this.container.id = "codeflow-dashboard";
    this.container.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 2147483647;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: none;
      flex-direction: column;
      background: transparent;
      pointer-events: none;
    `;

    // 🔷 HEADER BAR
    const topBar = document.createElement("div");
    topBar.style.cssText = `
      height: 70px; display: flex; justify-content: space-between; align-items: center;
      padding: 0 32px;
      background: rgba(255,255,255,0.08);
      backdrop-filter: blur(25px);
      -webkit-backdrop-filter: blur(25px);
      border-bottom: 1px solid rgba(255,255,255,0.1);
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      pointer-events: auto;
    `;
    topBar.innerHTML = `
      <div>
        <div style="font-size: 12px; font-weight: 600; color: #a5b4fc; text-transform: uppercase; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">Currently Working On</div>
        <div id="projectName" style="font-size: 16px; font-weight: 600; color: #ffffff; text-shadow: 0 1px 3px rgba(0,0,0,0.4);">FiberHearts Dashboard Backend</div>
      </div>
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 10px; padding: 8px 16px; background: linear-gradient(135deg, rgba(102,126,234,0.9) 0%, rgba(118,75,162,0.9) 100%); border-radius: 20px; color: white; font-size: 13px; font-weight: 500; box-shadow: 0 4px 12px rgba(102,126,234,0.3);">
          <div style="width: 8px; height: 8px; background: #4ade80; border-radius: 50%; animation: pulse 2s infinite; box-shadow: 0 0 8px #4ade80;"></div>
          <span id="topicMonitor">Chef Payment API Integration</span>
        </div>
        <button id="closeDashboard" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #ffffff; font-size: 20px; cursor: pointer; width: 36px; height: 36px; border-radius: 10px; transition: all 0.2s; backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);">×</button>
      </div>
    `;
    this.container.appendChild(topBar);

    // 🔷 CHAT BOX
    const chatContainer = document.createElement("div");
    chatContainer.id = "chatContainer";
    chatContainer.style.cssText = `
      position: fixed;
      top: 90px; right: 32px;
      width: 420px;
      height: calc(100vh - 120px);
      background: rgba(255,255,255,0.08);
      backdrop-filter: blur(30px);
      -webkit-backdrop-filter: blur(30px);
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      border: 1px solid rgba(255,255,255,0.15);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      pointer-events: auto;
    `;

    chatContainer.innerHTML = `
      <!-- Header -->
      <div style="padding: 20px 24px; background: linear-gradient(135deg, rgba(102,126,234,0.9) 0%, rgba(118,75,162,0.9) 100%); color: white; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.2);">
        <div style="font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 10px;">
          <span>🤖</span><span>AI Assistant</span>
        </div>
      </div>

      <!-- Messages -->
      <div id="chatMessages" style="flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 16px; background: rgba(0,0,0,0.02);">
        <div id="welcomeScreen" style="text-align:center; padding:40px;">
          <div style="font-size: 64px;">🚀</div>
          <h3 style="font-size: 20px; font-weight: 600; margin: 8px 0; color: #ffffff; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">Welcome to CodeFlow AI</h3>
          <p style="font-size: 14px; color: rgba(255,255,255,0.8); margin-bottom: 24px; text-shadow: 0 1px 2px rgba(0,0,0,0.2);">I'm here to help you with your development tasks</p>
          
          <!-- Quick Action Buttons -->
          <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px; margin: 0 auto;">
            <button class="quick-action-btn" data-action="Explain this payment integration code in detail. What does each part do?">
              <span style="font-size: 20px;">📖</span>
              <span>Explain this payment integration</span>
            </button>
            <button class="quick-action-btn" data-action="Review this code for security issues, especially payment handling vulnerabilities and data validation problems.">
              <span style="font-size: 20px;">🔒</span>
              <span>Review for security issues</span>
            </button>
            <button class="quick-action-btn" data-action="Suggest improvements for this payment integration code - performance, error handling, and best practices.">
              <span style="font-size: 20px;">⚡</span>
              <span>Suggest improvements</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Input Area -->
      <div style="padding: 20px 24px; background: rgba(255,255,255,0.05); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-top: 1px solid rgba(255,255,255,0.1);">
        <!-- File Preview Area -->
        <div id="filePreview" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; min-height: 0; transition: all 0.3s;"></div>
        
        <div id="inputWrapper" style="display: flex; gap: 12px; align-items: flex-end;">
          <div style="flex: 1;">
            <textarea id="chatInput" placeholder="Ask anything..." 
              style="width: 100%; background: rgba(255,255,255,0.12); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 2px solid rgba(255,255,255,0.2); border-radius: 12px; padding: 12px 16px; 
              font-size: 14px; font-family: inherit; color: #ffffff; resize: none; max-height: 120px; transition: all 0.2s;"></textarea>
          </div>
          <label for="fileInput" style="cursor: pointer; width: 44px; height: 44px; background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; transition: all 0.2s;">📎</label>
          <input type="file" id="fileInput" style="display:none;" multiple accept="image/*,.pdf,.doc,.docx,.txt,.js,.jsx,.ts,.tsx,.py,.java,.cpp,.c,.html,.css,.json">
          <button id="sendBtn" style="width: 44px; height: 44px; background: linear-gradient(135deg, rgba(102,126,234,0.9) 0%, rgba(118,75,162,0.9) 100%); border: none; border-radius: 12px; color: white; font-size: 20px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(102,126,234,0.3);">↑</button>
        </div>
        <div style="font-size: 11px; color: rgba(255,255,255,0.6); text-align: center; margin-top: 8px; text-shadow: 0 1px 2px rgba(0,0,0,0.2);">Press Enter to send • Shift+Enter for new line</div>
      </div>
    `;
    this.container.appendChild(chatContainer);
    document.body.appendChild(this.container);

    // Add CSS animations
    this.addStyles();
  };

  // 🔷 ADD STYLES
  AssistantSidebar.prototype.addStyles = function () {
    if (document.getElementById("codeflow-styles")) return;
    
    const style = document.createElement("style");
    style.id = "codeflow-styles";
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      .quick-action-btn {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 18px;
        background: rgba(255,255,255,0.12);
        backdrop-filter: blur(15px);
        -webkit-backdrop-filter: blur(15px);
        border: 2px solid rgba(255,255,255,0.2);
        border-radius: 12px;
        color: #ffffff;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        text-align: left;
      }
      
      .quick-action-btn:hover {
        background: rgba(255,255,255,0.18);
        border-color: rgba(102,126,234,0.6);
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
      }
      
      .quick-action-btn:active {
        transform: translateY(0);
      }
      
      #chatMessages::-webkit-scrollbar {
        width: 6px;
      }
      
      #chatMessages::-webkit-scrollbar-track {
        background: rgba(255,255,255,0.05);
      }
      
      #chatMessages::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.2);
        border-radius: 10px;
      }
      
      #chatMessages::-webkit-scrollbar-thumb:hover {
        background: rgba(255,255,255,0.3);
      }
      
      #closeDashboard:hover {
        background: rgba(255,255,255,0.2) !important;
        transform: rotate(90deg);
      }
      
      label[for="fileInput"]:hover,
      #sendBtn:hover {
        transform: scale(1.05);
      }
      
      label[for="fileInput"]:hover {
        background: rgba(255,255,255,0.15) !important;
      }
      
      #chatInput::placeholder {
        color: rgba(255,255,255,0.5);
      }
      
      #chatInput:focus {
        border-color: rgba(102,126,234,0.6);
        background: rgba(255,255,255,0.15);
        outline: none;
      }
      
      #sendBtn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `;
    document.head.appendChild(style);
  };

  // 🔷 EVENTS
  AssistantSidebar.prototype.setupEvents = function () {
    const self = this;
    const fileInput = this.container.querySelector("#fileInput");

    // File upload handling
    fileInput.addEventListener("change", (e) => {
      const files = Array.from(e.target.files);
      self.selectedFiles = [...self.selectedFiles, ...files];
      self.renderFilePreview();
      fileInput.value = "";
    });

    // Input events
    const input = this.container.querySelector("#chatInput");
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        self.sendMessage();
      }
    });
    
    input.addEventListener("input", function () {
      this.style.height = "auto";
      this.style.height = Math.min(this.scrollHeight, 120) + "px";
    });

    // Send button
    this.container.querySelector("#sendBtn").addEventListener("click", () => self.sendMessage());
    
    // Close button
    this.container.querySelector("#closeDashboard").addEventListener("click", () => {
      self.hide();
    });

    // Quick action buttons
    const quickBtns = this.container.querySelectorAll(".quick-action-btn");
    quickBtns.forEach(btn => {
      btn.addEventListener("click", function() {
        const action = this.getAttribute("data-action");
        self.container.querySelector("#chatInput").value = action;
        self.sendMessage();
      });
    });
  };

  // 🔷 KEYBOARD SHORTCUT
  AssistantSidebar.prototype.setupGlobalShortcut = function () {
    const self = this;
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "L" || e.code === "KeyL")) {
        e.preventDefault();
        self.toggle();
      }
    });
  };

  // 🔷 RENDER FILE PREVIEW
  AssistantSidebar.prototype.renderFilePreview = function() {
    const previewContainer = this.container.querySelector("#filePreview");
    previewContainer.innerHTML = "";

    if (this.selectedFiles.length === 0) {
      previewContainer.style.minHeight = "0";
      return;
    }

    previewContainer.style.minHeight = "70px";

    const self = this;
    this.selectedFiles.forEach((file, index) => {
      const preview = document.createElement("div");
      preview.style.cssText = `
        position: relative; border: 2px solid rgba(255,255,255,0.2); border-radius: 12px;
        background: rgba(255,255,255,0.1); box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
        display: flex; align-items: center; justify-content: center; 
        overflow: hidden; width: 70px; height: 70px; 
        transition: all 0.2s;
        animation: fadeIn 0.3s ease-out;
      `;

      preview.addEventListener("mouseenter", () => {
        preview.style.transform = "scale(1.05)";
      });

      preview.addEventListener("mouseleave", () => {
        preview.style.transform = "scale(1)";
      });

      if (file.type.startsWith("image/")) {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        img.style.cssText = `
          width: 100%; height: 100%; 
          object-fit: cover; 
          border-radius: 10px;
        `;
        preview.appendChild(img);
      } else {
        const ext = file.name.split('.').pop().toUpperCase();
        preview.innerHTML = `
          <div style="text-align: center;">
            <div style="font-size: 28px;">📄</div>
            <div style="font-size: 9px; color: #ffffff; font-weight: 600; margin-top: 2px;">${ext}</div>
          </div>
        `;
      }

      // Remove button
      const remove = document.createElement("div");
      remove.textContent = "×";
      remove.style.cssText = `
        position: absolute; top: -8px; right: -8px;
        background: #ef4444; color: white; 
        width: 22px; height: 22px;
        border-radius: 50%; 
        font-size: 16px; font-weight: 700;
        display: flex; align-items: center; justify-content: center; 
        cursor: pointer; 
        box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4);
        transition: all 0.2s;
      `;
      
      remove.addEventListener("mouseenter", () => {
        remove.style.background = "#dc2626";
        remove.style.transform = "scale(1.1)";
      });
      
      remove.addEventListener("mouseleave", () => {
        remove.style.background = "#ef4444";
        remove.style.transform = "scale(1)";
      });

      remove.onclick = () => {
        self.selectedFiles.splice(index, 1);
        self.renderFilePreview();
      };

      preview.appendChild(remove);

      // File name tooltip
      const fileName = document.createElement("div");
      fileName.textContent = file.name;
      fileName.style.cssText = `
        position: absolute; bottom: -28px; left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.9);
        color: white;
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 11px;
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s;
        z-index: 10;
        max-width: 150px;
        overflow: hidden;
        text-overflow: ellipsis;
      `;

      preview.addEventListener("mouseenter", () => {
        fileName.style.opacity = "1";
      });

      preview.addEventListener("mouseleave", () => {
        fileName.style.opacity = "0";
      });

      preview.appendChild(fileName);
      previewContainer.appendChild(preview);
    });
  };

  // 🔷 SHOW/HIDE/TOGGLE
  AssistantSidebar.prototype.show = function () {
    if (this.container) {
      this.container.style.display = "flex";
      this.isVisible = true;
      setTimeout(() => {
        const input = this.container.querySelector("#chatInput");
        if (input) input.focus();
      }, 100);
    }
  };

  AssistantSidebar.prototype.hide = function () {
    if (this.container) {
      this.container.style.display = "none";
      this.isVisible = false;
    }
  };

  AssistantSidebar.prototype.toggle = function () {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  };

  // 🔷 SEND MESSAGE
  AssistantSidebar.prototype.sendMessage = function () {
    const input = this.container.querySelector("#chatInput");
    const sendBtn = this.container.querySelector("#sendBtn");
    const text = input.value.trim();
    const hasFiles = this.selectedFiles.length > 0;

    if (!text && !hasFiles) return;
    if (this.isAwaitingResponse) return;

    // Remove welcome screen
    const welcomeScreen = this.container.querySelector("#welcomeScreen");
    if (welcomeScreen) welcomeScreen.remove();

    // Add user message
    if (text) {
      this.addMessage("user", text);
      this.conversationHistory.push({ role: "user", content: text });
    }

    // Add file messages
    this.selectedFiles.forEach((f) => this.addFileMessage(f));

    // Clear input and files
    this.selectedFiles = [];
    this.renderFilePreview();
    input.value = "";
    input.style.height = "auto";

    // Show typing indicator
    this.isAwaitingResponse = true;
    sendBtn.disabled = true;
    this.addTypingIndicator();

    // Send to background script
    const self = this;
    chrome.runtime.sendMessage({
      action: "chatMessage",
      message: text
    }, function(response) {
      self.removeTypingIndicator();
      self.isAwaitingResponse = false;
      sendBtn.disabled = false;

      if (chrome.runtime.lastError) {
        console.error("Message error:", chrome.runtime.lastError.message);
        self.addMessage("assistant", "⚠️ Connection error. Please reload the page and try again.");
        return;
      }

      if (response && response.success) {
        self.addMessage("assistant", response.response);
        self.conversationHistory.push({ role: "assistant", content: response.response });
      } else {
        const errorMsg = response ? response.response : "An unknown error occurred.";
        self.addMessage("assistant", errorMsg);
      }
    });
  };

  // 🔷 MESSAGE HANDLERS
  AssistantSidebar.prototype.addMessage = function (sender, msg) {
    const chat = this.container.querySelector("#chatMessages");
    const el = document.createElement("div");
    
    // Format markdown-style code blocks and bold text
    let formattedMsg = msg
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<pre style="background: rgba(0,0,0,0.4); color: #e5e7eb; padding: 12px; border-radius: 8px; overflow-x: auto; font-size: 13px; margin: 8px 0; border: 1px solid rgba(255,255,255,0.1);"><code>${this.escapeHtml(code)}</code></pre>`;
      })
      .replace(/`(.*?)`/g, '<code style="background: rgba(255,255,255,0.15); color: #fbbf24; padding: 2px 6px; border-radius: 4px; font-size: 13px;">$1</code>')
      .replace(/\n/g, '<br>');
    
    el.innerHTML = formattedMsg;
    el.style.cssText = `
      padding: 14px 16px; border-radius: 12px; max-width: 85%;
      background: ${sender === "user" ? "rgba(102,126,234,0.3)" : "rgba(255,255,255,0.12)"};
      backdrop-filter: blur(15px);
      -webkit-backdrop-filter: blur(15px);
      border: 1px solid ${sender === "user" ? "rgba(102,126,234,0.4)" : "rgba(255,255,255,0.2)"};
      color: #ffffff;
      align-self: ${sender === "user" ? "flex-end" : "flex-start"};
      font-size: 14px; line-height: 1.5;
      animation: fadeIn 0.3s ease-out;
      box-shadow: 0 2px 12px rgba(0,0,0,0.15);
    `;
    chat.appendChild(el);
    chat.scrollTop = chat.scrollHeight;
  };

  AssistantSidebar.prototype.addFileMessage = function (file) {
    const chat = this.container.querySelector("#chatMessages");
    const el = document.createElement("div");
    el.style.cssText = `
      padding: 12px; border-radius: 12px; max-width: 85%;
      background: rgba(102,126,234,0.3); 
      backdrop-filter: blur(15px);
      -webkit-backdrop-filter: blur(15px);
      border: 1px solid rgba(102,126,234,0.4);
      align-self: flex-end;
      display: flex; flex-direction: column; gap: 8px;
      animation: fadeIn 0.3s ease-out;
      box-shadow: 0 2px 12px rgba(0,0,0,0.15);
    `;
    
    const name = document.createElement("div");
    name.textContent = `${file.type.startsWith("image/") ? "🖼️" : "📄"} ${file.name}`;
    name.style.cssText = "font-size: 13px; color: #ffffff; font-weight: 500;";
    el.appendChild(name);

    if (file.type.startsWith("image/")) {
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      img.style.cssText = `max-width: 200px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.2);`;
      el.appendChild(img);
    }

    chat.appendChild(el);
    chat.scrollTop = chat.scrollHeight;
  };

  AssistantSidebar.prototype.addTypingIndicator = function () {
    const chat = this.container.querySelector("#chatMessages");
    const ind = document.createElement("div");
    ind.id = "typingIndicator";
    ind.style.cssText = `
      display: flex; align-items: center; gap: 8px;
      padding: 14px 16px; border-radius: 12px; max-width: 140px;
      background: rgba(255,255,255,0.12);
      backdrop-filter: blur(15px);
      -webkit-backdrop-filter: blur(15px);
      border: 1px solid rgba(255,255,255,0.2);
      align-self: flex-start;
      animation: fadeIn 0.3s ease-out;
      box-shadow: 0 2px 12px rgba(0,0,0,0.15);
    `;
    ind.innerHTML = `
      <div style="display: flex; gap: 4px;">
        <div style="width: 8px; height: 8px; background: #a5b4fc; border-radius: 50%; animation: pulse 1.4s infinite; box-shadow: 0 0 8px rgba(165,180,252,0.5);"></div>
        <div style="width: 8px; height: 8px; background: #a5b4fc; border-radius: 50%; animation: pulse 1.4s infinite 0.2s; box-shadow: 0 0 8px rgba(165,180,252,0.5);"></div>
        <div style="width: 8px; height: 8px; background: #a5b4fc; border-radius: 50%; animation: pulse 1.4s infinite 0.4s; box-shadow: 0 0 8px rgba(165,180,252,0.5);"></div>
      </div>
      <span style="font-size: 12px; color: #ffffff; font-weight: 500;">AI thinking...</span>
    `;
    chat.appendChild(ind);
    chat.scrollTop = chat.scrollHeight;
  };

  AssistantSidebar.prototype.removeTypingIndicator = function () {
    const ind = this.container.querySelector("#typingIndicator");
    if (ind) ind.remove();
  };

  // Escape HTML to prevent XSS
  AssistantSidebar.prototype.escapeHtml = function(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  window.AssistantSidebar = AssistantSidebar;
})();