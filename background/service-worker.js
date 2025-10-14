/* CodeFlow AI - Background Service Worker with AI Platform Identification */

console.log("CodeFlow AI: Service Worker Started");

// ========================================
// GEMINI API CONFIGURATION
// ========================================
const GEMINI_API_KEY = "AIzaSyCZK64M10nVeeePewb0zOV04RhJesubWKk";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent";

// ========================================
// MONITORING STATE
// ========================================
let monitoringState = {
    isActive: false,
    activeTab: null,
    platform: 'unknown',
    platformIdentity: null,
    sessionId: null,
    activityBuffer: [],
    contextCount: 0,
    startTime: null
};

// ========================================
// SESSION MANAGEMENT
// ========================================
function generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function initializeSession() {
    monitoringState.sessionId = generateSessionId();
    monitoringState.startTime = Date.now();
    monitoringState.activityBuffer = [];
    monitoringState.contextCount = 0;
    monitoringState.platform = 'unknown';
    monitoringState.platformIdentity = null;
    console.log("Service Worker: ✅ Session initialized:", monitoringState.sessionId);
}

// ========================================
// MESSAGE HANDLERS
// ========================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Service Worker: 📨 Message:", request.action);

    switch(request.action) {
        case "toggleMonitoring":
            handleToggleMonitoring(request, sender.tab?.id);
            sendResponse({ success: true });
            break;

        case "startMonitoring":
            handleStartMonitoring(sender.tab?.id);
            sendResponse({ success: true, sessionId: monitoringState.sessionId });
            break;

        case "stopMonitoring":
            handleStopMonitoring();
            sendResponse({ success: true });
            break;

        case "getMonitoringStatus":
            sendResponse({
                success: true,
                isActive: monitoringState.isActive,
                platform: monitoringState.platform,
                platformIdentity: monitoringState.platformIdentity,
                contextCount: monitoringState.contextCount,
                sessionId: monitoringState.sessionId
            });
            break;

        case "contextBatchUpdate":
            handleContextBatchUpdate(request, sender.tab?.id);
            sendResponse({ success: true, contextCount: monitoringState.contextCount });
            break;

        case "identifyPlatform":
            handlePlatformIdentification(request, sendResponse);
            return true; // Async response

        case "chatMessage":
            handleChatMessage(request, sendResponse);
            return true; // Async response

        case "taskUpdate":
            handleTaskUpdate(request);
            sendResponse({ success: true });
            break;

        default:
            console.log("Service Worker: ⚠️ Unknown action:", request.action);
            sendResponse({ success: false, error: "Unknown action" });
    }

    return true;
});

// ========================================
// MONITORING CONTROL
// ========================================
function handleToggleMonitoring(request, tabId) {
    monitoringState.isActive = request.isActive;
    monitoringState.activeTab = tabId;
    
    if (request.isActive) {
        initializeSession();
        console.log("Service Worker: ✅ Monitoring activated");
    } else {
        console.log("Service Worker: ⏹️ Monitoring deactivated");
    }
}

function handleStartMonitoring(tabId) {
    if (!monitoringState.isActive) {
        monitoringState.isActive = true;
        monitoringState.activeTab = tabId;
        initializeSession();
        console.log("Service Worker: ✅ Monitoring started");
    }
}

function handleStopMonitoring() {
    if (monitoringState.isActive) {
        monitoringState.isActive = false;
        console.log("Service Worker: ⏹️ Monitoring stopped");
        console.log(`Final stats - Contexts: ${monitoringState.contextCount}, Platform: ${monitoringState.platform}`);
    }
}

function handleTaskUpdate(request) {
    console.log("Service Worker: 📝 Task updated:", request.task);
    // Store task description for context
    chrome.storage.local.set({ currentTask: request.task });
}

// ========================================
// CONTEXT BATCH HANDLER
// ========================================
function handleContextBatchUpdate(request, tabId) {
    console.log(`Service Worker: 📦 Received ${request.contexts.length} contexts`);
    
    // Update platform info
    if (request.platform && request.platform !== 'unknown') {
        monitoringState.platform = request.platform;
    }
    
    if (request.platformInfo) {
        monitoringState.platformIdentity = request.platformInfo;
        console.log(`Service Worker: 🏷️ Platform: ${request.platformInfo.name}`);
    }
    
    // Add contexts to buffer
    request.contexts.forEach(ctx => {
        ctx.tabId = tabId;
        ctx.sessionId = monitoringState.sessionId;
        monitoringState.activityBuffer.push(ctx);
        monitoringState.contextCount++;
    });
    
    console.log(`Service Worker: ✅ Total contexts: ${monitoringState.contextCount}`);
    
    // Send to backend (optional)
    sendContextsToBackend(request.contexts);
}

// ========================================
// AI PLATFORM IDENTIFICATION
// ========================================
async function handlePlatformIdentification(request, sendResponse) {
    console.log('Service Worker: 🤖 Identifying platform with AI...');
    
    try {
        const aiResponse = await callGeminiAPI(request.prompt);
        
        // Parse JSON from AI response
        let identity;
        try {
            identity = JSON.parse(aiResponse);
        } catch (e) {
            // Try to extract JSON from markdown code blocks
            const jsonMatch = aiResponse.match(/``````/) || 
                             aiResponse.match(/``````/);
            if (jsonMatch) {
                identity = JSON.parse(jsonMatch[1]);
            } else {
                throw new Error('Failed to parse AI response');
            }
        }
        
        console.log('Service Worker: ✅ Platform identified:', identity.name);
        
        sendResponse({
            success: true,
            identity: JSON.stringify(identity)
        });
    } catch (error) {
        console.error('Service Worker: ❌ Platform identification error:', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

// ========================================
// CHAT MESSAGE HANDLER (WITH PLATFORM CONTEXT)
// ========================================
async function handleChatMessage(request, sendResponse) {
    console.log("Service Worker: 💬 Processing chat message");

    try {
        const userMessage = request.message;
        
        if (!userMessage || userMessage.trim() === "") {
            sendResponse({
                success: false,
                response: "Please enter a message."
            });
            return;
        }

        // Build context from monitoring data
        const recentContexts = monitoringState.activityBuffer.slice(-10);
        let contextInfo = "";
        
        // Add platform context
        if (monitoringState.platformIdentity) {
            contextInfo += `\n\nUser is currently working on: ${monitoringState.platformIdentity.name}`;
            contextInfo += `\nPlatform Type: ${monitoringState.platformIdentity.type}`;
            if (monitoringState.platformIdentity.description) {
                contextInfo += `\nPlatform Description: ${monitoringState.platformIdentity.description}`;
            }
        }
        
        // Add recent activity context
        if (recentContexts.length > 0) {
            const pageContexts = recentContexts.filter(c => c.type === 'page_context');
            const selections = recentContexts.filter(c => c.type === 'selection');
            
            if (pageContexts.length > 0) {
                const lastPage = pageContexts[pageContexts.length - 1];
                contextInfo += `\n\nCurrent page: ${lastPage.title}`;
                contextInfo += `\nURL: ${lastPage.url}`;
            }
            
            if (selections.length > 0) {
                contextInfo += `\n\nRecently selected text:`;
                selections.slice(-3).forEach(s => {
                    contextInfo += `\n- "${s.selectedText.substring(0, 100)}..."`;
                    if (s.selectionContext?.isCodeBlock) {
                        contextInfo += ` (from code block)`;
                    }
                });
            }
        }

        // Add current task if available
        const storage = await chrome.storage.local.get(['currentTask']);
        if (storage.currentTask) {
            contextInfo += `\n\nUser's current task: ${storage.currentTask}`;
        }

        const fullPrompt = `You are an AI coding assistant helping a developer.
${contextInfo}

User Question: ${userMessage}

Provide a helpful, concise answer based on the context above.`;

        // Call Gemini API
        const aiResponse = await callGeminiAPI(fullPrompt);
        
        sendResponse({
            success: true,
            response: aiResponse
        });

    } catch (error) {
        console.error("Service Worker: ❌ Chat error:", error);
        sendResponse({
            success: false,
            response: `Error: ${error.message}`
        });
    }
}

// ========================================
// GEMINI API CALL
// ========================================
async function callGeminiAPI(prompt) {
    const requestBody = {
        contents: [{
            parts: [{
                text: prompt
            }]
        }],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
        }
    };

    try {
        console.log('Service Worker: 🤖 Calling Gemini API...');
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Gemini API Error:', errorData);
            throw new Error(errorData.error?.message || `API Error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
            return data.candidates[0].content.parts[0].text;
        } else {
            throw new Error("Unexpected API response format");
        }
    } catch (error) {
        console.error("Gemini API Error:", error);
        throw error;
    }
}

// ========================================
// BACKEND API COMMUNICATION
// ========================================
async function sendContextsToBackend(contexts) {
    const BACKEND_URL = 'http://localhost:5000/api/context/batch';
    
    try {
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                contexts,
                sessionId: monitoringState.sessionId,
                platformInfo: monitoringState.platformIdentity
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Service Worker: ✅ Contexts sent to backend');
        } else {
            console.warn('Service Worker: ⚠️ Backend error:', response.status);
        }
    } catch (error) {
        console.warn('Service Worker: ⚠️ Backend unavailable (offline mode)');
    }
}

// ========================================
// EXTENSION ICON CLICK
// ========================================
chrome.action.onClicked.addListener((tab) => {
    console.log("Service Worker: 🖱️ Extension icon clicked");
    
    monitoringState.isActive = !monitoringState.isActive;
    
    if (monitoringState.isActive) {
        monitoringState.activeTab = tab.id;
        initializeSession();
    }
    
    chrome.tabs.sendMessage(tab.id, {
        action: 'toggleAssistant',
        isActive: monitoringState.isActive
    }, (response) => {
        if (chrome.runtime.lastError) {
            console.log("Service Worker: ⚠️ Content script not ready");
        }
    });
});

// ========================================
// TAB UPDATE LISTENER
// ========================================
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && monitoringState.isActive && tabId === monitoringState.activeTab) {
        console.log("Service Worker: 🔄 Tab updated");
        
        chrome.tabs.sendMessage(tabId, {
            action: 'toggleAssistant',
            isActive: true
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.log("Service Worker: ⚠️ Content script not ready after navigation");
            }
        });
    }
});

console.log("CodeFlow AI: ✅ Service Worker ready");
