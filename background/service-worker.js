// Service Worker - The Brain of Your Extension

// State Management
let assistantState = {
    isActive: false,
    currentTask: null,
    userContext: {},
    monitoringInterval: null
};

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
    console.log('CodeFlow AI Assistant installed');

    // Set default storage
    chrome.storage.local.set({
        taskDescription: '',
        monitoringEnabled: false,
        updateFrequency: 5000, // 5 seconds
        apiEndpoint: 'YOUR_BACKEND_API_URL'
    });
});

// Listen for keyboard shortcuts
chrome.commands.onCommand.addListener((command, tab) => {
    if (command === 'toggle-assistant') {
        toggleAssistant(tab);
    } else if (command === 'quick-help') {
        requestQuickHelp(tab);
    }
});

// Toggle assistant on/off
async function toggleAssistant(tab) {
    assistantState.isActive = !assistantState.isActive;

    // Send message to content script
    chrome.tabs.sendMessage(tab.id, {
        action: 'toggleAssistant',
        isActive: assistantState.isActive
    });

    if (assistantState.isActive) {
        startMonitoring(tab.id);
    } else {
        stopMonitoring();
    }
}

// Start continuous monitoring
function startMonitoring(tabId) {
    const updateFrequency = 5000; // Check every 5 seconds

    assistantState.monitoringInterval = setInterval(async () => {
        try {
            // Request context from content script
            chrome.tabs.sendMessage(tabId, {
                action: 'captureContext'
            });
        } catch (error) {
            console.error('Monitoring error:', error);
        }
    }, updateFrequency);
}

// Stop monitoring
function stopMonitoring() {
    if (assistantState.monitoringInterval) {
        clearInterval(assistantState.monitoringInterval);
        assistantState.monitoringInterval = null;
    }
}

// Quick help for current code
async function requestQuickHelp(tab) {
    chrome.tabs.sendMessage(tab.id, {
        action: 'getQuickHelp'
    });
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    if (request.action === 'contextCaptured') {
        // Context received from content script
        handleContextUpdate(request.context, sender.tab.id);
        sendResponse({ success: true });
    }

    if (request.action === 'errorDetected') {
        // Error detected in code
        handleErrorDetection(request.error, sender.tab.id);
        sendResponse({ success: true });
    }

    if (request.action === 'taskUpdate') {
        // User updated task description
        assistantState.currentTask = request.task;
        chrome.storage.local.set({ taskDescription: request.task });
        sendResponse({ success: true });
    }

    return true; // Keep channel open for async response
});

// Handle context updates
async function handleContextUpdate(context, tabId) {
    try {
        // Get stored task description
        const { taskDescription, apiEndpoint } = await chrome.storage.local.get([
            'taskDescription',
            'apiEndpoint'
        ]);

        // Prepare payload for backend
        const payload = {
            task: taskDescription,
            context: context,
            timestamp: Date.now(),
            platform: context.platform
        };

        // Send to backend for AI analysis
        const response = await fetch(`${apiEndpoint}/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await getAuthToken()}`
            },
            body: JSON.stringify(payload)
        });

        const aiResponse = await response.json();

        // Send AI suggestions back to content script
        chrome.tabs.sendMessage(tabId, {
            action: 'updateSuggestions',
            suggestions: aiResponse.suggestions,
            nextSteps: aiResponse.nextSteps,
            warnings: aiResponse.warnings
        });

    } catch (error) {
        console.error('Context handling error:', error);
    }
}

// Handle error detection
async function handleErrorDetection(error, tabId) {
    try {
        const { apiEndpoint } = await chrome.storage.local.get('apiEndpoint');

        // Get error help from AI
        const response = await fetch(`${apiEndpoint}/debug`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await getAuthToken()}`
            },
            body: JSON.stringify({
                error: error.message,
                code: error.code,
                context: error.context
            })
        });

        const debugHelp = await response.json();

        // Send debug help to content script
        chrome.tabs.sendMessage(tabId, {
            action: 'showDebugHelp',
            help: debugHelp
        });

    } catch (error) {
        console.error('Error handling failed:', error);
    }
}

// Get authentication token (placeholder)
async function getAuthToken() {
    const { authToken } = await chrome.storage.local.get('authToken');
    return authToken || 'demo-token';
}

// Monitor tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    if (assistantState.isActive) {
        const tab = await chrome.tabs.get(activeInfo.tabId);

        // Check if it's a coding platform
        const codingPlatforms = [
            'replit.com',
            'leetcode.com',
            'colab.research.google.com',
            'github.com',
            'codepen.io'
        ];

        const isCodingPlatform = codingPlatforms.some(platform =>
            tab.url?.includes(platform)
        );

        if (isCodingPlatform) {
            // Reinitialize monitoring for new tab
            stopMonitoring();
            startMonitoring(activeInfo.tabId);
        }
    }
});