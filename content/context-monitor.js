/* Context Monitor - Privacy-First with Enhanced Detection */
(function () {
    'use strict';

    if (window.ContextMonitorInitialized) return;
    window.ContextMonitorInitialized = true;

    class ContextMonitor {
        constructor() {
            this.isMonitoring = false;
            this.isInitialized = false;

            this.platformAnalysis = null;
            this.platform = 'unknown';
            this.platformIdentity = null;

            this.eventBuffer = [];
            this.bufferTimeout = null;
            this.BUFFER_DELAY = 2000;
            this.MAX_BUFFER_SIZE = 50;

            this.lastContext = { url: '', title: '', selectedText: '', timestamp: null };
            this.selectionDebounce = null;
            this.lastSelection = '';

            this.selectionObserver = null;
            this.lastFocusedElement = null;

            this.codeExtractionInterval = null;

            console.log('[ContextMonitor] ✅ Initialized (passive mode - no detection yet)');
        }

        async initialize() {
            if (this.isInitialized) {
                console.log('[ContextMonitor] Already initialized');
                return;
            }

            console.log('[ContextMonitor] 🔍 Initializing platform detection (user started monitoring)');

            this.platformAnalysis = this.analyzePlatform();
            this.platform = this.platformAnalysis.type;

            if (this.isCodingPlatform()) {
                console.log('[ContextMonitor] 🤖 Coding platform detected, identifying with AI...');
                await this.identifyPlatformWithAI();
            }

            this.isInitialized = true;
            console.log('[ContextMonitor] ✅ Initialization complete');
        }

        analyzePlatform() {
            const analysis = {
                url: window.location.href,
                hostname: window.location.hostname,
                title: document.title,

                scores: {
                    codeEditor: 0,
                    codeBlocks: 0,
                    syntaxHighlight: 0,
                    terminal: 0,
                    fileSystem: 0,
                    execution: 0,
                    documentation: 0,
                    learning: 0
                },

                features: [],
                type: 'web',
                confidence: 0,
                category: 'unknown'
            };

            this.detectCodeEditor(analysis);
            this.detectCodeBlocks(analysis);
            this.detectSyntaxHighlighting(analysis);
            this.detectTerminal(analysis);
            this.detectFileSystem(analysis);
            this.detectExecution(analysis);
            this.detectDocumentation(analysis);
            this.detectLearningPlatform(analysis);

            this.classifyPlatform(analysis);

            return analysis;
        }

        detectCodeEditor(analysis) {
            const editorPatterns = [
                { selector: '.monaco-editor', name: 'Monaco', weight: 10 },
                { selector: '.CodeMirror', name: 'CodeMirror', weight: 10 },
                { selector: '.cm-editor', name: 'CodeMirror 6', weight: 10 },
                { selector: '.ace_editor', name: 'Ace', weight: 10 },
                { selector: '[class*="code-editor"]', name: 'Generic', weight: 7 },
                { selector: '[class*="editor-container"]', name: 'Generic', weight: 7 },
                { selector: 'textarea[class*="code"]', name: 'Textarea', weight: 5 }
            ];

            for (const pattern of editorPatterns) {
                if (document.querySelector(pattern.selector)) {
                    analysis.scores.codeEditor += pattern.weight;
                    analysis.features.push(`Code Editor: ${pattern.name}`);
                    break;
                }
            }
        }

        detectCodeBlocks(analysis) {
            const codeBlocks = document.querySelectorAll('pre code, pre, code[class*="language-"], code[class*="hljs"]');
            const count = codeBlocks.length;

            if (count > 0) {
                analysis.scores.codeBlocks = Math.min(count * 2, 20);
                analysis.features.push(`${count} code blocks`);
            }

            // Check for multi-line code
            let multiLineCount = 0;
            codeBlocks.forEach(block => {
                if (block.textContent.split('\n').length > 3) {
                    multiLineCount++;
                }
            });

            if (multiLineCount > 2) {
                analysis.scores.codeBlocks += 5;
                analysis.features.push(`${multiLineCount} multi-line blocks`);
            }
        }

        detectSyntaxHighlighting(analysis) {
            const highlightClasses = ['hljs', 'highlight', 'prism', 'token', 'syntax', 'cm-', 'ace_'];

            for (const className of highlightClasses) {
                if (document.querySelector(`[class*="${className}"]`)) {
                    analysis.scores.syntaxHighlight += 8;
                    analysis.features.push('Syntax Highlighting');
                    break;
                }
            }

            // Check for language-specific tokens
            const languageTokens = document.querySelectorAll('[class*="token-"], [class*="mtk"]');
            if (languageTokens.length > 5) {
                analysis.scores.syntaxHighlight += 5;
            }
        }

        detectTerminal(analysis) {
            const terminalSelectors = [
                '.terminal', '.console', '.xterm',
                '[class*="terminal"]', '[class*="console"]',
                '[class*="shell"]', '.output'
            ];

            for (const selector of terminalSelectors) {
                if (document.querySelector(selector)) {
                    analysis.scores.terminal += 10;
                    analysis.features.push('Terminal');
                    break;
                }
            }
        }

        detectFileSystem(analysis) {
            const fileSystemSelectors = [
                '[class*="file-explorer"]', '[class*="file-tree"]',
                '[class*="project-tree"]', '.explorer',
                '[class*="workspace"]', '[class*="sidebar"]'
            ];

            for (const selector of fileSystemSelectors) {
                if (document.querySelector(selector)) {
                    analysis.scores.fileSystem += 10;
                    analysis.features.push('File System');
                    break;
                }
            }

            // Check for file icons
            const fileIcons = document.querySelectorAll('[class*="file-icon"], [class*="folder-icon"]');
            if (fileIcons.length > 3) {
                analysis.scores.fileSystem += 5;
            }
        }

        detectExecution(analysis) {
            const executionKeywords = ['run', 'execute', 'compile', 'submit', 'test', 'debug', 'build'];
            const buttons = document.querySelectorAll('button, [role="button"], input[type="button"]');

            buttons.forEach(btn => {
                const btnText = (btn.textContent || btn.value || '').toLowerCase();
                for (const keyword of executionKeywords) {
                    if (btnText.includes(keyword)) {
                        analysis.scores.execution += 8;
                        analysis.features.push(`Execution: ${keyword}`);
                        break;
                    }
                }
            });
        }

        detectDocumentation(analysis) {
            const docKeywords = [
                'documentation', 'docs', 'api reference', 'tutorial',
                'guide', 'example', 'usage', 'syntax'
            ];

            const pageText = (document.title + ' ' +
                (document.querySelector('meta[name="description"]')?.content || '')).toLowerCase();

            for (const keyword of docKeywords) {
                if (pageText.includes(keyword)) {
                    analysis.scores.documentation += 5;
                    analysis.features.push(`Documentation: ${keyword}`);
                    break;
                }
            }

            // Check for code examples in docs
            const codeBlocks = document.querySelectorAll('pre code');
            if (codeBlocks.length >= 3 && codeBlocks.length <= 10) {
                analysis.scores.documentation += 8;
            }
        }

        detectLearningPlatform(analysis) {
            const learningKeywords = [
                'problem', 'challenge', 'exercise', 'practice',
                'learn', 'course', 'lesson', 'difficulty',
                'easy', 'medium', 'hard', 'solution', 'hint'
            ];

            const pageText = document.body.textContent.toLowerCase();
            let keywordCount = 0;

            for (const keyword of learningKeywords) {
                if (pageText.includes(keyword)) {
                    keywordCount++;
                }
            }

            if (keywordCount >= 3) {
                analysis.scores.learning = keywordCount * 3;
                analysis.features.push(`Learning (${keywordCount} keywords)`);
            }
        }

        classifyPlatform(analysis) {
            const scores = analysis.scores;
            const total = Object.values(scores).reduce((a, b) => a + b, 0);

            if (scores.codeEditor >= 8) {
                if (scores.fileSystem >= 8 && scores.terminal >= 8) {
                    analysis.type = 'Full IDE';
                    analysis.category = 'online-ide';
                    analysis.confidence = 0.95;
                } else if (scores.execution >= 8) {
                    analysis.type = 'Code Playground';
                    analysis.category = 'code-playground';
                    analysis.confidence = 0.90;
                } else {
                    analysis.type = 'Code Editor';
                    analysis.category = 'code-editor';
                    analysis.confidence = 0.85;
                }
            } else if (scores.learning >= 10 && scores.codeBlocks >= 10) {
                analysis.type = 'Coding Challenge';
                analysis.category = 'coding-challenge';
                analysis.confidence = 0.88;
            } else if (scores.documentation >= 10 && scores.codeBlocks >= 8) {
                analysis.type = 'Documentation';
                analysis.category = 'documentation';
                analysis.confidence = 0.82;
            } else if (scores.codeBlocks >= 15 || scores.syntaxHighlight >= 10) {
                analysis.type = 'Coding Platform';
                analysis.category = 'coding-platform';
                analysis.confidence = 0.75;
            } else if (total >= 20) {
                analysis.type = 'Tech Platform';
                analysis.category = 'tech-platform';
                analysis.confidence = 0.60;
            } else {
                analysis.type = 'Web';
                analysis.category = 'web';
                analysis.confidence = 0.50;
            }

            // Localhost check
            if (analysis.hostname === 'localhost' || analysis.hostname === '127.0.0.1') {
                analysis.type = 'Local ' + analysis.type;
                analysis.category = 'localhost-' + analysis.category;
            }
        }

        isCodingPlatform() {
            if (!this.platformAnalysis) return false;
            const total = Object.values(this.platformAnalysis.scores).reduce((a, b) => a + b, 0);
            return total >= 15;
        }

        async identifyPlatformWithAI() {
            const cacheKey = `platform_identity_${this.platformAnalysis.hostname}`;
            const cached = await this.getFromCache(cacheKey);

            if (cached) {
                this.platformIdentity = cached;
                return cached;
            }

            const context = {
                url: window.location.href,
                hostname: window.location.hostname,
                title: document.title,
                description: document.querySelector('meta[name="description"]')?.content || '',
                features: this.platformAnalysis.features,
                category: this.platformAnalysis.category
            };

            const prompt = `Identify this coding platform:

URL: ${context.url}
Title: ${context.title}
Features: ${context.features.join(', ')}

Respond with JSON only:
{
  "name": "platform name",
  "type": "platform type",
  "description": "brief description",
  "confidence": 0-1
}`;

            return new Promise((resolve) => {
                chrome.runtime.sendMessage({
                    action: 'identifyPlatform',
                    prompt: prompt
                }, (response) => {
                    if (chrome.runtime.lastError || !response?.success) {
                        resolve(this.getFallbackIdentity());
                        return;
                    }

                    try {
                        const identity = JSON.parse(response.identity);
                        this.platformIdentity = identity;
                        this.saveToCache(cacheKey, identity, 7 * 24 * 60 * 60 * 1000);

                        // Update display after AI identification
                        if (this.isMonitoring) {
                            this.updateSidebarDisplay();
                        }

                        resolve(identity);
                    } catch (e) {
                        resolve(this.getFallbackIdentity());
                    }
                });
            });
        }

        getFallbackIdentity() {
            const hostname = this.platformAnalysis.hostname;
            const name = hostname.replace(/^www\./, '').replace(/\.(com|io|ai|dev)$/, '').split('.')[0];

            return {
                name: name.charAt(0).toUpperCase() + name.slice(1),
                type: this.platformAnalysis.type,
                description: `A ${this.platformAnalysis.category} platform`,
                confidence: 0.5
            };
        }

        setupSelectionObserver() {
            if (this.selectionObserver) return;

            this.selectionObserver = new MutationObserver((mutations) => {
                const activeElement = document.activeElement;
                if (activeElement && activeElement !== document.body) {
                    this.lastFocusedElement = activeElement;
                }
            });

            this.selectionObserver.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: false,
                characterData: false
            });

            console.log('[ContextMonitor] ✅ MutationObserver active');
        }

        stopSelectionObserver() {
            if (this.selectionObserver) {
                this.selectionObserver.disconnect();
                this.selectionObserver = null;
            }
        }

        async start() {
            if (this.isMonitoring) return;

            console.log('[ContextMonitor] 🚀 Starting monitoring (user initiated)');

            await this.initialize();

            this.isMonitoring = true;
            this.setupSelectionObserver();

            setTimeout(() => this.capturePageContext(), 500);
            this.setupListeners();

            this.startAdvancedTrackers();

            // Show platform display on top left
            setTimeout(() => {
                this.updateSidebarDisplay();
                console.log('[ContextMonitor] 🎯 Platform display should now be visible');
            }, 1000);

            this.contextInterval = setInterval(() => {
                if (this.isMonitoring) {
                    this.capturePageContext();
                    this.updateSidebarDisplay(); // Update periodically
                }
            }, 30000);

            console.log('[ContextMonitor] ✅ Monitoring active');
        }
        // ========================================
        // NEW METHOD: Start Advanced Trackers
        // ========================================
        startAdvancedTrackers() {
            console.log('[ContextMonitor] 🚀 Starting advanced trackers...');

            // Start Input Tracker
            if (window.InputTracker && !window.InputTracker.getStatus().isTracking) {
                window.InputTracker.start((inputData) => {
                    console.log('[InputTracker] Data captured:', inputData);
                    this.captureContext('input_tracking', inputData);
                });
                console.log('[ContextMonitor] ✅ Input Tracker started');
            }

            // Start Scroll Tracker
            if (window.ScrollTracker && !window.ScrollTracker.getStatus().isTracking) {
                window.ScrollTracker.start((scrollData) => {
                    console.log('[ScrollTracker] Data captured:', scrollData);
                    this.captureContext('scroll_tracking', scrollData);
                });
                console.log('[ContextMonitor] ✅ Scroll Tracker started');
            }

            // Extract code blocks periodically
            if (window.CodeFlowDOMParser) {
                this.codeExtractionInterval = setInterval(() => {
                    const codeBlocks = window.CodeFlowDOMParser.extractCodeBlocks();
                    if (codeBlocks.length > 0) {
                        console.log('[DOMParser] Code blocks extracted:', codeBlocks.length);
                        this.captureContext('code_blocks', codeBlocks);
                    }
                }, 10000); // Every 10 seconds
                console.log('[ContextMonitor] ✅ Code extraction scheduled');
            }

            console.log('[ContextMonitor] ✅ All advanced trackers started');
        }

        // ========================================
        // NEW METHOD: Helper to capture context
        // ========================================
        captureContext(type, data) {
            const context = {
                type: type,
                data: data,
                url: window.location.href,
                platform: this.platform,
                timestamp: Date.now()
            };

            this.addToBuffer(context);
        }

        stop() {
            if (!this.isMonitoring) return;

            console.log('[ContextMonitor] ⏹️ Stopping monitoring');
            this.isMonitoring = false;

            this.removeListeners();
            this.stopSelectionObserver();

            // NEW: Stop Advanced Trackers
            if (window.InputTracker) {
                window.InputTracker.stop();
                console.log('[ContextMonitor] ⏹️ Input Tracker stopped');
            }

            if (window.ScrollTracker) {
                window.ScrollTracker.stop();
                console.log('[ContextMonitor] ⏹️ Scroll Tracker stopped');
            }

            if (this.codeExtractionInterval) {
                clearInterval(this.codeExtractionInterval);
                console.log('[ContextMonitor] ⏹️ Code extraction stopped');
            }

            if (this.contextInterval) clearInterval(this.contextInterval);
            this.flushBuffer(true);

            // Clean up platform display
            const displayElement = document.getElementById('codeflow-platform-display');
            if (displayElement) {
                displayElement.remove();
                console.log('[ContextMonitor] 🗑️ Platform display removed');
            }

            console.log('[ContextMonitor] ✅ Stopped');
        }

        setupListeners() {
            this.selectionHandler = () => this.handleTextSelection();
            document.addEventListener('mouseup', this.selectionHandler);
            document.addEventListener('keyup', this.selectionHandler);

            this.urlCheckInterval = setInterval(() => {
                if (!this.isMonitoring) return;
                if (window.location.href !== this.lastContext.url) {
                    this.capturePageContext();
                }
            }, 5000);
        }

        removeListeners() {
            if (this.selectionHandler) {
                document.removeEventListener('mouseup', this.selectionHandler);
                document.removeEventListener('keyup', this.selectionHandler);
            }
            if (this.urlCheckInterval) clearInterval(this.urlCheckInterval);
        }

        handleTextSelection() {
            if (!this.isMonitoring) return;

            clearTimeout(this.selectionDebounce);
            this.selectionDebounce = setTimeout(() => {
                const selection = window.getSelection();
                const selectedText = selection.toString().trim();

                if (selectedText && selectedText.length > 5 && selectedText !== this.lastSelection) {
                    this.lastSelection = selectedText;

                    const range = selection.getRangeAt(0);
                    const containerElement = range.commonAncestorContainer.parentElement;

                    const context = {
                        type: 'selection',
                        selectedText: selectedText.substring(0, 500),
                        url: window.location.href,
                        title: document.title,
                        platform: this.platform,
                        platformInfo: this.getPlatformInfo(),
                        domain: window.location.hostname,
                        timestamp: Date.now(),

                        selectionContext: {
                            containerTag: containerElement?.tagName,
                            containerClass: containerElement?.className,
                            nearbyText: this.getNearbyText(range),
                            isCodeBlock: this.isSelectionInCode(containerElement)
                        }
                    };

                    window.postMessage({
                        type: 'CODEFLOW_TEXT_SELECTED',
                        text: selectedText,
                        platform: this.getPlatformInfo(),
                        context: context.selectionContext
                    }, '*');

                    this.addToBuffer(context);
                    console.log('[ContextMonitor] ✅ Selection captured');
                }
            }, 500);
        }

        getNearbyText(range) {
            const before = range.startContainer.textContent?.substring(
                Math.max(0, range.startOffset - 100),
                range.startOffset
            ) || '';

            const after = range.endContainer.textContent?.substring(
                range.endOffset,
                range.endOffset + 100
            ) || '';

            return { before, after };
        }

        isSelectionInCode(element) {
            if (!element) return false;

            const codeElements = ['PRE', 'CODE'];
            if (codeElements.includes(element.tagName)) return true;

            let parent = element.parentElement;
            for (let i = 0; i < 5 && parent; i++) {
                if (codeElements.includes(parent.tagName)) return true;
                if (parent.className?.includes('code') || parent.className?.includes('editor')) return true;
                parent = parent.parentElement;
            }

            return false;
        }

        capturePageContext() {
            if (!this.isMonitoring) return;

            const context = {
                type: 'page_context',
                url: window.location.href,
                title: document.title,
                platform: this.platform,
                platformInfo: this.getPlatformInfo(),
                domain: window.location.hostname,
                timestamp: Date.now()
            };

            this.lastContext.url = context.url;
            this.addToBuffer(context);
        }

        getPlatformInfo() {
            if (this.platformIdentity) {
                return {
                    name: this.platformIdentity.name,
                    type: this.platformIdentity.type,
                    description: this.platformIdentity.description,
                    category: this.platformAnalysis?.category,
                    confidence: this.platformIdentity.confidence,
                    hostname: this.platformAnalysis?.hostname,
                    icon: this.getIcon(this.platformIdentity.type)
                };
            }

            if (this.platformAnalysis) {
                return {
                    name: this.getFallbackIdentity().name,
                    type: this.platformAnalysis.type,
                    category: this.platformAnalysis.category,
                    confidence: this.platformAnalysis.confidence,
                    hostname: this.platformAnalysis.hostname,
                    icon: this.getIcon(this.platformAnalysis.type)
                };
            }

            return {
                name: 'Unknown',
                type: 'Web',
                category: 'web',
                confidence: 0,
                hostname: window.location.hostname,
                icon: '🌐'
            };
        }

        getIcon(type) {
            const icons = {
                'Full IDE': '💻',
                'Code Playground': '🎮',
                'Code Editor': '✏️',
                'Coding Challenge': '🏆',
                'Documentation': '📚',
                'Coding Platform': '💻',
                'Tech Platform': '🔧',
                'Web': '🌐'
            };
            return icons[type] || '💻';
        }

        updateSidebarDisplay() {
            console.log('[ContextMonitor] 🎯 updateSidebarDisplay called');

            let displayElement = document.getElementById('codeflow-platform-display');

            if (!displayElement) {
                console.log('[ContextMonitor] 🆕 Creating new platform display element');
                displayElement = document.createElement('div');
                displayElement.id = 'codeflow-platform-display';
                displayElement.style.cssText = `
                    position: fixed;
                    top: 15px;
                    left: 15px;
                    background: rgba(26, 27, 38, 0.95);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    color: #ffffff;
                    padding: 12px 18px;
                    border-radius: 10px;
                    border: 1px solid rgba(100, 150, 255, 0.4);
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
                    z-index: 9999;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    font-size: 14px;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    max-width: 350px;
                `;
                document.body.appendChild(displayElement);
                console.log('[ContextMonitor] ✅ Platform display element added to DOM');
            }

            const platformInfo = this.getPlatformInfo();
            console.log('[ContextMonitor] 📊 Platform info:', platformInfo);

            if (platformInfo) {
                displayElement.innerHTML = `
                    <span style="font-size: 18px;">${platformInfo.icon || '💻'}</span>
                    <div style="display: flex; flex-direction: column; gap: 2px;">
                        <div style="font-size: 12px; color: rgba(255, 255, 255, 0.6);">Currently Working On</div>
                        <div style="font-size: 14px; font-weight: 600; color: #ffffff;">
                            ${platformInfo.name || 'Unknown Platform'}
                        </div>
                    </div>
                `;
                console.log('[ContextMonitor] ✅ Platform display updated with:', platformInfo.name);
            }
        }

        addToBuffer(contextData) {
            this.eventBuffer.push(contextData);

            if (this.eventBuffer.length >= this.MAX_BUFFER_SIZE) {
                this.flushBuffer();
                return;
            }

            clearTimeout(this.bufferTimeout);
            this.bufferTimeout = setTimeout(() => this.flushBuffer(), this.BUFFER_DELAY);
        }

        flushBuffer(force = false) {
            if (this.eventBuffer.length === 0) return;

            const eventsToSend = [...this.eventBuffer];

            chrome.runtime.sendMessage({
                action: 'contextBatchUpdate',
                contexts: eventsToSend,
                platform: this.platform,
                platformInfo: this.getPlatformInfo()
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.warn('[ContextMonitor] Send failed');
                }
            });

            this.eventBuffer = [];
            clearTimeout(this.bufferTimeout);
        }

        async getFromCache(key) {
            if (!chrome?.storage?.local) {
                return null;
            }

            return new Promise((resolve) => {
                try {
                    chrome.storage.local.get([key], (result) => {
                        if (chrome.runtime.lastError) {
                            resolve(null);
                            return;
                        }

                        const cached = result[key];
                        if (cached?.expiry > Date.now()) {
                            resolve(cached.data);
                        } else {
                            resolve(null);
                        }
                    });
                } catch (error) {
                    resolve(null);
                }
            });
        }

        async saveToCache(key, data, ttl) {
            if (!chrome?.storage?.local) return;

            try {
                chrome.storage.local.set({
                    [key]: { data, expiry: Date.now() + ttl }
                }, () => {
                    if (chrome.runtime.lastError) {
                        console.warn('[Cache] Save failed');
                    }
                });
            } catch (error) {
                // Silent fail
            }
        }

        getStatus() {
            return {
                isMonitoring: this.isMonitoring,
                isInitialized: this.isInitialized,
                platform: this.platform,
                platformInfo: this.getPlatformInfo(),
                bufferSize: this.eventBuffer.length,
                lastContext: this.lastContext
            };
        }
    }

    window.ContextMonitor = ContextMonitor;
    console.log('[ContextMonitor] ✅ Class loaded (lazy mode)');
})();