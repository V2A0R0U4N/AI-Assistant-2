/* Input Tracker - Track All User Typing in Real-Time */
/* Privacy-first: Only starts when monitoring is enabled */
(function () {
    'use strict';

    if (window.InputTrackerInitialized) return;
    window.InputTrackerInitialized = true;

    class InputTracker {
        constructor() {
            this.isTracking = false;
            this.inputBuffer = [];
            this.maxBufferSize = 20;
            this.debounceTimer = null;
            this.callback = null;

            // Stats
            this.stats = {
                totalInputs: 0,
                totalPastes: 0,
                totalKeyPresses: 0
            };

            console.log('[InputTracker] ✅ Initialized (passive - waiting for start)');
        }

        // Start tracking (called by ContextMonitor)
        start(callback) {
            if (this.isTracking) {
                console.log('[InputTracker] ⚠️ Already tracking');
                return;
            }

            this.isTracking = true;
            this.callback = callback;

            // Track input events
            this.inputHandler = this.handleInput.bind(this);
            document.addEventListener('input', this.inputHandler, true);

            // Track paste events
            this.pasteHandler = this.handlePaste.bind(this);
            document.addEventListener('paste', this.pasteHandler, true);

            // Track keypress for special keys
            this.keydownHandler = this.handleKeydown.bind(this);
            document.addEventListener('keydown', this.keydownHandler, true);

            console.log('[InputTracker] ✅ Started tracking');
        }

        // Stop tracking (called by ContextMonitor)
        stop() {
            if (!this.isTracking) return;

            this.isTracking = false;

            document.removeEventListener('input', this.inputHandler, true);
            document.removeEventListener('paste', this.pasteHandler, true);
            document.removeEventListener('keydown', this.keydownHandler, true);

            this.flushBuffer();

            console.log('[InputTracker] ⏹️ Stopped tracking');
        }

        // Handle input events
        handleInput(event) {
            if (!this.isTracking) return;

            const target = event.target;
            if (!target.matches('input, textarea, [contenteditable]')) return;

            this.stats.totalInputs++;

            const inputData = {
                type: 'input',
                eventType: 'typing',
                element: target.tagName.toLowerCase(),
                elementId: target.id || 'unnamed',
                elementClass: target.className,
                value: this.getValue(target).substring(0, 500), // Limit size
                valueLength: this.getValue(target).length,
                inputType: target.type || 'text',
                timestamp: Date.now(),
                url: window.location.href
            };

            this.addToBuffer(inputData);
        }

        // Handle paste events
        handlePaste(event) {
            if (!this.isTracking) return;

            const target = event.target;
            const pastedData = event.clipboardData?.getData('text') || '';

            if (pastedData.length > 0) {
                this.stats.totalPastes++;

                const pasteData = {
                    type: 'input',
                    eventType: 'paste',
                    element: target.tagName?.toLowerCase(),
                    content: pastedData.substring(0, 500), // Limit size
                    contentLength: pastedData.length,
                    timestamp: Date.now(),
                    url: window.location.href
                };

                this.addToBuffer(pasteData);
                console.log('[InputTracker] 📋 Paste detected:', pastedData.length, 'chars');
            }
        }

        // Handle special keys
        handleKeydown(event) {
            if (!this.isTracking) return;

            const specialKeys = ['Enter', 'Tab', 'Escape', 'Delete', 'Backspace'];
            const modifierKeys = ['Control', 'Alt', 'Meta', 'Shift'];

            if (specialKeys.includes(event.key) ||
                (modifierKeys.some(k => event.getModifierState(k)) && event.key.length === 1)) {

                this.stats.totalKeyPresses++;

                const keyData = {
                    type: 'input',
                    eventType: 'keypress',
                    key: event.key,
                    ctrl: event.ctrlKey,
                    alt: event.altKey,
                    shift: event.shiftKey,
                    meta: event.metaKey,
                    timestamp: Date.now()
                };

                this.addToBuffer(keyData);
            }
        }

        // Get value from element
        getValue(element) {
            if (element.value !== undefined) return element.value;
            if (element.textContent) return element.textContent;
            return '';
        }

        // Add to buffer
        addToBuffer(data) {
            this.inputBuffer.push(data);

            if (this.inputBuffer.length >= this.maxBufferSize) {
                this.flushBuffer();
            } else {
                clearTimeout(this.debounceTimer);
                this.debounceTimer = setTimeout(() => this.flushBuffer(), 2000);
            }
        }

        // Flush buffer (send to ContextMonitor via callback)
        flushBuffer() {
            if (this.inputBuffer.length === 0) return;

            const dataToSend = [...this.inputBuffer];
            this.inputBuffer = [];

            if (this.callback) {
                this.callback(dataToSend);
            }

            console.log(`[InputTracker] 📤 Flushed ${dataToSend.length} input events`);
        }

        // Get status (for ContextMonitor)
        getStatus() {
            return {
                isTracking: this.isTracking,
                bufferSize: this.inputBuffer.length,
                stats: this.stats
            };
        }
    }

    // Export globally (matches your pattern)
    window.InputTracker = new InputTracker();
    console.log('[InputTracker] ✅ Ready - waiting for monitoring to start');
})();
