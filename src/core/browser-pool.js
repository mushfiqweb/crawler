/**
 * Browser Pool Management Module
 * Handles browser instance creation, management, and resource optimization
 */

const puppeteer = require('puppeteer');
const { ORGANIC_BEHAVIOR } = require('../config/organic-behavior');
const { PERFORMANCE_CONFIG } = require('../config/performance');
const { DEVICE_CONFIGURATIONS_STRUCTURED: DEVICE_CONFIGURATIONS } = require('../config/device-configurations');
const ProxyManager = require('./proxy-manager');

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
        this.stats = {
            created: 0,
            destroyed: 0,
            reused: 0,
            errors: 0,
            isolatedSessions: 0
        };
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

        // Reject all queued requests
        this.browserCreationQueue.forEach(({ reject }) => {
            reject(new Error('Browser pool is shutting down'));
        });
        this.browserCreationQueue = [];

        // Close all browsers
        const closePromises = this.browsers.map(async (browser) => {
            try {
                await browser.close();
                this.stats.destroyed++;
            } catch (error) {
                console.error('❌ Error closing browser:', error.message);
            }
        });

        await Promise.all(closePromises);
        
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
}

module.exports = { BrowserPool };