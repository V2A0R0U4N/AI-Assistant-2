// Popup.js - Extension popup controller with sidebar support

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
        this.init();
    }

    async init() {
        await this.loadSavedData();
        this.setupEventListeners();
        this.loadStats();
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
        document.getElementById('helpLink').addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: 'https://your-docs-url.com' });
        });
    }

    async openSidebar() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
            this.showNotification('⚠️ No active tab found', 'warning');
            return;
        }

        try {
            await chrome.tabs.sendMessage(tab.id, { action: 'showSidebar' });
            this.showNotification('✅ Sidebar opened! Press Ctrl+Shift+L to toggle.', 'success');
            setTimeout(() => window.close(), 1500);
        } catch (error) {
            console.error('Error opening sidebar:', error, chrome.runtime && chrome.runtime.lastError);
            this.showNotification('❌ Could not open sidebar. Refresh the page and try again.', 'error');
        }
    }

    async openOverlay() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
            this.showNotification('⚠️ No active tab found', 'warning');
            return;
        }
        try {
            await chrome.tabs.sendMessage(tab.id, { action: 'toggleAssistant', isActive: true });
            this.showNotification('✅ Overlay opened! Press Ctrl+Shift+A to toggle.', 'success');
            setTimeout(() => window.close(), 1500);
        } catch (error) {
            console.error('Error opening overlay:', error, chrome.runtime && chrome.runtime.lastError);
            this.showNotification('❌ Could not open overlay. Refresh the page and try again.', 'error');
        }
    }

    async startMonitoring() {
        const taskText = this.taskInput.value.trim();
        if (!taskText) {
            this.showNotification('⚠️ Please describe your task first', 'warning');
            this.taskInput.focus();
            return;
        }

        await this.saveTaskDescription();
        this.isMonitoring = true;
        await chrome.storage.local.set({ monitoringEnabled: true });
        this.showStopButton();
        this.monitorToggle.classList.add('active');

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            try {
                // We use sendMessage to both start the UI and check the connection
                await chrome.tabs.sendMessage(tab.id, { action: 'toggleAssistant', isActive: true });
                this.showNotification('✅ Monitoring started!', 'success');
                this.incrementStat('sessionsCount');
            } catch (error) {
                console.error('Failed to start monitoring:', error);
                this.showNotification('❌ Connection failed. Refresh the page and ensure you are on a supported site.', 'error');
                this.stopMonitoring(); // Revert state if connection fails
            }
        }
    }

    async stopMonitoring() {
        this.isMonitoring = false;
        await chrome.storage.local.set({ monitoringEnabled: false });
        this.showStartButton();
        this.monitorToggle.classList.remove('active');
        
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
             try {
                await chrome.tabs.sendMessage(tab.id, { action: 'toggleAssistant', isActive: false });
             } catch (e) {
                // It's okay if this fails, the tab might have closed.
             }
        }
        this.showNotification('⏸ Monitoring stopped', 'info');
    }

    async saveTaskDescription() {
        const taskText = this.taskInput.value.trim();
        await chrome.storage.local.set({ taskDescription: taskText });
        // Also send to background script if needed
        chrome.runtime.sendMessage({ action: 'taskUpdate', task: taskText });
    }

    async toggleSetting(settingKey, toggleElement) {
        const isActive = toggleElement.classList.toggle('active');
        await chrome.storage.local.set({ [settingKey]: isActive });
    }

    showStartButton() {
        this.startBtn.style.display = 'flex';
        this.stopBtn.style.display = 'none';
    }

    showStopButton() {
        this.startBtn.style.display = 'none';
        this.stopBtn.style.display = 'flex';
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        if (type === 'warning') notification.style.background = 'rgba(251, 191, 36, 0.9)';
        else if (type === 'error') notification.style.background = 'rgba(239, 68, 68, 0.9)';
        else if (type === 'info') notification.style.background = 'rgba(59, 130, 246, 0.9)';
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.animation = 'slideInRight 0.3s ease-out reverse';
            setTimeout(() => notification.remove(), 300);
        }, 3500); // Increased time to read the longer error message
    }

    async loadStats() {
        const stats = await chrome.storage.local.get(['sessionsCount', 'suggestionsCount', 'timesSaved']);
        document.getElementById('sessionsCount').textContent = stats.sessionsCount || 0;
        document.getElementById('suggestionsCount').textContent = stats.suggestionsCount || 0;
        document.getElementById('timesSaved').textContent = this.formatTime(stats.timesSaved || 0);
    }

    async incrementStat(statKey) {
        const data = await chrome.storage.local.get(statKey);
        const currentValue = data[statKey] || 0;
        await chrome.storage.local.set({ [statKey]: currentValue + 1 });
        document.getElementById(statKey).textContent = (statKey === 'timesSaved') ? this.formatTime(currentValue + 1) : currentValue + 1;
    }

    formatTime(minutes) {
        return (minutes < 60) ? `${minutes}m` : `${Math.floor(minutes / 60)}h`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PopupController();
});