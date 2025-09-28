
/**
 * Main Crawler Application - Modular Architecture
 * Optimized for organic search behavior with comprehensive statistics tracking
 */

// Node.js stream imports for memory-efficient processing
const { Readable, Transform, Writable, pipeline } = require('stream');
const { promisify } = require('util');
const pipelineAsync = promisify(pipeline);

// Import modular components
const { BrowserPool } = require('./core/browser-pool');
const { MemoryManager } = require('./core/memory-manager');
const { SearchEngine } = require('./core/search-engine');
const { StatsTracker } = require('./utils/stats-tracker');
const { MemoryMonitor } = require('./utils/memory-monitor');
const ImmediateProcessor = require('./utils/immediate-processor');
const { defaultLogger: Logger } = require('./utils/logger');
const { Helpers } = require('./utils/helpers');
const { URLGenerator } = require('./utils/url-generator');
const { PlatformSelector } = require('./utils/platform-selector');
const { SystemValidator } = require('./validation/system-validator');
const { HealthChecker } = require('./validation/health-checker');
const { PostSearchCleanup } = require('./core/post-search-cleanup');

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
        
        // Initialize PostSearchCleanup for comprehensive resource management
        this.postSearchCleanup = new PostSearchCleanup({
            browserTerminationTimeout: 35000,
            memoryReleaseTimeout: 30000,
            tempFileCleanupTimeout: 25000,
            preserveSearchResults: true,
            continueOnError: true,
            detailedLogging: true,
            logCleanupSteps: true,
            logPerformanceMetrics: true
        });
        
        // Initialize immediate processor for data processing and disposal
        this.immediateProcessor = new ImmediateProcessor({
            maxBufferSize: 25,
            processingTimeout: 8000,
            autoFlush: true,
            flushInterval: 3000,
            enableMetrics: true,
            maxRetries: 2,
            retryDelay: 1000
        });
        
        this.isRunning = false;
        this.currentIndex = 0;
        this.searchCombinations = [];
        this.searchGenerator = null;
        this.totalCombinations = 0;
        this.burstMode = false;
        this.burstRemaining = 0;
        
        // Stream processing configuration
        this.streamConfig = {
            batchSize: 10,
            maxConcurrency: 3,
            memoryThreshold: 100 * 1024 * 1024, // 100MB
            streamBufferSize: 50,
            enableStreaming: true
        };
        
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
     * Generate search combinations using memory-efficient generator pattern
     */
    generateSearchCombinations() {
        Logger.info('🎲 Generating search combinations with memory optimization...');

        try {
            const filteredKeywords = this.getFilteredKeywords();
            Logger.info(`Found ${filteredKeywords.length} filtered keywords`);
            
            // Calculate total combinations without storing them
            this.totalCombinations = this.calculateTotalCombinations(filteredKeywords);
            Logger.info(`📊 Total combinations calculated: ${this.totalCombinations}`);
            
            // Create generator for memory-efficient iteration
            this.searchGenerator = this.createSearchGenerator(filteredKeywords);
            
            // Keep a small buffer for immediate use (max 100 items)
            this.searchCombinations = [];
            this.fillSearchBuffer();
            
            Logger.info(`✅ Search generator initialized with buffer size: ${this.searchCombinations.length}`);

        } catch (error) {
            Logger.error('❌ Error generating search combinations:', error.message);
            Logger.error('❌ Error stack:', error.stack);
            throw error;
        }
    }

    /**
     * Calculate total combinations without storing them in memory
     */
    calculateTotalCombinations(filteredKeywords) {
        let total = 0;
        
        filteredKeywords.forEach(keyword => {
            const locationCount = Math.min(10, GEO_LOCATIONS.length);
            const deviceCount = 3;
            
            const { PlatformManager } = require('./config/search-platforms');
            const enabledPlatformsCount = PlatformManager.getEnabledPlatforms().length;
            const platformCount = Math.min(3, enabledPlatformsCount);
            
            total += locationCount * deviceCount * platformCount;
        });
        
        return total;
    }

    /**
     * Create a generator for search combinations
     */
    *createSearchGenerator(filteredKeywords) {
        for (const keyword of filteredKeywords) {
            // Select diverse geolocations
            const selectedLocations = Helpers.getRandomElements(
                GEO_LOCATIONS, 
                Math.min(10, GEO_LOCATIONS.length)
            );

            for (const location of selectedLocations) {
                // Select diverse device configurations
                const selectedDevices = Helpers.getRandomElements(ALL_DEVICE_CONFIGS, 3);

                for (const deviceConfig of selectedDevices) {
                    // Get the number of enabled platforms
                    const { PlatformManager } = require('./config/search-platforms');
                    const enabledPlatformsCount = PlatformManager.getEnabledPlatforms().length;
                    const platformsToRequest = Math.min(3, enabledPlatformsCount);
                    
                    // Select appropriate platforms
                    const availablePlatforms = this.platformSelector.selectMultiplePlatforms(
                        keyword,
                        platformsToRequest,
                        { deviceConfig, location }
                    );

                    for (const platform of availablePlatforms) {
                        const searchUrl = this.urlGenerator.generateSearchURL(
                            platform.name, keyword, {
                                location: location,
                                deviceConfig: deviceConfig
                            }
                        );

                        yield {
                            url: searchUrl,
                            keyword: keyword,
                            platform: platform.name,
                            platformConfig: platform,
                            location: location,
                            deviceConfig: deviceConfig,
                            category: this.getKeywordCategory(keyword),
                            searchId: Helpers.generateUniqueId(),
                            timestamp: new Date().toISOString()
                        };
                    }
                }
            }
        }
    }

    /**
     * Fill search buffer with next batch of combinations
     */
    fillSearchBuffer() {
        const bufferSize = 100; // Keep only 100 items in memory
        this.searchCombinations = [];
        
        if (!this.searchGenerator) return;
        
        for (let i = 0; i < bufferSize; i++) {
            const next = this.searchGenerator.next();
            if (next.done) {
                // Restart generator for continuous cycling
                const filteredKeywords = this.getFilteredKeywords();
                this.searchGenerator = this.createSearchGenerator(filteredKeywords);
                break;
            }
            this.searchCombinations.push(next.value);
        }
        
        // Apply organic randomization to buffer
        if (KEYWORD_CONFIG.randomizeOrder) {
            this.searchCombinations = Helpers.shuffleArray([...this.searchCombinations]);
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
            Logger.info(`📊 Total search combinations: ${this.totalCombinations}`);
            Logger.info(`🧠 Memory-efficient buffer size: ${this.searchCombinations.length}`);

            // Start the organic search pattern
            Logger.info('🔄 About to schedule next search...');
            this.scheduleNextSearch();
            Logger.info('✅ Successfully scheduled next search');

        } catch (error) {
            Logger.error('Failed to start crawler');
            Logger.error(`❌ Error message: ${error.message}`);
            Logger.error(`❌ Error stack: ${error.stack}`);
            throw error;
        }
    }

    /**
     * Schedule the next search with organic timing and memory-efficient processing
     */
    scheduleNextSearch() {
        if (!this.isRunning) return;

        let nextInterval = this.calculateNextInterval();

        setTimeout(async () => {
            if (!this.isRunning) return;

            // Check if we need to refill the buffer
            if (this.currentIndex >= this.searchCombinations.length) {
                Logger.info('🔄 Refilling search buffer for memory efficiency...');
                this.fillSearchBuffer();
                this.currentIndex = 0;
                
                // Trigger garbage collection after buffer refill
                this.memoryManager.optimizeForOperation('batch');
            }

            // Get current search data
            const searchData = this.searchCombinations[this.currentIndex];
            if (!searchData) {
                Logger.warn('⚠️ No search data available, refilling buffer...');
                this.fillSearchBuffer();
                this.currentIndex = 0;
                this.scheduleNextSearch();
                return;
            }

            await this.executeSearch(searchData);

            // Move to next search
            this.currentIndex++;

            // Check if we completed a cycle (based on total combinations)
            if (this.stats.totalSearches > 0 && this.stats.totalSearches % this.totalCombinations === 0) {
                await this.handleCycleCompletion();
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
            this.burstRemaining = Helpers.randomBetween(
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
            return Helpers.randomBetween(
                config.humanPatterns.burstInterval.min,
                config.humanPatterns.burstInterval.max
            );
        }

        // Check for long pause
        if (config.humanPatterns.enableRandomPauses && 
            Math.random() < config.humanPatterns.pauseProbability) {
            const pauseTime = Helpers.randomBetween(
                config.humanPatterns.longPauseRange.min,
                config.humanPatterns.longPauseRange.max
            );
            Logger.info(`⏸️  Taking organic pause: ${(pauseTime / 1000).toFixed(1)}s`);
            return pauseTime;
        }

        // Normal interval with jitter
        let baseInterval = Helpers.randomBetween(
            config.intervalRange.min,
            config.intervalRange.max
        );

        if (config.antiDetection.enableJitter) {
            const jitter = Helpers.randomBetween(
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
            const result = await this.searchEngine.performSearch(
                searchData.keyword,
                searchData.platform,
                {
                    location: searchData.location,
                    deviceConfig: searchData.deviceConfig,
                    platformConfig: searchData.platformConfig
                }
            );

            // Update local stats (detailed stats are recorded by search engine)
            this.stats.totalSearches++;
            this.stats.successfulSearches++;

            Logger.info(`✅ Search completed successfully`, {
                keyword: searchData.keyword,
                platform: searchData.platform,
                duration: `${Date.now() - startTime}ms`
            });

            // Trigger memory management
            this.memoryManager.recordMemoryUsage();

            return result;

        } catch (error) {
            // Update local stats (detailed stats are recorded by search engine)
            this.stats.totalSearches++;
            this.stats.failedSearches++;

            Logger.error(`❌ Search failed: ${searchData.keyword} on ${searchData.platform}`, error);
            
            // Don't throw - continue with next search
        }
    }

    /**
     * Handle cycle completion
     */
    async handleCycleCompletion() {
        this.stats.currentCycle++;
        
        Logger.info(`🔄 Completed search cycle ${this.stats.currentCycle - 1}`);
        
        // Execute comprehensive resource cleanup at cycle completion
        try {
            Logger.info('🧹 Executing comprehensive cycle cleanup', {
                cycle: this.stats.currentCycle - 1,
                timestamp: new Date().toISOString(),
                memoryBefore: this.formatMemoryUsage(process.memoryUsage())
            });

            const cleanupResult = await this.postSearchCleanup.executeCleanup();
            
            Logger.info('✅ Cycle cleanup completed successfully', {
                cycle: this.stats.currentCycle - 1,
                cleanupResult,
                timestamp: new Date().toISOString(),
                memoryAfter: this.formatMemoryUsage(process.memoryUsage())
            });

        } catch (cleanupError) {
            Logger.error('❌ Error during cycle cleanup', {
                cycle: this.stats.currentCycle - 1,
                error: cleanupError.message,
                timestamp: new Date().toISOString()
            });
        }
        
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

    /**
     * Create a readable stream of search combinations for memory-efficient processing
     */
    createSearchStream() {
        const self = this;
        let index = 0;
        
        return new Readable({
            objectMode: true,
            read() {
                if (!self.streamConfig.enableStreaming) {
                    this.push(null);
                    return;
                }

                if (index >= self.searchCombinations.length) {
                    this.push(null);
                    return;
                }

                const batch = self.searchCombinations.slice(
                    index, 
                    index + self.streamConfig.batchSize
                );
                
                index += self.streamConfig.batchSize;
                this.push(batch);
            }
        });
    }

    /**
     * Create a transform stream for processing search batches
     */
    createSearchTransform() {
        const self = this;
        let activeSearches = 0;

        return new Transform({
            objectMode: true,
            async transform(batch, encoding, callback) {
                try {
                    // Check memory usage before processing
                    const memoryUsage = process.memoryUsage();
                    if (memoryUsage.heapUsed > self.streamConfig.memoryThreshold) {
                        Logger.warn('Memory threshold exceeded, triggering cleanup');
                        await self.memoryManager.performMemoryCleanup();
                        global.gc && global.gc();
                    }

                    // Process batch with concurrency control
                    const results = [];
                    for (let i = 0; i < batch.length; i += self.streamConfig.maxConcurrency) {
                        const chunk = batch.slice(i, i + self.streamConfig.maxConcurrency);
                        
                        const chunkPromises = chunk.map(async (searchData) => {
                            activeSearches++;
                            try {
                                const result = await self.executeSearch(searchData);
                                return { success: true, data: searchData, result };
                            } catch (error) {
                                return { success: false, data: searchData, error };
                            } finally {
                                activeSearches--;
                            }
                        });

                        const chunkResults = await Promise.allSettled(chunkPromises);
                        results.push(...chunkResults.map(r => r.value || r.reason));
                    }

                    // Stream results immediately to prevent memory buildup
                    this.push(results);
                    callback();

                } catch (error) {
                    Logger.error('Error in search transform stream', error);
                    callback(error);
                }
            }
        });
    }

    /**
     * Create a writable stream for processing search results
     */
    createResultStream() {
        const self = this;
        let processedCount = 0;

        return new Writable({
            objectMode: true,
            write(results, encoding, callback) {
                try {
                    // Process results immediately
                    for (const result of results) {
                        if (result.success) {
                            // Record statistics using stream processing
                            self.statsTracker.streamBatchRecord([{
                                type: 'keyword',
                                data: {
                                    keyword: result.data.keyword,
                                    platform: result.data.platform,
                                    location: result.data.location
                                }
                            }]);
                        }
                        
                        processedCount++;
                        
                        // Periodic memory cleanup
                        if (processedCount % self.streamConfig.streamBufferSize === 0) {
                            setImmediate(() => {
                                self.memoryManager.recordMemoryUsage();
                                global.gc && global.gc();
                            });
                        }
                    }

                    // Clear results immediately to free memory
                    results.length = 0;
                    callback();

                } catch (error) {
                    Logger.error('Error in result stream', error);
                    callback(error);
                }
            }
        });
    }

    /**
     * Execute searches using stream-based processing for memory efficiency
     */
    async streamBatchSearch() {
        if (!this.streamConfig.enableStreaming || this.searchCombinations.length === 0) {
            Logger.info('Stream processing disabled or no search combinations available');
            return;
        }

        try {
            Logger.info('🌊 Starting stream-based search processing', {
                totalCombinations: this.searchCombinations.length,
                batchSize: this.streamConfig.batchSize,
                maxConcurrency: this.streamConfig.maxConcurrency
            });

            const searchStream = this.createSearchStream();
            const transformStream = this.createSearchTransform();
            const resultStream = this.createResultStream();

            // Create pipeline for memory-efficient processing
            await pipelineAsync(
                searchStream,
                transformStream,
                resultStream
            );

            Logger.info('✅ Stream-based search processing completed');

        } catch (error) {
            Logger.error('❌ Error in stream-based search processing', error);
            throw error;
        }
    }

    /**
     * Enable or disable stream processing
     */
    setStreamProcessing(enabled) {
        this.streamConfig.enableStreaming = enabled;
        Logger.info(`Stream processing ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Update stream configuration
     */
    updateStreamConfig(config) {
        this.streamConfig = { ...this.streamConfig, ...config };
        Logger.info('Stream configuration updated', this.streamConfig);
    }

    /**
     * Format memory usage for logging
     */
    formatMemoryUsage(memUsage) {
        return {
            rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
            external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
        };
    }

    /**
     * Get stream processing statistics
     */
    getStreamStats() {
        return {
            streamConfig: this.streamConfig,
            memoryUsage: process.memoryUsage(),
            activeStreams: {
                searchStream: this.createSearchStream.name,
                transformStream: this.createSearchTransform.name,
                resultStream: this.createResultStream.name
            }
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
