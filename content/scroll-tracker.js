/* Scroll Tracker - Monitor Scroll Depth & User Attention */
/* Privacy-first: Only tracks when monitoring is enabled */
(function () {
    'use strict';

    if (window.ScrollTrackerInitialized) return;
    window.ScrollTrackerInitialized = true;

    class ScrollTracker {
        constructor() {
            this.isTracking = false;
            this.scrollData = {
                maxDepth: 0,
                currentDepth: 0,
                lastPosition: 0,
                lastTime: Date.now(),
                scrollEvents: []
            };
            this.throttleDelay = 200; // ms
            this.lastThrottle = 0;
            this.callback = null;
            this.scrollHandler = null;

            console.log('[ScrollTracker] ✅ Initialized (passive - waiting for start)');
        }

        // Start tracking (called by ContextMonitor)
        start(callback) {
            if (this.isTracking) {
                console.log('[ScrollTracker] ⚠️ Already tracking');
                return;
            }

            this.isTracking = true;
            this.callback = callback;

            this.scrollHandler = this.handleScroll.bind(this);
            window.addEventListener('scroll', this.scrollHandler, { passive: true });

            console.log('[ScrollTracker] ✅ Started tracking');
        }

        // Stop tracking (called by ContextMonitor)
        stop() {
            if (!this.isTracking) return;

            this.isTracking = false;
            window.removeEventListener('scroll', this.scrollHandler);

            console.log('[ScrollTracker] ⏹️ Stopped tracking');
        }

        // Handle scroll events (throttled)
        handleScroll() {
            if (!this.isTracking) return;

            const now = Date.now();
            if (now - this.lastThrottle < this.throttleDelay) return;
            this.lastThrottle = now;

            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
            const currentDepth = documentHeight > 0 ? (scrollTop / documentHeight) * 100 : 0;

            // Calculate scroll rate (pixels per second)
            const timeDelta = (now - this.scrollData.lastTime) / 1000; // seconds
            const positionDelta = Math.abs(scrollTop - this.scrollData.lastPosition);
            const scrollRate = timeDelta > 0 ? positionDelta / timeDelta : 0;

            // Update data
            this.scrollData.currentDepth = currentDepth;
            this.scrollData.maxDepth = Math.max(this.scrollData.maxDepth, currentDepth);

            const scrollEvent = {
                type: 'scroll',
                depth: Math.round(currentDepth * 100) / 100,
                maxDepth: Math.round(this.scrollData.maxDepth * 100) / 100,
                scrollRate: Math.round(scrollRate),
                behavior: this.analyzeScrollBehavior(scrollRate),
                visibleElements: this.getVisibleElements(),
                timestamp: now,
                url: window.location.href
            };

            // Send to callback (ContextMonitor)
            if (this.callback) {
                this.callback(scrollEvent);
            }

            // Update for next iteration
            this.scrollData.lastPosition = scrollTop;
            this.scrollData.lastTime = now;
            this.scrollData.scrollEvents.push(scrollEvent);

            // Limit event history
            if (this.scrollData.scrollEvents.length > 50) {
                this.scrollData.scrollEvents.shift();
            }
        }

        // Analyze scroll behavior
        analyzeScrollBehavior(scrollRate) {
            if (scrollRate > 3000) return 'rapid_scroll'; // Fast scrolling (looking for something)
            if (scrollRate > 1000) return 'moderate_scroll'; // Normal scrolling
            if (scrollRate > 100) return 'slow_scroll'; // Careful reading
            return 'paused'; // Stopped/reading
        }

        // Get visible elements in viewport (for context)
        getVisibleElements() {
            const viewportHeight = window.innerHeight;
            const scrollTop = window.scrollY;
            const elements = [];

            // Check important elements
            document.querySelectorAll('h1, h2, h3, code, pre, p').forEach(el => {
                const rect = el.getBoundingClientRect();
                const elementTop = rect.top + scrollTop;
                const elementBottom = elementTop + rect.height;

                // Check if in viewport
                if (elementTop < scrollTop + viewportHeight && elementBottom > scrollTop) {
                    elements.push({
                        tag: el.tagName.toLowerCase(),
                        text: el.textContent.substring(0, 100),
                        isCode: el.tagName === 'CODE' || el.tagName === 'PRE'
                    });
                }
            });

            return elements.slice(0, 10); // Limit to 10 elements
        }

        // Get analytics
        getAnalytics() {
            return {
                maxDepth: this.scrollData.maxDepth,
                currentDepth: this.scrollData.currentDepth,
                totalScrollEvents: this.scrollData.scrollEvents.length,
                averageScrollRate: this.calculateAverageScrollRate()
            };
        }

        // Calculate average scroll rate
        calculateAverageScrollRate() {
            if (this.scrollData.scrollEvents.length === 0) return 0;

            const totalRate = this.scrollData.scrollEvents.reduce((sum, event) => {
                return sum + (event.scrollRate || 0);
            }, 0);

            return Math.round(totalRate / this.scrollData.scrollEvents.length);
        }

        // Get status (for ContextMonitor)
        getStatus() {
            return {
                isTracking: this.isTracking,
                currentDepth: this.scrollData.currentDepth,
                maxDepth: this.scrollData.maxDepth,
                analytics: this.getAnalytics()
            };
        }
    }

    // Export globally (matches your pattern)
    window.ScrollTracker = new ScrollTracker();
    console.log('[ScrollTracker] ✅ Ready - waiting for monitoring to start');
})();
