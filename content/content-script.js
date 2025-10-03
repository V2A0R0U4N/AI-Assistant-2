// Content Script - Lives in the webpage and captures coding context

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

    // Replit code extraction
    extractReplitCode() {
        // Replit uses Monaco editor
        const codeElements = document.querySelectorAll('.view-line');
        let code = Array.from(codeElements)
            .map(line => line.textContent)
            .join('\n');

        // Also check for visible file name
        const fileTab = document.querySelector('.tab-item.active');
        const fileName = fileTab ? fileTab.textContent.trim() : 'unknown';

        return {
            code: code,
            fileName: fileName,
            language: this.detectLanguage(fileName),
            platform: 'replit'
        };
    }

    // LeetCode code extraction
    extractLeetCodeCode() {
        // LeetCode also uses Monaco editor
        const editorContainer = document.querySelector('.monaco-editor');

        if (!editorContainer) {
            return { code: '', fileName: 'solution', language: 'unknown' };
        }

        const codeLines = editorContainer.querySelectorAll('.view-line');
        const code = Array.from(codeLines)
            .map(line => line.textContent)
            .join('\n');

        // Get problem title
        const problemTitle = document.querySelector('[data-cy="question-title"]');
        const title = problemTitle ? problemTitle.textContent.trim() : 'Problem';

        // Get selected language
        const langButton = document.querySelector('button[id^="headlessui-listbox-button"]');
        const language = langButton ? langButton.textContent.trim() : 'unknown';

        return {
            code: code,
            fileName: title,
            language: language.toLowerCase(),
            platform: 'leetcode',
            problemContext: this.extractProblemContext()
        };
    }

    // Google Colab code extraction
    extractColabCode() {
        const cells = document.querySelectorAll('.cell');
        let notebooks = [];

        cells.forEach((cell, index) => {
            const codeElement = cell.querySelector('.inputarea');
            if (codeElement) {
                notebooks.push({
                    cellIndex: index,
                    code: codeElement.textContent,
                    type: 'code'
                });
            }
        });

        return {
            code: notebooks.map(n => n.code).join('\n\n'),
            fileName: 'notebook',
            language: 'python',
            platform: 'colab',
            cells: notebooks
        };
    }

    // GitHub code extraction (when viewing files)
    extractGitHubCode() {
        const codeBlock = document.querySelector('.blob-code-content');
        const lines = document.querySelectorAll('.blob-code-inner');

        if (!lines.length) {
            return { code: '', fileName: 'unknown', language: 'unknown' };
        }

        const code = Array.from(lines)
            .map(line => line.textContent)
            .join('\n');

        const fileNameElement = document.querySelector('.final-path');
        const fileName = fileNameElement ? fileNameElement.textContent : 'file';

        return {
            code: code,
            fileName: fileName,
            language: this.detectLanguage(fileName),
            platform: 'github'
        };
    }

    // Generic code extraction (fallback)
    extractGenericCode() {
        // Try to find Monaco, CodeMirror, or ACE editors
        let code = '';

        // Monaco editor
        const monacoLines = document.querySelectorAll('.view-line');
        if (monacoLines.length > 0) {
            code = Array.from(monacoLines).map(l => l.textContent).join('\n');
        }

        // CodeMirror
        if (!code) {
            const codeMirror = document.querySelector('.CodeMirror');
            if (codeMirror && codeMirror.CodeMirror) {
                code = codeMirror.CodeMirror.getValue();
            }
        }

        // Textarea fallback
        if (!code) {
            const textarea = document.querySelector('textarea[class*="code"]');
            if (textarea) {
                code = textarea.value;
            }
        }

        return {
            code: code,
            fileName: 'code',
            language: 'unknown',
            platform: 'generic'
        };
    }

    // Detect programming language from filename
    detectLanguage(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();

        const langMap = {
            'js': 'javascript',
            'ts': 'typescript',
            'py': 'python',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c',
            'go': 'go',
            'rs': 'rust',
            'rb': 'ruby',
            'php': 'php',
            'swift': 'swift',
            'kt': 'kotlin',
            'scala': 'scala',
            'html': 'html',
            'css': 'css'
        };

        return langMap[ext] || 'unknown';
    }

    // Extract problem context (for LeetCode)
    extractProblemContext() {
        const description = document.querySelector('[data-track-load="description_content"]');

        if (!description) return null;

        return {
            description: description.textContent.trim().substring(0, 500),
            difficulty: document.querySelector('[diff]')?.textContent || 'Unknown'
        };
    }

    // Detect console errors
    detectConsoleErrors() {
        const consolePanel = document.querySelector('[class*="console"]');

        if (!consolePanel) return null;

        const errorElements = consolePanel.querySelectorAll('[class*="error"]');

        if (errorElements.length > 0) {
            return {
                hasError: true,
                errors: Array.from(errorElements).map(el => ({
                    message: el.textContent,
                    timestamp: Date.now()
                }))
            };
        }

        return null;
    }

    // Get active cursor position and surrounding code
    getActiveContext() {
        const activeElement = document.activeElement;

        if (!activeElement) return null;

        // Try to get cursor position from Monaco/CodeMirror
        const selection = window.getSelection();
        const selectedText = selection.toString();

        return {
            selectedText: selectedText,
            hasSelection: selectedText.length > 0,
            activeElement: activeElement.tagName
        };
    }

    // Capture full context
    captureFullContext() {
        const codeData = this.extractCode();
        const errors = this.detectConsoleErrors();
        const activeContext = this.getActiveContext();

        const context = {
            ...codeData,
            errors: errors,
            activeContext: activeContext,
            url: window.location.href,
            timestamp: Date.now(),
            codeChanged: codeData.code !== this.lastCapturedCode
        };

        this.lastCapturedCode = codeData.code;

        return context;
    }

    // Start observing DOM changes
    startObserving() {
        // Observe code changes
        this.codeChangeObserver = new MutationObserver((mutations) => {
            // Debounce: Only check after user stops typing for 2 seconds
            clearTimeout(this.changeTimeout);
            this.changeTimeout = setTimeout(() => {
                this.onCodeChange();
            }, 2000);
        });

        // Observe the editor area
        const editorArea = document.querySelector('.monaco-editor') ||
            document.querySelector('.CodeMirror') ||
            document.body;

        this.codeChangeObserver.observe(editorArea, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    // Handle code changes
    onCodeChange() {
        const context = this.captureFullContext();

        // Send to service worker
        chrome.runtime.sendMessage({
            action: 'contextCaptured',
            context: context
        });
    }

    // Stop observing
    stopObserving() {
        if (this.codeChangeObserver) {
            this.codeChangeObserver.disconnect();
        }
    }
}

// Initialize monitor
const monitor = new CodeContextMonitor();

// Listen for messages from service worker
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    if (request.action === 'toggleAssistant') {
        monitor.assistantActive = request.isActive;

        if (request.isActive) {
            monitor.startObserving();
            showAssistantUI();
        } else {
            monitor.stopObserving();
            hideAssistantUI();
        }

        sendResponse({ success: true });
    }

    if (request.action === 'captureContext') {
        const context = monitor.captureFullContext();
        sendResponse({ context: context });
    }

    if (request.action === 'getQuickHelp') {
        const context = monitor.captureFullContext();
        chrome.runtime.sendMessage({
            action: 'contextCaptured',
            context: context
        });
        sendResponse({ success: true });
    }

    if (request.action === 'updateSuggestions') {
        updateAssistantUI(request);
        sendResponse({ success: true });
    }

    if (request.action === 'showDebugHelp') {
        showDebugHelp(request.help);
        sendResponse({ success: true });
    }

    return true;
});

// Placeholder UI functions (will be implemented in overlay-ui.js)
function showAssistantUI() {
    // Will be implemented in Phase 3
    console.log('Assistant UI shown');
}

function hideAssistantUI() {
    console.log('Assistant UI hidden');
}

function updateAssistantUI(data) {
    console.log('UI updated with:', data);
}

function showDebugHelp(help) {
    console.log('Debug help:', help);
}

console.log('CodeFlow AI Assistant loaded on', monitor.platform);