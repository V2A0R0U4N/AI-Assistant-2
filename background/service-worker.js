/* CodeFlow AI - Service Worker with Navigation Persistence + Backend Integration */

console.log("🚀 CodeFlow AI: Service Worker Started");

// ========================================
// CONFIGURATION
// ========================================
const GEMINI_API_KEY = "AIzaSyCZK64M10nVeeePewb0zOV04RhJesubWKk";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent";
const BACKEND_URL = 'http://localhost:5000/api/tracking';

const BATCH_CONFIG = {
    maxEvents: 20,
    timeInterval: 5000, // 5 seconds
};

// ========================================
// STATE MANAGEMENT
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

let eventBatch = [];
let batchTimer = null;
let activeSessions = new Map(); // Track sessions per tab

// ========================================
// SESSION MANAGEMENT
// ========================================
function generateSessionId(tabId) {
    return `session_${tabId}_${Date.now()}`;
}

async function getOrCreateSession(tabId, url, hostname) {
    try {
        // Check if session exists for this tab
        if (activeSessions.has(tabId)) {
            return activeSessions.get(tabId);
        }

        // Create new session
        const sessionId = generateSessionId(tabId);
        const session = {
            sessionId,
            tabId,
            url,
            hostname,
            platform: detectPlatform(hostname),
            startTime: new Date().toISOString(),
            status: 'active',
            eventCount: 0
        };

        // Store in memory
        activeSessions.set(tabId, session);

        // Store in chrome.storage
        await chrome.storage.session.set({ [`session_${tabId}`]: session });

        // Create in backend
        await createBackendSession(session);

        console.log('✅ Session created:', sessionId);
        return session;

    } catch (error) {
        console.error('❌ Session creation error:', error);
        return null;
    }
}

async function createBackendSession(session) {
    try {
        const userId = await getUserId();
        
        const response = await fetch(`${BACKEND_URL}/session/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: session.sessionId,
                userId: userId,
                platform: session.platform,
                url: session.url,
                hostname: session.hostname,
                startTime: session.startTime
            })
        });

        if (!response.ok) {
            throw new Error(`Backend session creation failed: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Backend session created:', data);
        return data;

    } catch (error) {
        console.error('❌ Backend session creation error:', error);
        // Continue without backend - store locally
        return null;
    }
}

async function updateSession(tabId, newUrl, newHostname) {
    try {
        const session = activeSessions.get(tabId);
        if (!session) {
            console.warn('⚠️ No session found for tab', tabId);
            return;
        }

        session.url = newUrl;
        session.hostname = newHostname;
        session.platform = detectPlatform(newHostname);
        session.updatedAt = new Date().toISOString();
        session.eventCount++;

        // Update storage
        await chrome.storage.session.set({ [`session_${tabId}`]: session });

        // Update backend
        await fetch(`${BACKEND_URL}/session/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: session.sessionId,
                url: newUrl,
                hostname: newHostname,
                platform: session.platform,
                timestamp: session.updatedAt
            })
        }).catch(err => console.warn('Backend update failed:', err));

        console.log('🔄 Session updated:', session.sessionId);

    } catch (error) {
        console.error('❌ Session update error:', error);
    }
}

async function endSession(tabId) {
    try {
        const session = activeSessions.get(tabId);
        if (!session) return;

        // Flush any remaining events
        await flushBatch(session.sessionId);

        session.status = 'completed';
        session.endTime = new Date().toISOString();

        // Calculate duration
        const startTime = new Date(session.startTime);
        const endTime = new Date(session.endTime);
        session.duration = Math.floor((endTime - startTime) / 1000); // seconds

        // Notify backend
        await fetch(`${BACKEND_URL}/session/end`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: session.sessionId,
                endTime: session.endTime,
                duration: session.duration,
                totalEvents: session.eventCount
            })
        }).catch(err => console.warn('Backend end session failed:', err));

        // Cleanup
        activeSessions.delete(tabId);
        await chrome.storage.session.remove(`session_${tabId}`);

        console.log('🏁 Session ended:', session.sessionId);

    } catch (error) {
        console.error('❌ Session end error:', error);
    }
}

// ========================================
// NAVIGATION DETECTION (CRITICAL FIX)
// ========================================

// Listen for full page loads
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        // Skip chrome:// and extension:// URLs
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
            return;
        }

        console.log('📄 Page loaded:', tab.url);

        const url = new URL(tab.url);
        const session = await getOrCreateSession(tabId, tab.url, url.hostname);

        // Notify content script if monitoring is active
        if (monitoringState.isActive && session) {
            chrome.tabs.sendMessage(tabId, {
                action: 'startMonitoring',
                sessionId: session.sessionId,
                url: tab.url
            }).catch(() => {
                console.log('Content script not ready yet');
            });
        }
    }
});

// Listen for SPA navigation (CRITICAL for GitHub, etc.)
chrome.webNavigation.onHistoryStateUpdated.addListener(async (details) => {
    if (details.frameId !== 0 || !details.url.startsWith('http')) {
        return;
    }

    console.log('🔄 SPA navigation detected:', details.url);

    const tabId = details.tabId;
    const url = new URL(details.url);

    // Update session
    await updateSession(tabId, details.url, url.hostname);

    const session = activeSessions.get(tabId);

    // Notify content script to restart monitoring
    if (monitoringState.isActive && session) {
        chrome.tabs.sendMessage(tabId, {
            action: 'URL_CHANGED',
            sessionId: session.sessionId,
            url: details.url,
            trigger: 'spa_navigation'
        }).catch(err => {
            console.warn('Could not notify content script:', err);
        });
    }
});

// Listen for hash changes
chrome.webNavigation.onReferenceFragmentUpdated.addListener(async (details) => {
    if (details.frameId !== 0) return;

    console.log('🔗 Hash changed:', details.url);

    const session = activeSessions.get(details.tabId);
    if (session && monitoringState.isActive) {
        chrome.tabs.sendMessage(details.tabId, {
            action: 'HASH_CHANGED',
            url: details.url
        }).catch(() => {});
    }
});

// Listen for tab removal
chrome.tabs.onRemoved.addListener(async (tabId) => {
    console.log('🗑️ Tab closed:', tabId);
    await endSession(tabId);
});

// ========================================
// BATCH MANAGEMENT
// ========================================
async function flushBatch(sessionId) {
    if (eventBatch.length === 0) return;

    const eventsToSend = [...eventBatch];
    eventBatch = [];

    await sendEventsToBackend(sessionId, eventsToSend);
}

function scheduleBatchFlush(sessionId) {
    if (batchTimer) clearTimeout(batchTimer);

    batchTimer = setTimeout(() => {
        flushBatch(sessionId);
    }, BATCH_CONFIG.timeInterval);
}

async function sendEventsToBackend(sessionId, events) {
    try {
        if (events.length === 0) return;

        const response = await fetch(`${BACKEND_URL}/events/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId,
                events: events.map(e => ({
                    type: e.type,
                    data: e.data,
                    timestamp: e.timestamp
                }))
            })
        });

        if (!response.ok) {
            throw new Error(`Backend event batch failed: ${response.status}`);
        }

        const data = await response.json();
        console.log(`📤 Events sent: ${events.length}, Stored: ${data.stored || events.length}`);

        // Update session event count
        for (const [tabId, session] of activeSessions.entries()) {
            if (session.sessionId === sessionId) {
                session.eventCount += events.length;
                await chrome.storage.session.set({ [`session_${tabId}`]: session });
                break;
            }
        }

        return data;

    } catch (error) {
        console.error('❌ Error sending events to backend:', error);
        // Store locally as fallback
        await storeFallbackEvents(sessionId, events);
    }
}

async function storeFallbackEvents(sessionId, events) {
    try {
        const key = `fallback_events_${sessionId}`;
        const result = await chrome.storage.local.get(key);
        const existingEvents = result[key] || [];
        existingEvents.push(...events);
        await chrome.storage.local.set({ [key]: existingEvents });
        console.log('📦 Stored events locally as fallback');
    } catch (error) {
        console.error('Failed to store fallback events:', error);
    }
}

// ========================================
// MESSAGE HANDLER
// ========================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Message received:', request.action, 'from tab:', sender.tab?.id);

    (async () => {
        try {
            switch (request.action) {
                case 'contentScriptReady':
                    console.log('✅ Content script ready on:', request.url);
                    
                    if (sender.tab?.id && request.url) {
                        const url = new URL(request.url);
                        const session = await getOrCreateSession(sender.tab.id, request.url, url.hostname);
                        
                        sendResponse({ 
                            success: true, 
                            shouldStartMonitoring: monitoringState.isActive,
                            sessionId: session?.sessionId
                        });
                    } else {
                        sendResponse({ success: true, shouldStartMonitoring: false });
                    }
                    break;

                case 'startMonitoring':
                case 'toggleMonitoring':
                    console.log('🚀 Start monitoring requested');
                    monitoringState.isActive = true;
                    await chrome.storage.local.set({ monitoringEnabled: true });

                    // Start monitoring on all active tabs
                    const tabs = await chrome.tabs.query({});
                    for (const tab of tabs) {
                        if (tab.url?.startsWith('http')) {
                            const url = new URL(tab.url);
                            const session = await getOrCreateSession(tab.id, tab.url, url.hostname);
                            chrome.tabs.sendMessage(tab.id, {
                                action: 'startMonitoring',
                                sessionId: session?.sessionId
                            }).catch(() => {});
                        }
                    }

                    sendResponse({ success: true, message: 'Monitoring started' });
                    break;

                case 'stopMonitoring':
                    console.log('⏹️ Stop monitoring requested');
                    monitoringState.isActive = false;
                    await chrome.storage.local.set({ monitoringEnabled: false });

                    // Flush and end all sessions
                    for (const [tabId, session] of activeSessions.entries()) {
                        await endSession(tabId);
                    }

                    sendResponse({ success: true, message: 'Monitoring stopped' });
                    break;

                case 'getMonitoringStatus':
                    const status = await chrome.storage.local.get('monitoringEnabled');
                    sendResponse({
                        success: true,
                        isActive: status.monitoringEnabled || false,
                        activeSessions: activeSessions.size,
                        platform: monitoringState.platform
                    });
                    break;

                case 'contextBatchUpdate':
                    await handleContextBatchUpdate(request, sender.tab?.id);
                    sendResponse({ success: true });
                    break;

                case 'EVENT_CAPTURED':
                    await handleEventCapture(request);
                    sendResponse({ success: true });
                    break;

                case 'identifyPlatform':
                    await handlePlatformIdentification(request, sendResponse);
                    return true; // Async

                case 'chatMessage':
                    await handleChatMessage(request, sendResponse);
                    return true; // Async

                default:
                    console.warn('⚠️ Unknown action:', request.action);
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        } catch (error) {
            console.error('❌ Message handler error:', error);
            sendResponse({ success: false, error: error.message });
        }
    })();

    return true; // Keep message channel open
});

// ========================================
// EVENT HANDLING
// ========================================
async function handleContextBatchUpdate(request, tabId) {
    console.log(`📦 Received ${request.contexts?.length || 0} contexts from tab ${tabId}`);

    if (!request.contexts || request.contexts.length === 0) return;

    const session = activeSessions.get(tabId);
    if (!session) {
        console.warn('⚠️ No session for tab', tabId);
        return;
    }

    // Update monitoring state
    if (request.platform && request.platform !== 'unknown') {
        monitoringState.platform = request.platform;
    }

    if (request.platformInfo) {
        monitoringState.platformIdentity = request.platformInfo;
        console.log(`🏷️ Platform: ${request.platformInfo.name}`);
    }

    // Add to activity buffer
    request.contexts.forEach(ctx => {
        ctx.tabId = tabId;
        ctx.sessionId = session.sessionId;
        monitoringState.activityBuffer.push(ctx);
        monitoringState.contextCount++;
    });

    // Add to event batch
    eventBatch.push(...request.contexts.map(ctx => ({
        type: ctx.type || 'context',
        data: ctx,
        timestamp: ctx.timestamp || Date.now()
    })));

    // Flush if batch is full
    if (eventBatch.length >= BATCH_CONFIG.maxEvents) {
        await flushBatch(session.sessionId);
    } else {
        scheduleBatchFlush(session.sessionId);
    }
}

async function handleEventCapture(request) {
    const { sessionId, eventType, data, timestamp } = request;

    eventBatch.push({
        type: eventType,
        data: data,
        timestamp: timestamp || Date.now()
    });

    // Flush if batch is full
    if (eventBatch.length >= BATCH_CONFIG.maxEvents) {
        await flushBatch(sessionId);
    } else {
        scheduleBatchFlush(sessionId);
    }
}

// ========================================
// AI HANDLERS (Keep existing)
// ========================================
async function handlePlatformIdentification(request, sendResponse) {
    console.log('🤖 Identifying platform with AI...');

    try {
        const aiResponse = await callGeminiAPI(request.prompt);
        let identity;

        try {
            identity = JSON.parse(aiResponse);
        } catch (e) {
            const jsonMatch = aiResponse.match(/``````/) || 
                              aiResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                identity = JSON.parse(jsonMatch[1] || jsonMatch[0]);
            } else {
                throw new Error('No JSON found');
            }
        }

        identity.name = identity.name || 'Unknown Platform';
        identity.type = identity.type || 'Web Platform';
        identity.confidence = identity.confidence || 0.5;

        sendResponse({ success: true, identity: JSON.stringify(identity) });

    } catch (error) {
        console.error('❌ Platform identification error:', error);
        sendResponse({
            success: true,
            identity: JSON.stringify({
                name: 'Platform',
                type: 'Web',
                confidence: 0.3
            })
        });
    }
}

async function handleChatMessage(request, sendResponse) {
    console.log("💬 Processing chat message");

    try {
        const userMessage = request.message;
        if (!userMessage || userMessage.trim() === "") {
            sendResponse({ success: false, response: "Please enter a message." });
            return;
        }

        const recentContexts = monitoringState.activityBuffer.slice(-10);
        let contextInfo = "";

        if (monitoringState.platformIdentity) {
            contextInfo += `\n\nUser is on: ${monitoringState.platformIdentity.name}`;
        }

        if (recentContexts.length > 0) {
            const pageContexts = recentContexts.filter(c => c.type === 'page_context');
            if (pageContexts.length > 0) {
                const lastPage = pageContexts[pageContexts.length - 1];
                contextInfo += `\n\nCurrent page: ${lastPage.title}`;
            }
        }

        const storage = await chrome.storage.local.get(['currentTask']);
        if (storage.currentTask) {
            contextInfo += `\n\nTask: ${storage.currentTask}`;
        }

        const fullPrompt = `You are an AI coding assistant.${contextInfo}\n\nUser: ${userMessage}`;
        const aiResponse = await callGeminiAPI(fullPrompt);

        sendResponse({ success: true, response: aiResponse });

    } catch (error) {
        console.error("❌ Chat error:", error);
        sendResponse({ success: false, response: `Error: ${error.message}` });
    }
}

async function callGeminiAPI(prompt) {
    const requestBody = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
}

// ========================================
// HELPER FUNCTIONS
// ========================================
function detectPlatform(hostname) {
    const platforms = {
        'github.com': 'GitHub',
        'leetcode.com': 'LeetCode',
        'codesignal.com': 'CodeSignal',
        'hackerrank.com': 'HackerRank',
        'localhost': 'Local IDE'
    };

    for (const [domain, platform] of Object.entries(platforms)) {
        if (hostname.includes(domain)) return platform;
    }

    return 'Other';
}

async function getUserId() {
    const result = await chrome.storage.local.get('userId');
    if (result.userId) return result.userId;

    const userId = `user_${Date.now()}`;
    await chrome.storage.local.set({ userId });
    return userId;
}

// ========================================
// KEEPALIVE (Prevent service worker sleep)
// ========================================
setInterval(() => {
    chrome.runtime.getPlatformInfo(() => {
        console.log('💓 Keepalive ping');
    });
}, 20000); // Every 20 seconds

// ========================================
// INITIALIZATION
// ========================================
chrome.runtime.onStartup.addListener(async () => {
    console.log('🔄 Browser started');
    const { monitoringEnabled } = await chrome.storage.local.get('monitoringEnabled');
    monitoringState.isActive = monitoringEnabled || false;
});

chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('⚙️ Extension installed/updated:', details.reason);
    if (details.reason === 'install') {
        await chrome.storage.local.set({ monitoringEnabled: false });
    }
});

console.log('✅ Service Worker initialized with navigation persistence');
