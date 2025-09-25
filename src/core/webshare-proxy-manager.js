/**
 * Webshare Proxy Rotation Manager
 * Handles proxy rotation, failover, and integration with existing systems
 */

const WebshareProxyConfig = require('../config/webshare-proxies');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { HttpProxyAgent } = require('http-proxy-agent');

class WebshareProxyManager {
    constructor(options = {}) {
        this.config = new WebshareProxyConfig();
        this.options = {
            enableHealthCheck: options.enableHealthCheck !== false,
            healthCheckInterval: options.healthCheckInterval || 300000, // 5 minutes
            maxRetries: options.maxRetries || 3,
            retryDelay: options.retryDelay || 1000,
            enableDirectFallback: options.enableDirectFallback !== false,
            ...options
        };

        this.isInitialized = false;
        this.healthCheckTimer = null;
        this.requestQueue = [];
        this.activeRequests = new Map();
    }

    /**
     * Initialize the Webshare proxy manager
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }

        console.log('Initializing Webshare Proxy Manager...');
        
        try {
            // Perform initial health check
            if (this.options.enableHealthCheck) {
                await this.performHealthCheck();
                this.startHealthCheckTimer();
            }

            this.isInitialized = true;
            console.log(`Webshare Proxy Manager initialized with ${this.config.getActiveProxies().length} active proxies`);
        } catch (error) {
            console.error('Failed to initialize Webshare Proxy Manager:', error);
            throw error;
        }
    }

    /**
     * Get next available proxy with automatic failover
     */
    async getNextProxy(retryCount = 0) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            // Re-enable proxies whose disable period has expired
            this.config.proxies.forEach(proxy => {
                if (!proxy.active && proxy.disabledUntil && Date.now() >= proxy.disabledUntil) {
                    proxy.active = true;
                    proxy.failureCount = 0;
                    proxy.disabledUntil = null;
                    console.info(`Proxy ${proxy.id} re-enabled after timeout`);
                }
            });

            const proxy = this.config.getNextProxy();
            
            // Test proxy if it hasn't been used recently
            if (!proxy.lastUsed || Date.now() - proxy.lastUsed > 60000) {
                const isHealthy = await this.testProxy(proxy);
                if (!isHealthy && retryCount < this.options.maxRetries) {
                    console.warn(`Proxy ${proxy.id} failed health check, trying next proxy...`);
                    this.disableProxy(proxy.id, 300000); // Disable for 5 minutes
                    return this.getNextProxy(retryCount + 1);
                }
            }

            return proxy;
        } catch (error) {
            if (this.options.enableDirectFallback && retryCount >= this.options.maxRetries) {
                console.warn('All Webshare proxies failed, falling back to direct connection');
                return null; // null indicates direct connection
            }
            throw error;
        }
    }

    /**
     * Create HTTP/HTTPS agent for proxy
     */
    createProxyAgent(proxy, isHttps = true) {
        if (!proxy) {
            return null; // Direct connection
        }

        const proxyUrl = this.config.formatProxyUrl(proxy);
        return isHttps ? new HttpsProxyAgent(proxyUrl) : new HttpProxyAgent(proxyUrl);
    }



    /**
     * Get proxy configuration for Puppeteer (alias for compatibility)
     */
    async getPuppeteerConfig() {
        return await this.getPuppeteerProxyConfig();
    }

    /**
     * Get proxy configuration for Puppeteer with timeout best practices
     */
    async getPuppeteerProxyConfig() {
        const proxy = await this.getNextProxy();
        if (!proxy) {
            return null; // Direct connection
        }

        // Apply Webshare timeout best practices for Puppeteer
        const config = this.config.formatProxyForPuppeteer(proxy);
        
        // Add timeout configurations based on Webshare article recommendations
        return {
            ...config,
            // Navigation timeout - increased for proxy connections
            navigationTimeout: 60000, // 60 seconds for navigation
            // Default timeout for all operations
            defaultTimeout: 45000, // 45 seconds default
            // Connection timeout for proxy establishment
            connectTimeout: 15000, // 15 seconds for connection
            // Selector wait timeout
            selectorTimeout: 30000, // 30 seconds for selectors
            // Page load timeout
            pageLoadTimeout: 60000 // 60 seconds for page load
        };
    }

    /**
     * Set rotation strategy for proxy selection
     */
    setRotationStrategy(strategy) {
        const validStrategies = ['round-robin', 'least-used', 'best-performance', 'random'];
        
        if (!validStrategies.includes(strategy)) {
            throw new Error(`Invalid rotation strategy: ${strategy}. Valid strategies: ${validStrategies.join(', ')}`);
        }
        
        this.config.setRotationStrategy(strategy);
        console.log(`Webshare proxy rotation strategy set to: ${strategy}`);
        return true;
    }

    /**
     * Enhanced makeRequest with Puppeteer timeout best practices
     */
    async makeRequest(url, options = {}, retryCount = 0) {
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Apply timeout best practices from Webshare article
        const timeout = options.timeout || this.config.settings.timeoutMs || 45000; // Increased default
        const connectTimeout = options.connectTimeout || 15000; // Connection timeout
        const navigationTimeout = options.navigationTimeout || 60000; // Navigation timeout
        
        try {
            const proxy = await this.getNextProxy();
            const isHttps = url.startsWith('https://');
            const agent = this.createProxyAgent(proxy, isHttps);

            const requestOptions = {
                ...options,
                agent,
                timeout: timeout,
                headers: {
                    'User-Agent': this.config.settings.userAgent,
                    ...options.headers
                },
                // Use AbortSignal for better timeout control
                signal: AbortSignal.timeout(connectTimeout)
            };

            const startTime = Date.now();
            this.activeRequests.set(requestId, { proxy, startTime, url });

            let response;
            try {
                // Enhanced error handling for different request types
                if (options.method === 'POST') {
                    response = await fetch(url, {
                        method: 'POST',
                        body: options.body,
                        ...requestOptions
                    });
                } else {
                    response = await fetch(url, requestOptions);
                }
                
                // Validate response based on Webshare recommendations
                if (!response.ok && response.status >= 400) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
            } catch (fetchError) {
                // Enhanced error categorization based on timeout scenarios
                const errorType = this.categorizeError(fetchError);
                
                if (proxy && (errorType === 'CONNECTION_ERROR' || errorType === 'TIMEOUT_ERROR')) {
                    // Disable proxy for longer duration for timeout errors
                    const disableDuration = errorType === 'TIMEOUT_ERROR' ? 600000 : 300000; // 10 min for timeout, 5 min for connection
                    this.disableProxy(proxy.id, disableDuration);
                }
                
                throw fetchError;
            }

            const responseTime = Date.now() - startTime;
            
            if (proxy) {
                this.config.recordProxyUsage(proxy.id, response.ok, responseTime);
            }

            this.activeRequests.delete(requestId);
            return response;

        } catch (error) {
            this.activeRequests.delete(requestId);
            
            const proxy = this.activeRequests.get(requestId)?.proxy;
            if (proxy) {
                this.config.recordProxyUsage(proxy.id, false);
            }

            if (retryCount < this.options.maxRetries) {
                const errorType = this.categorizeError(error);
                console.warn(`Request failed (attempt ${retryCount + 1}/${this.options.maxRetries}) - ${errorType}:`, error.message);
                
                // Exponential backoff with jitter for timeout errors
                const baseDelay = errorType === 'TIMEOUT_ERROR' ? 2000 : this.options.retryDelay;
                const backoffDelay = Math.min(baseDelay * Math.pow(2, retryCount), 15000);
                const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
                
                await this.delay(backoffDelay + jitter);
                return this.makeRequest(url, options, retryCount + 1);
            }

            // Enhanced direct fallback for timeout scenarios
            if (this.options.enableDirectFallback && retryCount >= this.options.maxRetries) {
                try {
                    console.log('Attempting direct connection as fallback...');
                    const directResponse = await fetch(url, {
                        ...options,
                        timeout: timeout,
                        headers: {
                            'User-Agent': this.config.settings.userAgent,
                            ...options.headers
                        },
                        signal: AbortSignal.timeout(timeout) // Apply timeout to direct connection too
                    });
                    console.log('Direct connection fallback successful');
                    return directResponse;
                } catch (directError) {
                    console.error('Direct connection fallback also failed:', directError.message);
                }
            }

            throw error;
        }
    }

    /**
     * Enhanced error categorization with timeout-specific handling
     */
    categorizeError(error) {
        const message = error.message.toLowerCase();
        
        // Enhanced timeout detection based on Webshare article
        if (message.includes('timeout') || 
            message.includes('etimedout') || 
            message.includes('operation timed out') ||
            message.includes('request timeout') ||
            message.includes('navigation timeout') ||
            error.name === 'TimeoutError' ||
            error.name === 'AbortError') {
            return 'TIMEOUT_ERROR';
        }
        
        if (message.includes('econnrefused') || 
            message.includes('enotfound') || 
            message.includes('econnreset') ||
            message.includes('network error') ||
            message.includes('connection refused')) {
            return 'CONNECTION_ERROR';
        }
        
        if (message.includes('407') || 
            message.includes('authentication') ||
            message.includes('proxy authentication required')) {
            return 'AUTH_ERROR';
        }
        
        if (message.includes('403') || 
            message.includes('forbidden') ||
            message.includes('access denied')) {
            return 'FORBIDDEN_ERROR';
        }
        
        if (message.includes('429') || 
            message.includes('rate limit') ||
            message.includes('too many requests')) {
            return 'RATE_LIMIT_ERROR';
        }
        
        // Navigation specific errors
        if (message.includes('navigation') || 
            message.includes('page load') ||
            message.includes('waiting for selector')) {
            return 'NAVIGATION_ERROR';
        }
        
        return 'UNKNOWN_ERROR';
    }

    /**
     * Test individual proxy health
     */
    async testProxy(proxy, timeout = 10000) {
        try {
            const proxyUrl = this.config.formatProxyUrl(proxy);
            const agent = new HttpsProxyAgent(proxyUrl);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const response = await fetch('https://httpbin.org/ip', {
                agent,
                signal: controller.signal,
                headers: {
                    'User-Agent': this.config.settings.userAgent
                }
            });

            clearTimeout(timeoutId);
            return response.ok;
        } catch (error) {
            console.debug(`Proxy ${proxy.id} health check failed:`, error.message);
            return false;
        }
    }

    /**
     * Perform health check on all proxies
     */
    async performHealthCheck() {
        console.log('Performing Webshare proxy health check...');
        return await this.config.performHealthCheck();
    }

    /**
     * Start automatic health check timer
     */
    startHealthCheckTimer() {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
        }

        this.healthCheckTimer = setInterval(async () => {
            try {
                await this.performHealthCheck();
            } catch (error) {
                console.error('Health check failed:', error);
            }
        }, this.options.healthCheckInterval);
    }

    /**
     * Stop health check timer
     */
    stopHealthCheckTimer() {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
        }
    }

    /**
     * Get proxy statistics
     */
    getStats() {
        return {
            ...this.config.getStats(),
            activeRequests: this.activeRequests.size,
            queuedRequests: this.requestQueue.length,
            isInitialized: this.isInitialized
        };
    }

    /**
     * Update proxy credentials
     */
    updateCredentials(updates) {
        this.config.updateProxyCredentials(updates);
    }

    /**
     * Enable/disable IP whitelisting
     */
    setIPWhitelisting(enabled, whitelistedIPs = []) {
        this.config.setIPWhitelisting(enabled, whitelistedIPs);
    }

    /**
     * Get proxy configuration for external integration
     */
    getProxyConfig() {
        return this.config.getProxyConfig();
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        console.log('Shutting down Webshare Proxy Manager...');
        
        this.stopHealthCheckTimer();
        
        // Wait for active requests to complete (with timeout)
        const shutdownTimeout = 30000; // 30 seconds
        const startTime = Date.now();
        
        while (this.activeRequests.size > 0 && Date.now() - startTime < shutdownTimeout) {
            await this.delay(100);
        }

        if (this.activeRequests.size > 0) {
            console.warn(`Forced shutdown with ${this.activeRequests.size} active requests`);
        }

        this.isInitialized = false;
        console.log('Webshare Proxy Manager shutdown complete');
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get proxy by ID
     */
    getProxyById(proxyId) {
        return this.config.proxies.find(proxy => proxy.id === proxyId);
    }

    /**
     * Disable proxy temporarily
     */
    disableProxy(proxyId, duration = 600000) { // 10 minutes default
        const proxy = this.getProxyById(proxyId);
        if (proxy) {
            proxy.active = false;
            proxy.disabledUntil = Date.now() + duration;
            console.warn(`Proxy ${proxyId} disabled for ${duration}ms due to connection issues`);
            
            setTimeout(() => {
                if (proxy.disabledUntil && Date.now() >= proxy.disabledUntil) {
                    proxy.active = true;
                    proxy.failureCount = 0;
                    proxy.disabledUntil = null;
                    console.info(`Proxy ${proxyId} re-enabled after timeout`);
                }
            }, duration);
        }
    }

    /**
     * Force proxy rotation (skip to next proxy)
     */
    forceRotation() {
        this.config.currentIndex = (this.config.currentIndex + 1) % this.config.getActiveProxies().length;
    }

    /**
     * Get current proxy without rotation
     */
    getCurrentProxy() {
        const activeProxies = this.config.getActiveProxies();
        if (activeProxies.length === 0) {
            return null;
        }
        return activeProxies[this.config.currentIndex % activeProxies.length];
    }

    /**
     * Reset proxy statistics
     */
    resetStats() {
        this.config.proxies.forEach(proxy => {
            proxy.successCount = 0;
            proxy.failureCount = 0;
            proxy.responseTime = 0;
            proxy.reliability = 1.0;
        });
        
        this.config.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            proxyUsageDistribution: {}
        };
        
        this.config.initializeStats();
        console.log('Webshare proxy statistics reset');
    }
}

module.exports = WebshareProxyManager;