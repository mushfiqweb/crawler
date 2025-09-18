/**
 * Browser Pool Management Module
 * Handles browser instance creation, management, and resource optimization
 */

const puppeteer = require('puppeteer');
const { ORGANIC_BEHAVIOR } = require('../config/organic-behavior');
const { PERFORMANCE_CONFIG } = require('../config/performance');
const { DEVICE_CONFIGURATIONS_STRUCTURED: DEVICE_CONFIGURATIONS } = require('../config/device-configurations');

class BrowserPool {
    constructor(maxBrowsers = PERFORMANCE_CONFIG.browserPoolSize) {
        this.maxBrowsers = maxBrowsers;
        this.browsers = [];
        this.availableBrowsers = [];
        this.busyBrowsers = [];
        this.browserCreationQueue = [];
        this.isShuttingDown = false;
        this.stats = {
            created: 0,
            destroyed: 0,
            reused: 0,
            errors: 0
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
}

module.exports = { BrowserPool };