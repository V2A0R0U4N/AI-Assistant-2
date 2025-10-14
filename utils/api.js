/* API Helper for Backend Communication */
(function () {
    'use strict';

    if (window.APIClientInitialized) return;
    window.APIClientInitialized = true;

    const API_CONFIG = {
        BASE_URL: 'http://localhost:5000/api', // Change to your backend URL
        TIMEOUT: 10000 // 10 seconds
    };

    class APIClient {
        constructor() {
            this.baseUrl = API_CONFIG.BASE_URL;
            console.log('[APIClient] Initialized with base URL:', this.baseUrl);
        }

        async sendContext(contextData) {
            try {
                const response = await this.post('/context', contextData);
                console.log('[APIClient] Context sent successfully');
                return response;
            } catch (error) {
                console.error('[APIClient] Error sending context:', error);
                throw error;
            }
        }

        async batchSendContexts(contexts) {
            try {
                const response = await this.post('/context/batch', { contexts });
                console.log('[APIClient] Batch contexts sent successfully');
                return response;
            } catch (error) {
                console.error('[APIClient] Error sending batch contexts:', error);
                throw error;
            }
        }

        async getContextHistory(limit = 50) {
            try {
                const response = await this.get(`/context/history?limit=${limit}`);
                console.log('[APIClient] Context history retrieved');
                return response;
            } catch (error) {
                console.error('[APIClient] Error fetching context history:', error);
                throw error;
            }
        }

        async getSessionSummary(sessionId) {
            try {
                const response = await this.get(`/context/session/${sessionId}`);
                console.log('[APIClient] Session summary retrieved');
                return response;
            } catch (error) {
                console.error('[APIClient] Error fetching session summary:', error);
                throw error;
            }
        }

        async post(endpoint, data) {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

            try {
                const response = await fetch(`${this.baseUrl}${endpoint}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data),
                    signal: controller.signal
                });

                clearTimeout(timeout);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
                }

                return await response.json();
            } catch (error) {
                clearTimeout(timeout);
                if (error.name === 'AbortError') {
                    throw new Error('Request timeout');
                }
                throw error;
            }
        }

        async get(endpoint) {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

            try {
                const response = await fetch(`${this.baseUrl}${endpoint}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    signal: controller.signal
                });

                clearTimeout(timeout);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
                }

                return await response.json();
            } catch (error) {
                clearTimeout(timeout);
                if (error.name === 'AbortError') {
                    throw new Error('Request timeout');
                }
                throw error;
            }
        }

        async delete(endpoint) {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

            try {
                const response = await fetch(`${this.baseUrl}${endpoint}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    signal: controller.signal
                });

                clearTimeout(timeout);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
                }

                return await response.json();
            } catch (error) {
                clearTimeout(timeout);
                if (error.name === 'AbortError') {
                    throw new Error('Request timeout');
                }
                throw error;
            }
        }

        // Check if backend is available
        async healthCheck() {
            try {
                const response = await this.get('/health');
                return response;
            } catch (error) {
                console.error('[APIClient] Backend health check failed:', error);
                return { status: 'unavailable', error: error.message };
            }
        }
    }

    // Make globally accessible
    window.APIClient = APIClient;

    console.log('[APIClient] Loaded and ready');
})();
