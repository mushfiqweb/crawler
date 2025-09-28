/**
 * Enhanced Browser Pool Management System
 * Comprehensive browser instance management with advanced optimization, monitoring, and security
 */

const puppeteer = require('puppeteer');
const { EventEmitter } = require('events');
const { ORGANIC_BEHAVIOR } = require('../config/organic-behavior');
const { PERFORMANCE_CONFIG } = require('../config/performance');
const { DEVICE_CONFIGURATIONS_STRUCTURED: DEVICE_CONFIGURATIONS } = require('../config/device-configurations');
const ProxyManager = require('./proxy-manager');
const { ConcurrentOptimizer } = require('../utils/concurrent-optimizer');
const { MemoryManager } = require('./memory-manager');
const { defaultLogger: Logger } = require('../utils/logger');

class EnhancedBrowserPool extends EventEmitter {
    constructor(options = {}) {
        super();
        
        // Configuration with intelligent defaults
        this.config = {
            minBrowsers: options.minBrowsers || 1,
            maxBrowsers: options.maxBrowsers || PERFORMANCE_CONFIG.browserPoolSize || 3,
            targetBrowsers: options.targetBrowsers || 2,
            maxBrowserAge: options.maxBrowserAge || 30 * 60 * 1000, // 30 minutes
            maxBrowserUsage: options.maxBrowserUsage || 50,
            scaleUpThreshold: options.scaleUpThreshold || 0.8, // Scale up when 80% busy
            scaleDownThreshold: options.scaleDownThreshold || 0.3, // Scale down when 30% busy
            healthCheckInterval: options.healthCheckInterval || 60000, // 1 minute
            memoryOptimizationInterval: options.memoryOptimizationInterval || 5 * 60 * 1000, // 5 minutes
            enableAutoScaling: options.enableAutoScaling !== false,
            enablePredictiveScaling: options.enablePredictiveScaling !== false,
            enableSecurityIsolation: options.enableSecurityIsolation !== false,
            enableOrganicBehavior: options.enableOrganicBehavior !== false,
            maxRetryAttempts: options.maxRetryAttempts || 3,
            retryDelay: options.retryDelay || 1000,
            enableAdvancedMonitoring: options.enableAdvancedMonitoring !== false
        };

        // Core components
        this.browsers = new Map(); // Browser instances with metadata
        this.availableBrowsers = new Set(); // Available browser IDs
        this.busyBrowsers = new Set(); // Busy browser IDs
        this.browserQueue = []; // Queue for browser requests
        this.sessionRegistry = new Map(); // Isolated sessions
        this.isShuttingDown = false;

        // Managers and optimizers
        this.proxyManager = new ProxyManager();
        this.memoryManager = new MemoryManager();
        this.concurrentOptimizer = new ConcurrentOptimizer({
            maxConcurrency: Math.min(this.config.maxBrowsers, 3),
            memoryThreshold: 300 * 1024 * 1024, // 300MB
            batchSize: 5,
            enableMemoryMonitoring: true,
            enableGarbageCollection: true
        });

        // Advanced monitoring and statistics
        this.stats = {
            created: 0,
            destroyed: 0,
            reused: 0,
            errors: 0,
            recoveries: 0,
            scaleUps: 0,
            scaleDowns: 0,
            isolatedSessions: 0,
            organicSearches: 0,
            averageResponseTime: 0,
            peakConcurrency: 0,
            memoryOptimizations: 0,
            securityViolations: 0
        };

        // Performance tracking
        this.performanceMetrics = {
            requestTimes: [],
            memoryUsage: [],
            cpuUsage: [],
            errorRates: [],
            throughput: []
        };

        // Auto-scaling and predictive analytics
        this.scalingHistory = [];
        this.workloadPredictor = {
            patterns: new Map(),
            predictions: new Map()
        };

        // Security and isolation
        this.securityProfiles = new Map();
        this.isolationContexts = new Map();

        // Organic behavior simulation
        this.organicBehaviorEngine = null;
        this.continuousSearchState = {
            active: false,
            sessions: new Map(),
            patterns: []
        };

        // Timers and intervals
        this.timers = {
            healthCheck: null,
            memoryOptimization: null,
            autoScaling: null,
            organicBehavior: null,
            performanceMonitoring: null
        };

        this.initialize();
    }

    /**
     * Initialize the enhanced browser pool
     */
    async initialize() {
        try {
            Logger.info('🚀 Initializing Enhanced Browser Pool...');

            // Initialize memory manager
            await this.memoryManager.initialize();
            this.memoryManager.startMonitoring();

            // Setup event listeners
            this.setupEventListeners();

            // Create initial browser instances
            await this.createInitialBrowsers();

            // Start monitoring and optimization services
            this.startMonitoringServices();

            // Initialize organic behavior engine if enabled
            if (this.config.enableOrganicBehavior) {
                await this.initializeOrganicBehaviorEngine();
            }

            Logger.info(`✅ Enhanced Browser Pool initialized with ${this.browsers.size} browsers`);
            this.emit('initialized', this.getStats());

        } catch (error) {
            Logger.error('❌ Failed to initialize Enhanced Browser Pool:', error);
            throw error;
        }
    }

    /**
     * Initialize organic behavior engine for human-like interactions
     */
    async initializeOrganicBehaviorEngine() {
        try {
            Logger.info('🤖 Initializing organic behavior engine...');
            
            // Initialize organic behavior configurations
            this.organicBehaviorConfig = {
                enabled: this.config.enableOrganicBehavior,
                mouseMovements: ORGANIC_BEHAVIOR.mouseMovements || true,
                typingPatterns: ORGANIC_BEHAVIOR.typingPatterns || true,
                scrollBehavior: ORGANIC_BEHAVIOR.scrollBehavior || true,
                clickPatterns: ORGANIC_BEHAVIOR.clickPatterns || true,
                delayVariations: ORGANIC_BEHAVIOR.delayVariations || true
            };

            Logger.info('✅ Organic behavior engine initialized');
        } catch (error) {
            Logger.error('❌ Failed to initialize organic behavior engine:', error);
            throw error;
        }
    }

    /**
     * Setup event listeners for various components
     */
    setupEventListeners() {
        // Memory manager events (listen to memoryMonitor within memoryManager)
        this.memoryManager.memoryMonitor.on('memoryAlert', (alert) => {
            this.handleMemoryAlert(alert);
        });

        this.memoryManager.memoryMonitor.on('memoryCritical', (critical) => {
            this.handleCriticalMemory(critical);
        });

        this.memoryManager.memoryMonitor.on('memoryStats', (stats) => {
            this.updatePerformanceMetrics('memory', stats);
        });

        // Concurrent optimizer events
        this.concurrentOptimizer.on('memoryCheck', (data) => {
            this.updatePerformanceMetrics('memory', data);
        });

        // Self events for monitoring
        this.on('browserCreated', (browser) => {
            this.updateScalingHistory('created', browser);
        });

        this.on('browserDestroyed', (browser) => {
            this.updateScalingHistory('destroyed', browser);
        });
    }

    /**
     * Create initial browser instances based on configuration
     */
    async createInitialBrowsers() {
        const initialCount = Math.min(this.config.targetBrowsers, this.config.maxBrowsers);
        
        for (let i = 0; i < initialCount; i++) {
            try {
                await this.createBrowser();
            } catch (error) {
                Logger.warn(`⚠️ Failed to create initial browser ${i + 1}:`, error.message);
            }
        }

        Logger.info(`📊 Created ${this.browsers.size}/${initialCount} initial browsers`);
    }

    /**
     * Create a new browser instance with enhanced configuration
     */
    async createBrowser(options = {}) {
        try {
            const browserId = this.generateBrowserId();
            const startTime = Date.now();

            // Determine browser type and configuration
            const browserConfig = await this.determineBrowserConfiguration(options);
            
            // Create browser with optimized settings
            const browser = await puppeteer.launch(browserConfig.launchOptions);

            // Enhanced browser metadata
            const browserMetadata = {
                id: browserId,
                browser: browser,
                createdAt: Date.now(),
                lastUsed: Date.now(),
                usageCount: 0,
                type: browserConfig.type,
                proxyConfig: browserConfig.proxyConfig,
                securityProfile: browserConfig.securityProfile,
                isolationLevel: browserConfig.isolationLevel,
                performanceMetrics: {
                    creationTime: Date.now() - startTime,
                    averagePageLoadTime: 0,
                    memoryUsage: 0,
                    errorCount: 0
                },
                health: {
                    status: 'healthy',
                    lastHealthCheck: Date.now(),
                    consecutiveFailures: 0
                }
            };

            // Store browser with metadata
            this.browsers.set(browserId, browserMetadata);
            this.availableBrowsers.add(browserId);

            // Update statistics
            this.stats.created++;
            this.updatePerformanceMetrics('creation', browserMetadata.performanceMetrics.creationTime);

            Logger.info(`✅ Created browser ${browserId} (${browserConfig.type}) in ${browserMetadata.performanceMetrics.creationTime}ms`);
            this.emit('browserCreated', browserMetadata);

            return browserId;

        } catch (error) {
            this.stats.errors++;
            Logger.error('❌ Failed to create browser:', error);
            throw error;
        }
    }

    /**
     * Determine optimal browser configuration based on options and current state
     */
    async determineBrowserConfiguration(options = {}) {
        const config = {
            type: options.type || 'standard',
            proxyConfig: null,
            securityProfile: 'standard',
            isolationLevel: 'basic'
        };

        // Base launch options with enhanced security and performance
        const launchOptions = {
            headless: PERFORMANCE_CONFIG.headless !== false,
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
                // Enhanced security options
                '--disable-extensions',
                '--disable-plugins',
                '--disable-java',
                '--disable-images', // For performance
                '--disable-javascript', // Will be enabled per page as needed
                // Isolation options
                '--site-per-process',
                '--disable-site-isolation-trials'
            ],
            defaultViewport: null,
            ignoreDefaultArgs: ['--enable-automation'],
            ignoreHTTPSErrors: true,
            timeout: 30000
        };

        // Configure proxy if needed
        if (options.useProxy) {
            const proxyConfig = await this.proxyManager.getProxyConfigForPuppeteer();
            if (proxyConfig) {
                launchOptions.args.push(`--proxy-server=${proxyConfig.host}:${proxyConfig.port}`);
                config.proxyConfig = proxyConfig;
                config.type = 'proxy';
            }
        }

        // Enhanced security configuration
        if (this.config.enableSecurityIsolation) {
            config.securityProfile = 'enhanced';
            config.isolationLevel = 'strict';
            launchOptions.args.push(
                '--disable-background-networking',
                '--disable-default-apps',
                '--disable-sync',
                '--disable-translate',
                '--hide-scrollbars',
                '--metrics-recording-only',
                '--mute-audio',
                '--no-default-browser-check',
                '--no-pings',
                '--password-store=basic',
                '--use-mock-keychain'
            );
        }

        config.launchOptions = launchOptions;
        return config;
    }

    /**
     * Get an available browser with intelligent allocation
     */
    async getBrowser(options = {}) {
        const startTime = Date.now();

        try {
            // Check for immediate availability
            if (this.availableBrowsers.size > 0) {
                const browserId = this.selectOptimalBrowser(options);
                if (browserId) {
                    return await this.allocateBrowser(browserId, options);
                }
            }

            // Check if we can scale up
            if (this.shouldScaleUp()) {
                await this.scaleUp();
                // Try again after scaling
                if (this.availableBrowsers.size > 0) {
                    const browserId = this.selectOptimalBrowser(options);
                    if (browserId) {
                        return await this.allocateBrowser(browserId, options);
                    }
                }
            }

            // Wait for available browser or timeout
            return await this.waitForAvailableBrowser(options);

        } catch (error) {
            this.stats.errors++;
            Logger.error('❌ Failed to get browser:', error);
            throw error;
        } finally {
            const responseTime = Date.now() - startTime;
            this.updatePerformanceMetrics('response', responseTime);
        }
    }

    /**
     * Get a browser with Bangladesh proxy for Google searches
     */
    async getBangladeshBrowserForGoogle() {
        try {
            // Create a new browser with proxy configuration for Google searches
            const browserId = await this.createBrowser({
                useProxy: true,
                type: 'google-search',
                proxy: 'bangladesh',
                purpose: 'google_search'
            });

            // Get the browser instance from the pool
            const browser = await this.allocateBrowser(browserId, {
                useProxy: true,
                type: 'google-search'
            });

            // Track Google search usage if proxy is configured
            const metadata = this.browsers.get(browserId);
            if (metadata && metadata.proxyConfig && metadata.proxyConfig.proxy) {
                await this.proxyManager.trackGoogleSearchUsage(metadata.proxyConfig.proxy);
            }

            Logger.info(`🔍 Allocated proxy browser ${browserId} for Google search`);
            return browser;
        } catch (error) {
            Logger.error('❌ Failed to get Bangladesh browser for Google:', error);
            throw error;
        }
    }

    /**
     * Select optimal browser based on criteria
     */
    selectOptimalBrowser(options = {}) {
        if (this.availableBrowsers.size === 0) return null;

        const availableBrowserIds = Array.from(this.availableBrowsers);
        
        // Score browsers based on various criteria
        const scoredBrowsers = availableBrowserIds.map(browserId => {
            const metadata = this.browsers.get(browserId);
            let score = 0;

            // Prefer less used browsers
            score += (this.config.maxBrowserUsage - metadata.usageCount) / this.config.maxBrowserUsage * 30;

            // Prefer newer browsers
            const age = Date.now() - metadata.createdAt;
            score += (this.config.maxBrowserAge - age) / this.config.maxBrowserAge * 20;

            // Prefer browsers with better performance
            if (metadata.performanceMetrics.averagePageLoadTime > 0) {
                score += Math.max(0, 10 - metadata.performanceMetrics.averagePageLoadTime / 1000) * 10;
            }

            // Prefer healthy browsers
            if (metadata.health.status === 'healthy') {
                score += 20;
            }

            // Type matching bonus
            if (options.type && metadata.type === options.type) {
                score += 15;
            }

            // Proxy matching bonus
            if (options.useProxy && metadata.proxyConfig) {
                score += 10;
            } else if (!options.useProxy && !metadata.proxyConfig) {
                score += 10;
            }

            return { browserId, score, metadata };
        });

        // Sort by score and return best match
        scoredBrowsers.sort((a, b) => b.score - a.score);
        return scoredBrowsers[0]?.browserId;
    }

    /**
     * Allocate a browser to a request
     */
    async allocateBrowser(browserId, options = {}) {
        const metadata = this.browsers.get(browserId);
        if (!metadata) {
            throw new Error(`Browser ${browserId} not found`);
        }

        // Move from available to busy
        this.availableBrowsers.delete(browserId);
        this.busyBrowsers.add(browserId);

        // Update metadata
        metadata.lastUsed = Date.now();
        metadata.usageCount++;

        // Update peak concurrency
        if (this.busyBrowsers.size > this.stats.peakConcurrency) {
            this.stats.peakConcurrency = this.busyBrowsers.size;
        }

        Logger.debug(`📋 Allocated browser ${browserId} (usage: ${metadata.usageCount})`);
        this.emit('browserAllocated', { browserId, metadata, options });

        // Add browser ID to the browser instance for tracking
        const browser = metadata.browser;
        browser._poolId = browserId;
        browser._enhancedPoolMetadata = { ...metadata };

        return browser;
    }

    /**
     * Release a browser back to the pool
     */
    async releaseBrowser(browserOrId, options = {}) {
        try {
            // Handle both browser instances and browser IDs
            let browserId;
            if (typeof browserOrId === 'string') {
                browserId = browserOrId;
            } else if (browserOrId && browserOrId._poolId) {
                browserId = browserOrId._poolId;
            } else {
                Logger.warn(`⚠️ Invalid browser identifier provided for release`);
                return;
            }

            const metadata = this.browsers.get(browserId);
            if (!metadata) {
                Logger.warn(`⚠️ Attempted to release unknown browser ${browserId}`);
                return;
            }

            // Move from busy to available
            this.busyBrowsers.delete(browserId);

            // Check if browser should be recycled
            if (this.shouldRecycleBrowser(metadata)) {
                await this.recycleBrowser(browserId);
                return;
            }

            // Clean up browser state
            await this.cleanupBrowserState(metadata.browser);

            // Return to available pool
            this.availableBrowsers.add(browserId);
            metadata.lastUsed = Date.now();

            // Update statistics
            this.stats.reused++;

            Logger.debug(`♻️ Released browser ${browserId} back to pool`);
            this.emit('browserReleased', { browserId, metadata });

            // Process any queued requests
            this.processQueue();

            // Check if we should scale down
            if (this.shouldScaleDown()) {
                await this.scaleDown();
            }

        } catch (error) {
            this.stats.errors++;
            Logger.error(`❌ Error releasing browser ${browserId}:`, error);
            await this.recycleBrowser(browserId);
        }
    }

    /**
     * Clean up browser state for reuse
     */
    async cleanupBrowserState(browser) {
        try {
            const pages = await browser.pages();
            
            // Close all pages except the first one
            for (let i = 1; i < pages.length; i++) {
                try {
                    await pages[i].close();
                } catch (error) {
                    Logger.debug('⚠️ Error closing page:', error.message);
                }
            }

            // Reset the main page
            if (pages[0]) {
                await pages[0].goto('about:blank');
                
                // Clear storage with enhanced error handling
                await pages[0].evaluate(() => {
                    try {
                        if (typeof localStorage !== 'undefined') localStorage.clear();
                        if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
                        if (typeof indexedDB !== 'undefined') {
                            // Clear IndexedDB databases
                            indexedDB.databases?.().then(databases => {
                                databases.forEach(db => {
                                    if (db.name) indexedDB.deleteDatabase(db.name);
                                });
                            });
                        }
                    } catch (error) {
                        // Security errors are expected in some contexts
                        return { cleared: false, reason: error.message };
                    }
                    return { cleared: true };
                });
            }

        } catch (error) {
            Logger.debug('⚠️ Error during browser cleanup:', error.message);
        }
    }

    /**
     * Check if browser should be recycled
     */
    shouldRecycleBrowser(metadata) {
        const age = Date.now() - metadata.createdAt;
        return (
            metadata.usageCount >= this.config.maxBrowserUsage ||
            age >= this.config.maxBrowserAge ||
            metadata.health.status === 'unhealthy' ||
            metadata.health.consecutiveFailures >= 3
        );
    }

    /**
     * Recycle (destroy and optionally replace) a browser
     */
    async recycleBrowser(browserId) {
        try {
            const metadata = this.browsers.get(browserId);
            if (!metadata) return;

            Logger.info(`🔄 Recycling browser ${browserId} (age: ${Math.round((Date.now() - metadata.createdAt) / 60000)}min, uses: ${metadata.usageCount})`);

            // Remove from all collections
            this.browsers.delete(browserId);
            this.availableBrowsers.delete(browserId);
            this.busyBrowsers.delete(browserId);

            // Close browser
            try {
                await metadata.browser.close();
            } catch (error) {
                Logger.debug('⚠️ Error closing browser during recycling:', error.message);
            }

            // Update statistics
            this.stats.destroyed++;

            this.emit('browserRecycled', { browserId, metadata });

            // Create replacement if needed and not shutting down
            if (!this.isShuttingDown && this.browsers.size < this.config.minBrowsers) {
                await this.createBrowser();
            }

        } catch (error) {
            this.stats.errors++;
            Logger.error(`❌ Error recycling browser ${browserId}:`, error);
        }
    }

    /**
     * Generate unique browser ID
     */
    generateBrowserId() {
        return `browser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get comprehensive pool statistics
     */
    getStats() {
        return {
            ...this.stats,
            pool: {
                total: this.browsers.size,
                available: this.availableBrowsers.size,
                busy: this.busyBrowsers.size,
                queued: this.browserQueue.length
            },
            performance: {
                averageResponseTime: this.stats.averageResponseTime,
                peakConcurrency: this.stats.peakConcurrency,
                memoryOptimizations: this.stats.memoryOptimizations
            },
            health: this.getHealthStatus(),
            memory: this.memoryManager.getStats(),
            concurrent: this.concurrentOptimizer.getStats()
        };
    }

    /**
     * Get health status of the pool
     */
    getHealthStatus() {
        const totalBrowsers = this.browsers.size;
        if (totalBrowsers === 0) return { status: 'empty', score: 0 };

        let healthyBrowsers = 0;
        for (const [browserId, metadata] of this.browsers) {
            if (metadata.health.status === 'healthy') {
                healthyBrowsers++;
            }
        }

        const healthScore = (healthyBrowsers / totalBrowsers) * 100;
        let status = 'healthy';
        if (healthScore < 50) status = 'critical';
        else if (healthScore < 80) status = 'degraded';

        return {
            status,
            score: healthScore,
            healthy: healthyBrowsers,
            total: totalBrowsers
        };
    }

    /**
     * Start monitoring and optimization services
     */
    startMonitoringServices() {
        // Health check interval
        this.timers.healthCheck = setInterval(() => {
            this.performHealthCheck();
        }, this.config.healthCheckInterval);

        // Memory optimization interval
        this.timers.memoryOptimization = setInterval(() => {
            this.performMemoryOptimization();
        }, this.config.memoryOptimizationInterval);

        // Auto-scaling check
        if (this.config.enableAutoScaling) {
            this.timers.autoScaling = setInterval(() => {
                this.checkAutoScaling();
            }, 30000); // Check every 30 seconds
        }

        // Performance monitoring
        if (this.config.enableAdvancedMonitoring) {
            this.timers.performanceMonitoring = setInterval(() => {
                this.collectPerformanceMetrics();
            }, 60000); // Collect every minute
        }

        Logger.info('📊 Monitoring services started');
    }

    /**
     * Stop all monitoring services
     */
    stopMonitoringServices() {
        Object.values(this.timers).forEach(timer => {
            if (timer) clearInterval(timer);
        });
        
        Object.keys(this.timers).forEach(key => {
            this.timers[key] = null;
        });

        Logger.info('📊 Monitoring services stopped');
    }

    /**
     * Shutdown the enhanced browser pool
     */
    async shutdown() {
        Logger.info('🛑 Shutting down Enhanced Browser Pool...');
        this.isShuttingDown = true;

        // Stop all monitoring services
        this.stopMonitoringServices();

        // Stop organic behavior engine
        if (this.continuousSearchState.active) {
            await this.stopOrganicBehaviorEngine();
        }

        // Stop memory manager
        this.memoryManager.stopMonitoring();

        // Stop concurrent optimizer
        await this.concurrentOptimizer.shutdown();

        // Close all browsers
        const browserIds = Array.from(this.browsers.keys());
        for (const browserId of browserIds) {
            await this.recycleBrowser(browserId);
        }

        // Clear all collections
        this.browsers.clear();
        this.availableBrowsers.clear();
        this.busyBrowsers.clear();
        this.browserQueue.length = 0;
        this.sessionRegistry.clear();

        Logger.info('✅ Enhanced Browser Pool shutdown complete');
        this.emit('shutdown');
    }

    /**
     * Wait for an available browser with timeout and retry logic
     */
    async waitForAvailableBrowser(options = {}) {
        const timeout = options.timeout || 30000;
        const startTime = Date.now();

        return new Promise((resolve, reject) => {
            const checkAvailability = () => {
                // Check timeout
                if (Date.now() - startTime > timeout) {
                    reject(new Error('Timeout waiting for available browser'));
                    return;
                }

                // Check for available browser
                if (this.availableBrowsers.size > 0) {
                    const browserId = this.selectOptimalBrowser(options);
                    if (browserId) {
                        this.allocateBrowser(browserId, options)
                            .then(resolve)
                            .catch(reject);
                        return;
                    }
                }

                // Add to queue and retry
                this.browserQueue.push({ resolve, reject, options, timestamp: Date.now() });
                setTimeout(checkAvailability, 1000);
            };

            checkAvailability();
        });
    }

    /**
     * Process queued browser requests
     */
    processQueue() {
        while (this.browserQueue.length > 0 && this.availableBrowsers.size > 0) {
            const request = this.browserQueue.shift();
            const browserId = this.selectOptimalBrowser(request.options);
            
            if (browserId) {
                this.allocateBrowser(browserId, request.options)
                    .then(request.resolve)
                    .catch(request.reject);
            } else {
                // Put back in queue if no suitable browser
                this.browserQueue.unshift(request);
                break;
            }
        }
    }

    /**
     * Auto-scaling logic - determine if we should scale up
     */
    shouldScaleUp() {
        if (!this.config.enableAutoScaling) return false;
        if (this.browsers.size >= this.config.maxBrowsers) return false;

        const busyRatio = this.busyBrowsers.size / Math.max(this.browsers.size, 1);
        const queueLength = this.browserQueue.length;

        return busyRatio >= this.config.scaleUpThreshold || queueLength > 2;
    }

    /**
     * Auto-scaling logic - determine if we should scale down
     */
    shouldScaleDown() {
        if (!this.config.enableAutoScaling) return false;
        if (this.browsers.size <= this.config.minBrowsers) return false;

        const busyRatio = this.busyBrowsers.size / Math.max(this.browsers.size, 1);
        const queueLength = this.browserQueue.length;

        return busyRatio <= this.config.scaleDownThreshold && queueLength === 0;
    }

    /**
     * Scale up the browser pool
     */
    async scaleUp() {
        if (this.browsers.size >= this.config.maxBrowsers) return;

        try {
            Logger.info('📈 Scaling up browser pool...');
            await this.createBrowser();
            this.stats.scaleUps++;
            this.emit('scaledUp', { newSize: this.browsers.size });
        } catch (error) {
            Logger.error('❌ Failed to scale up:', error);
        }
    }

    /**
     * Scale down the browser pool
     */
    async scaleDown() {
        if (this.browsers.size <= this.config.minBrowsers) return;
        if (this.availableBrowsers.size === 0) return;

        try {
            Logger.info('📉 Scaling down browser pool...');
            
            // Find least optimal browser to remove
            const availableBrowserIds = Array.from(this.availableBrowsers);
            const oldestBrowser = availableBrowserIds.reduce((oldest, current) => {
                const currentMetadata = this.browsers.get(current);
                const oldestMetadata = this.browsers.get(oldest);
                return currentMetadata.createdAt < oldestMetadata.createdAt ? current : oldest;
            });

            await this.recycleBrowser(oldestBrowser);
            this.stats.scaleDowns++;
            this.emit('scaledDown', { newSize: this.browsers.size });
        } catch (error) {
            Logger.error('❌ Failed to scale down:', error);
        }
    }

    /**
     * Check auto-scaling conditions
     */
    async checkAutoScaling() {
        if (this.isShuttingDown) return;

        try {
            if (this.shouldScaleUp()) {
                await this.scaleUp();
            } else if (this.shouldScaleDown()) {
                await this.scaleDown();
            }
        } catch (error) {
            Logger.error('❌ Error during auto-scaling check:', error);
        }
    }

    /**
     * Perform comprehensive health check on all browsers
     */
    async performHealthCheck() {
        if (this.isShuttingDown) return;

        try {
            Logger.debug('🏥 Performing health check...');
            
            const healthCheckPromises = Array.from(this.browsers.entries()).map(async ([browserId, metadata]) => {
                try {
                    const isHealthy = await this.checkBrowserHealth(metadata.browser);
                    
                    if (isHealthy) {
                        metadata.health.status = 'healthy';
                        metadata.health.consecutiveFailures = 0;
                    } else {
                        metadata.health.consecutiveFailures++;
                        if (metadata.health.consecutiveFailures >= 3) {
                            metadata.health.status = 'unhealthy';
                        }
                    }
                    
                    metadata.health.lastHealthCheck = Date.now();
                    
                    return { browserId, healthy: isHealthy };
                } catch (error) {
                    metadata.health.status = 'unhealthy';
                    metadata.health.consecutiveFailures++;
                    Logger.warn(`⚠️ Health check failed for browser ${browserId}:`, error.message);
                    return { browserId, healthy: false, error: error.message };
                }
            });

            const results = await Promise.allSettled(healthCheckPromises);
            const healthyCount = results.filter(r => r.status === 'fulfilled' && r.value.healthy).length;
            
            Logger.debug(`🏥 Health check complete: ${healthyCount}/${this.browsers.size} browsers healthy`);
            
            // Recycle unhealthy browsers
            for (const [browserId, metadata] of this.browsers) {
                if (metadata.health.status === 'unhealthy' && !this.busyBrowsers.has(browserId)) {
                    await this.recycleBrowser(browserId);
                }
            }

        } catch (error) {
            Logger.error('❌ Error during health check:', error);
        }
    }

    /**
     * Check individual browser health
     */
    async checkBrowserHealth(browser) {
        try {
            // Check if browser is connected
            if (!browser.isConnected()) return false;

            // Try to get pages
            const pages = await browser.pages();
            if (pages.length === 0) return false;

            // Try to navigate to a simple page
            const page = pages[0];
            await page.goto('about:blank', { timeout: 5000 });
            
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Perform memory optimization across the pool
     */
    async performMemoryOptimization() {
        if (this.isShuttingDown) return;

        try {
            Logger.debug('🧠 Performing memory optimization...');
            
            // Force memory cleanup on memory manager
            await this.memoryManager.optimizeMemory();
            
            // Optimize individual browsers
            for (const [browserId, metadata] of this.browsers) {
                if (!this.busyBrowsers.has(browserId)) {
                    await this.optimizeBrowserMemory(metadata.browser);
                }
            }

            this.stats.memoryOptimizations++;
            Logger.debug('🧠 Memory optimization complete');

        } catch (error) {
            Logger.error('❌ Error during memory optimization:', error);
        }
    }

    /**
     * Optimize memory for individual browser
     */
    async optimizeBrowserMemory(browser) {
        try {
            const pages = await browser.pages();
            for (const page of pages) {
                if (!page.isClosed()) {
                    // Force garbage collection in page context
                    await page.evaluate(() => {
                        if (window.gc) window.gc();
                    });
                }
            }
        } catch (error) {
            Logger.debug('⚠️ Error optimizing browser memory:', error.message);
        }
    }

    /**
     * Collect performance metrics
     */
    collectPerformanceMetrics() {
        try {
            const memUsage = process.memoryUsage();
            const cpuUsage = process.cpuUsage();
            
            // Update performance metrics
            this.performanceMetrics.memoryUsage.push({
                timestamp: Date.now(),
                heapUsed: memUsage.heapUsed,
                heapTotal: memUsage.heapTotal,
                external: memUsage.external,
                rss: memUsage.rss
            });

            this.performanceMetrics.cpuUsage.push({
                timestamp: Date.now(),
                user: cpuUsage.user,
                system: cpuUsage.system
            });

            // Calculate error rate
            const totalOperations = this.stats.created + this.stats.reused;
            const errorRate = totalOperations > 0 ? (this.stats.errors / totalOperations) * 100 : 0;
            
            this.performanceMetrics.errorRates.push({
                timestamp: Date.now(),
                rate: errorRate
            });

            // Calculate throughput (operations per minute)
            const now = Date.now();
            const oneMinuteAgo = now - 60000;
            const recentOperations = this.performanceMetrics.requestTimes.filter(
                rt => rt.timestamp > oneMinuteAgo
            ).length;
            
            this.performanceMetrics.throughput.push({
                timestamp: now,
                operationsPerMinute: recentOperations
            });

            // Keep only last 100 entries for each metric
            Object.keys(this.performanceMetrics).forEach(key => {
                if (this.performanceMetrics[key].length > 100) {
                    this.performanceMetrics[key] = this.performanceMetrics[key].slice(-100);
                }
            });

        } catch (error) {
            Logger.error('❌ Error collecting performance metrics:', error);
        }
    }

    /**
     * Update performance metrics with new data
     */
    updatePerformanceMetrics(type, value) {
        const timestamp = Date.now();
        
        switch (type) {
            case 'response':
                this.performanceMetrics.requestTimes.push({ timestamp, value });
                // Update average response time
                const recentTimes = this.performanceMetrics.requestTimes.slice(-50);
                this.stats.averageResponseTime = recentTimes.reduce((sum, rt) => sum + rt.value, 0) / recentTimes.length;
                break;
            case 'creation':
                // Track browser creation times
                break;
            case 'memory':
                // Memory data from concurrent optimizer
                break;
        }
    }

    /**
     * Update scaling history for predictive analytics
     */
    updateScalingHistory(action, metadata) {
        this.scalingHistory.push({
            timestamp: Date.now(),
            action,
            poolSize: this.browsers.size,
            busyBrowsers: this.busyBrowsers.size,
            queueLength: this.browserQueue.length,
            metadata
        });

        // Keep only last 1000 entries
        if (this.scalingHistory.length > 1000) {
            this.scalingHistory = this.scalingHistory.slice(-1000);
        }
    }

    /**
     * Handle memory alerts from memory manager
     */
    async handleMemoryAlert(alert) {
        Logger.warn('🧠 Memory alert received:', alert);
        
        try {
            // Perform immediate memory optimization
            await this.performMemoryOptimization();
            
            // Consider scaling down if memory pressure is high
            if (alert.severity === 'high' && this.shouldScaleDown()) {
                await this.scaleDown();
            }
            
        } catch (error) {
            Logger.error('❌ Error handling memory alert:', error);
        }
    }

    /**
     * Handle critical memory conditions
     */
    async handleCriticalMemory(critical) {
        Logger.error('🚨 Critical memory condition:', critical);
        
        try {
            // Emergency actions
            await this.performEmergencyMemoryCleanup();
            
            // Force scale down to minimum
            while (this.browsers.size > this.config.minBrowsers && this.availableBrowsers.size > 0) {
                const browserId = Array.from(this.availableBrowsers)[0];
                await this.recycleBrowser(browserId);
            }
            
        } catch (error) {
            Logger.error('❌ Error handling critical memory:', error);
        }
    }

    /**
     * Perform emergency memory cleanup
     */
    async performEmergencyMemoryCleanup() {
        try {
            // Close all available browsers except minimum required
            const availableBrowserIds = Array.from(this.availableBrowsers);
            const browsersToClose = availableBrowserIds.slice(this.config.minBrowsers);
            
            for (const browserId of browsersToClose) {
                await this.recycleBrowser(browserId);
            }
            
            // Force garbage collection
            if (global.gc) {
                global.gc();
            }
            
            Logger.info('🚨 Emergency memory cleanup completed');
            
        } catch (error) {
            Logger.error('❌ Error during emergency cleanup:', error);
        }
    }

}

module.exports = { EnhancedBrowserPool };