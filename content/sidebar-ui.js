/* CodeFlow AI Pro - Content Script with Gemini AI integration */
(function () {
  "use strict";

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

  var AssistantSidebar = function () {
    this.container = null;
    this.isVisible = false;
    this.isAwaitingResponse = false;
    this.conversationHistory = [];
    this.init();
  };

  AssistantSidebar.prototype.init = function () {
    this.createSidebar();
    this.setupEvents();
    this.setupGlobalShortcut();
  };

  AssistantSidebar.prototype.createSidebar = function () {
    if (document.getElementById("codeflow-sidebar")) {
      this.container = document.getElementById("codeflow-sidebar");
      return;
    }

    this.container = el("div", { id: "codeflow-sidebar" });
    this.container.style.cssText = "position:fixed;top:0;right:-480px;width:480px;height:100vh;background:rgba(15,15,25,0.98);backdrop-filter:blur(30px);border-left:1px solid rgba(255,255,255,0.08);box-shadow:-8px 0 40px rgba(0,0,0,0.5);z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;transition:right 0.34s cubic-bezier(0.4,0,0.2,1);display:flex;flex-direction:column;";

    var headerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><div style="display:flex;align-items:center;gap:12px;"><div style="width:44px;height:44px;background:linear-gradient(135deg,#667eea,#764ba2);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 6px 16px rgba(102,126,234,0.28);">🤖</div><div><div style="color:white;font-weight:700;font-size:17px;">CodeFlow AI Pro</div><div style="color:rgba(255,255,255,0.55);font-size:11px;margin-top:2px;">All-in-one coding assistant</div></div></div><button id="sidebar-close" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.06);color:rgba(255,255,255,0.75);font-size:20px;cursor:pointer;width:36px;height:36px;border-radius:10px;transition:all 0.2s;">×</button></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;"><div style="padding:10px;background:rgba(74,222,128,0.1);border-radius:10px;display:flex;align-items:center;gap:8px;border:1px solid rgba(74,222,128,0.18);"><div id="status-dot" style="width:8px;height:8px;background:#4ade80;border-radius:50%;box-shadow:0 0 10px #4ade80;animation:pulse 2s infinite;"></div><span style="color:#4ade80;font-size:11px;font-weight:700;">LIVE CONNECTION</span></div><div style="padding:10px;background:rgba(72,133,237,0.1);border-radius:10px;display:flex;align-items:center;gap:8px;border:1px solid rgba(72,133,237,0.2);"><span style="color:#89b4f8;font-size:11px;font-weight:700;">🔷 POWERED BY GEMINI</span></div></div>`;
    var header = el("div", { style: "padding:18px;background:linear-gradient(135deg,rgba(102,126,234,0.08),rgba(118,75,162,0.08));border-bottom:1px solid rgba(255,255,255,0.06);" }, headerHTML);
    
    var tabsHTML = ['<button class="tab-btn active" data-tab="chat">💬 Chat</button>', '<button class="tab-btn" data-tab="image" disabled>🎨 Image</button>', '<button class="tab-btn" data-tab="research" disabled>🔍 Web</button>', '<button class="tab-btn" data-tab="docs" disabled>📄 Docs</button>', '<button class="tab-btn" data-tab="monitor" disabled>📊 Live</button>'].join("");
    var tabs = el("div", { style: "display:grid;grid-template-columns:repeat(5,1fr);padding:10px;gap:6px;background:rgba(0,0,0,0.28);border-bottom:1px solid rgba(255,255,255,0.06);overflow-x:auto;" }, tabsHTML);

    var content = el("div", { id: "sidebar-content", style: "flex:1;overflow-y:auto;padding:16px;box-sizing:border-box;" });
    var chatTab = el("div", { id: "chat-tab", class: "tab-content" });
    chatTab.innerHTML = `<div id="chat-messages" style="display:flex;flex-direction:column;gap:12px;margin-bottom:16px;"></div><div id="welcome" style="text-align:center;padding:30px 18px;"><div style="font-size:60px;margin-bottom:12px;">🚀</div><h3 style="color:white;margin:0 0 8px 0;font-size:18px;">Welcome to CodeFlow AI Pro</h3><p style="color:rgba(255,255,255,0.66);margin:0 0 16px 0;font-size:13px;line-height:1.6;">Connected to Google Gemini. Ask me anything about your code!</p><div style="display:grid;gap:10px;"><button class="quick-action" data-action="Explain the selected code">📖 Explain selected code</button><button class="quick-action" data-action="Find bugs in the current file">🐛 Find bugs in this file</button><button class="quick-action" data-action="Suggest improvements for this code">⚡ Suggest improvements</button></div></div>`;

    var inputAreaHTML = `<div style="display:flex;gap:8px;align-items:flex-end;"><textarea id="chat-input" placeholder="Ask Gemini anything..." style="flex:1;min-height:48px;max-height:120px;background:rgba(255,255,255,0.04);border-radius:10px;padding:10px;border:1px solid rgba(255,255,255,0.06);color:white;resize:none;"></textarea><button id="send-btn" style="width:48px;height:48px;background:linear-gradient(135deg,#667eea,#764ba2);border:none;border-radius:10px;color:white;font-size:20px;cursor:pointer;transition: background 0.2s;">↑</button></div><div style="font-size:11px;color:rgba(255,255,255,0.44);text-align:center;margin-top:10px;">Ctrl+Shift+L to toggle sidebar</div>`;
    var inputArea = el("div", { style: "padding:14px;border-top:1px solid rgba(255,255,255,0.04);background:rgba(0,0,0,0.34);" }, inputAreaHTML);
    
    content.appendChild(chatTab);
    this.container.appendChild(header);
    this.container.appendChild(tabs);
    this.container.appendChild(content);
    this.container.appendChild(inputArea);

    document.body.appendChild(this.container);
    this.addStyles();
  };

  AssistantSidebar.prototype.addStyles = function () {
    if (document.getElementById("codeflow-styles")) return;
    var styles = `
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
      @keyframes typing{0%,60%,100%{opacity:0.35;transform:scale(0.9)}30%{opacity:1;transform:scale(1)}}
      #codeflow-sidebar .message.user{align-self:flex-end}
      #codeflow-sidebar .message.ai{align-self:flex-start}
      #codeflow-sidebar ::-webkit-scrollbar{width:8px}
      #codeflow-sidebar ::-webkit-scrollbar-thumb{background:linear-gradient(180deg,#667eea,#764ba2);border-radius:10px}
      #codeflow-sidebar .tab-btn{padding:10px 8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:rgba(255,255,255,0.75);font-size:12px;cursor:pointer;}
      #codeflow-sidebar .tab-btn:disabled{opacity:0.4;cursor:not-allowed;}
      #codeflow-sidebar .tab-btn.active{background:rgba(255,255,255,0.10);border:1px solid rgba(255,255,255,0.12);color:white;}
      #codeflow-sidebar .quick-action{padding:12px;background:rgba(255,255,255,0.05);border-radius:10px;border:1px solid rgba(255,255,255,0.1);color:white;cursor:pointer;text-align:left;font-size:13px;}
      #codeflow-sidebar .quick-action:hover{background:rgba(255,255,255,0.1);}
      #codeflow-sidebar pre { background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; margin: 8px 0; overflow-x: auto; font-size: 13px; color: #a5b4f8; }
      #codeflow-sidebar code { font-family: 'Courier New', Courier, monospace; }
      #send-btn:disabled { background: #555; cursor: not-allowed; }
    `;
    var styleEl = el("style", { id: "codeflow-styles" }, styles);
    document.head.appendChild(styleEl);
  };

  AssistantSidebar.prototype.setupEvents = function () {
    var self = this;
    this.container.querySelector("#sidebar-close").addEventListener("click", () => self.hide());
    this.container.querySelector("#send-btn").addEventListener("click", () => self.sendMessage());
    const chatInput = this.container.querySelector("#chat-input");
    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        self.sendMessage();
      }
    });
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = (chatInput.scrollHeight) + 'px';
    });
    this.container.querySelectorAll(".quick-action").forEach(qa => {
      qa.addEventListener("click", function() {
        document.getElementById("chat-input").value = this.getAttribute("data-action");
        self.sendMessage();
      });
    });
  };
  
  AssistantSidebar.prototype.setupGlobalShortcut = function () {
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "L" || e.code === "KeyL")) {
        e.preventDefault();
        this.toggle();
      }
    });
  };
  
  AssistantSidebar.prototype.show = function () {
    if (!this.container) return;
    this.container.style.right = "0px";
    this.isVisible = true;
    setTimeout(() => this.container.querySelector("#chat-input")?.focus(), 340);
  };
  AssistantSidebar.prototype.hide = function () {
    if (!this.container) return;
    this.container.style.right = "-480px";
    this.isVisible = false;
  };
  AssistantSidebar.prototype.toggle = function () {
    if (this.isVisible) this.hide(); else this.show();
  };

  AssistantSidebar.prototype.sendMessage = function () {
    const input = this.container.querySelector("#chat-input");
    const sendBtn = this.container.querySelector("#send-btn");
    const message = input.value.trim();

    if (!message || this.isAwaitingResponse) {
        return;
    }

    this.isAwaitingResponse = true;
    sendBtn.disabled = true;
    this.container.querySelector("#welcome")?.remove();
    this.addMessage(message, "user");
    this.conversationHistory.push({ role: "user", content: message });
    input.value = "";
    input.style.height = '48px';

    this.addTypingIndicator();
    const self = this;

    chrome.runtime.sendMessage({
        action: "chatMessage",
        message: message
    }, function(response) {
        self.removeTypingIndicator();
        self.isAwaitingResponse = false;
        sendBtn.disabled = false;

        if (chrome.runtime.lastError) {
            console.error("sendMessage Error:", chrome.runtime.lastError.message);
            self.addMessage("Error: Could not connect to the assistant. Reload the page and extension.", "assistant");
            return;
        }

        if (response && response.success) {
            self.addMessage(response.response, "assistant");
            self.conversationHistory.push({ role: "assistant", content: response.response });
        } else {
            const errorMessage = response ? response.response : "An unknown error occurred.";
            self.addMessage(errorMessage, "assistant");
        }
    });
  };

  AssistantSidebar.prototype.addMessage = function (text, sender) {
    const messagesDiv = this.container.querySelector("#chat-messages");
    if (!messagesDiv) return;

    let sanitizedText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    sanitizedText = sanitizedText.replace(/^#+\s/gm, '');

    const formattedHTML = sanitizedText
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
            return `<pre><code class="language-${lang}">${code}</code></pre>`;
        })
        .replace(/`(.*?)`/g, '<code>$1</code>') // Inline code
        .replace(/\n/g, '<br>');

    const msg = el("div", { class: `message ${sender}` });
    if (sender === "user") {
        msg.style.cssText = "padding:12px 16px;border-radius:12px;max-width:84%;font-size:14px;line-height:1.6;background:linear-gradient(135deg,#667eea,#764ba2);color:white;margin-left:auto;border-bottom-right-radius:4px;box-shadow:0 4px 16px rgba(102,126,234,0.18);word-wrap:break-word;";
    } else {
        msg.style.cssText = "padding:12px 16px;border-radius:12px;max-width:84%;font-size:14px;line-height:1.6;background:rgba(255,255,255,0.06);color:white;border:1px solid rgba(255,255,255,0.08);border-bottom-left-radius:4px;word-wrap:break-word;";
    }

    msg.innerHTML = formattedHTML;
    messagesDiv.appendChild(msg);
    messagesDiv.parentElement.scrollTop = messagesDiv.parentElement.scrollHeight;
  };

  AssistantSidebar.prototype.addTypingIndicator = function () {
    if (document.getElementById("typing-indicator")) return;
    const messagesDiv = this.container.querySelector("#chat-messages");
    const typingDiv = el("div", { id: "typing-indicator", style: "padding:14px;border-radius:12px;background:rgba(255,255,255,0.06);display:flex;gap:6px;max-width:80px;" });
    typingDiv.innerHTML = '<div style="width:8px;height:8px;background:rgba(255,255,255,0.7);border-radius:50%;animation:typing 1.4s infinite;"></div><div style="width:8px;height:8px;background:rgba(255,255,255,0.7);border-radius:50%;animation:typing 1.4s infinite 0.2s;"></div><div style="width:8px;height:8px;background:rgba(255,255,255,0.7);border-radius:50%;animation:typing 1.4s infinite 0.4s;"></div>';
    messagesDiv.appendChild(typingDiv);
    messagesDiv.parentElement.scrollTop = messagesDiv.parentElement.scrollHeight;
  };

  AssistantSidebar.prototype.removeTypingIndicator = function () {
    document.getElementById("typing-indicator")?.remove();
  };

  window.AssistantSidebar = AssistantSidebar;
})();