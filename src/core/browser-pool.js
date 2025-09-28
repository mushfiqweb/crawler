/**
 * Browser Pool Management Module
 * Handles browser instance creation, management, and resource optimization
 */

const puppeteer = require('puppeteer');
const { ORGANIC_BEHAVIOR } = require('../config/organic-behavior');
const { PERFORMANCE_CONFIG } = require('../config/performance');
const { DEVICE_CONFIGURATIONS_STRUCTURED: DEVICE_CONFIGURATIONS } = require('../config/device-configurations');
const ProxyManager = require('./proxy-manager');
const { ConcurrentOptimizer } = require('../utils/concurrent-optimizer');
const { defaultLogger: Logger } = require('../utils/logger');

class BrowserPool {
    constructor(maxBrowsers = PERFORMANCE_CONFIG.browserPoolSize) {
        this.maxBrowsers = maxBrowsers;
        this.browsers = [];
        this.availableBrowsers = [];
        this.busyBrowsers = [];
        this.browserCreationQueue = [];
        this.isShuttingDown = false;
        this.sessionRegistry = new Map(); // Track isolated sessions
        this.proxyManager = new ProxyManager(); // Initialize proxy manager
        
        // Concurrent optimizer for memory-efficient operations
        this.concurrentOptimizer = new ConcurrentOptimizer({
            maxConcurrency: Math.min(maxBrowsers, 3),
            memoryThreshold: 300 * 1024 * 1024, // 300MB
            batchSize: 5,
            enableMemoryMonitoring: true,
            enableGarbageCollection: true
        });
        
        this.stats = {
            created: 0,
            destroyed: 0,
            reused: 0,
            errors: 0,
            isolatedSessions: 0
        };
        
        // Memory optimization settings
        this.maxBrowserAge = 30 * 60 * 1000; // 30 minutes max age
        this.maxBrowserUsage = 50; // Max uses per browser
        this.memoryCheckInterval = 5 * 60 * 1000; // Check every 5 minutes
        this.maxIdleBrowsers = 2; // Keep max 2 idle browsers
        this.sessionCleanupInterval = 10 * 60 * 1000; // Cleanup sessions every 10 minutes
        
        // Start memory optimization
        this.startMemoryOptimization();
    }

    /**
     * Initialize the browser pool
     */
    async initialize() {
        console.log(`🚀 Initializing browser pool with ${this.maxBrowsers} browsers...`);
        
        // Create initial browsers
        const initialBrowsers = Math.min(2, this.maxBrowsers);
        for (let i = 0; i < initialBrowsers; i++) {
            await this.createBrowser();
        }
        
        console.log(`✅ Browser pool initialized with ${this.availableBrowsers.length} browsers`);
    }

    /**
     * Create a new browser instance with optimized settings
     */
    async createBrowser() {
        try {
            const browser = await puppeteer.launch({
                headless: PERFORMANCE_CONFIG.headless,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding',
                    '--disable-features=TranslateUI',
                    '--disable-ipc-flooding-protection',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--memory-pressure-off',
                    '--max_old_space_size=4096'
                ],
                defaultViewport: null,
                ignoreDefaultArgs: ['--enable-automation'],
                ignoreHTTPSErrors: true
            });

            // Add browser metadata
            browser._poolId = Date.now() + Math.random();
            browser._createdAt = Date.now();
            browser._usageCount = 0;
            browser._lastUsed = Date.now();

            this.browsers.push(browser);
            this.availableBrowsers.push(browser);
            this.stats.created++;

            console.log(`🌐 Created browser ${browser._poolId} (Total: ${this.browsers.length})`);
            return browser;
        } catch (error) {
            this.stats.errors++;
            console.error('❌ Failed to create browser:', error.message);
            throw error;
        }
    }

    /**
     * Create a browser instance with proxy configuration for Google searches (uses Webshare proxies)
     */
    async createProxyBrowser() {
        try {
            // Get proxy configuration (now uses Webshare proxies only)
            const proxyConfig = await this.proxyManager.getProxyConfigForPuppeteer();
            
            if (!proxyConfig) {
                // No proxy configured, create direct connection browser
                return await this.createDirectBrowser();
            }
            
            const browser = await puppeteer.launch({
                headless: PERFORMANCE_CONFIG.headless,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding',
                    '--disable-features=TranslateUI',
                    '--disable-ipc-flooding-protection',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--memory-pressure-off',
                    '--max_old_space_size=4096',
                    // Add proxy configuration
                    `--proxy-server=${proxyConfig.server}`
                ],
                defaultViewport: null,
                ignoreDefaultArgs: ['--enable-automation'],
                ignoreHTTPSErrors: true
            });

            // Add browser metadata including proxy info
            browser._poolId = Date.now() + Math.random();
            browser._createdAt = Date.now();
            browser._usageCount = 0;
            browser._lastUsed = Date.now();
            browser._proxyConfig = proxyConfig;
            browser._webshareProxy = true;

            // Configure proxy authentication for Webshare proxies
            if (proxyConfig.username && proxyConfig.password) {
                const pages = await browser.pages();
                if (pages.length > 0) {
                    await pages[0].authenticate({
                        username: proxyConfig.username,
                        password: proxyConfig.password
                    });
                }
            }

            this.browsers.push(browser);
            this.availableBrowsers.push(browser);
            this.stats.created++;

            console.log(`🌐 Created Webshare proxy browser ${browser._poolId} via ${proxyConfig.server}`);
            return browser;
        } catch (error) {
            this.stats.errors++;
            console.error('❌ Failed to create proxy browser:', error.message);
            throw error;
        }
    }

    /**
     * Create a direct connection browser (no proxy)
     */
    async createDirectBrowser() {
        try {
            const browser = await puppeteer.launch({
                headless: PERFORMANCE_CONFIG.headless,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding',
                    '--disable-features=TranslateUI',
                    '--disable-ipc-flooding-protection',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--memory-pressure-off',
                    '--max_old_space_size=4096'
                ],
                defaultViewport: null,
                ignoreDefaultArgs: ['--enable-automation'],
                ignoreHTTPSErrors: true
            });

            // Add browser metadata
            browser._poolId = Date.now() + Math.random();
            browser._createdAt = Date.now();
            browser._usageCount = 0;
            browser._lastUsed = Date.now();
            browser._directConnection = true;

            this.browsers.push(browser);
            this.availableBrowsers.push(browser);
            this.stats.created++;

            console.log(`🔗 Created direct connection browser ${browser._poolId}`);
            return browser;
        } catch (error) {
            this.stats.errors++;
            console.error('❌ Failed to create direct browser:', error.message);
            throw error;
        }
    }

    /**
     * Backward compatibility alias
     */
    async createBangladeshProxyBrowser() {
        return await this.createProxyBrowser();
    }

    /**
     * Get a browser specifically configured for Google searches with proxy
     */
    async getBangladeshBrowserForGoogle() {
        if (this.isShuttingDown) {
            throw new Error('Browser pool is shutting down');
        }

        // Always create a new browser with unique proxy for Google searches
        const browser = await this.createProxyBrowser();
        this.availableBrowsers.pop(); // Remove from available
        this.busyBrowsers.push(browser); // Add to busy
        browser._usageCount++;
        browser._lastUsed = Date.now();

        // Track Google search usage if proxy is configured
        if (browser._proxyConfig && browser._proxyConfig.proxy) {
            await this.proxyManager.trackGoogleSearchUsage(browser._proxyConfig.proxy);
        }

        console.log(`🔍 Allocated proxy browser ${browser._poolId} for Google search`);
        return browser;
    }

    /**
     * Get an available browser from the pool
     */
    async getBrowser() {
        if (this.isShuttingDown) {
            throw new Error('Browser pool is shutting down');
        }

        // Try to get an available browser
        if (this.availableBrowsers.length > 0) {
            const browser = this.availableBrowsers.pop();
            this.busyBrowsers.push(browser);
            browser._usageCount++;
            browser._lastUsed = Date.now();
            this.stats.reused++;
            
            console.log(`🔄 Reusing browser ${browser._poolId} (Usage: ${browser._usageCount})`);
            return browser;
        }

        // Create new browser if under limit
        if (this.browsers.length < this.maxBrowsers) {
            const browser = await this.createBrowser();
            this.availableBrowsers.pop(); // Remove from available
            this.busyBrowsers.push(browser); // Add to busy
            browser._usageCount++;
            browser._lastUsed = Date.now();
            
            return browser;
        }

        // Wait for a browser to become available
        return new Promise((resolve, reject) => {
            this.browserCreationQueue.push({ resolve, reject });
            
            // Timeout after 30 seconds
            setTimeout(() => {
                const index = this.browserCreationQueue.findIndex(item => item.resolve === resolve);
                if (index !== -1) {
                    this.browserCreationQueue.splice(index, 1);
                    reject(new Error('Timeout waiting for available browser'));
                }
            }, 30000);
        });
    }

    /**
     * Return a browser to the pool
     */
    async releaseBrowser(browser) {
        if (!browser || !browser._poolId) {
            console.warn('⚠️ Attempted to release invalid browser');
            return;
        }

        try {
            // Remove from busy browsers
            const busyIndex = this.busyBrowsers.findIndex(b => b._poolId === browser._poolId);
            if (busyIndex !== -1) {
                this.busyBrowsers.splice(busyIndex, 1);
            }

            // Check if browser should be recycled
            const shouldRecycle = this.shouldRecycleBrowser(browser);
            
            if (shouldRecycle) {
                await this.recycleBrowser(browser);
                return;
            }

            // Close all pages except one
            const pages = await browser.pages();
            for (let i = 1; i < pages.length; i++) {
                try {
                    await pages[i].close();
                } catch (error) {
                    console.warn('⚠️ Error closing page:', error.message);
                }
            }

            // Reset the remaining page
            if (pages[0]) {
                try {
                    await pages[0].goto('about:blank');
                    
                    // Attempt to clear storage with proper error handling
                    await pages[0].evaluate(() => {
                        try {
                            // Attempt localStorage access
                            if (typeof localStorage !== 'undefined') {
                                localStorage.clear();
                            }
                        } catch (error) {
                            if (error.name === 'SecurityError') {
                                console.log('ℹ️ LocalStorage access blocked by security policy - using fallback');
                                // Storage clearing blocked by security policy, continue without error
                                return { localStorage: 'blocked', reason: 'SecurityError' };
                            } else {
                                throw error;
                            }
                        }
                        
                        try {
                            // Attempt sessionStorage access
                            if (typeof sessionStorage !== 'undefined') {
                                sessionStorage.clear();
                            }
                        } catch (error) {
                            if (error.name === 'SecurityError') {
                                console.log('ℹ️ SessionStorage access blocked by security policy - using fallback');
                                // Storage clearing blocked by security policy, continue without error
                                return { sessionStorage: 'blocked', reason: 'SecurityError' };
                            } else {
                                throw error;
                            }
                        }
                        
                        return { localStorage: 'cleared', sessionStorage: 'cleared' };
                    });
                    
                } catch (error) {
                    // Only log non-SecurityError issues as warnings
                    if (error.message && !error.message.includes('localStorage') && !error.message.includes('sessionStorage')) {
                        console.warn('⚠️ Error resetting page:', error.message);
                    }
                }
            }

            // Return to available pool
            this.availableBrowsers.push(browser);
            browser._lastUsed = Date.now();

            console.log(`♻️ Released browser ${browser._poolId} back to pool`);

            // Process queue if any
            if (this.browserCreationQueue.length > 0) {
                const { resolve } = this.browserCreationQueue.shift();
                const releasedBrowser = this.availableBrowsers.pop();
                this.busyBrowsers.push(releasedBrowser);
                releasedBrowser._usageCount++;
                releasedBrowser._lastUsed = Date.now();
                resolve(releasedBrowser);
            }

        } catch (error) {
            console.error('❌ Error releasing browser:', error.message);
            await this.recycleBrowser(browser);
        }
    }

    /**
     * Check if browser should be recycled
     */
    shouldRecycleBrowser(browser) {
        const maxUsage = PERFORMANCE_CONFIG.maxBrowserUsage || 50;
        const maxAge = PERFORMANCE_CONFIG.maxBrowserAge || 3600000; // 1 hour
        
        return (
            browser._usageCount >= maxUsage ||
            (Date.now() - browser._createdAt) >= maxAge
        );
    }

    /**
     * Recycle (destroy and replace) a browser
     */
    async recycleBrowser(browser) {
        try {
            console.log(`🔄 Recycling browser ${browser._poolId}`);
            
            // Remove from all arrays
            this.browsers = this.browsers.filter(b => b._poolId !== browser._poolId);
            this.availableBrowsers = this.availableBrowsers.filter(b => b._poolId !== browser._poolId);
            this.busyBrowsers = this.busyBrowsers.filter(b => b._poolId !== browser._poolId);

            // Close browser
            await browser.close();
            this.stats.destroyed++;

            // Create replacement if not shutting down
            if (!this.isShuttingDown && this.browsers.length < this.maxBrowsers) {
                await this.createBrowser();
            }

        } catch (error) {
            console.error('❌ Error recycling browser:', error.message);
            this.stats.errors++;
        }
    }

    /**
     * Get pool statistics
     */
    getStats() {
        return {
            ...this.stats,
            total: this.browsers.length,
            available: this.availableBrowsers.length,
            busy: this.busyBrowsers.length,
            queued: this.browserCreationQueue.length
        };
    }

    /**
     * Cleanup and shutdown the browser pool
     */
    async shutdown() {
        console.log('🛑 Shutting down browser pool...');
        this.isShuttingDown = true;

        // Stop memory optimization
        this.stopMemoryOptimization();

        // Shutdown concurrent optimizer
        if (this.concurrentOptimizer) {
            await this.concurrentOptimizer.shutdown();
        }

        // Reject all queued requests
        this.browserCreationQueue.forEach(({ reject }) => {
            reject(new Error('Browser pool is shutting down'));
        });
        this.browserCreationQueue = [];

        // Close all browsers using concurrent optimizer if available
        if (this.browsers.length > 0) {
            try {
                await this.releaseBrowsersConcurrent(this.browsers);
            } catch (error) {
                // Fallback to sequential closing
                const closePromises = this.browsers.map(async (browser) => {
                    try {
                        await browser.close();
                        this.stats.destroyed++;
                    } catch (error) {
                        console.error('❌ Error closing browser:', error.message);
                    }
                });
                await Promise.all(closePromises);
            }
        }
        
        this.browsers = [];
        this.availableBrowsers = [];
        this.busyBrowsers = [];

        console.log('✅ Browser pool shutdown complete');
    }

    /**
     * Health check for the browser pool
     */
    async healthCheck() {
        const stats = this.getStats();
        const issues = [];

        // Check for too many errors
        if (stats.errors > stats.created * 0.1) {
            issues.push(`High error rate: ${stats.errors} errors`);
        }

        // Check for stuck browsers
        const now = Date.now();
        const stuckBrowsers = this.busyBrowsers.filter(browser => 
            (now - browser._lastUsed) > 300000 // 5 minutes
        );

        if (stuckBrowsers.length > 0) {
            issues.push(`${stuckBrowsers.length} browsers appear stuck`);
            
            // Recycle stuck browsers
            for (const browser of stuckBrowsers) {
                await this.recycleBrowser(browser);
            }
        }

        return {
            healthy: issues.length === 0,
            issues,
            stats
        };
    }

    /**
     * Create isolated browser session with unique fingerprint
     */
    async createIsolatedSession(sessionId, fingerprint = null) {
        try {
            const sessionFingerprint = fingerprint || this.generateDefaultFingerprint();
            
            const browser = await puppeteer.launch({
                headless: PERFORMANCE_CONFIG.headless,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    `--user-agent=${sessionFingerprint.userAgent}`,
                    `--window-size=${sessionFingerprint.viewport.width},${sessionFingerprint.viewport.height}`
                ],
                defaultViewport: sessionFingerprint.viewport,
                ignoreHTTPSErrors: true
            });

            // Register session
            this.sessionRegistry.set(sessionId, {
                browser,
                fingerprint: sessionFingerprint,
                createdAt: Date.now(),
                status: 'active'
            });

            this.stats.isolatedSessions++;
            console.log(`🔒 Created isolated session [${sessionId}] with unique fingerprint`);

            return browser;

        } catch (error) {
            console.error(`❌ Failed to create isolated session [${sessionId}]:`, error);
            this.stats.errors++;
            throw error;
        }
    }

    /**
     * Get isolated session browser
     */
    getIsolatedSession(sessionId) {
        const session = this.sessionRegistry.get(sessionId);
        return session ? session.browser : null;
    }

    /**
     * Close isolated session
     */
    async closeIsolatedSession(sessionId) {
        const session = this.sessionRegistry.get(sessionId);
        
        if (session) {
            try {
                await session.browser.close();
                session.status = 'closed';
                session.closedAt = Date.now();
                
                console.log(`🔒 Closed isolated session [${sessionId}]`);
                
                // Remove from registry after a delay for potential debugging
                setTimeout(() => {
                    this.sessionRegistry.delete(sessionId);
                }, 60000); // Keep for 1 minute

            } catch (error) {
                console.error(`❌ Error closing isolated session [${sessionId}]:`, error);
                this.stats.errors++;
            }
        }
    }

    /**
     * Generate default fingerprint for isolated sessions
     */
    generateDefaultFingerprint() {
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ];

        const viewports = [
            { width: 1920, height: 1080, deviceScaleFactor: 1, isMobile: false, hasTouch: false, isLandscape: true },
            { width: 1366, height: 768, deviceScaleFactor: 1, isMobile: false, hasTouch: false, isLandscape: true },
            { width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false, isLandscape: true },
            { width: 1536, height: 864, deviceScaleFactor: 1, isMobile: false, hasTouch: false, isLandscape: true }
        ];

        return {
            userAgent: userAgents[Math.floor(Math.random() * userAgents.length)],
            viewport: viewports[Math.floor(Math.random() * viewports.length)]
        };
    }

    /**
     * Get session registry statistics
     */
    getSessionStats() {
        const activeSessions = Array.from(this.sessionRegistry.values())
            .filter(session => session.status === 'active').length;
        
        return {
            totalSessions: this.sessionRegistry.size,
            activeSessions,
            isolatedSessionsCreated: this.stats.isolatedSessions
        };
    }

    /**
     * Start memory optimization routines
     */
    startMemoryOptimization() {
        // Periodic memory check and cleanup
        this.memoryCheckTimer = setInterval(() => {
            this.performMemoryOptimization();
        }, this.memoryCheckInterval);

        // Session cleanup
        this.sessionCleanupTimer = setInterval(() => {
            this.cleanupExpiredSessions();
        }, this.sessionCleanupInterval);

        console.log('🧠 Browser pool memory optimization started');
    }

    /**
     * Stop memory optimization routines
     */
    stopMemoryOptimization() {
        if (this.memoryCheckTimer) {
            clearInterval(this.memoryCheckTimer);
            this.memoryCheckTimer = null;
        }

        if (this.sessionCleanupTimer) {
            clearInterval(this.sessionCleanupTimer);
            this.sessionCleanupTimer = null;
        }

        console.log('🧠 Browser pool memory optimization stopped');
    }

    /**
     * Perform memory optimization
     */
    async performMemoryOptimization() {
        try {
            const now = Date.now();
            const browsersToRecycle = [];

            // Check for browsers that need recycling
            for (const browser of this.browsers) {
                const age = now - browser._createdAt;
                const shouldRecycle = 
                    age > this.maxBrowserAge || 
                    browser._usageCount > this.maxBrowserUsage;

                if (shouldRecycle && !this.busyBrowsers.includes(browser)) {
                    browsersToRecycle.push(browser);
                }
            }

            // Recycle old browsers
            for (const browser of browsersToRecycle) {
                await this.recycleBrowser(browser);
                console.log(`♻️ Recycled browser ${browser._poolId} (age: ${Math.round((now - browser._createdAt) / 60000)}min, uses: ${browser._usageCount})`);
            }

            // Limit idle browsers
            const idleBrowsers = this.availableBrowsers.length;
            if (idleBrowsers > this.maxIdleBrowsers) {
                const excessBrowsers = this.availableBrowsers.splice(this.maxIdleBrowsers);
                for (const browser of excessBrowsers) {
                    await this.destroyBrowser(browser);
                    console.log(`🗑️ Destroyed excess idle browser ${browser._poolId}`);
                }
            }

            // Force garbage collection on remaining browsers
            for (const browser of this.availableBrowsers) {
                try {
                    const pages = await browser.pages();
                    for (const page of pages) {
                        if (!page.isClosed()) {
                            await page.evaluate(() => {
                                if (window.gc) {
                                    window.gc();
                                }
                            });
                        }
                    }
                } catch (error) {
                    // Ignore errors during GC
                }
            }

        } catch (error) {
            console.error('❌ Error during browser pool memory optimization:', error.message);
        }
    }

    /**
     * Clean up expired sessions
     */
    cleanupExpiredSessions() {
        const now = Date.now();
        const expiredSessions = [];

        for (const [sessionId, session] of this.sessionRegistry) {
            const age = now - session.createdAt;
            if (age > this.maxBrowserAge || session.status === 'closed') {
                expiredSessions.push(sessionId);
            }
        }

        for (const sessionId of expiredSessions) {
            this.sessionRegistry.delete(sessionId);
        }

        if (expiredSessions.length > 0) {
            console.log(`🧹 Cleaned up ${expiredSessions.length} expired sessions`);
        }
    }

    /**
     * Get memory usage statistics
     */
    getMemoryStats() {
        const now = Date.now();
        const browserAges = this.browsers.map(b => now - b._createdAt);
        const browserUsages = this.browsers.map(b => b._usageCount);

        return {
            totalBrowsers: this.browsers.length,
            availableBrowsers: this.availableBrowsers.length,
            busyBrowsers: this.busyBrowsers.length,
            activeSessions: this.sessionRegistry.size,
            averageBrowserAge: browserAges.length > 0 ? Math.round(browserAges.reduce((a, b) => a + b, 0) / browserAges.length / 60000) : 0,
            averageBrowserUsage: browserUsages.length > 0 ? Math.round(browserUsages.reduce((a, b) => a + b, 0) / browserUsages.length) : 0,
            stats: this.stats
        };
    }

    /**
     * Force memory optimization
     */
    async optimizeMemory() {
        await this.performMemoryOptimization();
        this.cleanupExpiredSessions();
        console.log('🧠 Browser pool memory optimization completed');
    }

    /**
     * Create multiple browsers concurrently with memory optimization
     */
    async createBrowsersConcurrent(count, options = {}) {
        if (this.isShuttingDown) {
            throw new Error('Browser pool is shutting down');
        }

        const operations = Array.from({ length: count }, (_, index) => ({
            name: `createBrowser_${index}`,
            execute: async () => {
                if (options.useProxy) {
                    return await this.createProxyBrowser();
                } else {
                    return await this.createDirectBrowser();
                }
            }
        }));

        try {
            const result = await this.concurrentOptimizer.executeConcurrent(operations, {
                maxConcurrency: Math.min(count, 3),
                batchSize: 3
            });

            Logger.info(`✅ Created ${result.results.length} browsers concurrently, ${result.errors.length} failed`);
            return result;

        } catch (error) {
            Logger.error('❌ Concurrent browser creation failed:', error);
            throw error;
        }
    }

    /**
     * Release multiple browsers concurrently with memory optimization
     */
    async releaseBrowsersConcurrent(browsers) {
        if (!Array.isArray(browsers) || browsers.length === 0) {
            return { results: [], errors: [] };
        }

        const operations = browsers.map((browser, index) => ({
            name: `releaseBrowser_${browser._poolId || index}`,
            execute: async () => {
                return await this.releaseBrowser(browser);
            }
        }));

        try {
            const result = await this.concurrentOptimizer.executeConcurrent(operations, {
                maxConcurrency: Math.min(browsers.length, 5),
                batchSize: 5
            });

            Logger.info(`✅ Released ${result.results.length} browsers concurrently, ${result.errors.length} failed`);
            return result;

        } catch (error) {
            Logger.error('❌ Concurrent browser release failed:', error);
            throw error;
        }
    }

    /**
     * Perform health checks on multiple browsers concurrently
     */
    async healthCheckConcurrent(browsers = null) {
        const browsersToCheck = browsers || this.browsers;
        
        if (browsersToCheck.length === 0) {
            return { results: [], errors: [] };
        }

        const operations = browsersToCheck.map((browser, index) => ({
            name: `healthCheck_${browser._poolId || index}`,
            execute: async () => {
                try {
                    const pages = await browser.pages();
                    const isConnected = browser.isConnected();
                    
                    return {
                        browserId: browser._poolId,
                        isConnected,
                        pageCount: pages.length,
                        usageCount: browser._usageCount || 0,
                        lastUsed: browser._lastUsed || 0,
                        healthy: isConnected && pages.length > 0
                    };
                } catch (error) {
                    return {
                        browserId: browser._poolId,
                        healthy: false,
                        error: error.message
                    };
                }
            }
        }));

        try {
            const result = await this.concurrentOptimizer.executeConcurrent(operations, {
                maxConcurrency: Math.min(browsersToCheck.length, 5),
                batchSize: 5,
                promiseTimeout: 10000 // 10 seconds timeout for health checks
            });

            const healthyBrowsers = result.results.filter(r => r.result.healthy).length;
            const unhealthyBrowsers = result.results.filter(r => !r.result.healthy).length;

            Logger.info(`🏥 Health check completed: ${healthyBrowsers} healthy, ${unhealthyBrowsers} unhealthy browsers`);
            
            return {
                ...result,
                summary: {
                    total: browsersToCheck.length,
                    healthy: healthyBrowsers,
                    unhealthy: unhealthyBrowsers,
                    errors: result.errors.length
                }
            };

        } catch (error) {
            Logger.error('❌ Concurrent health check failed:', error);
            throw error;
        }
    }

    /**
     * Get concurrent optimizer statistics
     */
    getConcurrentStats() {
        return this.concurrentOptimizer.getStats();
    }

    /**
     * Update concurrent optimizer configuration
     */
    updateConcurrentConfig(config) {
        Object.assign(this.concurrentOptimizer.config, config);
        Logger.info('🔧 Updated concurrent optimizer configuration');
    }
}

module.exports = { BrowserPool };