
/**
 * Main Crawler Application - Modular Architecture
 * Optimized for organic search behavior with comprehensive statistics tracking
 */

// Import modular components
const { BrowserPool } = require('./core/browser-pool');
const { MemoryManager } = require('./core/memory-manager');
const { SearchEngine } = require('./core/search-engine');
const { StatsTracker } = require('./utils/stats-tracker');
const { defaultLogger: Logger } = require('./utils/logger');
const { Helpers } = require('./utils/helpers');
const { URLGenerator } = require('./utils/url-generator');
const { PlatformSelector } = require('./utils/platform-selector');
const { SystemValidator } = require('./validation/system-validator');
const { HealthChecker } = require('./validation/health-checker');

// Import configurations
const { ORGANIC_BEHAVIOR_CONFIG } = require('./config/organic-behavior');
const { KEYWORD_CATEGORIES, KEYWORDS, KEYWORD_CONFIG, GEO_LOCATIONS } = require('./config/keywords');
const { DEVICE_CONFIGURATIONS: ALL_DEVICE_CONFIGS } = require('./config/device-configurations');

/**
 * Main Crawler Class - Orchestrates all components
 */
class Crawler {
    constructor() {
        this.browserPool = new BrowserPool();
        this.memoryManager = new MemoryManager();
        this.statsTracker = new StatsTracker();
        this.searchEngine = new SearchEngine(this.browserPool, this.statsTracker);
        this.urlGenerator = new URLGenerator();
        this.platformSelector = new PlatformSelector();
        this.systemValidator = new SystemValidator();
        this.healthChecker = new HealthChecker();
        
        this.isRunning = false;
        this.currentIndex = 0;
        this.searchCombinations = [];
        this.burstMode = false;
        this.burstRemaining = 0;
        
        // Statistics
        this.stats = {
            startTime: new Date(),
            totalSearches: 0,
            successfulSearches: 0,
            failedSearches: 0,
            currentCycle: 1
        };

        this.setupEventHandlers();
    }

    /**
     * Setup event handlers for health monitoring and graceful shutdown
     */
    setupEventHandlers() {
        // Health monitoring
        this.healthChecker.on('healthCheck', (status) => {
            if (status.isHealthy) {
                Logger.info('System health check passed', status);
            } else {
                Logger.warn('System health check failed', status);
                this.handleHealthIssue(status);
            }
        });

        this.healthChecker.on('criticalError', async (error) => {
            Logger.error('Critical system error detected', error);
            await this.attemptRecovery();
        });

        // Graceful shutdown handlers
        process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
        process.on('SIGQUIT', () => this.gracefulShutdown('SIGQUIT'));

        // Error handlers
        process.on('uncaughtException', (error) => {
            Logger.error('Uncaught Exception', error);
            this.gracefulShutdown('uncaughtException');
        });

        process.on('unhandledRejection', (reason, promise) => {
            Logger.error('Unhandled Rejection', { reason, promise });
            // Continue operation but log the issue
        });
    }

    /**
     * Initialize all components and validate system
     */
    async initialize() {
        try {
            Logger.info('🚀 Initializing Crawler with Modular Architecture');

            // System validation
            Logger.info('🧪 Running comprehensive system validation...');
            const validationResult = await this.systemValidator.validateSystem();
            
            if (!validationResult.success) {
                const failedChecks = validationResult.results.failed.map(f => f.message).join(', ');
                throw new Error(`System validation failed: ${failedChecks}`);
            }

            // Initialize components
            Logger.info('🔧 Initializing browser pool...');
            await this.browserPool.initialize();
            
            Logger.info('🧠 Initializing memory manager...');
            await this.memoryManager.initialize();
            
            Logger.info('🔍 Initializing search engine...');
            await this.searchEngine.initialize();
            
            Logger.info('📊 Initializing stats tracker...');
            await this.statsTracker.initialize();

            // Start health monitoring
            Logger.info('🏥 Starting health monitoring...');
            this.healthChecker.start();

            // Generate search combinations
            Logger.info('🎲 Generating search combinations...');
            this.generateSearchCombinations();

            Logger.info('✅ Crawler initialization completed successfully');
            return true;

        } catch (error) {
            Logger.error('❌ Crawler initialization failed', error);
            throw error;
        }
    }

    /**
     * Generate search combinations using modular components
     */
    generateSearchCombinations() {
        Logger.info('🎲 Generating search combinations...');

        try {
            const filteredKeywords = this.getFilteredKeywords();
            Logger.info(`Found ${filteredKeywords.length} filtered keywords`);
            const combinations = [];

        filteredKeywords.forEach(keyword => {
            // Select diverse geolocations
            const selectedLocations = Helpers.getRandomItems(
                GEO_LOCATIONS, 
                Math.min(10, GEO_LOCATIONS.length)
            );

            selectedLocations.forEach(location => {
                // Select diverse device configurations
                const selectedDevices = Helpers.getRandomItems(ALL_DEVICE_CONFIGS, 3);

                selectedDevices.forEach(deviceConfig => {
                    // Select appropriate platforms
                    const availablePlatforms = this.platformSelector.selectPlatforms(
                        deviceConfig,
                        location.requiresGeolocation || false
                    );

                    availablePlatforms.forEach(platform => {
                        const searchUrl = this.urlGenerator.generateSearchURL(
                            platform.name, keyword, {
                                location: location,
                                deviceConfig: deviceConfig
                            }
                        );

                        combinations.push({
                            url: searchUrl,
                            keyword: keyword,
                            platform: platform.name,
                            platformConfig: platform,
                            location: location,
                            deviceConfig: deviceConfig,
                            category: this.getKeywordCategory(keyword),
                            searchId: Helpers.generateUniqueId(),
                            timestamp: new Date().toISOString()
                        });
                    });
                });
            });
        });

            // Apply organic randomization
            this.searchCombinations = this.applyOrganicSequencing(combinations);
            
            Logger.info(`✅ Generated ${this.searchCombinations.length} search combinations`);
        } catch (error) {
            Logger.error('❌ Error generating search combinations:', error);
            throw error;
        }
    }

    /**
     * Get filtered keywords based on configuration
     */
    getFilteredKeywords() {
        const filteredKeywords = [];

        KEYWORD_CONFIG.enabledCategories.forEach(category => {
            if (KEYWORD_CATEGORIES[category]) {
                filteredKeywords.push(...KEYWORD_CATEGORIES[category]);
            }
        });

        return filteredKeywords.length > 0 ? filteredKeywords : KEYWORDS || [];
    }

    /**
     * Get keyword category
     */
    getKeywordCategory(keyword) {
        for (const [category, keywords] of Object.entries(KEYWORD_CATEGORIES)) {
            if (Array.isArray(keywords) && keywords.includes(keyword)) {
                return category;
            }
        }
        return 'uncategorized';
    }

    /**
     * Apply organic sequencing to search combinations
     */
    applyOrganicSequencing(combinations) {
        if (KEYWORD_CONFIG.randomizeOrder) {
            return Helpers.shuffleArray([...combinations]);
        }
        return combinations;
    }

    /**
     * Start the crawler with organic behavior patterns
     */
    async start() {
        if (this.isRunning) {
            Logger.warn('Crawler is already running');
            return;
        }

        try {
            await this.initialize();
            this.isRunning = true;

            Logger.info('🚀 Starting crawler with organic behavior patterns');
            Logger.info(`📊 Total search combinations: ${this.searchCombinations.length}`);

            // Start the organic search pattern
            this.scheduleNextSearch();

        } catch (error) {
            Logger.error('Failed to start crawler', error);
            throw error;
        }
    }

    /**
     * Schedule the next search with organic timing
     */
    scheduleNextSearch() {
        if (!this.isRunning) return;

        let nextInterval = this.calculateNextInterval();

        setTimeout(async () => {
            if (!this.isRunning) return;

            const searchData = this.searchCombinations[this.currentIndex];
            await this.executeSearch(searchData);

            // Move to next search
            this.currentIndex = (this.currentIndex + 1) % this.searchCombinations.length;

            // Check if we completed a cycle
            if (this.currentIndex === 0) {
                this.handleCycleCompletion();
            }

            // Schedule next search
            this.scheduleNextSearch();

        }, nextInterval);
    }

    /**
     * Calculate next search interval with organic behavior
     */
    calculateNextInterval() {
        const config = ORGANIC_BEHAVIOR_CONFIG;

        // Check for burst mode
        if (!this.burstMode && this.shouldEnterBurstMode()) {
            this.burstMode = true;
            this.burstRemaining = Helpers.getRandomInRange(
                config.humanPatterns.burstCount.min,
                config.humanPatterns.burstCount.max
            );
            Logger.info(`🚀 Entering burst mode: ${this.burstRemaining} searches`);
        }

        if (this.burstMode && this.burstRemaining > 0) {
            this.burstRemaining--;
            if (this.burstRemaining === 0) {
                this.burstMode = false;
                Logger.info('✅ Burst mode completed');
            }
            return Helpers.getRandomInRange(
                config.humanPatterns.burstInterval.min,
                config.humanPatterns.burstInterval.max
            );
        }

        // Check for long pause
        if (config.humanPatterns.enableRandomPauses && 
            Math.random() < config.humanPatterns.pauseProbability) {
            const pauseTime = Helpers.getRandomInRange(
                config.humanPatterns.longPauseRange.min,
                config.humanPatterns.longPauseRange.max
            );
            Logger.info(`⏸️  Taking organic pause: ${(pauseTime / 1000).toFixed(1)}s`);
            return pauseTime;
        }

        // Normal interval with jitter
        let baseInterval = Helpers.getRandomInRange(
            config.intervalRange.min,
            config.intervalRange.max
        );

        if (config.antiDetection.enableJitter) {
            const jitter = Helpers.getRandomInRange(
                config.antiDetection.jitterRange.min,
                config.antiDetection.jitterRange.max
            );
            baseInterval += jitter;
        }

        return Math.max(1000, baseInterval); // Minimum 1 second
    }

    /**
     * Check if should enter burst mode
     */
    shouldEnterBurstMode() {
        return ORGANIC_BEHAVIOR_CONFIG.humanPatterns.enableBurstPatterns &&
               Math.random() < ORGANIC_BEHAVIOR_CONFIG.humanPatterns.burstProbability;
    }

    /**
     * Execute a single search
     */
    async executeSearch(searchData) {
        const startTime = Date.now();
        
        try {
            Logger.info(`🔍 Searching: ${searchData.keyword} on ${searchData.platform}`, {
                location: searchData.location.city,
                device: searchData.deviceConfig.deviceType
            });

            // Perform the search using SearchEngine
            const result = await this.searchEngine.performSearch(searchData);

            // Record statistics
            await this.statsTracker.recordSearch(
                searchData.keyword,
                searchData.platform,
                true,
                Date.now() - startTime
            );

            this.stats.totalSearches++;
            this.stats.successfulSearches++;

            Logger.info(`✅ Search completed successfully`, {
                keyword: searchData.keyword,
                platform: searchData.platform,
                duration: `${Date.now() - startTime}ms`
            });

            // Trigger memory management
            this.memoryManager.checkMemory();

            return result;

        } catch (error) {
            // Record failed search
            await this.statsTracker.recordSearch(
                searchData.keyword,
                searchData.platform,
                false,
                Date.now() - startTime,
                error.message
            );

            this.stats.totalSearches++;
            this.stats.failedSearches++;

            Logger.error(`❌ Search failed: ${searchData.keyword} on ${searchData.platform}`, error);
            
            // Don't throw - continue with next search
        }
    }

    /**
     * Handle cycle completion
     */
    handleCycleCompletion() {
        this.stats.currentCycle++;
        
        Logger.info(`🔄 Completed search cycle ${this.stats.currentCycle - 1}`);
        
        // Re-randomize search sequence for next cycle
        this.searchCombinations = this.applyOrganicSequencing(this.searchCombinations);
        
        // Save statistics
        this.statsTracker.saveStats();
        
        Logger.info(`📊 Cycle Statistics`, {
            totalSearches: this.stats.totalSearches,
            successRate: `${((this.stats.successfulSearches / this.stats.totalSearches) * 100).toFixed(1)}%`,
            currentCycle: this.stats.currentCycle
        });
    }

    /**
     * Handle health issues
     */
    async handleHealthIssue(status) {
        if (status.severity === 'critical') {
            Logger.error('Critical health issue detected, attempting recovery');
            await this.attemptRecovery();
        } else {
            Logger.warn('Health issue detected, monitoring closely', status);
        }
    }

    /**
     * Attempt system recovery
     */
    async attemptRecovery() {
        try {
            Logger.info('🔧 Attempting system recovery...');

            // Force garbage collection
            this.memoryManager.forceGarbageCollection();

            // Reinitialize browser pool
            await this.browserPool.cleanup();
            await this.browserPool.initialize();

            // Reset search engine
            await this.searchEngine.reset();

            Logger.info('✅ System recovery completed successfully');
            return true;

        } catch (error) {
            Logger.error('❌ System recovery failed', error);
            return false;
        }
    }

    /**
     * Stop the crawler
     */
    async stop() {
        Logger.info('🛑 Stopping crawler...');
        this.isRunning = false;

        try {
            // Stop health monitoring
            this.healthChecker.stopMonitoring();

            // Save final statistics
            await this.statsTracker.saveStats();

            Logger.info('✅ Crawler stopped successfully');

        } catch (error) {
            Logger.error('Error stopping crawler', error);
        }
    }

    /**
     * Graceful shutdown
     */
    async gracefulShutdown(signal) {
        Logger.info(`🛑 Received ${signal}. Initiating graceful shutdown...`);

        try {
            await this.stop();
            await this.browserPool.cleanup();
            await this.memoryManager.cleanup();

            // Final statistics
            const runtime = Math.round((new Date() - this.stats.startTime) / 1000);
            const successRate = this.stats.totalSearches > 0 ?
                ((this.stats.successfulSearches / this.stats.totalSearches) * 100).toFixed(1) : '0.0';

            Logger.info('📊 Final Statistics', {
                runtime: `${runtime}s`,
                totalSearches: this.stats.totalSearches,
                successRate: `${successRate}%`,
                cycles: this.stats.currentCycle
            });

            Logger.info('✅ Graceful shutdown completed');
            process.exit(0);

        } catch (error) {
            Logger.error('❌ Error during shutdown', error);
            process.exit(1);
        }
    }

    /**
     * Get current statistics
     */
    getStats() {
        const runtime = Math.round((new Date() - this.stats.startTime) / 1000);
        const successRate = this.stats.totalSearches > 0 ?
            ((this.stats.successfulSearches / this.stats.totalSearches) * 100).toFixed(1) : '0.0';

        return {
            ...this.stats,
            runtime: `${runtime}s`,
            successRate: `${successRate}%`,
            memoryUsage: this.memoryManager.getMemoryUsage()
        };
    }
}

// Create and start the crawler
const crawler = new Crawler();

// Start the crawler
crawler.start().catch(error => {
    Logger.error('Failed to start crawler', error);
    process.exit(1);
});

// Export for testing
module.exports = { Crawler };
