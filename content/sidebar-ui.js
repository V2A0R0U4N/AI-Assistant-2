//* CodeFlow AI Pro - Complete with All Features */
(function () {
  "use strict";

  var AssistantSidebar = function () {
    this.container = null;
    this.isVisible = false;
    this.isAwaitingResponse = false;
    this.selectedFiles = [];
    this.conversationHistory = [];
    this.monitoringActive = false;
    this.statsInterval = null;
    this.contextMonitorInstance = null;
    this.init();
  };

  AssistantSidebar.prototype.init = function () {
    this.createDashboard();
    this.setupEvents();
    this.setupGlobalShortcut();
    this.setupSelectionListener();
  };

  AssistantSidebar.prototype.createDashboard = function () {
    if (document.getElementById("codeflow-dashboard")) {
      this.container = document.getElementById("codeflow-dashboard");
      return;
    }

    // MAIN WRAPPER
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

    // HEADER BAR
    const topBar = document.createElement("div");
    topBar.style.cssText = `
      height: 70px; display: flex; justify-content: space-between; align-items: center;
      padding: 0 32px;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(25px);
      -webkit-backdrop-filter: blur(25px);
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      pointer-events: auto;
    `;
    topBar.innerHTML = `
      <div id="topLeftPlatformDisplay" style="display: none;">
        <div style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; text-shadow: none;">Currently Working On</div>
        <div id="projectName" style="font-size: 16px; font-weight: 600; color: #111827; text-shadow: none;">Loading...</div>
      </div>
      <div id="platformDisplay" style="display: flex; align-items: center; gap: 10px;"></div>
      <button id="closeDashboard" style="width: 36px; height: 36px; border-radius: 50%; background: rgba(0,0,0,0.05); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(0,0,0,0.1); color: #111827; font-size: 20px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center;">×</button>
    `;

    this.container.appendChild(topBar);

    // CHAT BOX
    const chatContainer = document.createElement("div");
    chatContainer.id = "chatContainer";
    chatContainer.style.cssText = `
      position: fixed;
      top: 90px; right: 32px;
      width: 420px;
      height: calc(100vh - 120px);
      background: rgba(255, 255, 255, 0.90);
      backdrop-filter: blur(30px);
      -webkit-backdrop-filter: blur(30px);
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
      border: 1px solid rgba(0, 0, 0, 0.08);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      pointer-events: auto;
    `;

    chatContainer.innerHTML = `
      <!--Header-->
      <div style="padding: 20px 24px; background: rgba(255, 255, 255, 0.95); color: #111827; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(0,0,0,0.08);">
        <div style="font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 10px;">
          <span>🤖</span><span>AI Assistant</span>
        </div>
      </div>

      <!--Monitoring Control Panel-->
      <div id="monitoringPanel" style="padding: 16px 24px; background: rgba(248, 250, 252, 0.95); border-bottom: 1px solid rgba(0,0,0,0.08);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <span style="font-size: 13px; font-weight: 600; color: #1f2937;">Real-Time Monitoring</span>
          <button id="toggleMonitoring" style="padding: 6px 16px; background: linear-gradient(135deg, rgba(102,126,234,0.9) 0%, rgba(118,75,162,0.9) 100%); border: none; border-radius: 8px; color: white; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 8px rgba(102,126,234,0.3);">
            Start
          </button>
        </div>
        <div id="monitoringStatus" style="font-size: 11px; color: #1f2937; display: none;">
          <div style="margin-bottom: 4px;">
            <span style="display: inline-block; width: 8px; height: 8px; background: #4ade80; border-radius: 50%; margin-right: 6px; box-shadow: 0 0 6px #4ade80;"></span>
            <span id="statusText">Monitoring active</span>
          </div>
          <div style="margin-top: 8px; padding: 8px; background: rgba(255, 255, 255, 0.8); border-radius: 6px; font-size: 10px; border: 1px solid rgba(0,0,0,0.06);">
            <div style="color: #374151;">📊 Contexts: <span id="contextCount">0</span></div>
            <div style="color: #374151;">🎯 Platform: <span id="platformName">Unknown</span></div>
          </div>
        </div>
      </div>

      <!--Messages-->
      <div id="chatMessages" style="flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 16px; background: rgba(249, 250, 251, 0.8);">
        <div id="welcomeScreen" style="text-align:center; padding:40px;">
          <div style="font-size: 64px;">🚀</div>
          <h3 style="font-size: 20px; font-weight: 600; margin: 8px 0; color: #111827; text-shadow: none;">Welcome to CodeFlow AI</h3>
          <p style="font-size: 14px; color: #6b7280; margin-bottom: 24px; text-shadow: none;">Start monitoring to enable context-aware assistance</p>
          
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

      <!--Input Area-->
      <div style="padding: 20px 24px; background: rgba(248, 250, 252, 0.95); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-top: 1px solid rgba(0,0,0,0.08);">
        <div id="filePreview" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; min-height: 0; transition: all 0.3s;"></div>

        <div id="inputWrapper" style="display: flex; gap: 12px; align-items: flex-end;">
          <div style="flex: 1;">
            <textarea id="chatInput" placeholder="Ask anything..."
              style="width: 100%; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 2px solid rgba(0,0,0,0.1); border-radius: 12px; padding: 12px 16px; 
              font-size: 14px; font-family: inherit; color: #111827; resize: none; max-height: 120px; transition: all 0.2s;"></textarea>
          </div>
          <label for="fileInput" style="cursor: pointer; width: 44px; height: 44px; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(0,0,0,0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; transition: all 0.2s;">📎</label>
          <input type="file" id="fileInput" style="display:none;" multiple accept="image/*,.pdf,.doc,.docx,.txt,.js,.jsx,.ts,.tsx,.py,.java,.cpp,.c,.html,.css,.json">
          <button id="sendBtn" style="width: 44px; height: 44px; background: linear-gradient(135deg, rgba(102,126,234,0.9) 0%, rgba(118,75,162,0.9) 100%); border: none; border-radius: 12px; color: white; font-size: 20px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(102,126,234,0.3);">↑</button>
        </div>
        <div style="font-size: 11px; color: #6b7280; text-align: center; margin-top: 8px; text-shadow: none;">Press Enter to send • Shift+Enter for new line</div>
      </div>
    `;
    this.container.appendChild(chatContainer);
    document.body.appendChild(this.container);

    this.addStyles();
    this.detectAndApplyTheme();
  };

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

      @keyframes slideUp {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      .quick-action-btn {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 18px;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(15px);
        -webkit-backdrop-filter: blur(15px);
        border: 2px solid rgba(0, 0, 0, 0.08);
        border-radius: 12px;
        color: #374151;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        text-align: left;
      }
      
      .quick-action-btn:hover {
        background: rgba(255, 255, 255, 1);
        border-color: rgba(102, 126, 234, 0.4);
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(102, 126, 234, 0.2);
      }
      
      .quick-action-btn:active {
        transform: translateY(0);
      }

      #chatMessages::-webkit-scrollbar {
        width: 6px;
      }

      #chatMessages::-webkit-scrollbar-track {
        background: rgba(249, 250, 251, 0.5);
      }

      #chatMessages::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 10px;
      }

      #chatMessages::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 0, 0, 0.3);
      }

      #selectedTextPreview div[style*="overflow-y"]::-webkit-scrollbar {
        width: 6px;
      }

      #selectedTextPreview div[style*="overflow-y"]::-webkit-scrollbar-track {
        background: rgba(249, 250, 251, 0.5);
        border-radius: 3px;
      }

      #selectedTextPreview div[style*="overflow-y"]::-webkit-scrollbar-thumb {
        background: rgba(102, 126, 234, 0.5);
        border-radius: 3px;
      }

      #selectedTextPreview div[style*="overflow-y"]::-webkit-scrollbar-thumb:hover {
        background: rgba(102, 126, 234, 0.7);
      }

      #previewTextContent::-webkit-scrollbar {
        width: 8px;
      }

      #previewTextContent::-webkit-scrollbar-track {
        background: rgba(249, 250, 251, 0.8);
        border-radius: 4px;
        margin: 4px;
      }

      #previewTextContent::-webkit-scrollbar-thumb {
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.6) 0%, rgba(118, 75, 162, 0.6) 100%);
        border-radius: 4px;
        border: 2px solid rgba(255, 255, 255, 0.3);
      }

      #previewTextContent::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.8) 0%, rgba(118, 75, 162, 0.8) 100%);
      }

      @keyframes fadeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-10px); }
      }

      #closeDashboard:hover {
        background: rgba(0, 0, 0, 0.1) !important;
        transform: rotate(90deg);
      }

      label[for="fileInput"]:hover,
      #sendBtn:hover {
        transform: scale(1.05);
      }

      label[for="fileInput"]:hover {
        background: rgba(0, 0, 0, 0.05) !important;
      }

      #chatInput::placeholder {
        color: rgba(0, 0, 0, 0.4);
      }

      #chatInput:focus {
        border-color: rgba(102, 126, 234, 0.6);
        background: rgba(255, 255, 255, 1);
        outline: none;
      }

      #sendBtn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      #toggleMonitoring:hover {
        transform: scale(1.05);
        box-shadow: 0 4px 16px rgba(102, 126, 234, 0.5);
      }
    `;
    document.head.appendChild(style);
  };

  // Website theme detection - matches website's theme
  AssistantSidebar.prototype.detectAndApplyTheme = function() {
    const self = this;
    let currentIsDark = null;
    
    function isWebsiteDark() {
      const body = document.body;
      const bgColor = window.getComputedStyle(body).backgroundColor;
      
      const rgb = bgColor.match(/\d+/g);
      if (rgb) {
        const r = parseInt(rgb[0]);
        const g = parseInt(rgb[1]);
        const b = parseInt(rgb[2]);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        
        if (brightness < 128) {
          return true;
        }
      }
      
      const darkClasses = ['dark', 'dark-mode', 'theme-dark', 'darkmode'];
      const htmlClass = document.documentElement.className.toLowerCase();
      const bodyClass = document.body.className.toLowerCase();
      
      for (const darkClass of darkClasses) {
        if (htmlClass.includes(darkClass) || bodyClass.includes(darkClass)) {
          return true;
        }
      }
      
      const htmlTheme = document.documentElement.getAttribute('data-theme');
      const bodyTheme = document.body.getAttribute('data-theme');
      
      if (htmlTheme === 'dark' || bodyTheme === 'dark') {
        return true;
      }
      
      return false;
    }
    
    function checkAndApply() {
      const isDark = isWebsiteDark();
      if (isDark !== currentIsDark) {
        currentIsDark = isDark;
        self.applyTheme(isDark ? 'dark' : 'light');
        console.log('[Theme] Applied', isDark ? 'DARK' : 'LIGHT', 'theme');
      }
    }
    
    checkAndApply();
    
    const observer = new MutationObserver(() => {
      checkAndApply();
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'style']
    });
    
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'style']
    });
  };

  AssistantSidebar.prototype.applyTheme = function(theme) {
    if (!this.container) return;
    
    const isDark = theme === 'dark';
    
    const colors = isDark ? {
      topBarBg: 'rgba(26, 27, 38, 0.95)',
      topBarText: '#ffffff',
      topBarTextSecondary: '#a5b4fc',
      topBarBorder: 'rgba(255, 255, 255, 0.1)',
      topBarShadow: 'rgba(0,0,0,0.3)',
      chatContainerBg: 'rgba(26, 27, 38, 0.95)',
      chatContainerBorder: 'rgba(100, 100, 255, 0.3)',
      headerBg: 'rgba(26, 27, 38, 0.95)',
      headerText: '#ffffff',
      monitoringPanelBg: 'rgba(30, 35, 50, 0.9)',
      monitoringPanelText: '#ffffff',
      monitoringStatsBg: 'rgba(40, 42, 58, 0.9)',
      monitoringStatsText: '#ffffff',
      messagesBg: 'rgba(20, 22, 35, 0.6)',
      welcomeTitle: '#ffffff',
      welcomeText: 'rgba(255,255,255,0.8)',
      inputAreaBg: 'rgba(30, 35, 50, 0.95)',
      textareaBg: 'rgba(40, 42, 58, 0.9)',
      textareaText: '#ffffff',
      textareaBorder: 'rgba(100, 100, 255, 0.3)',
      buttonBg: 'rgba(40, 42, 58, 0.9)',
      buttonBorder: 'rgba(255,255,255,0.2)',
      quickActionBg: 'rgba(40, 42, 58, 0.9)',
      quickActionText: '#ffffff',
      quickActionBorder: 'rgba(100, 100, 255, 0.3)',
      closeButtonBg: 'rgba(255,255,255,0.1)',
      closeButtonText: 'white',
      closeButtonBorder: 'rgba(255,255,255,0.2)',
      placeholderColor: 'rgba(255, 255, 255, 0.5)'
    } : {
      topBarBg: 'rgba(255, 255, 255, 0.85)',
      topBarText: '#111827',
      topBarTextSecondary: '#6b7280',
      topBarBorder: 'rgba(0, 0, 0, 0.1)',
      topBarShadow: 'rgba(0,0,0,0.08)',
      chatContainerBg: 'rgba(255, 255, 255, 0.90)',
      chatContainerBorder: 'rgba(0, 0, 0, 0.08)',
      headerBg: 'rgba(255, 255, 255, 0.95)',
      headerText: '#111827',
      monitoringPanelBg: 'rgba(248, 250, 252, 0.95)',
      monitoringPanelText: '#1f2937',
      monitoringStatsBg: 'rgba(255, 255, 255, 0.8)',
      monitoringStatsText: '#374151',
      messagesBg: 'rgba(249, 250, 251, 0.8)',
      welcomeTitle: '#111827',
      welcomeText: '#6b7280',
      inputAreaBg: 'rgba(248, 250, 252, 0.95)',
      textareaBg: 'rgba(255, 255, 255, 0.95)',
      textareaText: '#111827',
      textareaBorder: 'rgba(0,0,0,0.1)',
      buttonBg: 'rgba(255, 255, 255, 0.95)',
      buttonBorder: 'rgba(0,0,0,0.1)',
      quickActionBg: 'rgba(255, 255, 255, 0.95)',
      quickActionText: '#374151',
      quickActionBorder: 'rgba(0, 0, 0, 0.08)',
      closeButtonBg: 'rgba(0,0,0,0.05)',
      closeButtonText: '#111827',
      closeButtonBorder: 'rgba(0,0,0,0.1)',
      placeholderColor: 'rgba(0, 0, 0, 0.4)'
    };
    
    const topBar = this.container.querySelector('#codeflow-dashboard > div:first-child');
    if (topBar) {
      topBar.style.background = colors.topBarBg;
      topBar.style.borderBottom = `1px solid ${colors.topBarBorder}`;
      topBar.style.boxShadow = `0 2px 12px ${colors.topBarShadow}`;
      
      const platformDisplay = topBar.querySelector('#topLeftPlatformDisplay');
      if (platformDisplay) {
        const label = platformDisplay.querySelector('div:first-child');
        const projectName = platformDisplay.querySelector('#projectName');
        if (label) label.style.color = colors.topBarTextSecondary;
        if (projectName) projectName.style.color = colors.topBarText;
      }
      
      const closeBtn = topBar.querySelector('#closeDashboard');
      if (closeBtn) {
        closeBtn.style.background = colors.closeButtonBg;
        closeBtn.style.color = colors.closeButtonText;
        closeBtn.style.border = `1px solid ${colors.closeButtonBorder}`;
      }
    }
    
    const chatContainer = this.container.querySelector('#chatContainer');
    if (chatContainer) {
      chatContainer.style.background = colors.chatContainerBg;
      chatContainer.style.border = `1px solid ${colors.chatContainerBorder}`;
      
      const header = chatContainer.querySelector('div:first-child');
      if (header) {
        header.style.background = colors.headerBg;
        header.style.color = colors.headerText;
      }
      
      const monitoringPanel = chatContainer.querySelector('#monitoringPanel');
      if (monitoringPanel) {
        monitoringPanel.style.background = colors.monitoringPanelBg;
        const title = monitoringPanel.querySelector('span');
        if (title) title.style.color = colors.monitoringPanelText;
        
        const monitoringStatus = monitoringPanel.querySelector('#monitoringStatus');
        if (monitoringStatus) {
          monitoringStatus.style.color = colors.monitoringPanelText;
          const statsDiv = monitoringStatus.querySelector('div[style*="padding: 8px"]');
          if (statsDiv) {
            statsDiv.style.background = colors.monitoringStatsBg;
            statsDiv.querySelectorAll('div').forEach(d => d.style.color = colors.monitoringStatsText);
          }
        }
      }
      
      const chatMessages = chatContainer.querySelector('#chatMessages');
      if (chatMessages) {
        chatMessages.style.background = colors.messagesBg;
        
        const welcomeScreen = chatMessages.querySelector('#welcomeScreen');
        if (welcomeScreen) {
          const title = welcomeScreen.querySelector('h3');
          const text = welcomeScreen.querySelector('p');
          if (title) title.style.color = colors.welcomeTitle;
          if (text) text.style.color = colors.welcomeText;
        }
      }
      
      const inputArea = chatContainer.querySelector('div[style*="padding: 20px 24px"]:last-child');
      if (inputArea) {
        inputArea.style.background = colors.inputAreaBg;
        
        const textarea = inputArea.querySelector('#chatInput');
        if (textarea) {
          textarea.style.background = colors.textareaBg;
          textarea.style.color = colors.textareaText;
          textarea.style.border = `2px solid ${colors.textareaBorder}`;
        }
        
        const fileLabel = inputArea.querySelector('label[for="fileInput"]');
        if (fileLabel) {
          fileLabel.style.background = colors.buttonBg;
          fileLabel.style.border = `1px solid ${colors.buttonBorder}`;
        }
        
        const helpText = inputArea.querySelector('div[style*="font-size: 11px"]');
        if (helpText) helpText.style.color = colors.welcomeText;
      }
    }
    
    this.updateQuickActionTheme(isDark);
  };

  AssistantSidebar.prototype.updateQuickActionTheme = function(isDark) {
    const colors = isDark ? {
      bg: 'rgba(40, 42, 58, 0.9)',
      text: '#ffffff',
      border: 'rgba(100, 100, 255, 0.3)'
    } : {
      bg: 'rgba(255, 255, 255, 0.95)',
      text: '#374151',
      border: 'rgba(0, 0, 0, 0.08)'
    };
    
    const buttons = this.container.querySelectorAll('.quick-action-btn');
    buttons.forEach(btn => {
      btn.style.background = colors.bg;
      btn.style.color = colors.text;
      btn.style.border = `2px solid ${colors.border}`;
    });
  };

  AssistantSidebar.prototype.setupEvents = function () {
    // Your existing setupEvents code here
  };

  // Continue with rest of your code...




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
      btn.addEventListener("click", function () {
        const action = this.getAttribute("data-action");
        self.container.querySelector("#chatInput").value = action;
        self.sendMessage();
      });
    });

    // Monitoring toggle
    const toggleMonitoringBtn = this.container.querySelector("#toggleMonitoring");
    toggleMonitoringBtn.addEventListener("click", () => {
      if (self.monitoringActive) {
        self.stopMonitoring();
      } else {
        self.startMonitoring();
      }
    });
  };

  // NEW: Setup selection listener for auto-fill
  AssistantSidebar.prototype.setupSelectionListener = function () {
    const self = this;

    window.addEventListener('message', (event) => {
      if (event.data.type === 'CODEFLOW_TEXT_SELECTED') {
        self.showSelectedTextPreview(event.data.text, event.data.platform, event.data.context);
      }
    });
  };

  // NEW: Show selected text preview (Merlin-style)
  AssistantSidebar.prototype.showSelectedTextPreview = function(text, platformInfo, selectionContext) {
    const self = this;
    
    // Remove existing preview
    const existingPreview = this.container.querySelector('#selectedTextPreview');
    if (existingPreview) existingPreview.remove();
    
    const isCodeBlock = selectionContext?.isCodeBlock;
    
    // Calculate preview dimensions
    const lines = text.split('\n');
    const totalLines = lines.length;
    const isLongText = totalLines > 3 || text.length > 300;
    
    // Create preview container
    const preview = document.createElement('div');
    preview.id = 'selectedTextPreview';
    preview.style.cssText = `
      padding: 12px 16px;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
      border: 2px solid rgba(102, 126, 234, 0.4);
      border-radius: 12px;
      margin-bottom: 12px;
      animation: slideUp 0.3s ease-out;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      position: relative;
    `;
    
    // Close button (X) - top right corner
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: rgba(239, 68, 68, 0.8);
      border: none;
      color: white;
      font-size: 18px;
      font-weight: bold;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      z-index: 10;
      line-height: 1;
    `;
    
    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.background = 'rgba(239, 68, 68, 1)';
      closeButton.style.transform = 'scale(1.1)';
    });
    
    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.background = 'rgba(239, 68, 68, 0.8)';
      closeButton.style.transform = 'scale(1)';
    });
    
    closeButton.addEventListener('click', () => {
      preview.style.animation = 'fadeOut 0.3s ease-out';
      setTimeout(() => preview.remove(), 300);
    });
    
    preview.appendChild(closeButton);
    
    // Header with platform info
    const header = document.createElement('div');
    header.style.cssText = `

    display: flex;
align-items: center;
gap: 8px;
margin-bottom: 10px;
padding-right: 30px;
`;

header.innerHTML = `
<span style="font-size: 16px;">${platformInfo?.icon || '📝'}</span>
<div style="flex: 1;">
  <div style="font-weight: 600; font-size: 12px; color: #a5b4fc;">
    Selected${isCodeBlock ? ' Code' : ' Text'} • Context Captured
  </div>
  <div style="font-size: 10px; color: rgba(255,255,255,0.6);">
    from ${platformInfo?.hostname || 'page'} • ${totalLines} line${totalLines > 1 ? 's' : ''} • ${text.length} chars
  </div>
</div>
<div style="
  padding: 4px 10px;
  background: rgba(76, 175, 80, 0.2);
  border: 1px solid rgba(76, 175, 80, 0.4);
  border-radius: 12px;
  font-size: 10px;
  color: #4ade80;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
">
  <span style="width: 6px; height: 6px; background: #4ade80; border-radius: 50%; display: inline-block;"></span>
  Active
</div>
`;

// Content container with collapse/expand
const contentContainer = document.createElement('div');
contentContainer.id = 'previewContent';

// Preview text (collapsed by default if long)
const previewText = document.createElement('div');
previewText.id = 'previewTextContent';
previewText.style.cssText = `
  font-family: ${isCodeBlock ? "'Courier New', 'Consolas', monospace" : 'inherit'};
  font-size: ${isCodeBlock ? '11px' : '12px'};
  white-space: pre-wrap;
  word-wrap: break-word;
  background: rgba(0, 0, 0, 0.4);
  padding: 12px;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.95);
  line-height: 1.6;
  max-height: ${isLongText ? '80px' : 'none'};
  overflow: hidden;
  position: relative;
  transition: max-height 0.3s ease;
`;

previewText.textContent = text;

// Add fade gradient for collapsed state
if (isLongText) {
  const fadeOverlay = document.createElement('div');
  fadeOverlay.id = 'fadeOverlay';
  fadeOverlay.style.cssText = `
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 40px;
    background: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.6));
    pointer-events: none;
  `;
  previewText.style.position = 'relative';
  previewText.appendChild(fadeOverlay);
}

contentContainer.appendChild(previewText);

// Expand/Collapse button (only for long text)
if (isLongText) {
  const expandButton = document.createElement('button');
  expandButton.id = 'expandButton';
  expandButton.style.cssText = `
    width: 100%;
    padding: 6px 12px;
    margin-top: 8px;
    background: rgba(40, 42, 58, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    color: rgba(255, 255, 255, 0.8);
    font-size: 11px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  `;

  expandButton.innerHTML = `
    <span style="font-size: 14px;">▼</span>
    <span>Show full text (${totalLines} lines)</span>
  `;

  let isExpanded = false;

  expandButton.addEventListener('click', () => {
    isExpanded = !isExpanded;
    const fadeOverlay = previewText.querySelector('#fadeOverlay');

    if (isExpanded) {
      // Expand
      const fullHeight = Math.min(previewText.scrollHeight, 400);
      previewText.style.maxHeight = fullHeight + 'px';
      previewText.style.overflowY = 'auto';
      expandButton.innerHTML = `
        <span style="font-size: 14px; transform: rotate(180deg); display: inline-block;">▼</span>
        <span>Show less</span>
      `;
      if (fadeOverlay) fadeOverlay.style.display = 'none';
    } else {
      // Collapse
      previewText.style.maxHeight = '80px';
      previewText.style.overflowY = 'hidden';
      expandButton.innerHTML = `
        <span style="font-size: 14px;">▼</span>
        <span>Show full text (${totalLines} lines)</span>
      `;
      if (fadeOverlay) fadeOverlay.style.display = 'block';
    }
  });

  expandButton.addEventListener('mouseenter', () => {
    expandButton.style.background = 'rgba(255,255,255,0.15)';
  });

  expandButton.addEventListener('mouseleave', () => {
    expandButton.style.background = 'rgba(255,255,255,0.1)';
  });

  contentContainer.appendChild(expandButton);
}

// Info footer
const footer = document.createElement('div');
footer.style.cssText = `
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
`;

footer.innerHTML = `
  <span style="font-size: 12px;">ℹ️</span>
  <span>This context is automatically available to AI • Ask anything about it</span>
`;

// Assemble preview
preview.appendChild(header);
preview.appendChild(contentContainer);
preview.appendChild(footer);

// Insert into DOM
const inputWrapper = this.container.querySelector('#inputWrapper');
inputWrapper.parentElement.insertBefore(preview, inputWrapper);

// Auto-remove after 60 seconds
setTimeout(() => {
  if (preview.parentElement) {
    preview.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => preview.remove(), 300);
  }
}, 60000);
};

AssistantSidebar.prototype.startMonitoring = function () {
  const self = this;
  const toggleMonitoringBtn = this.container.querySelector("#toggleMonitoring");
  const monitoringStatus = this.container.querySelector("#monitoringStatus");

  console.log("[Sidebar] 🚀 Starting monitoring...");

  // Create ContextMonitor instance if not exists
  if (!self.contextMonitorInstance) {
    if (window.ContextMonitor) {
      console.log("[Sidebar] Creating ContextMonitor instance...");
      self.contextMonitorInstance = new window.ContextMonitor();
      console.log("[Sidebar] ✅ ContextMonitor created!");
    } else {
      console.error("[Sidebar] ❌ ContextMonitor class not found!");
      alert("ERROR: ContextMonitor not loaded! Please refresh the page.");
      return;
    }
  }

  if (!self.contextMonitorInstance) {
    console.error("[Sidebar] ❌ Failed to create ContextMonitor instance!");
    return;
  }

  // Start monitoring DIRECTLY
  console.log("[Sidebar] Starting ContextMonitor directly...");
  self.contextMonitorInstance.start();
  console.log("[Sidebar] ✅ ContextMonitor.start() called!");

  // Notify background
  if (chrome.runtime && chrome.runtime.id) {
    chrome.runtime.sendMessage({ action: "startMonitoring" }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn("[Sidebar] Background notification failed");
      }
    });
  }

  // Update UI
  self.monitoringActive = true;
  toggleMonitoringBtn.textContent = "Stop";
  toggleMonitoringBtn.style.background = "rgba(239, 68, 68, 0.9)";
  monitoringStatus.style.display = "block";

  console.log("[Sidebar] ✅ Monitoring started");

  // Start stats polling
  self.updateMonitoringStats();

  // NEW: Update platform display
  self.updatePlatformDisplay();
};

AssistantSidebar.prototype.stopMonitoring = function () {
  const self = this;
  const toggleMonitoringBtn = this.container.querySelector("#toggleMonitoring");
  const monitoringStatus = this.container.querySelector("#monitoringStatus");

  console.log("[Sidebar] ⏹️ Stopping monitoring...");

  // Stop stats interval FIRST
  if (self.statsInterval) {
    clearInterval(self.statsInterval);
    self.statsInterval = null;
    console.log("[Sidebar] Stats interval cleared");
  }

  // Stop ContextMonitor DIRECTLY
  if (self.contextMonitorInstance) {
    console.log("[Sidebar] Stopping ContextMonitor directly...");
    self.contextMonitorInstance.stop();
    console.log("[Sidebar] ✅ ContextMonitor.stop() called");
  }

  // Notify background
  if (chrome.runtime && chrome.runtime.id) {
    chrome.runtime.sendMessage({ action: "stopMonitoring" });
  }

  // Update UI
  self.monitoringActive = false;
  toggleMonitoringBtn.textContent = "Start";
  toggleMonitoringBtn.style.background = "linear-gradient(135deg, rgba(102,126,234,0.9) 0%, rgba(118,75,162,0.9) 100%)";
  monitoringStatus.style.display = "none";

  console.log("[Sidebar] ✅ Monitoring stopped");
};

AssistantSidebar.prototype.updateMonitoringStats = function () {
  const self = this;

  console.log("[Sidebar] Starting stats polling...");

  if (self.statsInterval) {
    clearInterval(self.statsInterval);
  }

  self.statsInterval = setInterval(() => {
    if (!self.monitoringActive) {
      console.log("[Sidebar] Monitoring inactive, stopping stats polling");
      clearInterval(self.statsInterval);
      self.statsInterval = null;
      return;
    }

    // Get stats DIRECTLY from ContextMonitor instance
    if (self.contextMonitorInstance) {
      const status = self.contextMonitorInstance.getStatus();

      const contextCount = self.container.querySelector("#contextCount");
      const platformName = self.container.querySelector("#platformName");

      if (contextCount) {
        contextCount.textContent = status.bufferSize || 0;
      }
      if (platformName) {
        const platformInfo = status.platformInfo || {};
        platformName.textContent = platformInfo.name || 'Web';
      }
    }

    // ALSO check background for total sent count
    if (chrome.runtime && chrome.runtime.id) {
      try {
        chrome.runtime.sendMessage({ action: "getMonitoringStatus" }, (response) => {
          if (chrome.runtime.lastError) {
            return;
          }

          if (response && response.success && response.contextCount > 0) {
            const contextCount = self.container.querySelector("#contextCount");
            if (contextCount) {
              contextCount.textContent = response.contextCount;
            }
          }
        });
      } catch (error) {
        console.error("[Sidebar] Exception in background check:", error);
      }
    }
  }, 3000);
};

// NEW: Update platform display in header
AssistantSidebar.prototype.updatePlatformDisplay = function () {
  const self = this;
  
  if (!self.contextMonitorInstance) return;

  // Wait for platform detection to complete
  setTimeout(() => {
    const platformInfo = self.contextMonitorInstance.getPlatformInfo();
    
    // Update top-left display
    const topLeftDisplay = self.container.querySelector('#topLeftPlatformDisplay');
    const projectName = self.container.querySelector('#projectName');

    if (topLeftDisplay && projectName && platformInfo) {
      topLeftDisplay.style.display = 'block';
      projectName.textContent = `${platformInfo.icon || '💻'} ${platformInfo.name || 'Unknown Platform'}`;
    }
    
    // Update top-right display
    const platformDisplay = self.container.querySelector('#platformDisplay');

    if (platformDisplay && platformInfo) {
      platformDisplay.innerHTML = `
        <div style="width: 8px; height: 8px; background: #4ade80; border-radius: 50%; animation: pulse 2s infinite; box-shadow: 0 0 8px #4ade80;"></div>
        <div style="text-align: left;">
          <div style="font-size: 12px; font-weight: 600;">
            ${platformInfo.icon || '💻'} ${platformInfo.name || 'Platform'}
          </div>
          <div style="font-size: 9px; opacity: 0.8;">${platformInfo.type || 'Web'}</div>
        </div>
      `;
    }
  }, 2000); // Wait for AI identification
};

AssistantSidebar.prototype.setupGlobalShortcut = function () {
  const self = this;
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === "L" || e.code === "KeyL")) {
      e.preventDefault();
      self.toggle();
    }
  });
};

AssistantSidebar.prototype.renderFilePreview = function () {
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
      position: relative; border: 2px solid rgba(100, 100, 255, 0.3); border-radius: 12px;
      background: rgba(40, 42, 58, 0.9); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
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

    const fileName = document.createElement("div");
    fileName.textContent = file.name;
    fileName.style.cssText = `
      position: absolute; bottom: -28px; left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.9);
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

    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }
};

AssistantSidebar.prototype.toggle = function () {
  if (this.isVisible) {
    this.hide();
  } else {
    this.show();
  }
};

AssistantSidebar.prototype.sendMessage = function () {
  const input = this.container.querySelector("#chatInput");
  const sendBtn = this.container.querySelector("#sendBtn");
  const text = input.value.trim();
  const hasFiles = this.selectedFiles.length > 0;

  if (!text && !hasFiles) return;
  if (this.isAwaitingResponse) return;

  const welcomeScreen = this.container.querySelector("#welcomeScreen");
  if (welcomeScreen) welcomeScreen.remove();

  if (text) {
    this.addMessage("user", text);
    this.conversationHistory.push({ role: "user", content: text });
  }

  this.selectedFiles.forEach((f) => this.addFileMessage(f));

  this.selectedFiles = [];
  this.renderFilePreview();
  input.value = "";
  input.style.height = "auto";

  this.isAwaitingResponse = true;
  sendBtn.disabled = true;
  this.addTypingIndicator();

  const self = this;
  chrome.runtime.sendMessage({
    action: "chatMessage",
    message: text
  }, function (response) {
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

AssistantSidebar.prototype.addMessage = function (sender, msg) {
  const chat = this.container.querySelector("#chatMessages");
  const el = document.createElement("div");

  let formattedMsg = msg
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/``````/g, (match, code) => {
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
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  `;
  chat.appendChild(el);
  chat.scrollTop = chat.scrollHeight;
};

AssistantSidebar.prototype.addFileMessage = function (file) {
  const chat = this.container.querySelector("#chatMessages");
  const el = document.createElement("div");
  el.style.cssText = `
    padding: 12px; border-radius: 12px; max-width: 85%;
    background: rgba(102, 126, 234, 0.3);
    backdrop-filter: blur(15px);
    -webkit-backdrop-filter: blur(15px);
    border: 1px solid rgba(102, 126, 234, 0.4);
    align-self: flex-end;
    display: flex; flex-direction: column; gap: 8px;
    animation: fadeIn 0.3s ease-out;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  `;

  const name = document.createElement("div");
  name.textContent = `${file.type.startsWith("image/") ? "🖼️" : "📄"} ${file.name}`;
  name.style.cssText = "font-size: 13px; color: #ffffff; font-weight: 500;";
  el.appendChild(name);

  if (file.type.startsWith("image/")) {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.style.cssText = `max-width: 200px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2); border: 1px solid rgba(255, 255, 255, 0.2);`;
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
    background: rgba(40, 42, 58, 0.9);
    backdrop-filter: blur(15px);
    -webkit-backdrop-filter: blur(15px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    align-self: flex-start;
    animation: fadeIn 0.3s ease-out;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
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

AssistantSidebar.prototype.escapeHtml = function (text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

window.AssistantSidebar = AssistantSidebar;
})();