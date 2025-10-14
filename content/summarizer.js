/* Real-Time Context Monitor with Buffering & Smart Detection */
(function () {
    'use strict';

    if (window.ContextMonitorInitialized) return;
    window.ContextMonitorInitialized = true;

    class ContextMonitor {
        constructor() {
            this.isMonitoring = false;
            this.platform = this.detectPlatform();

            // Buffering system
            this.eventBuffer = [];
            this.bufferTimeout = null;
            this.BUFFER_DELAY = 2000; // 2 seconds
            this.MAX_BUFFER_SIZE = 50;

            // Context tracking
            this.lastContext = {
                url: '',
                title: '',
                selectedText: '',
                timestamp: null
            };

            // Selection tracking
            this.selectionDebounce = null;
            this.lastSelection = '';

            console.log('[ContextMonitor] Initialized on platform:', this.platform);
        }

        detectPlatform() {
            const hostname = window.location.hostname;
            if (hostname.includes('replit.com')) return 'replit';
            if (hostname.includes('leetcode.com')) return 'leetcode';
            if (hostname.includes('colab.research.google.com')) return 'colab';
            if (hostname.includes('github.com')) return 'github';
            if (hostname.includes('codepen.io')) return 'codepen';
            if (hostname.includes('stackblitz.com')) return 'stackblitz';
            return 'web';
        }

        start() {
            if (this.isMonitoring) return;

            console.log('[ContextMonitor] Starting real-time monitoring...');
            this.isMonitoring = true;

            // Capture initial page context
            this.capturePageContext();

            // Setup event listeners
            this.setupListeners();

            // Start periodic context capture (every 30 seconds)
            this.contextInterval = setInterval(() => {
                this.capturePageContext();
            }, 30000);
        }

        stop() {
            if (!this.isMonitoring) return;

            console.log('[ContextMonitor] Stopping monitoring...');
            this.isMonitoring = false;

            // Remove event listeners
            this.removeListeners();

            // Clear intervals
            if (this.contextInterval) {
                clearInterval(this.contextInterval);
            }

            // Flush any remaining buffered events
            this.flushBuffer(true);
        }

        setupListeners() {
            // Text selection monitoring
            this.selectionHandler = () => this.handleTextSelection();
            document.addEventListener('mouseup', this.selectionHandler);
            document.addEventListener('keyup', this.selectionHandler);

            // URL change detection (for SPAs)
            this.urlCheckInterval = setInterval(() => {
                const currentUrl = window.location.href;
                if (currentUrl !== this.lastContext.url) {
                    this.capturePageContext();
                }
            }, 5000);

            // Visibility change detection
            this.visibilityHandler = () => {
                if (!document.hidden) {
                    this.capturePageContext();
                }
            };
            document.addEventListener('visibilitychange', this.visibilityHandler);
        }

        removeListeners() {
            if (this.selectionHandler) {
                document.removeEventListener('mouseup', this.selectionHandler);
                document.removeEventListener('keyup', this.selectionHandler);
            }

            if (this.urlCheckInterval) {
                clearInterval(this.urlCheckInterval);
            }

            if (this.visibilityHandler) {
                document.removeEventListener('visibilitychange', this.visibilityHandler);
            }
        }

        handleTextSelection() {
            if (!this.isMonitoring) return;

            clearTimeout(this.selectionDebounce);

            this.selectionDebounce = setTimeout(() => {
                const selectedText = window.getSelection().toString().trim();

                // Only capture if text is selected and different from last
                if (selectedText && selectedText.length > 5 && selectedText !== this.lastSelection) {
                    this.lastSelection = selectedText;

                    const context = {
                        type: 'selection',
                        selectedText: selectedText.substring(0, 500), // Limit size
                        url: window.location.href,
                        title: document.title,
                        platform: this.platform,
                        timestamp: Date.now()
                    };

                    this.addToBuffer(context);
                    console.log('[ContextMonitor] Text selected:', selectedText.substring(0, 50) + '...');
                }
            }, 500); // Debounce 500ms
        }

        capturePageContext() {
            if (!this.isMonitoring) return;

            const url = window.location.href;
            const title = document.title;

            // Only send if URL or title changed
            if (url === this.lastContext.url && title === this.lastContext.title) {
                return;
            }

            const metadata = this.extractPageMetadata();

            const context = {
                type: 'page_context',
                url: url,
                title: title,
                description: metadata.description,
                keywords: metadata.keywords,
                platform: this.platform,
                domain: window.location.hostname,
                timestamp: Date.now()
            };

            this.lastContext.url = url;
            this.lastContext.title = title;

            this.addToBuffer(context);
            console.log('[ContextMonitor] Page context captured:', title);
        }

        extractPageMetadata() {
            const metadata = {
                description: '',
                keywords: []
            };

            // Extract meta description
            const metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc) {
                metadata.description = metaDesc.getAttribute('content') || '';
            }

            // Extract keywords
            const metaKeywords = document.querySelector('meta[name="keywords"]');
            if (metaKeywords) {
                const keywords = metaKeywords.getAttribute('content') || '';
                metadata.keywords = keywords.split(',').map(k => k.trim()).filter(k => k);
            }

            // Extract h1 tags as fallback keywords
            if (metadata.keywords.length === 0) {
                const headings = Array.from(document.querySelectorAll('h1, h2'));
                metadata.keywords = headings.slice(0, 5).map(h => h.textContent.trim());
            }

            return metadata;
        }

        addToBuffer(contextData) {
            this.eventBuffer.push(contextData);

            // Auto-flush if buffer is full
            if (this.eventBuffer.length >= this.MAX_BUFFER_SIZE) {
                this.flushBuffer();
                return;
            }

            // Schedule flush
            clearTimeout(this.bufferTimeout);
            this.bufferTimeout = setTimeout(() => {
                this.flushBuffer();
            }, this.BUFFER_DELAY);
        }

        flushBuffer(force = false) {
            if (this.eventBuffer.length === 0) return;

            console.log(`[ContextMonitor] Flushing ${this.eventBuffer.length} buffered events...`);

            // Send batch to background script
            chrome.runtime.sendMessage({
                action: 'contextBatchUpdate',
                contexts: this.eventBuffer,
                platform: this.platform,
                tabInfo: {
                    url: window.location.href,
                    title: document.title
                }
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('[ContextMonitor] Error sending context:', chrome.runtime.lastError);
                } else {
                    console.log('[ContextMonitor] Batch sent successfully');
                }
            });

            // Clear buffer
            this.eventBuffer = [];
        }

        getStatus() {
            return {
                isMonitoring: this.isMonitoring,
                platform: this.platform,
                bufferSize: this.eventBuffer.length,
                lastContext: this.lastContext
            };
        }
    }

    // Make globally accessible
    window.ContextMonitor = ContextMonitor;

    console.log('[ContextMonitor] Class loaded and ready');
})();
