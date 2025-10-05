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
        // Load saved data
        await this.loadSavedData();

        // Setup event listeners
        this.setupEventListeners();

        // Load stats
        this.loadStats();
    }

    async loadSavedData() {
        try {
            const data = await chrome.storage.local.get([
                'taskDescription',
                'monitoringEnabled',
                'errorDetection',
                'proactiveSuggestions'
            ]);

            // Set task description
            if (data.taskDescription) {
                this.taskInput.value = data.taskDescription;
            }

            // Set toggle states
            this.isMonitoring = data.monitoringEnabled || false;

            if (this.isMonitoring) {
                this.showStopButton();
                this.monitorToggle.classList.add('active');
            }

            if (data.errorDetection !== false) {
                this.errorToggle.classList.add('active');
            }

            if (data.proactiveSuggestions !== false) {
                this.suggestToggle.classList.add('active');
            }

        } catch (error) {
            console.error('Failed to load saved data:', error);
        }
    }

    setupEventListeners() {
        // Start button
        this.startBtn.addEventListener('click', () => {
            this.startMonitoring();
        });

        // Stop button
        this.stopBtn.addEventListener('click', () => {
            this.stopMonitoring();
        });

        // Open Sidebar button
        this.openSidebarBtn.addEventListener('click', async () => {
            console.log('Open Sidebar button clicked');
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                this.showNotification('⚠️ No active tab found', 'warning');
                return;
            }

            // Check if on supported platform
            const supportedPlatforms = [
                'replit.com',
                'leetcode.com',
                'colab.research.google.com',
                'github.com',
                'codepen.io',
                'stackblitz.com'
            ];

            const isSupported = supportedPlatforms.some(platform =>
                tab.url?.includes(platform)
            );

            if (!isSupported) {
                this.showNotification('⚠️ Please navigate to a supported coding platform (Replit, LeetCode, GitHub, etc.)', 'warning');
                return;
            }

            try {
                // Send message to show sidebar
                const response = await chrome.tabs.sendMessage(tab.id, {
                    action: 'showSidebar'
                });
                
                console.log('Sidebar response:', response);
                this.showNotification('✅ Sidebar opened! Press Ctrl+Shift+L to toggle.', 'success');
                
                // Close popup after a short delay
                setTimeout(() => {
                    window.close();
                }, 1500);
                
            } catch (error) {
                console.error('Error opening sidebar:', error);
                this.showNotification('❌ Error: ' + error.message, 'error');
            }
        });

        // Open Overlay button
        this.openOverlayBtn.addEventListener('click', async () => {
            console.log('Open Overlay button clicked');
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                this.showNotification('⚠️ No active tab found', 'warning');
                return;
            }

            try {
                // Send message to show overlay
                const response = await chrome.tabs.sendMessage(tab.id, {
                    action: 'toggleAssistant',
                    isActive: true
                });
                
                console.log('Overlay response:', response);
                this.showNotification('✅ Overlay opened! Press Ctrl+Shift+A to toggle.', 'success');
                
                // Close popup after a short delay
                setTimeout(() => {
                    window.close();
                }, 1500);
                
            } catch (error) {
                console.error('Error opening overlay:', error);
                this.showNotification('❌ Error: ' + error.message, 'error');
            }
        });

        // Save task on input (debounced)
        let saveTimeout;
        this.taskInput.addEventListener('input', () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                this.saveTaskDescription();
            }, 500);
        });

        // Toggle switches
        this.monitorToggle.addEventListener('click', () => {
            if (this.isMonitoring) {
                this.stopMonitoring();
            } else {
                this.startMonitoring();
            }
        });

        this.errorToggle.addEventListener('click', () => {
            this.toggleSetting('errorDetection', this.errorToggle);
        });

        this.suggestToggle.addEventListener('click', () => {
            this.toggleSetting('proactiveSuggestions', this.suggestToggle);
        });

        // Help link
        document.getElementById('helpLink').addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: 'https://your-docs-url.com' });
        });
    }

    async startMonitoring() {
        // Validate task description
        const taskText = this.taskInput.value.trim();

        if (!taskText) {
            this.showNotification('⚠️ Please describe your task first', 'warning');
            this.taskInput.focus();
            return;
        }

        // Save task description
        await this.saveTaskDescription();

        // Update state
        this.isMonitoring = true;
        await chrome.storage.local.set({ monitoringEnabled: true });

        // Update UI
        this.showStopButton();
        this.monitorToggle.classList.add('active');

        // Get current tab and send message
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (tab) {
            // Check if it's a supported platform
            const supportedPlatforms = [
                'replit.com',
                'leetcode.com',
                'colab.research.google.com',
                'github.com',
                'codepen.io',
                'stackblitz.com'
            ];

            const isSupportedPlatform = supportedPlatforms.some(platform =>
                tab.url?.includes(platform)
            );

            if (!isSupportedPlatform) {
                this.showNotification('⚠️ Not a supported coding platform. Navigate to Replit, LeetCode, or Colab.', 'warning');
                this.stopMonitoring();
                return;
            }

            // Send message to toggle assistant
            chrome.runtime.sendMessage({
                action: 'toggleAssistant',
                isActive: true
            });

            this.showNotification('✅ Monitoring started! Press Ctrl+Shift+A for overlay or Ctrl+Shift+L for sidebar.', 'success');

            // Update stats
            this.incrementStat('sessionsCount');
        }
    }

    async stopMonitoring() {
        // Update state
        this.isMonitoring = false;
        await chrome.storage.local.set({ monitoringEnabled: false });

        // Update UI
        this.showStartButton();
        this.monitorToggle.classList.remove('active');

        // Send message to stop
        chrome.runtime.sendMessage({
            action: 'toggleAssistant',
            isActive: false
        });

        this.showNotification('⏸ Monitoring stopped', 'info');
    }

    async saveTaskDescription() {
        const taskText = this.taskInput.value.trim();

        await chrome.storage.local.set({
            taskDescription: taskText
        });

        // Send to background script
        chrome.runtime.sendMessage({
            action: 'taskUpdate',
            task: taskText
        });
    }

    async toggleSetting(settingKey, toggleElement) {
        const isActive = toggleElement.classList.contains('active');

        if (isActive) {
            toggleElement.classList.remove('active');
            await chrome.storage.local.set({ [settingKey]: false });
        } else {
            toggleElement.classList.add('active');
            await chrome.storage.local.set({ [settingKey]: true });
        }
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
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;

        // Adjust color based on type
        if (type === 'warning') {
            notification.style.background = 'rgba(251, 191, 36, 0.9)';
        } else if (type === 'error') {
            notification.style.background = 'rgba(239, 68, 68, 0.9)';
        } else if (type === 'info') {
            notification.style.background = 'rgba(59, 130, 246, 0.9)';
        }

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideInRight 0.3s ease-out reverse';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    async loadStats() {
        try {
            const stats = await chrome.storage.local.get([
                'sessionsCount',
                'suggestionsCount',
                'timesSaved'
            ]);

            document.getElementById('sessionsCount').textContent = stats.sessionsCount || 0;
            document.getElementById('suggestionsCount').textContent = stats.suggestionsCount || 0;
            document.getElementById('timesSaved').textContent = this.formatTime(stats.timesSaved || 0);

        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    }

    async incrementStat(statKey) {
        const data = await chrome.storage.local.get(statKey);
        const currentValue = data[statKey] || 0;
        await chrome.storage.local.set({ [statKey]: currentValue + 1 });

        // Update display
        if (statKey === 'timesSaved') {
            document.getElementById(statKey).textContent = this.formatTime(currentValue + 1);
        } else {
            document.getElementById(statKey).textContent = currentValue + 1;
        }
    }

    formatTime(minutes) {
        if (minutes < 60) {
            return `${minutes}m`;
        } else {
            const hours = Math.floor(minutes / 60);
            return `${hours}h`;
        }
    }
}

// Initialize popup controller
document.addEventListener('DOMContentLoaded', () => {
    console.log('CodeFlow Popup loaded');
    new PopupController();
});