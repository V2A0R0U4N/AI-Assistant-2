// Unified Content Script for CodeFlow AI
(function() {
    // Use a flag to ensure the script only runs once per page
    if (window.codeFlowInitialized) {
        return;
    }
    window.codeFlowInitialized = true;

    console.log('CodeFlow AI: Unified Content Script Initializing...');

    // These will hold the instances of our UI components
    let assistantOverlay = null;
    let assistantSidebar = null;

    // The CodeContextMonitor class captures what's happening on the page
    class CodeContextMonitor {
        constructor() {
            this.platform = this.detectPlatform();
            this.lastCapturedCode = '';
            this.errorPatterns = [];
            this.codeChangeObserver = null;
            this.assistantActive = false;
        }

        // Detect which coding platform we're on
        detectPlatform() {
            const hostname = window.location.hostname;

            if (hostname.includes('replit.com')) return 'replit';
            if (hostname.includes('leetcode.com')) return 'leetcode';
            if (hostname.includes('colab.research.google.com')) return 'colab';
            if (hostname.includes('github.com')) return 'github';
            if (hostname.includes('codepen.io')) return 'codepen';
            if (hostname.includes('stackblitz.com')) return 'stackblitz';

            return 'generic';
        }

        // Platform-specific code extraction
        extractCode() {
            switch (this.platform) {
                case 'replit':
                    return this.extractReplitCode();
                case 'leetcode':
                    return this.extractLeetCodeCode();
                case 'colab':
                    return this.extractColabCode();
                case 'github':
                    return this.extractGitHubCode();
                default:
                    return this.extractGenericCode();
            }
        }

        extractReplitCode() {
            const codeElements = document.querySelectorAll('.view-line');
            let code = Array.from(codeElements).map(line => line.textContent).join('\n');
            const fileTab = document.querySelector('.tab-item.active');
            const fileName = fileTab ? fileTab.textContent.trim() : 'unknown';
            return { code, fileName, language: this.detectLanguage(fileName), platform: 'replit' };
        }

        extractLeetCodeCode() {
            const editorContainer = document.querySelector('.monaco-editor');
            if (!editorContainer) return { code: '', fileName: 'solution', language: 'unknown' };
            const codeLines = editorContainer.querySelectorAll('.view-line');
            const code = Array.from(codeLines).map(line => line.textContent).join('\n');
            const problemTitle = document.querySelector('[data-cy="question-title"]');
            const title = problemTitle ? problemTitle.textContent.trim() : 'Problem';
            const langButton = document.querySelector('button[id^="headlessui-listbox-button"]');
            const language = langButton ? langButton.textContent.trim() : 'unknown';
            return { code, fileName: title, language: language.toLowerCase(), platform: 'leetcode', problemContext: this.extractProblemContext() };
        }

        extractColabCode() {
            const cells = document.querySelectorAll('.cell');
            let notebooks = [];
            cells.forEach((cell, index) => {
                const codeElement = cell.querySelector('.inputarea');
                if (codeElement) {
                    notebooks.push({ cellIndex: index, code: codeElement.textContent, type: 'code' });
                }
            });
            return { code: notebooks.map(n => n.code).join('\n\n'), fileName: 'notebook', language: 'python', platform: 'colab', cells: notebooks };
        }

        extractGitHubCode() {
            const lines = document.querySelectorAll('.blob-code-inner');
            if (!lines.length) return { code: '', fileName: 'unknown', language: 'unknown' };
            const code = Array.from(lines).map(line => line.textContent).join('\n');
            const fileNameElement = document.querySelector('.final-path');
            const fileName = fileNameElement ? fileNameElement.textContent : 'file';
            return { code, fileName, language: this.detectLanguage(fileName), platform: 'github' };
        }

        extractGenericCode() {
            let code = '';
            const monacoLines = document.querySelectorAll('.view-line');
            if (monacoLines.length > 0) {
                code = Array.from(monacoLines).map(l => l.textContent).join('\n');
            } else {
                const textarea = document.querySelector('textarea[class*="code"]');
                if (textarea) code = textarea.value;
            }
            return { code, fileName: 'code', language: 'unknown', platform: 'generic' };
        }

        detectLanguage(fileName) {
            const ext = fileName.split('.').pop().toLowerCase();
            const langMap = { 'js': 'javascript', 'ts': 'typescript', 'py': 'python', 'java': 'java', 'cpp': 'cpp', 'c': 'c', 'html': 'html', 'css': 'css' };
            return langMap[ext] || 'unknown';
        }

        extractProblemContext() {
            const description = document.querySelector('[data-track-load="description_content"]');
            if (!description) return null;
            return { description: description.textContent.trim().substring(0, 500), difficulty: document.querySelector('[diff]')?.textContent || 'Unknown' };
        }

        captureFullContext() {
            const codeData = this.extractCode();
            const context = { ...codeData, url: window.location.href, timestamp: Date.now(), codeChanged: codeData.code !== this.lastCapturedCode };
            this.lastCapturedCode = codeData.code;
            return context;
        }

        startObserving() {
            if (this.codeChangeObserver) this.codeChangeObserver.disconnect();
            this.codeChangeObserver = new MutationObserver(() => {
                clearTimeout(this.changeTimeout);
                this.changeTimeout = setTimeout(() => this.onCodeChange(), 2000);
            });
            const editorArea = document.querySelector('.monaco-editor, .CodeMirror, body');
            this.codeChangeObserver.observe(editorArea, { childList: true, subtree: true, characterData: true });
            console.log("CodeFlow AI: Started observing code changes.");
        }

        onCodeChange() {
            const context = this.captureFullContext();
            chrome.runtime.sendMessage({ action: 'contextCaptured', context: context });
        }

        stopObserving() {
            if (this.codeChangeObserver) {
                this.codeChangeObserver.disconnect();
                console.log("CodeFlow AI: Stopped observing code changes.");
            }
        }
    }

    // Initialize the monitor
    const monitor = new CodeContextMonitor();

    // The single, unified message listener for this content script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('CodeFlow AI: Message received in content script ->', request.action);

        // --- Sidebar Actions ---
        if (request.action === "toggleSidebar" || request.action === "showSidebar" || request.action === "hideSidebar") {
            if (!assistantSidebar) {
                try {
                    assistantSidebar = new AssistantSidebar();
                    console.log("CodeFlow AI: Sidebar initialized on demand.");
                } catch (e) {
                    console.error("CodeFlow AI: Failed to initialize sidebar:", e);
                    sendResponse({ success: false, error: e.message });
                    return true;
                }
            }

            if (request.action === "toggleSidebar") assistantSidebar.toggle();
            else if (request.action === "showSidebar") assistantSidebar.show();
            else if (request.action === "hideSidebar") assistantSidebar.hide();
            
            sendResponse({ success: true, visible: assistantSidebar ? assistantSidebar.isVisible : false });
        }

        // --- Overlay & Monitoring Actions ---
        else if (request.action === 'toggleAssistant') {
            if (!assistantOverlay) {
                try {
                    assistantOverlay = new AssistantOverlay();
                    console.log("CodeFlow AI: Overlay initialized on demand.");
                    chrome.storage.local.get('taskDescription', (data) => {
                        if (assistantOverlay) assistantOverlay.updateTask(data.taskDescription);
                    });
                } catch (e) {
                    console.error("CodeFlow AI: Failed to initialize overlay:", e);
                    sendResponse({ success: false, error: e.message });
                    return true;
                }
            }

            monitor.assistantActive = request.isActive;
            if (request.isActive) {
                monitor.startObserving();
                assistantOverlay.show();
            } else {
                monitor.stopObserving();
                assistantOverlay.hide();
            }
            sendResponse({ success: true });
        }

        // --- Data Update Actions for UI from Background Script ---
        else if (request.action === 'updateSuggestions') {
            if (assistantOverlay && assistantOverlay.isVisible) {
                assistantOverlay.updateSuggestions(request);
            }
            sendResponse({ success: true });
        } 
        else if (request.action === 'showDebugHelp') {
            if (assistantOverlay && assistantOverlay.isVisible) {
                assistantOverlay.showDebugHelp(request.help);
            }
            sendResponse({ success: true });
        }

        return true; // Keep the message channel open for asynchronous responses
    });

    console.log('CodeFlow AI: Assistant loaded on', monitor.platform);

})();