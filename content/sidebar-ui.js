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
    const self = this;
    this.createDashboard();
    this.setupEvents();
    this.setupGlobalShortcut();
    this.setupSelectionListener();

    // Track scroll to move sidebar with page
    let ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(function () {
          self.updateSidebarPosition();
          ticking = false;
        });
        ticking = true;
      }
    });
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
    // HEADER BAR - DYNAMIC (Hidden until monitoring starts)
    const topBar = document.createElement("div");
    topBar.id = "topBar";
    topBar.style.cssText = `
  height: 0px;
  overflow: hidden;
  opacity: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 32px;
  
  /* iOS 26 Glassmorphism for Top Bar */
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.10) 0%,
    rgba(255, 255, 255, 0.06) 50%,
    rgba(255, 255, 255, 0.08) 100%
  );
  backdrop-filter: blur(40px) saturate(180%) brightness(1.05);
  -webkit-backdrop-filter: blur(40px) saturate(180%) brightness(1.05);
  
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  
  box-shadow: 
    0 4px 30px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(255, 255, 255, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  
  pointer-events: auto;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
`;


    topBar.innerHTML = `
  <div style="flex: 1; opacity: 0;" id="topBarContent">
    <div style="font-size: 11px; font-weight: 600;color: rgba(255,255,255,1); text-transform: uppercase; letter-spacing: 0.8px;">Currently Working On</div>
    <div id="projectName" style="font-size: 15px; font-weight: 600; color: rgba(255,255,255,1);margin-top: 4px;">Platform Detection...</div>
  </div>
  
  <div style="display: flex; align-items: center; gap: 16px;">
    <!-- Platform Badge - RIGHT SIDE, BIGGER -->
    <div id="platformDisplay" style="
      display: none;
      align-items: center;
      gap: 14px;
      padding: 12px 24px;
background: transparent;
   
      border: 2px solid rgba(102,126,234,0.35);
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(102,126,234,0.25);
      transition: all 0.3s ease;
    ">
      <div style="
        width: 14px;
        height: 14px;
        background: #4ade80;
        border-radius: 50%;
        animation: pulse 2.5s infinite;
        box-shadow: 0 0 16px #4ade80, 0 0 32px rgba(74,222,128,0.4);
      "></div>
      <div style="text-align: left;">
        <div id="platformNameDisplay" style="
          font-size: 16px;
          font-weight: 700;
       color: rgba(255,255,255,1);
          letter-spacing: 0.4px;
          text-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">
          LeetCode
        </div>
        <div id="platformTypeDisplay" style="
          font-size: 11px;
          color: rgba(255,255,255,1)
          margin-top: 2px;
          font-weight: 500;
        ">
          Online Judge
        </div>
      </div>
    </div>
    
    <!-- Close Button -->
    <button id="closeDashboard" style="
      width: 42px;
      height: 42px;
      border-radius: 12px;
    background: transparent;
    
      border: 1px solid rgba(255,255,255,0.12);
      color: rgba(255,255,255,1);
      font-size: 24px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 300;
    ">×</button>
  </div>
`;

    this.container.appendChild(topBar);

    // CHAT BOX - ULTRA TRANSPARENT, NO OVERLAP
    const chatContainer = document.createElement("div");
    chatContainer.id = "chatContainer";
    chatContainer.style.cssText = `
  position: absolute;
  top: 90px;
  right: 32px;
  width: 440px;
  height: calc(100vh - 120px);
  
  /* iOS 26 Premium Glassmorphism */
  background: linear-gradient(
    135deg,Line 163:     rgba(255, 255, 255, 0.85) 0%,
Line 164:     rgba(255, 255, 255, 0.75) 50%,
Line 165:     rgba(255, 255, 255, 0.80) 100%

  );
  backdrop-filter: blur(60px) saturate(200%) brightness(1.08);
  -webkit-backdrop-filter: blur(60px) saturate(200%) brightness(1.08);
  
  /* Layered Glass Borders */
Line 171:   border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 30px;
  
  /* Depth & Glow */
  box-shadow: 
  0 30px 90px rgba(0, 0, 0, 0.10),
    0 0 0 1px rgba(255, 255, 255, 0.15),
    inset 0 1px 1px 0 rgba(255, 255, 255, 0.4),
     inset 0 -1px 1px 0 rgba(0, 0, 0, 0.05),
    0 0 60px rgba(102, 126, 234, 0.15);
  
  /* Floating Effect */
  transform: translateZ(0);
  will-change: transform, opacity;
  
  display: flex;
  flex-direction: column;
  overflow: hidden;
  pointer-events: auto;
  
  /* Smooth Premium Motion */
  transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
`;



    chatContainer.innerHTML = `
  <!-- Header - ULTRA TRANSPARENT -->
  <div style="
    padding: 24px;
   background: transparent;
 
   Line 203:    color: #1f2937;

    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255,255,255,0.02);
  ">
    <div style="font-size: 18px; font-weight: 600; display: flex; align-items: center; gap: 12px;">
      <span style="font-size: 24px;">🤖</span>
      <span style="text-shadow: 0 2px 8px rgba(0,0,0,0.5);">AI Assistant</span>
    </div>
  </div>
  
  

  <!-- Monitoring Control Panel - ULTRA TRANSPARENT -->
  <div id="monitoringPanel" style="
    padding: 20px 24px;
    background: transparent;

    border-bottom: 1px solid rgba(255,255,255,0.02);
  ">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <span style="font-size: 13px; font-weight: 600; color: rgba(255,255,255,1); text-shadow: 0 1px 4px rgba(0,0,0,0.3);">Real-Time Monitoring</span>
      <button id="toggleMonitoring" style="
        padding: 6px 16px;
        background: linear-gradient(135deg, rgba(102,126,234,0.9) 0%, rgba(118,75,162,0.9) 100%);
        border: none;
        border-radius: 8px;
        color: white;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: 0 2px 8px rgba(102,126,234,0.4);
      ">
        Start
      </button>
    </div>
    <div id="monitoringStatus" style="font-size: 11px; color: color: rgba(255,255,255,1);display: none;">
      <div style="margin-bottom: 4px;">
        <span style="display: inline-block; width: 8px; height: 8px; background: #4ade80; border-radius: 50%; margin-right: 6px; box-shadow: 0 0 8px #4ade80;"></span>
        <span id="statusText">Monitoring active</span>
      </div>
      <div style="margin-top: 8px; padding: 8px;background: transparent; border-radius: 6px;
 // Fully transparent
 border-radius: 6px; font-size: 10px; border: 1px solid rgba(255,255,255,1);">
        <div style="color: color: rgba(255,255,255,1);">📊 Contexts: <span id="contextCount">0</span></div>
        <div style="color: rgba(255,255,255,1);">🎯 Platform: <span id="platformName">Unknown</span></div>
      </div>
    </div>
  </div>

  <!-- Messages - FULLY TRANSPARENT BACKGROUND -->
  <div id="chatMessages" style="
    flex: 1;
    overflow-y: auto;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    background: transparent;
  ">
    <div id="welcomeScreen" style="text-align:center; padding:40px;">
      <div style="font-size: 64px;">🚀</div>
      <h3 style="
        font-size: 20px;
        font-weight: 600;
        margin: 8px 0;
       color: rgba(255,255,255,1);
        text-shadow: 0 2px 12px rgba(0,0,0,0.5);
      ">Welcome to CodeFlow AI</h3>
      <p style="
        font-size: 14px;
        color: rgba(255,255,255,1);
        margin-bottom: 24px;
        text-shadow: 0 1px 6px rgba(0,0,0,0.4);
      ">Start monitoring to enable context-aware assistance</p>
      
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

 <!-- Input Area - PROPERLY SIZED -->
<div style="
  padding: 16px 20px;
  background: transparent;
  border-top: 1px solid rgba(255,255,255,0.02);
">
  <div id="filePreview" style="
    display: flex; 
    gap: 8px; 
    flex-wrap: wrap; 
    margin-bottom: 12px; 
    min-height: 0; 
    transition: all 0.3s;
  "></div>

  <div id="inputWrapper" style="
    display: flex; 
    gap: 10px; 
    align-items: flex-end;
  ">
    <div style="flex: 1; min-width: 0;">
      <textarea id="chatInput" 
        placeholder="Ask anything..."
        style="
          width: 100%;
          min-height: 80px;
          max-height: 150px;
          background: linear-gradient(135deg, rgba(20, 25, 35, 0.95), rgba(25, 30, 40, 0.95));
          border: 2px solid rgba(255,255,255,0.15);
          border-radius: 12px;
          padding: 14px 16px;
          font-size: 14px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          color: #ffffff;
          resize: vertical;
          transition: all 0.2s;
          line-height: 1.5;
          box-sizing: border-box;
        "
      ></textarea>
    </div>
    
    <label for="fileInput" style="
      cursor: pointer;
      width: 44px;
      height: 44px;
      min-width: 44px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      transition: all 0.2s;
      flex-shrink: 0;
    " onmouseover="this.style.background='rgba(255,255,255,0.1)'" 
       onmouseout="this.style.background='rgba(255,255,255,0.06)'">
      📎
    </label>
    
    <input type="file" id="fileInput" style="display:none;" 
      multiple 
      accept="image/*,.pdf,.doc,.docx,.txt,.js,.jsx,.ts,.tsx,.py,.java,.cpp,.c,.html,.css,.json">
    
    <button id="sendBtn" style="
      width: 44px;
      height: 44px;
      min-width: 44px;
      background: linear-gradient(135deg, rgba(102,126,234,0.9) 0%, rgba(118,75,162,0.9) 100%);
      border: none;
      border-radius: 12px;
      color: white;
      font-size: 20px;
      cursor: pointer;
      transition: all 0.3s;
      box-shadow: 0 4px 12px rgba(102,126,234,0.4);
      flex-shrink: 0;
    " onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 6px 16px rgba(102,126,234,0.6)'" 
       onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 12px rgba(102,126,234,0.4)'">
      ↑
    </button>
  </div>
  
  <div style="
    font-size: 11px;
    color: rgba(255,255,255,0.6);
    text-align: center;
    margin-top: 10px;
    text-shadow: 0 1px 3px rgba(0,0,0,0.3);
  ">
    Press Enter to send • Shift+Enter for new line
  </div>
</div>

`;


    // ✅ NOW add the specular highlight AFTER the HTML
    const specularHighlight = document.createElement('div');
    specularHighlight.id = 'specularHighlight';
    specularHighlight.style.cssText = `
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  background: radial-gradient(
    circle at 50% 50%,
    rgba(255, 255, 255, 0.25) 0%,
    rgba(255, 255, 255, 0.1) 30%,
    transparent 60%
  );
  opacity: 0;
  transition: opacity 0.3s ease, transform 0.1s ease;
  border-radius: 30px;
  mix-blend-mode: overlay;
  z-index: 1;
`;
    chatContainer.appendChild(specularHighlight);

    // Then continue with the rest
    this.container.appendChild(chatContainer);

    // PERMANENT CLOSE BUTTON - Always visible
    const permanentCloseBtn = document.createElement("button");
    permanentCloseBtn.id = "permanentCloseBtn";
    permanentCloseBtn.innerHTML = "×";
    permanentCloseBtn.style.cssText = `
  position: absolute;
  top: 20px;
  right: 20px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  
  /* Premium Glass Effect */
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.25) 0%,
    rgba(255, 255, 255, 0.15) 100%
  );
  backdrop-filter: blur(40px) saturate(180%) brightness(1.2);
  -webkit-backdrop-filter: blur(40px) saturate(180%) brightness(1.2);
  
  /* Glowing Edge */
  border: 1.5px solid rgba(255, 255, 255, 0.35);
  box-shadow: 
    0 12px 40px rgba(0, 0, 0, 0.2),
    0 0 0 1px rgba(255, 255, 255, 0.2),
    inset 0 2px 2px 0 rgba(255, 255, 255, 0.5),
    inset 0 -1px 1px 0 rgba(0, 0, 0, 0.15),
    0 0 30px rgba(255, 255, 255, 0.2);
  
  color: #ffffff;
  font-size: 32px;
  font-weight: 200;
  cursor: pointer;
  
  display: flex;
  align-items: center;
  justify-content: center;
  
  z-index: 2147483648;
  pointer-events: auto;
  
  /* Smooth Transform */
  transform: translateZ(0) scale(1);
  will-change: transform, background, box-shadow;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
`;

    this.container.appendChild(permanentCloseBtn);

    document.body.appendChild(this.container);

    this.addStyles();
    this.detectAndApplyTheme();
  };

  AssistantSidebar.prototype.addStyles = function () {
    if (document.getElementById("codeflow-styles")) return;

    const style = document.createElement("style");
    style.id = "codeflow-styles";
    style.textContent = `
      /* ===== iOS 26 PREMIUM GLASSMORPHISM ===== */
      
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.85; transform: scale(1.08); }
      }
      
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(15px) scale(0.96); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      @keyframes glowPulse {
        0%, 100% { box-shadow: 0 0 20px rgba(102, 126, 234, 0.4); }
        50% { box-shadow: 0 0 40px rgba(102, 126, 234, 0.6); }
      }
      
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-6px); }
      }
      
      /* Container Floating Animation */
     /* Sidebar scrolls with page */
      #chatContainer {
        position: absolute !important;
        z-index: 2147483647 !important;
      }
      /* Parallax Hover */
      #chatContainer:hover {
        transform: translateY(-4px) translateZ(0) !important;
        box-shadow: 
          0 40px 120px rgba(0, 0, 0, 0.3),
          0 0 0 1px rgba(255, 255, 255, 0.2),
          inset 0 1px 1px 0 rgba(255, 255, 255, 0.5),
          0 0 80px rgba(102, 126, 234, 0.25) !important;
      }
      
      /* Close Button Hover */
      #permanentCloseBtn:hover {
        background: linear-gradient(135deg, rgba(239, 68, 68, 0.4) 0%, rgba(220, 38, 38, 0.3) 100%) !important;
        backdrop-filter: blur(50px) saturate(200%) brightness(1.3) !important;
        -webkit-backdrop-filter: blur(50px) saturate(200%) brightness(1.3) !important;
        border-color: rgba(239, 68, 68, 0.7) !important;
        transform: translateZ(0) scale(1.15) rotate(90deg) !important;
        box-shadow: 
          0 16px 50px rgba(239, 68, 68, 0.5),
          0 0 0 2px rgba(239, 68, 68, 0.3),
          inset 0 2px 2px 0 rgba(255, 255, 255, 0.6),
          0 0 60px rgba(239, 68, 68, 0.6) !important;
      }
      
      #permanentCloseBtn:active {
        transform: translateZ(0) scale(0.95) rotate(90deg) !important;
      }
      
      /* Quick Action Buttons */
      .quick-action-btn {
        position: relative;
        overflow: hidden;
      }
      
      .quick-action-btn::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 200%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
        transition: left 0.6s;
      }
      
      .quick-action-btn:hover::before {
        left: 100%;
      }
            /* ============================================
         ADVANCED: Dynamic Specular Highlights
         ============================================ */
      
      #specularHighlight {
        transition: opacity 0.3s ease, transform 0.1s ease-out;
      }
      
      #chatContainer:hover #specularHighlight {
        opacity: 1;
      }
      
      /* Content-aware color adaptation */
      @keyframes colorPulse {
        0%, 100% {
          filter: hue-rotate(0deg);
        }
        50% {
          filter: hue-rotate(5deg);
        }
      }
      
      .color-adaptive {
        animation: colorPulse 10s ease-in-out infinite;
      }
      /* ============================================
         INPUT TEXT COLOR FIX
         ============================================ */
      
       /* Chat Input - Universal Visibility */
          /* Chat Input Text - Universal Visibility */
         /* Chat Input - Lock Text Color (No Dynamic Changes) */
      #chatInput,
      #chatInput:focus,
      #chatInput:active,
      #chatInput:valid,
      #chatInput:-webkit-autofill,
      #chatInput:-webkit-autofill:hover,
      #chatInput:-webkit-autofill:focus,
      #chatInput:-webkit-autofill:active {
        color: #e0e7ff !important;
        -webkit-text-fill-color: #e0e7ff !important;
        font-weight: 500 !important;
        caret-color: #818cf8 !important;
        text-shadow: 
          0 1px 3px rgba(0, 0, 0, 0.9),
          0 -1px 3px rgba(255, 255, 255, 0.3) !important;
      }
      
      #chatInput::placeholder {
        color: rgba(156, 163, 175, 0.7) !important;
        -webkit-text-fill-color: rgba(156, 163, 175, 0.7) !important;
        opacity: 1 !important;
      }
      
      /* Prevent browser from changing styles */
      #chatInput:-webkit-autofill,
      #chatInput:-webkit-autofill:hover,
      #chatInput:-webkit-autofill:focus {
        -webkit-box-shadow: 0 0 0 1000px transparent inset !important;
        transition: background-color 5000s ease-in-out 0s !important;
      }


      /* Input Focus Glow */
      #chatInput:focus {
        background: rgba(255,255,255,0.12) !important;
        border-color: rgba(102,126,234,0.6) !important;
        
        outline: none;
        
        box-shadow: 
          0 0 0 4px rgba(102,126,234,0.15),
          0 8px 24px rgba(102,126,234,0.2),
          inset 0 1px 0 rgba(255,255,255,0.2);
        
        transform: scale(1.01);
      }

      /* ============================================
          INPUT TEXT COLOR FIX
         ============================================ */
      
      #chatInput {
        color: #1f2937 !important;
      }
      
      #chatInput::placeholder {
        color: rgba(107, 114, 128, 0.6) !important;
      }
      
      /* Input Focus Glow */
      #chatInput:focus {
        background: rgba(255,255,255,0.12) !important;
        border-color: rgba(102,126,234,0.6) !important;
        
        outline: none;
        
        box-shadow: 
          0 0 0 4px rgba(102,126,234,0.15),
          0 8px 24px rgba(102,126,234,0.2),
          inset 0 1px 0 rgba(255,255,255,0.2);
        
        transform: scale(1.01);
      }


      .quick-action-btn:hover {
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.25) 0%, rgba(118, 75, 162, 0.20) 100%);
        border-color: rgba(102, 126, 234, 0.6);
        transform: translateY(-4px) scale(1.02);
        box-shadow: 
          0 12px 40px rgba(102, 126, 234, 0.4),
          inset 0 1px 0 rgba(255, 255, 255, 0.3),
          0 0 30px rgba(102, 126, 234, 0.3);
      }
      /* Input Text Color - Light Mode */
#chatInput {
  color: #1f2937 !important;
}

#chatInput::placeholder {
  color: rgba(107, 114, 128, 0.6) !important;
}

/* Input Focus Glow */
#chatInput:focus {
  background: rgba(255,255,255,0.12) !important;
  border-color: rgba(102,126,234,0.6) !important;
  outline: none;
  box-shadow: 
    0 0 0 4px rgba(102,126,234,0.15),
    0 8px 24px rgba(102,126,234,0.2),
    inset 0 1px 0 rgba(255,255,255,0.2);
  transform: scale(1.01);
}

      /* Input Focus Glow */
      #chatInput:focus {
        background: rgba(255,255,255,0.12) !important;
        border-color: rgba(102,126,234,0.6) !important;
        outline: none;
        box-shadow: 
          0 0 0 4px rgba(102,126,234,0.15),
          0 8px 24px rgba(102,126,234,0.2),
          inset 0 1px 0 rgba(255,255,255,0.2);
        transform: scale(1.01);
      }
      
      /* Button Transforms */
      #sendBtn:hover, label[for="fileInput"]:hover {
        transform: translateY(-2px) scale(1.05);
        box-shadow: 0 12px 32px rgba(102,126,234,0.5);
      }
      
      #toggleMonitoring:hover {
        transform: scale(1.08);
        box-shadow: 0 8px 32px rgba(102,126,234,0.6);
        animation: glowPulse 2s infinite;
      }
      
      /* Smooth Rendering */
      * {
        transform-style: preserve-3d;
        backface-visibility: hidden;
        -webkit-font-smoothing: antialiased;
      }

            
      /* ============================================
         DARK MODE ADAPTATIONS
         ============================================ */
      
 
        
    `;

    document.head.appendChild(style);
  };


  // Website theme detection - matches website's theme
  AssistantSidebar.prototype.detectAndApplyTheme = function () {
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

  AssistantSidebar.prototype.applyTheme = function (theme) {
    if (!this.container) return;

    const isDark = theme === 'dark';

    const colors = isDark ? {
      topBarBg: 'transparent',
      topBarText: '#ffffff',
      topBarTextSecondary: '#a5b4fc',
      topBarBorder: 'rgba(255, 255, 255, 0.1)',
      topBarShadow: 'rgba(0,0,0,0.3)',
      chatContainerBg: 'transparent',
      chatContainerBorder: 'rgba(100, 100, 255, 0.3)',
      headerBg: 'transparent',
      headerText: '#ffffff',
      monitoringPanelBg: 'transparent',
      monitoringPanelText: '#ffffff',
      monitoringStatsBg: 'transparent',
      monitoringStatsText: '#ffffff',
      messagesBg: 'transparent',
      welcomeTitle: '#ffffff',
      welcomeText: 'rgba(255,255,255,1)',
      inputAreaBg: 'transparent',
      textareaBg: 'transparent',
      textareaText: '#ffffff',
      textareaBorder: 'rgba(100, 100, 255, 0.3)',
      buttonBg: 'transparent',
      buttonBorder: 'rgba(255,255,255,0.2)',
      quickActionBg: 'transparent',
      quickActionText: '#ffffff',
      quickActionBorder: 'rgba(100, 100, 255, 0.3)',
      closeButtonBg: 'rgba(255,255,255,0.1)',
      closeButtonText: 'white',
      closeButtonBorder: 'rgba(255,255,255,1)',
      placeholderColor: 'rgba(255, 255, 255, 1)'
    } : {
      topBarBg: 'transparent',
      topBarText: '#111827',
      topBarTextSecondary: '#6b7280',
      topBarBorder: 'rgba(0, 0, 0, 0.1)',
      topBarShadow: 'rgba(0,0,0,0.08)',
      chatContainerBg: 'transparent',
      chatContainerBorder: 'rgba(0, 0, 0, 0.08)',
      headerBg: 'transparent',
      headerText: '#111827',
      monitoringPanelBg: 'transparent',
      monitoringPanelText: '#1f2937',
      monitoringStatsBg: 'transparent',
      monitoringStatsText: '#374151',
      messagesBg: 'transparent',
      welcomeTitle: '#111827',
      welcomeText: '#6b7280',
      inputAreaBg: 'transparent',
      textareaBg: 'transparent',
      textareaText: '#111827',
      textareaBorder: 'rgba(0,0,0,0.1)',
      buttonBg: 'transparent',
      buttonBorder: 'rgba(0,0,0,0.1)',
      quickActionBg: 'transparent',
      quickActionText: '#374151',
      quickActionBorder: 'rgba(0, 0, 0, 0.08)',
      closeButtonBg: 'rgba(0,0,0,0.05)',
      closeButtonText: '#111827',
      closeButtonBorder: 'rgba(0,0,0,0.1)',
      placeholderColor: 'rgba(0, 0, 0, 0.4)'
    };
    // Update permanent close button for light/dark theme

    // Rest of the function continues...


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
    // Update permanent close button theme
    const permCloseBtn = this.container.querySelector('#permanentCloseBtn');
    if (permCloseBtn) {
      permCloseBtn.style.background = isDark
        ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.30) 0%, rgba(255, 255, 255, 0.20) 100%)'
        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.15) 100%)';

      permCloseBtn.style.backdropFilter = isDark
        ? 'blur(45px) saturate(180%) brightness(1.25)'
        : 'blur(40px) saturate(180%) brightness(1.2)';

      permCloseBtn.style.webkitBackdropFilter = isDark
        ? 'blur(45px) saturate(180%) brightness(1.25)'
        : 'blur(40px) saturate(180%) brightness(1.2)';

      permCloseBtn.style.border = isDark
        ? '1.5px solid rgba(255, 255, 255, 0.35)'
        : '1.5px solid rgba(255, 255, 255, 0.35)';

      permCloseBtn.style.boxShadow = isDark
        ? `
      0 12px 40px rgba(0, 0, 0, 0.4),
      0 0 0 1px rgba(255, 255, 255, 0.25),
      inset 0 2px 2px 0 rgba(255, 255, 255, 0.6),
      0 0 40px rgba(255, 255, 255, 0.25)
    `
        : `
      0 12px 40px rgba(0, 0, 0, 0.2),
      0 0 0 1px rgba(255, 255, 255, 0.2),
      inset 0 2px 2px 0 rgba(255, 255, 255, 0.5),
      inset 0 -1px 1px 0 rgba(0, 0, 0, 0.15),
      0 0 30px rgba(255, 255, 255, 0.2)
    `;
    }

  };

  // ADVANCED: Content-Aware Color Adaptation
  AssistantSidebar.prototype.startColorAdaptation = function () {
    const self = this;

    function sampleBackgroundColor() {
      const chatContainer = self.container.querySelector('#chatContainer');
      if (!chatContainer) return null;

      const bodyBg = window.getComputedStyle(document.body).backgroundColor;
      const rgb = bodyBg.match(/\d+/g);

      if (rgb && rgb.length >= 3) {
        const r = parseInt(rgb[0]);
        const g = parseInt(rgb[1]);
        const b = parseInt(rgb[2]);

        const brightness = (r * 299 + g * 587 + b * 114) / 1000;

        const max = Math.max(r, g, b);
        let hue = 0;

        if (max === r) {
          hue = ((g - b) / (max - Math.min(r, g, b))) * 60;
        } else if (max === g) {
          hue = (2 + (b - r) / (max - Math.min(r, g, b))) * 60;
        } else {
          hue = (4 + (r - g) / (max - Math.min(r, g, b))) * 60;
        }

        if (hue < 0) hue += 360;

        return {
          r, g, b,
          brightness,
          hue,
          isDark: brightness < 128
        };
      }

      return null;
    }

    function applyColorAdaptation() {
      const colorData = sampleBackgroundColor();
      if (!colorData) return;

      const chatContainer = self.container.querySelector('#chatContainer');
      if (!chatContainer) return;

      let tintColor;

      if (colorData.isDark) {
        const tintOpacity = 0.15;
        tintColor = `rgba(${Math.min(255, colorData.r + 50)}, ${Math.min(255, colorData.g + 50)}, ${Math.min(255, colorData.b + 50)}, ${tintOpacity})`;
      } else {
        const tintOpacity = 0.10;
        tintColor = `rgba(${Math.max(0, colorData.r - 30)}, ${Math.max(0, colorData.g - 30)}, ${Math.max(0, colorData.b - 30)}, ${tintOpacity})`;
      }

      chatContainer.style.background = `
        linear-gradient(
          135deg,
          ${tintColor} 0%,
          rgba(255, 255, 255, ${colorData.isDark ? 0.08 : 0.12}) 50%,
          ${tintColor} 100%
        )
      `;

      const hueRotation = (colorData.hue / 360) * 10;
      chatContainer.style.filter = `hue-rotate(${hueRotation}deg)`;

      chatContainer.classList.add('color-adaptive');
    }

    applyColorAdaptation();

    let adaptationTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(adaptationTimeout);
      adaptationTimeout = setTimeout(applyColorAdaptation, 300);
    });

    window.addEventListener('resize', () => {
      clearTimeout(adaptationTimeout);
      adaptationTimeout = setTimeout(applyColorAdaptation, 300);
    });

    const observer = new MutationObserver(() => {
      clearTimeout(adaptationTimeout);
      adaptationTimeout = setTimeout(applyColorAdaptation, 500);
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['style', 'class']
    });
  };

  AssistantSidebar.prototype.updateQuickActionTheme = function (isDark) {
    const colors = isDark ? {
      bg: 'transparent',
      text: '#ffffff',
      border: 'rgba(100, 100, 255, 0.3)'
    } : {
      bg: 'transparent',
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
  //our existing setupEvents code here

  // Continue with rest of your code..

  AssistantSidebar.prototype.setupEvents = function () {
    const self = this;
    // Permanent close button
    const permCloseBtn = this.container.querySelector("#permanentCloseBtn");
    if (permCloseBtn) {
      permCloseBtn.addEventListener("click", () => {
        self.hide();
      });
    }

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
      // ADVANCED: Dynamic Specular Highlight Tracking
      const chatContainer = this.container.querySelector('#chatContainer');
      const specularHighlight = chatContainer.querySelector('#specularHighlight');

      if (chatContainer && specularHighlight) {
        chatContainer.addEventListener('mousemove', (e) => {
          const rect = chatContainer.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;

          // Update specular highlight position
          specularHighlight.style.background = `
          radial-gradient(
            circle at ${x}% ${y}%,
            rgba(255, 255, 255, 0.3) 0%,
            rgba(255, 255, 255, 0.15) 20%,
            rgba(255, 255, 255, 0.05) 40%,
            transparent 60%
          )
        `;
          specularHighlight.style.opacity = '1';
        });

        chatContainer.addEventListener('mouseleave', () => {
          specularHighlight.style.opacity = '0';
        });
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

  // NEW FUNCTION: Makes sidebar follow scroll position
  AssistantSidebar.prototype.updateSidebarPosition = function () {
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    if (this.container) {
      // Move the container down as user scrolls
      this.container.style.transform = `translateY(${scrollY}px)`;
    }
  };



  // NEW: Show selected text preview (Merlin-style)
AssistantSidebar.prototype.showSelectedTextPreview = function(text, platformInfo, selectionContext) {
  const self = this;
  
  // Find the chatContainer (the main sidebar panel)
  const chatContainer = this.container.querySelector('#chatContainer');
  if (!chatContainer) {
    console.error('Chat container not found');
    return;
  }
  
  // Remove existing preview
  const existingPreview = document.querySelector('#selectedTextPreview');
  if (existingPreview) {
    existingPreview.remove();
  }

  const isCodeBlock = selectionContext?.isCodeBlock;
  
  // Calculate preview dimensions
  const lines = text.split('\n');
  const totalLines = lines.length;
  const isLongText = (totalLines > 3) || (text.length > 300);

  // Create FLOATING preview INSIDE sidebar
  const preview = document.createElement('div');
  preview.id = 'selectedTextPreview';
  preview.style.cssText = `
    position: absolute;
    top: 140px;
    left: 20px;
    right: 20px;
    width: calc(100% - 40px);
    max-height: 420px;
    padding: 14px 16px;
    background: linear-gradient(135deg, rgba(30, 35, 50, 0.98) 0%, rgba(25, 30, 45, 0.98) 100%);
    backdrop-filter: blur(25px);
    -webkit-backdrop-filter: blur(25px);
    border: 2px solid rgba(102, 126, 234, 0.5);
    border-radius: 16px;
    box-shadow: 
      0 12px 40px rgba(0, 0, 0, 0.5),
      0 0 0 1px rgba(255, 255, 255, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
    z-index: 999999;
    animation: popupSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  `;

  // Close button X
  const closeButton = document.createElement('button');
  closeButton.innerHTML = '×';
  closeButton.style.cssText = `
    position: absolute;
    top: 10px;
    right: 10px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(239, 68, 68, 0.95);
    border: none;
    color: white;
    font-size: 24px;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    z-index: 10;
    line-height: 1;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  `;
  
  closeButton.addEventListener('mouseenter', () => {
    closeButton.style.background = 'rgba(220, 38, 38, 1)';
    closeButton.style.transform = 'scale(1.15) rotate(90deg)';
  });
  
  closeButton.addEventListener('mouseleave', () => {
    closeButton.style.background = 'rgba(239, 68, 68, 0.95)';
    closeButton.style.transform = 'scale(1) rotate(0deg)';
  });
  
  closeButton.addEventListener('click', () => {
    preview.style.animation = 'popupSlideOut 0.3s ease-out';
    setTimeout(() => preview.remove(), 300);
  });
  
  preview.appendChild(closeButton);

  // Header
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    padding-right: 40px;
  `;
  
  header.innerHTML = `
    <span style="font-size: 18px;">${platformInfo?.icon || '📄'}</span>
    <div style="flex: 1;">
      <div style="font-weight: 600; font-size: 13px; color: #a5b4fc;">Selected ${isCodeBlock ? 'Code' : 'Text'} • Context Captured</div>
      <div style="font-size: 10px; color: rgba(255,255,255,0.7);">from ${platformInfo?.hostname || 'page'} • ${totalLines} line${totalLines !== 1 ? 's' : ''} • ${text.length} chars</div>
    </div>
    <div style="
      padding: 5px 12px;
      background: rgba(76, 175, 80, 0.25);
      border: 1px solid rgba(76, 175, 80, 0.5);
      border-radius: 14px;
      font-size: 10px;
      color: #4ade80;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 5px;
      box-shadow: 0 0 12px rgba(76, 175, 80, 0.2);
    ">
      <span style="width: 6px; height: 6px; background: #4ade80; border-radius: 50%; display: inline-block; animation: pulse 2s infinite;"></span>
      Active
    </div>
  `;
  
  preview.appendChild(header);

  // Content scrollable area
  const contentContainer = document.createElement('div');
  contentContainer.style.cssText = `
    flex: 1;
    overflow-y: auto;
    max-height: 300px;
  `;

  // Preview text
  const previewText = document.createElement('div');
  previewText.id = 'previewTextContent';
  previewText.style.cssText = `
    font-family: ${isCodeBlock ? 'Courier New, Consolas, monospace' : '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif'};
    font-size: ${isCodeBlock ? '11px' : '12px'};
    white-space: pre-wrap;
    word-wrap: break-word;
    background: rgba(0, 0, 0, 0.5);
    padding: 12px 14px;
    border-radius: 10px;
    color: rgba(255, 255, 255, 0.95);
    line-height: 1.6;
    max-height: ${isLongText ? '130px' : 'auto'};
    overflow-y: ${isLongText ? 'hidden' : 'auto'};
    position: relative;
    border: 1px solid rgba(255, 255, 255, 0.05);
  `;
  
  previewText.textContent = text;

  // Fade overlay
  if (isLongText) {
    const fadeOverlay = document.createElement('div');
    fadeOverlay.id = 'fadeOverlay';
    fadeOverlay.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 50px;
      background: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.8));
      pointer-events: none;
      opacity: 1;
      transition: opacity 0.3s ease;
    `;
    previewText.appendChild(fadeOverlay);
  }

  contentContainer.appendChild(previewText);

  // Expand/Collapse button
  if (isLongText) {
    const expandButton = document.createElement('button');
    expandButton.style.cssText = `
      width: 100%;
      padding: 10px 14px;
      margin-top: 10px;
      background: rgba(102, 126, 234, 0.15);
      border: 1px solid rgba(102, 126, 234, 0.3);
      border-radius: 8px;
      color: rgba(255, 255, 255, 0.95);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
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
        previewText.style.maxHeight = '350px';
        previewText.style.overflowY = 'auto';
        expandButton.innerHTML = `
          <span style="font-size: 14px; transform: rotate(180deg); display: inline-block;">▼</span>
          <span>Show less</span>
        `;
        if (fadeOverlay) fadeOverlay.style.opacity = '0';
      } else {
        previewText.style.maxHeight = '130px';
        previewText.style.overflowY = 'hidden';
        expandButton.innerHTML = `
          <span style="font-size: 14px;">▼</span>
          <span>Show full text (${totalLines} lines)</span>
        `;
        if (fadeOverlay) fadeOverlay.style.opacity = '1';
        previewText.scrollTop = 0;
      }
    });

    expandButton.addEventListener('mouseenter', () => {
      expandButton.style.background = 'rgba(102, 126, 234, 0.25)';
      expandButton.style.borderColor = 'rgba(102, 126, 234, 0.5)';
    });

    expandButton.addEventListener('mouseleave', () => {
      expandButton.style.background = 'rgba(102, 126, 234, 0.15)';
      expandButton.style.borderColor = 'rgba(102, 126, 234, 0.3)';
    });

    contentContainer.appendChild(expandButton);
  }

  preview.appendChild(contentContainer);

  // Info footer
  const footer = document.createElement('div');
  footer.style.cssText = `
    padding-top: 10px;
    margin-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.7);
  `;
  
  footer.innerHTML = `
    <span style="font-size: 14px;">💡</span>
    <span>This context is automatically available to AI • Ask anything about it</span>
  `;
  
  preview.appendChild(footer);

  // Animation styles
  if (!document.querySelector('#selectedTextAnimations')) {
    const style = document.createElement('style');
    style.id = 'selectedTextAnimations';
    style.textContent = `
      @keyframes popupSlideIn {
        from {
          opacity: 0;
          transform: translateY(-30px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      @keyframes popupSlideOut {
        from {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        to {
          opacity: 0;
          transform: translateY(-30px) scale(0.95);
        }
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `;
    document.head.appendChild(style);
  }

  // ✅ CRITICAL: Append to chatContainer (inside sidebar)
  // This ensures it's ABOVE the content but INSIDE the sidebar
  chatContainer.appendChild(preview);

  // Auto-remove after 60 seconds
  setTimeout(() => {
    if (preview.parentElement) {
      preview.style.animation = 'popupSlideOut 0.3s ease-out';
      setTimeout(() => preview.remove(), 300);
    }
  }, 60000);
};



  AssistantSidebar.prototype.startMonitoring = function () {
    const self = this;
    const topBar = self.container.querySelector('#topBar');
    const topBarContent = self.container.querySelector('#topBarContent');

    if (topBar) {
      // Animate top bar appearing
      setTimeout(() => {
        topBar.style.height = '70px';
        topBar.style.opacity = '1';
      }, 100);

      setTimeout(() => {
        if (topBarContent) {
          topBarContent.style.opacity = '1';
          topBarContent.style.transition = 'opacity 0.5s ease 0.3s';
        }
      }, 400);
    }

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

    // ========================================
    // 🆕 NEW: HIDE TOP BAR WITH ANIMATION
    // ========================================
    const topBar = self.container.querySelector('#topBar');
    const topBarContent = self.container.querySelector('#topBarContent');

    if (topBarContent) {
      topBarContent.style.opacity = '0';
    }

    setTimeout(() => {
      if (topBar) {
        topBar.style.height = '0px';
        topBar.style.opacity = '0';
      }
    }, 200);
    // ========================================
    // END NEW CODE
    // ========================================

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

    setTimeout(() => {
      const platformInfo = self.contextMonitorInstance.getPlatformInfo();

      const platformDisplay = self.container.querySelector('#platformDisplay');
      const platformNameDisplay = self.container.querySelector('#platformNameDisplay');
      const platformTypeDisplay = self.container.querySelector('#platformTypeDisplay');
      const projectName = self.container.querySelector('#projectName');

      if (platformDisplay && platformInfo) {
        // Show platform badge
        platformDisplay.style.display = 'flex';

        // Update name and type
        if (platformNameDisplay) {
          platformNameDisplay.textContent = `${platformInfo.icon || '💻'} ${platformInfo.name || 'Platform'}`;
        }

        if (platformTypeDisplay) {
          platformTypeDisplay.textContent = platformInfo.type || 'Web';
        }

        // Update project name on left
        if (projectName) {
          projectName.textContent = `${platformInfo.name || 'Platform'}`;
        }

        // Hover animation
        platformDisplay.addEventListener('mouseenter', () => {
          platformDisplay.style.transform = 'translateY(-2px) scale(1.02)';
          platformDisplay.style.boxShadow = '0 8px 32px rgba(102,126,234,0.4)';
        });

        platformDisplay.addEventListener('mouseleave', () => {
          platformDisplay.style.transform = 'translateY(0) scale(1)';
          platformDisplay.style.boxShadow = '0 4px 20px rgba(102,126,234,0.25)';
        });
      }
    }, 2000);
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