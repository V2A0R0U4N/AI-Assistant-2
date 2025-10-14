// Enhanced Popup.js - Extension popup with live monitoring dashboard

class PopupController {
    constructor() {
        this.taskInput = document.getElementById('taskInput');
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.openSidebarBtn = document.getElementById('openSidebarBtn');
        this.openOverlayBtn = document.getElementById('openOverlayBtn');
        this.monitorToggle = document.getElementById('monitorToggle');
        this.errorToggle = document.getElementById('errorToggle');
        this.suggestToggle = document.getElementById('suggestToggle');
        this.isMonitoring = false;
        this.statusUpdateInterval = null;
        this.init();
    }

    async init() {
        await this.loadSavedData();
        this.setupEventListeners();
        this.loadStats();
        this.createActivityDebugPanel();
        this.startStatusUpdates();
        this.checkExtensionReady();
    }

    async checkExtensionReady() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) return;

            // Test if content script is loaded
            chrome.tabs.sendMessage(tab.id, { action: 'ping' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.log("Content script not ready:", chrome.runtime.lastError.message);
                    this.showNotification('⚠️ Please refresh the page to activate the extension', 'warning');
                } else {
                    console.log("✅ Extension ready on this page");
                }
            });
        } catch (error) {
            console.error("Error checking extension status:", error);
        }
    }

    async loadSavedData() {
        try {
            const data = await chrome.storage.local.get([
                'taskDescription', 'monitoringEnabled', 'errorDetection', 'proactiveSuggestions'
            ]);

            if (data.taskDescription) {
                this.taskInput.value = data.taskDescription;
            }
            this.isMonitoring = data.monitoringEnabled || false;
            if (this.isMonitoring) {
                this.showStopButton();
                this.monitorToggle.classList.add('active');
            }
            if (data.errorDetection !== false) this.errorToggle.classList.add('active');
            if (data.proactiveSuggestions !== false) this.suggestToggle.classList.add('active');
        } catch (error) {
            console.error('Failed to load saved data:', error);
        }
    }

    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startMonitoring());
        this.stopBtn.addEventListener('click', () => this.stopMonitoring());
        this.openSidebarBtn.addEventListener('click', () => this.openSidebar());
        this.openOverlayBtn.addEventListener('click', () => this.openOverlay());

        let saveTimeout;
        this.taskInput.addEventListener('input', () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => this.saveTaskDescription(), 500);
        });

        this.monitorToggle.addEventListener('click', () => {
            if (this.isMonitoring) this.stopMonitoring();
            else this.startMonitoring();
        });

        this.errorToggle.addEventListener('click', () => this.toggleSetting('errorDetection', this.errorToggle));
        this.suggestToggle.addEventListener('click', () => this.toggleSetting('proactiveSuggestions', this.suggestToggle));
        
        const helpLink = document.getElementById('helpLink');
        if (helpLink) {
            helpLink.addEventListener('click', (e) => {
                e.preventDefault();
                chrome.tabs.create({ url: 'https://github.com/yourusername/codeflow-ai' });
            });
        }
    }

    createActivityDebugPanel() {
        const content = document.querySelector('.content');
        
        const debugSection = document.createElement('div');
        debugSection.className = 'section';
        debugSection.innerHTML = `
            <div class="section-title">🔍 Live Activity Monitor</div>
            <div id="activityDebugPanel" style="
                background: rgba(0, 0, 0, 0.3);
                border-radius: 12px;
                padding: 16px;
                max-height: 200px;
                overflow-y: auto;
                font-family: 'Courier New', monospace;
                font-size: 11px;
                line-height: 1.6;
            ">
                <div id="monitoringStatus" style="margin-bottom: 12px; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 6px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span>Status:</span>
                        <span id="statusText" style="color: #fbbf24;">Idle</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span>Contexts:</span>
                        <span id="activityCount">0</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span>Platform:</span>
                        <span id="platformName">Unknown</span>
                    </div>
                </div>
                <div id="activityLogContainer" style="color: rgba(255,255,255,0.8);">
                    <div style="text-align: center; padding: 20px; opacity: 0.5;">
                        Start monitoring to see live activities
                    </div>
                </div>
            </div>
        `;
        
        // Insert before settings section
        const settings = document.querySelector('.section');
        if (settings) {
            content.insertBefore(debugSection, settings);
        }
    }

    // FIXED: Start status updates with error handling
    startStatusUpdates() {
        console.log("[Popup] Starting status updates...");
        
        // Clear any existing interval
        if (this.statusUpdateInterval) {
            clearInterval(this.statusUpdateInterval);
        }
        
        // Update status every 2 seconds
        this.statusUpdateInterval = setInterval(() => {
            this.updateMonitoringStatus();
        }, 2000);
    }

    // FIXED: Update monitoring status with proper error handling
    async updateMonitoringStatus() {
        try {
            const statusText = document.getElementById('statusText');
            const activityCount = document.getElementById('activityCount');
            const platformName = document.getElementById('platformName');

            if (!statusText) {
                console.warn("[Popup] Status elements not found");
                return;
            }

            if (this.isMonitoring) {
                statusText.textContent = 'Active';
                statusText.style.color = '#4ade80';

                // Check if extension context is valid
                if (!chrome.runtime || !chrome.runtime.id) {
                    console.error("[Popup] Extension context invalidated");
                    clearInterval(this.statusUpdateInterval);
                    this.statusUpdateInterval = null;
                    return;
                }

                // Get monitoring status from background
                try {
                    chrome.runtime.sendMessage({ action: 'getMonitoringStatus' }, (response) => {
                        // Check for context invalidation
                        if (chrome.runtime.lastError) {
                            console.warn("[Popup] Background not responding:", chrome.runtime.lastError.message);
                            // Don't clear interval - might be temporary
                            return;
                        }

                        if (response && response.success) {
                            if (activityCount) {
                                activityCount.textContent = response.contextCount || 0;
                                console.log("[Popup] Context count updated:", response.contextCount);
                            }
                            if (platformName) {
                                platformName.textContent = response.platform || 'Unknown';
                                console.log("[Popup] Platform updated:", response.platform);
                            }
                        }
                    });
                } catch (error) {
                    console.error("[Popup] Error sending message:", error);
                }
            } else {
                statusText.textContent = 'Idle';
                statusText.style.color = '#fbbf24';
            }
        } catch (error) {
            console.error('[Popup] Error updating status:', error);
        }
    }

    async openSidebar() {
        console.log("[Popup] Opening sidebar...");
        
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
            this.showNotification('⚠️ No active tab found', 'warning');
            return;
        }

        // Check if on restricted page
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://')) {
            this.showNotification('❌ Extension cannot run on browser pages. Try opening a website first.', 'error');
            return;
        }

        try {
            // Send toggleSidebar message (matches content-script.js)
            chrome.tabs.sendMessage(tab.id, { action: 'toggleSidebar' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('[Popup] Sidebar error:', chrome.runtime.lastError.message);
                    this.showNotification('❌ Could not open sidebar. Please refresh the page and try again.', 'error');
                } else if (response && response.success) {
                    console.log("[Popup] ✅ Sidebar opened successfully");
                    this.showNotification('✅ Sidebar opened! Press Ctrl+Shift+L to toggle.', 'success');
                    setTimeout(() => window.close(), 1500);
                } else {
                    console.error('[Popup] Sidebar failed:', response);
                    this.showNotification('❌ Sidebar failed to open. Refresh the page.', 'error');
                }
            });
        } catch (error) {
            console.error('[Popup] Error opening sidebar:', error);
            this.showNotification('❌ Error: ' + error.message, 'error');
        }
    }

    async openOverlay() {
        console.log("[Popup] Opening overlay...");
        
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
            this.showNotification('⚠️ No active tab found', 'warning');
            return;
        }

        // Check if on restricted page
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://')) {
            this.showNotification('❌ Extension cannot run on browser pages. Try opening a website first.', 'error');
            return;
        }

        try {
            chrome.tabs.sendMessage(tab.id, { action: 'toggleAssistant', isActive: true }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('[Popup] Overlay error:', chrome.runtime.lastError.message);
                    this.showNotification('❌ Could not open overlay. Please refresh the page.', 'error');
                } else if (response && response.success) {
                    console.log("[Popup] ✅ Overlay opened successfully");
                    this.showNotification('✅ Overlay opened! Press Ctrl+Shift+A to toggle.', 'success');
                    setTimeout(() => window.close(), 1500);
                } else {
                    this.showNotification('❌ Overlay failed to open. Refresh the page.', 'error');
                }
            });
        } catch (error) {
            console.error('[Popup] Error opening overlay:', error);
            this.showNotification('❌ Error: ' + error.message, 'error');
        }
    }

    async startMonitoring() {
        console.log("[Popup] Starting monitoring...");
        
        const taskText = this.taskInput.value.trim();
        if (!taskText) {
            this.showNotification('⚠️ Please describe your task first', 'warning');
            this.taskInput.focus();
            return;
        }

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
            this.showNotification('⚠️ No active tab found', 'warning');
            return;
        }

        // Check if on restricted page
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://')) {
            this.showNotification('❌ Extension cannot run on browser pages. Open a website first.', 'error');
            return;
        }

        await this.saveTaskDescription();
        this.isMonitoring = true;
        await chrome.storage.local.set({ monitoringEnabled: true });
        
        // Notify background to start monitoring
        if (chrome.runtime && chrome.runtime.id) {
            chrome.runtime.sendMessage({ action: 'startMonitoring' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.warn("[Popup] Background message error:", chrome.runtime.lastError.message);
                } else {
                    console.log("[Popup] ✅ Background monitoring started");
                }
            });
        }
        
        this.showStopButton();
        this.monitorToggle.classList.add('active');

        try {
            chrome.tabs.sendMessage(tab.id, { action: 'startMonitoring' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('[Popup] Failed to start monitoring:', chrome.runtime.lastError.message);
                    this.showNotification('❌ Connection failed. Refresh the page and try again.', 'error');
                    this.stopMonitoring();
                } else if (response && response.success) {
                    console.log("[Popup] ✅ Monitoring started successfully");
                    this.showNotification('✅ Monitoring started!', 'success');
                    this.incrementStat('sessionsCount');
                } else {
                    this.showNotification('❌ Failed to start. Refresh the page.', 'error');
                    this.stopMonitoring();
                }
            });
        } catch (error) {
            console.error('[Popup] Error starting monitoring:', error);
            this.showNotification('❌ Error: ' + error.message, 'error');
            this.stopMonitoring();
        }
    }

    async stopMonitoring() {
        console.log("[Popup] Stopping monitoring...");
        
        this.isMonitoring = false;
        await chrome.storage.local.set({ monitoringEnabled: false });
        
        // Notify background to stop monitoring
        if (chrome.runtime && chrome.runtime.id) {
            chrome.runtime.sendMessage({ action: 'stopMonitoring' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.warn("[Popup] Background message error:", chrome.runtime.lastError.message);
                } else {
                    console.log("[Popup] ✅ Background monitoring stopped");
                }
            });
        }
        
        this.showStartButton();
        this.monitorToggle.classList.remove('active');
        
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && !tab.url.startsWith('chrome://')) {
            try {
                chrome.tabs.sendMessage(tab.id, { action: 'stopMonitoring' }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.warn("[Popup] Could not stop monitoring on tab:", chrome.runtime.lastError.message);
                    } else {
                        console.log("[Popup] ✅ Tab monitoring stopped");
                    }
                });
            } catch (e) {
                console.warn("[Popup] Stop monitoring error:", e);
            }
        }
        
        this.showNotification('⏸ Monitoring stopped', 'info');
    }

    async saveTaskDescription() {
        const taskText = this.taskInput.value.trim();
        await chrome.storage.local.set({ taskDescription: taskText });
        
        if (chrome.runtime && chrome.runtime.id) {
            chrome.runtime.sendMessage({ action: 'taskUpdate', task: taskText }, (response) => {
                if (chrome.runtime.lastError) {
                    console.warn("[Popup] Task update message failed:", chrome.runtime.lastError.message);
                }
            });
        }
    }

    async toggleSetting(settingKey, toggleElement) {
        const isActive = toggleElement.classList.toggle('active');
        await chrome.storage.local.set({ [settingKey]: isActive });
        console.log(`[Popup] Setting ${settingKey}:`, isActive);
    }

    showStartButton() {
        if (this.startBtn && this.stopBtn) {
            this.startBtn.style.display = 'flex';
            this.stopBtn.style.display = 'none';
        }
    }

    showStopButton() {
        if (this.startBtn && this.stopBtn) {
            this.startBtn.style.display = 'none';
            this.stopBtn.style.display = 'flex';
        }
    }

    showNotification(message, type = 'success') {
        // Remove any existing notifications
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        
        if (type === 'warning') notification.style.background = 'rgba(251, 191, 36, 0.9)';
        else if (type === 'error') notification.style.background = 'rgba(239, 68, 68, 0.9)';
        else if (type === 'info') notification.style.background = 'rgba(59, 130, 246, 0.9)';
        else notification.style.background = 'rgba(74, 222, 128, 0.9)';
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideInRight 0.3s ease-out reverse';
            setTimeout(() => notification.remove(), 300);
        }, 3500);
    }

    async loadStats() {
        const stats = await chrome.storage.local.get(['sessionsCount', 'suggestionsCount', 'timesSaved']);
        
        const sessionsCountEl = document.getElementById('sessionsCount');
        const suggestionsCountEl = document.getElementById('suggestionsCount');
        const timesSavedEl = document.getElementById('timesSaved');

        if (sessionsCountEl) sessionsCountEl.textContent = stats.sessionsCount || 0;
        if (suggestionsCountEl) suggestionsCountEl.textContent = stats.suggestionsCount || 0;
        if (timesSavedEl) timesSavedEl.textContent = this.formatTime(stats.timesSaved || 0);
    }

    async incrementStat(statKey) {
        const data = await chrome.storage.local.get(statKey);
        const currentValue = data[statKey] || 0;
        await chrome.storage.local.set({ [statKey]: currentValue + 1 });
        
        const element = document.getElementById(statKey);
        if (element) {
            element.textContent = currentValue + 1;
        }
    }

    formatTime(minutes) {
        return (minutes < 60) ? `${minutes}m` : `${Math.floor(minutes / 60)}h`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("[Popup] Popup loaded");
    new PopupController();
});
