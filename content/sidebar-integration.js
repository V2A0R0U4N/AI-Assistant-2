/* Sidebar Integration */
(function() {
    var sidebar = null;
    var initialized = false;

    function init() {
        if (initialized) {
            console.log("Already initialized");
            return sidebar;
        }
        
        console.log("Initializing sidebar...");
        
        if (typeof AssistantSidebar === "undefined") {
            console.error("AssistantSidebar not found!");
            return null;
        }
        
        try {
            sidebar = new AssistantSidebar();
            initialized = true;
            console.log("Sidebar created successfully");
            return sidebar;
        } catch (error) {
            console.error("Error creating sidebar:", error);
            return null;
        }
    }

    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        console.log("Message received:", request.action);
        
        if (request.action === "toggleSidebar") {
            if (!sidebar) {
                sidebar = init();
            }
            if (sidebar) {
                sidebar.toggle();
                console.log("Sidebar toggled, visible:", sidebar.isVisible);
            }
            sendResponse({ success: true, visible: sidebar ? sidebar.isVisible : false });
        } else if (request.action === "showSidebar") {
            if (!sidebar) {
                sidebar = init();
            }
            if (sidebar) {
                sidebar.show();
                console.log("Sidebar shown");
            }
            sendResponse({ success: true });
        } else if (request.action === "hideSidebar") {
            if (sidebar) {
                sidebar.hide();
                console.log("Sidebar hidden");
            }
            sendResponse({ success: true });
        }
        
        return true;
    });

    var platforms = ["replit.com", "leetcode.com", "github.com", "codepen.io", "stackblitz.com"];
    var hostname = window.location.hostname;
    var isSupported = false;
    
    for (var i = 0; i < platforms.length; i++) {
        if (hostname.indexOf(platforms[i]) !== -1) {
            isSupported = true;
            break;
        }
    }
    
    console.log("Platform:", hostname, "Supported:", isSupported);
    
    if (isSupported) {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", function() {
                console.log("DOM ready, initializing...");
                setTimeout(init, 1000);
            });
        } else {
            console.log("DOM already ready");
            setTimeout(init, 1000);
        }
    }

    window.CodeFlowSidebar = {
        get instance() { return sidebar; },
        init: init,
        toggle: function() {
            if (!sidebar) sidebar = init();
            if (sidebar) sidebar.toggle();
        },
        show: function() {
            if (!sidebar) sidebar = init();
            if (sidebar) sidebar.show();
        },
        hide: function() {
            if (sidebar) sidebar.hide();
        }
    };

    console.log("Sidebar integration ready");
})();