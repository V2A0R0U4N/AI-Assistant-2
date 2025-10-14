/* CodeFlow AI - Content Script with Privacy-First Lazy Initialization */
(function() {
    'use strict';

    console.log("CodeFlow AI: Content script loaded (passive mode)");

    // Prevent multiple initializations
    if (window.CodeFlowAIInitialized) {
        console.log("CodeFlow AI: Already initialized, skipping...");
        return;
    }
    window.CodeFlowAIInitialized = true;

    // Wait for all dependencies to load
    function waitForDependencies(callback) {
        let attempts = 0;
        const maxAttempts = 50;

        const checkInterval = setInterval(() => {
            attempts++;
            
            const hasAssistantSidebar = typeof window.AssistantSidebar !== 'undefined';
            const hasContextMonitor = typeof window.ContextMonitor !== 'undefined';

            if (attempts % 10 === 0) {
                console.log("Dependency check attempt", attempts, {
                    hasAssistantSidebar,
                    hasContextMonitor
                });
            }

            if (hasAssistantSidebar && hasContextMonitor) {
                // Minimum requirements met
                clearInterval(checkInterval);
                callback();
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                console.error("CodeFlow AI: Failed to load dependencies");
                console.error("Missing:", {
                    sidebar: !hasAssistantSidebar,
                    contextMonitor: !hasContextMonitor
                });
            }
        }, 100);
    }

    // Initialize all components
    waitForDependencies(() => {
        console.log("CodeFlow AI: Dependencies loaded, initializing...");

        // Initialize Context Monitor (LAZY - No auto-detection!)
        let contextMonitor = null;
        if (window.ContextMonitor) {
            try {
                contextMonitor = new window.ContextMonitor();
                console.log("✅ Context Monitor created (passive - no detection yet)");
            } catch (e) {
                console.error("❌ Context Monitor creation failed:", e);
            }
        } else {
            console.error("❌ CRITICAL: ContextMonitor class not found!");
        }

        // Initialize Assistant Sidebar (REQUIRED)
        let assistantSidebar = null;
        if (window.AssistantSidebar) {
            try {
                assistantSidebar = new window.AssistantSidebar();
                console.log("✅ Assistant Sidebar initialized");
            } catch (e) {
                console.error("❌ CRITICAL: Assistant Sidebar failed:", e);
                return;
            }
        } else {
            console.error("❌ CRITICAL: AssistantSidebar class not found!");
            return;
        }

        // Message handler for background script
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            try {
                if (request.action === 'ping') {
                    sendResponse({ success: true, ready: true });
                }
                else if (request.action === 'toggleSidebar') {
                    if (assistantSidebar) {
                        assistantSidebar.toggle();
                        console.log("✅ Sidebar toggled");
                        sendResponse({ success: true });
                    } else {
                        sendResponse({ success: false, error: "Sidebar not initialized" });
                    }
                }
                else if (request.action === 'startMonitoring') {
                    console.log("🚀 Starting monitoring (user-initiated)...");
                    
                    if (contextMonitor) {
                        contextMonitor.start();
                        
                        // Get status after starting
                        setTimeout(() => {
                            const status = contextMonitor.getStatus();
                            console.log("📊 Monitoring status:", status);
                        }, 1000);
                        
                        sendResponse({ 
                            success: true, 
                            message: "Monitoring started"
                        });
                    } else {
                        console.error("❌ Context monitor not available");
                        sendResponse({ success: false, message: "Context monitor not available" });
                    }
                }
                else if (request.action === 'stopMonitoring') {
                    console.log("⏹️ Stopping monitoring...");
                    
                    if (contextMonitor) {
                        contextMonitor.stop();
                        console.log("✅ Context monitor stopped");
                        sendResponse({ success: true, message: "Monitoring stopped" });
                    } else {
                        sendResponse({ success: false, message: "Context monitor not available" });
                    }
                }
                else if (request.action === 'getMonitoringStatus') {
                    if (contextMonitor) {
                        const status = contextMonitor.getStatus();
                        sendResponse({ 
                            success: true, 
                            isMonitoring: status.isMonitoring,
                            isInitialized: status.isInitialized,
                            platform: status.platformInfo?.name || 'Unknown',
                            platformType: status.platformInfo?.type || 'Web',
                            contextCount: status.bufferSize || 0,
                            lastContext: status.lastContext
                        });
                    } else {
                        sendResponse({ 
                            success: false, 
                            isMonitoring: false,
                            platform: 'unknown',
                            contextCount: 0
                        });
                    }
                }
                else {
                    console.log("⚠️ Unknown action:", request.action);
                    sendResponse({ success: false, message: "Unknown action" });
                }
            } catch (error) {
                console.error("❌ Error handling message:", error);
                sendResponse({ success: false, error: error.message });
            }

            return true; // Keep message channel open for async responses
        });

        console.log("🚀 CodeFlow AI: Ready (privacy-first mode)");
        console.log("ℹ️ No platform detection until user starts monitoring");

        // Send ready signal to background
        try {
            chrome.runtime.sendMessage({
                action: 'contentScriptReady',
                url: window.location.href
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.log("Background script not ready yet");
                } else {
                    console.log("✅ Connected to background script");
                }
            });
        } catch (e) {
            console.warn("Could not send ready signal:", e);
        }
    });
})();
