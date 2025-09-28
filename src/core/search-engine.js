/**
 * Search Engine Module
 * Handles search operations across different platforms with optimization
 */

// Import configurations
const { SEARCH_PLATFORMS, PlatformManager } = require('../config/search-platforms');
const { ORGANIC_BEHAVIOR } = require('../config/organic-behavior');
const { PERFORMANCE_CONFIG } = require('../config/performance');
const { createPlatformLog, getPlatformEmoji } = require('../utils/brand-colors');

// Import link interaction components
const { DomainDetector } = require('../utils/domain-detector');
const { HumanBehaviorSimulator } = require('../utils/human-behavior-simulator');
const { LinkInteractionSystem } = require('../utils/link-interaction-system');
const { RobustErrorHandler } = require('../utils/error-handler');
const { ConcurrentOptimizer } = require('../utils/concurrent-optimizer');
const ImmediateProcessor = require('../utils/immediate-processor');

// Import Node.js streams for memory-efficient processing
const { Readable, Transform, Writable } = require('stream');
const { pipeline } = require('stream/promises');

class SearchEngine {
    constructor(browserPool, statsTracker) {
        this.browserPool = browserPool;
        this.statsTracker = statsTracker;
        this.searchQueue = [];
        this.isProcessing = false;
        this.stats = {
            totalSearches: 0,
            successfulSearches: 0,
            failedSearches: 0,
            averageSearchTime: 0
        };
        
        // Initialize link interaction components
        this.domainDetector = new DomainDetector();
        this.humanBehavior = new HumanBehaviorSimulator();
        this.linkInteraction = new LinkInteractionSystem();
        this.errorHandler = new RobustErrorHandler();

        // Stream processing configuration
        this.streamConfig = {
            batchSize: PERFORMANCE_CONFIG.maxConcurrentSearches || 3,
            maxConcurrency: 5,
            resultBufferSize: 100,
            memoryThreshold: 100 * 1024 * 1024 // 100MB
        };
        
        // Concurrent optimizer for memory-efficient batch operations
        this.concurrentOptimizer = new ConcurrentOptimizer({
            maxConcurrency: PERFORMANCE_CONFIG.maxConcurrentSearches || 3,
            memoryThreshold: 250 * 1024 * 1024, // 250MB
            batchSize: 5,
            enableMemoryMonitoring: true,
            enableGarbageCollection: true,
            promiseTimeout: 120000 // 2 minutes for search operations
        });
        
        // Immediate processor for data processing and disposal
        this.immediateProcessor = new ImmediateProcessor({
            maxBufferSize: 50,
            processingTimeout: 10000,
            autoFlush: true,
            flushInterval: 2000,
            enableMetrics: true,
            maxRetries: 2,
            retryDelay: 500
        });
        
        this.setupImmediateProcessors();
    }

    /**
     * Initialize search engine
     */
    async initialize() {
        console.log('🔍 Search engine initialized');
        return true;
    }

    /**
     * Perform a search operation
     */
    async performSearch(keyword, platform = 'google', options = {}) {
        // Check if platform is enabled before proceeding
        if (!PlatformManager.isPlatformEnabled(platform)) {
            const error = new Error(`Platform "${platform}" is currently disabled`);
            error.code = 'PLATFORM_DISABLED';
            console.log(createPlatformLog(platform, `Search skipped for "${keyword}" - platform is disabled`, 'warning'));
            throw error;
        }

        const startTime = Date.now();
        let browser = null;
        let success = false;

        let result = null;
        let page = null;
        
        try {
            console.log(createPlatformLog(platform, `Starting search for "${keyword}" on ${platform}`, 'search'));
            
            // Get browser from pool - use Bangladesh proxy for Google searches
            if (platform.toLowerCase() === 'google') {
                browser = await this.browserPool.getBangladeshBrowserForGoogle();
                console.log(`🇧🇩 Using Bangladesh proxy browser for Google search: "${keyword}"`);
            } else {
                browser = await this.browserPool.getBrowser();
            }
            
            // Get platform configuration
            const platformConfig = SEARCH_PLATFORMS.find(p => p.name.toLowerCase() === platform.toLowerCase());
            if (!platformConfig) {
                throw new Error(`Platform "${platform}" not supported`);
            }

            // Create new page
            page = await browser.newPage();
            
            // Configure page
            await this.configurePage(page, options);
            
            // Perform the search
            result = await this.executeSearch(page, keyword, platformConfig, options);
            
            success = true;
            this.stats.successfulSearches++;
            
            console.log(createPlatformLog(platform, `Search completed for "${keyword}" on ${platform}`, 'success'));
            
        } catch (error) {
            console.error(createPlatformLog(platform, `Search failed for "${keyword}" on ${platform}: ${error.message}`, 'error'));
            this.stats.failedSearches++;
            throw error;
            
        } finally {
            // Close page (wrapped in try-catch to prevent cleanup errors)
            if (page) {
                try {
                    await page.close();
                } catch (error) {
                    console.warn('⚠️ Error closing page:', error.message);
                }
            }
            
            // Calculate search time
            const searchTime = (Date.now() - startTime) / 1000;
            this.stats.totalSearches++;
            this.stats.averageSearchTime = 
                ((this.stats.averageSearchTime * (this.stats.totalSearches - 1)) + searchTime) / this.stats.totalSearches;
            
            // Record in stats tracker (wrapped in try-catch to prevent cleanup errors)
            try {
                if (this.statsTracker) {
                    await this.statsTracker.recordKeywordSearch(keyword, platform, success, searchTime);
                }
            } catch (error) {
                console.warn('⚠️ Error recording stats:', error.message);
            }
            
            // Return browser to pool (wrapped in try-catch to prevent cleanup errors)
            try {
                if (browser) {
                    await this.browserPool.releaseBrowser(browser);
                }
            } catch (error) {
                console.warn('⚠️ Error releasing browser:', error.message);
            }
        }
        
        return result;
    }

    /**
     * Configure page settings
     */
    async configurePage(page, options = {}) {
        try {
            // Set viewport
            await page.setViewport({
                width: options.width || 1366,
                height: options.height || 768,
                deviceScaleFactor: 1
            });

            // Set user agent
            if (options.userAgent) {
                await page.setUserAgent(options.userAgent);
            }

            // Block unnecessary resources for performance
            if (PERFORMANCE_CONFIG.blockResources) {
                await page.setRequestInterception(true);
                page.on('request', (request) => {
                    const resourceType = request.resourceType();
                    if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
                        request.abort();
                    } else {
                        request.continue();
                    }
                });
            }

            // Set timeouts
            page.setDefaultTimeout(PERFORMANCE_CONFIG.pageTimeout || 30000);
            page.setDefaultNavigationTimeout(PERFORMANCE_CONFIG.navigationTimeout || 30000);

        } catch (error) {
            console.warn('⚠️ Error configuring page:', error.message);
        }
    }

    /**
     * Execute search on specific platform
     */
    async executeSearch(page, keyword, platformConfig, options = {}) {
        const searchUrl = this.buildSearchUrl(keyword, platformConfig, options);
        
        try {
            // Navigate to search URL
            console.log(`🌐 Navigating to: ${searchUrl}`);
            await page.goto(searchUrl, { 
                waitUntil: 'networkidle2',
                timeout: PERFORMANCE_CONFIG.navigationTimeout || 30000
            });

            // Wait for organic behavior delay
            await this.organicDelay();

            // Handle platform-specific interactions
            await this.handlePlatformInteractions(page, platformConfig, keyword);

            // Extract search results
            const results = await this.extractSearchResults(page, platformConfig);

            // Process results immediately for memory efficiency
            const searchMetadata = {
                keyword,
                platform: platformConfig.name,
                url: searchUrl,
                resultsCount: results.length,
                timestamp: new Date().toISOString(),
                success: true,
                searchTime: Date.now() - (options.startTime || Date.now())
            };
            
            // Immediate processing and disposal
            await this.processSearchResultsImmediate(results, searchMetadata);

            // Detect and interact with target domain links
            await this.handleTargetDomainInteraction(page, results, platformConfig, keyword);

            // Simulate organic browsing behavior
            await this.simulateOrganicBehavior(page, results, platformConfig);

            // Return minimal metadata (results already processed and disposed)
            return {
                keyword,
                platform: platformConfig.name,
                url: searchUrl,
                results: results.length,
                timestamp: searchMetadata.timestamp,
                success: true
            };

        } catch (error) {
            console.error(`❌ Error executing search on ${platformConfig.name}:`, error.message);
            throw error;
        }
    }

    /**
     * Build search URL for platform
     */
    buildSearchUrl(keyword, platformConfig, options = {}) {
        // Build URL from baseURL and queryParam
        const baseUrl = platformConfig.baseURL || platformConfig.searchUrl;
        const queryParam = platformConfig.queryParam || 'q';
        
        if (!baseUrl) {
            throw new Error(`No baseURL or searchUrl found for platform ${platformConfig.name}`);
        }
        
        // Start with base URL
        let url = baseUrl;
        
        // Add query parameter
        const separator = url.includes('?') ? '&' : '?';
        url += `${separator}${queryParam}=${encodeURIComponent(keyword)}`;
        
        // Add additional platform parameters
        if (platformConfig.additionalParams) {
            for (const [key, value] of Object.entries(platformConfig.additionalParams)) {
                url += `&${key}=${encodeURIComponent(value)}`;
            }
        }
        
        // Add additional parameters from options
        if (options.location) {
            url += `&location=${encodeURIComponent(options.location)}`;
        }
        
        if (options.language) {
            url += `&hl=${options.language}`;
        }
        
        return url;
    }

    /**
     * Handle platform-specific interactions
     */
    async handlePlatformInteractions(page, platformConfig, keyword) {
        try {
            // Handle cookie consent if present
            if (platformConfig.cookieSelector) {
                try {
                    await page.waitForSelector(platformConfig.cookieSelector, { timeout: 5000 });
                    await page.click(platformConfig.cookieSelector);
                    await this.organicDelay(1000, 2000);
                } catch (error) {
                    // Cookie consent not found or already handled
                }
            }

            // Handle search input if needed (for platforms that require manual search)
            if (platformConfig.searchInputSelector) {
                try {
                    await page.waitForSelector(platformConfig.searchInputSelector, { timeout: 10000 });
                    await page.type(platformConfig.searchInputSelector, keyword, { delay: 100 });
                    
                    if (platformConfig.searchButtonSelector) {
                        await page.click(platformConfig.searchButtonSelector);
                    } else {
                        await page.keyboard.press('Enter');
                    }
                    
                    await page.waitForNavigation({ waitUntil: 'networkidle2' });
                } catch (error) {
                    console.warn('⚠️ Manual search interaction failed:', error.message);
                }
            }

            // Wait for results to load
            if (platformConfig.resultsSelector) {
                await page.waitForSelector(platformConfig.resultsSelector, { 
                    timeout: PERFORMANCE_CONFIG.searchTimeout || 15000 
                });
            }

        } catch (error) {
            console.warn('⚠️ Platform interaction warning:', error.message);
        }
    }

    /**
     * Extract search results from page
     */
    async extractSearchResults(page, platformConfig) {
        try {
            const results = await page.evaluate((selector) => {
                const elements = document.querySelectorAll(selector);
                return Array.from(elements).slice(0, 10).map((element, index) => {
                    const titleElement = element.querySelector('h3, .title, [data-testid="result-title"]');
                    const linkElement = element.querySelector('a');
                    const snippetElement = element.querySelector('.snippet, .description, [data-testid="result-snippet"]');
                    
                    return {
                        position: index + 1,
                        title: titleElement ? titleElement.textContent.trim() : '',
                        url: linkElement ? linkElement.href : '',
                        snippet: snippetElement ? snippetElement.textContent.trim() : '',
                        visible: element.offsetParent !== null
                    };
                });
            }, platformConfig.resultSelector);

            console.log(`📊 Extracted ${results.length} search results`);
            return results;

        } catch (error) {
            console.warn('⚠️ Error extracting search results:', error.message);
            return [];
        }
    }

    /**
     * Simulate organic browsing behavior
     */
    async simulateOrganicBehavior(page, results, platformConfig) {
        if (!ORGANIC_BEHAVIOR.enableOrganicPatterns || results.length === 0) {
            return;
        }

        try {
            // Random scrolling
            const scrollCount = Math.floor(Math.random() * 3) + 1;
            for (let i = 0; i < scrollCount; i++) {
                const scrollAmount = Math.floor(Math.random() * 500) + 200;
                await page.evaluate((amount) => {
                    window.scrollBy(0, amount);
                }, scrollAmount);
                await this.organicDelay(500, 1500);
            }

            // Random mouse movements
            const mouseMovements = Math.floor(Math.random() * 3) + 1;
            for (let i = 0; i < mouseMovements; i++) {
                const x = Math.floor(Math.random() * 800) + 100;
                const y = Math.floor(Math.random() * 600) + 100;
                await page.mouse.move(x, y);
                await this.organicDelay(200, 800);
            }

            // Occasionally click on a result (simulate interest)
            if (Math.random() < 0.3 && results.length > 0 && platformConfig.resultSelector) {
                const randomResult = Math.floor(Math.random() * Math.min(results.length, 3));
                try {
                    const resultSelector = `${platformConfig.resultSelector}:nth-child(${randomResult + 1}) a`;
                    await page.click(resultSelector);
                    await this.organicDelay(2000, 5000);
                    await page.goBack();
                    await this.organicDelay(1000, 3000);
                } catch (error) {
                    // Click failed, continue
                }
            }

        } catch (error) {
            console.warn('⚠️ Error in organic behavior simulation:', error.message);
        }
    }

    /**
     * Organic delay with randomization
     */
    async organicDelay(min = ORGANIC_BEHAVIOR.minDelay, max = ORGANIC_BEHAVIOR.maxDelay) {
        const delay = Math.floor(Math.random() * (max - min + 1)) + min;
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    /**
     * Handle target domain interaction - detect and interact with kmsmarketplace.com links
     */
    async handleTargetDomainInteraction(page, results, platformConfig, keyword) {
        try {
            console.log(`🎯 Analyzing search results for target domain interactions...`);
            
            // Analyze search results for target domain
            const domainAnalysis = this.domainDetector.analyzeSearchResults(results, 'kmsmarketplace.com');
            
            if (domainAnalysis.targetLinks.length === 0) {
                console.log(`ℹ️ No kmsmarketplace.com links found in search results for "${keyword}"`);
                return;
            }

            console.log(`🎯 Found ${domainAnalysis.targetLinks.length} kmsmarketplace.com link(s) in search results for "${keyword}"`);
            
            // Process each target link with human-like behavior
            for (const linkInfo of domainAnalysis.targetLinks) {
                try {
                    console.log(`🔗 Preparing to interact with: ${linkInfo.url}`);
                    
                    // Simulate human scanning behavior before interaction
                    await this.humanBehavior.simulatePageScanning(page);
                    
                    // Add natural delay before interaction
                    await this.humanBehavior.naturalDelay(2000, 5000);
                    
                    // Simulate mouse movement and hover before click
                    await this.humanBehavior.simulateMouseMovement(page, linkInfo.position || 1);
                    await this.humanBehavior.simulateHover(page, linkInfo.position || 1);
                    
                    // Perform the link interaction with error handling
                    const interactionResult = await this.errorHandler.withErrorHandling(
                        async () => {
                            return await this.linkInteraction.performLinkInteraction(
                                page, 
                                linkInfo, 
                                {
                                    keyword,
                                    platform: platformConfig.name,
                                    searchContext: {
                                        totalResults: results.length,
                                        targetPosition: linkInfo.position
                                    }
                                }
                            );
                        },
                        {
                            maxRetries: 2,
                            retryDelay: 3000,
                            context: `Link interaction for ${linkInfo.url}`
                        }
                    );

                    if (interactionResult.success) {
                        console.log(`✅ Successfully interacted with kmsmarketplace.com link at position ${linkInfo.position}`);
                        
                        // Record successful interaction in stats
                        if (this.statsTracker) {
                            await this.statsTracker.recordDomainInteraction(
                                'kmsmarketplace.com',
                                keyword,
                                platformConfig.name,
                                true,
                                interactionResult.metrics
                            );
                        }
                        
                        // Add delay between multiple link interactions
                        if (domainAnalysis.targetLinks.length > 1) {
                            await this.humanBehavior.naturalDelay(5000, 10000);
                        }
                        
                    } else {
                        console.warn(`⚠️ Failed to interact with kmsmarketplace.com link: ${interactionResult.error}`);
                        
                        // Record failed interaction in stats
                        if (this.statsTracker) {
                            await this.statsTracker.recordDomainInteraction(
                                'kmsmarketplace.com',
                                keyword,
                                platformConfig.name,
                                false,
                                { error: interactionResult.error }
                            );
                        }
                    }

                } catch (linkError) {
                    console.error(`❌ Error processing kmsmarketplace.com link at position ${linkInfo.position}:`, linkError.message);
                    
                    // Record error in stats
                    if (this.statsTracker) {
                        await this.statsTracker.recordDomainInteraction(
                            'kmsmarketplace.com',
                            keyword,
                            platformConfig.name,
                            false,
                            { error: linkError.message }
                        );
                    }
                }
            }

            // Final delay to simulate natural browsing pattern
            await this.humanBehavior.naturalDelay(3000, 7000);
            
        } catch (error) {
            console.error(`❌ Error in target domain interaction handling:`, error.message);
        }
    }

    /**
     * Batch search operations with memory optimization
     */
    async batchSearch(keywords, platforms = ['google'], options = {}) {
        // Filter out disabled platforms
        const enabledPlatforms = platforms.filter(platform => PlatformManager.isPlatformEnabled(platform));
        
        if (enabledPlatforms.length === 0) {
            console.log('⚠️ No enabled platforms found for batch search');
            return [];
        }
        
        if (enabledPlatforms.length < platforms.length) {
            const disabledPlatforms = platforms.filter(platform => !PlatformManager.isPlatformEnabled(platform));
            console.log(`⚠️ Skipping disabled platforms: ${disabledPlatforms.join(', ')}`);
        }
        
        console.log(`🚀 Starting optimized batch search: ${keywords.length} keywords across ${enabledPlatforms.length} enabled platforms`);
        
        // Create search operations for concurrent execution
        const operations = [];
        for (const keyword of keywords) {
            for (const platform of enabledPlatforms) {
                operations.push({
                    name: `search_${keyword}_${platform}`,
                    keyword,
                    platform,
                    execute: async () => {
                        try {
                            const result = await this.performSearch(keyword, platform, options);
                            return { success: true, result, keyword, platform };
                        } catch (error) {
                            return { success: false, error: error.message, keyword, platform };
                        }
                    }
                });
            }
        }
        
        try {
            // Execute with concurrent optimizer
            const result = await this.concurrentOptimizer.executeConcurrent(operations, {
                maxConcurrency: options.maxConcurrency || PERFORMANCE_CONFIG.maxConcurrentSearches || 3,
                batchSize: options.batchSize || 5,
                promiseTimeout: options.timeout || 120000
            });
            
            const allResults = [...result.results.map(r => r.result), ...result.errors.map(e => e.error)];
            const successful = result.results.length;
            const failed = result.errors.length;
            
            console.log(`✅ Optimized batch search completed: ${successful} successful, ${failed} failed`);
            console.log(`📊 Concurrent stats: ${JSON.stringify(result.stats, null, 2)}`);
            
            return allResults;
            
        } catch (error) {
            console.error('❌ Optimized batch search failed:', error);
            throw error;
        }
    }

    /**
     * Get search engine statistics
     */
    getStats() {
        return {
            ...this.stats,
            successRate: this.stats.totalSearches > 0 
                ? ((this.stats.successfulSearches / this.stats.totalSearches) * 100).toFixed(2) + '%'
                : '0%'
        };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            totalSearches: 0,
            successfulSearches: 0,
            failedSearches: 0,
            averageSearchTime: 0
        };
    }

    /**
     * Create a readable stream for keyword processing
     */
    createKeywordStream(keywords, platforms = ['google']) {
        let index = 0;
        const enabledPlatforms = platforms.filter(platform => PlatformManager.isPlatformEnabled(platform));
        
        return new Readable({
            objectMode: true,
            read() {
                if (index >= keywords.length) {
                    this.push(null); // End of stream
                    return;
                }
                
                const keyword = keywords[index++];
                for (const platform of enabledPlatforms) {
                    this.push({ keyword, platform, index: index - 1 });
                }
            }
        });
    }

    /**
     * Create a transform stream for search processing
     */
    createSearchTransform(options = {}) {
        let activeSearches = 0;
        const maxConcurrency = this.streamConfig.maxConcurrency;
        
        return new Transform({
            objectMode: true,
            async transform(chunk, encoding, callback) {
                try {
                    // Wait if we've reached max concurrency
                    while (activeSearches >= maxConcurrency) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                    
                    activeSearches++;
                    
                    const result = await this.performSearch(chunk.keyword, chunk.platform, options)
                        .then(result => ({ 
                            success: true, 
                            result, 
                            keyword: chunk.keyword, 
                            platform: chunk.platform,
                            index: chunk.index
                        }))
                        .catch(error => ({ 
                            success: false, 
                            error: error.message, 
                            keyword: chunk.keyword, 
                            platform: chunk.platform,
                            index: chunk.index
                        }));
                    
                    activeSearches--;
                    
                    // Memory optimization: immediately process and dispose
                    this.push(result);
                    
                    // Trigger garbage collection if memory usage is high
                    if (process.memoryUsage().heapUsed > this.streamConfig.memoryThreshold) {
                        if (global.gc) {
                            global.gc();
                        }
                    }
                    
                    callback();
                } catch (error) {
                    activeSearches--;
                    callback(error);
                }
            }
        });
    }

    /**
     * Create a writable stream for result processing
     */
    createResultStream(onResult, onComplete) {
        const results = [];
        let processedCount = 0;
        
        return new Writable({
            objectMode: true,
            write(chunk, encoding, callback) {
                try {
                    processedCount++;
                    
                    // Process result immediately
                    if (onResult) {
                        onResult(chunk, processedCount);
                    }
                    
                    // Keep only essential data in memory
                    if (chunk.success) {
                        results.push({
                            keyword: chunk.keyword,
                            platform: chunk.platform,
                            success: true,
                            timestamp: Date.now()
                        });
                    } else {
                        results.push({
                            keyword: chunk.keyword,
                            platform: chunk.platform,
                            success: false,
                            error: chunk.error,
                            timestamp: Date.now()
                        });
                    }
                    
                    // Limit result buffer size
                    if (results.length > this.streamConfig.resultBufferSize) {
                        results.splice(0, results.length - this.streamConfig.resultBufferSize);
                    }
                    
                    callback();
                } catch (error) {
                    callback(error);
                }
            },
            final(callback) {
                if (onComplete) {
                    onComplete(results, processedCount);
                }
                callback();
            }
        });
    }

    /**
     * Stream-based batch search for memory efficiency
     */
    async streamBatchSearch(keywords, platforms = ['google'], options = {}) {
        console.log(`🌊 Starting stream-based batch search: ${keywords.length} keywords`);
        
        const results = [];
        let processedCount = 0;
        let successCount = 0;
        let failureCount = 0;
        
        try {
            const keywordStream = this.createKeywordStream(keywords, platforms);
            const searchTransform = this.createSearchTransform(options);
            const resultStream = this.createResultStream(
                (result, count) => {
                    processedCount = count;
                    if (result.success) {
                        successCount++;
                    } else {
                        failureCount++;
                    }
                    
                    // Log progress periodically
                    if (count % 10 === 0) {
                        console.log(`🔄 Processed ${count} searches (${successCount} success, ${failureCount} failed)`);
                    }
                },
                (finalResults, totalCount) => {
                    results.push(...finalResults);
                    console.log(`✅ Stream processing completed: ${totalCount} total, ${successCount} successful, ${failureCount} failed`);
                }
            );
            
            // Use pipeline for automatic error handling and cleanup
            await pipeline(keywordStream, searchTransform, resultStream);
            
            return {
                results,
                stats: {
                    total: processedCount,
                    successful: successCount,
                    failed: failureCount,
                    successRate: processedCount > 0 ? ((successCount / processedCount) * 100).toFixed(2) + '%' : '0%'
                }
            };
            
        } catch (error) {
            console.error('❌ Stream batch search failed:', error.message);
            throw error;
        }
    }

    /**
     * Memory-efficient result processing stream
     */
    async processResultsStream(results, processor) {
        const resultStream = new Readable({
            objectMode: true,
            read() {
                const result = results.shift();
                if (result) {
                    this.push(result);
                } else {
                    this.push(null);
                }
            }
        });
        
        const processTransform = new Transform({
            objectMode: true,
            async transform(chunk, encoding, callback) {
                try {
                    const processed = await processor(chunk);
                    this.push(processed);
                    callback();
                } catch (error) {
                    callback(error);
                }
            }
        });
        
        const outputStream = new Writable({
            objectMode: true,
            write(chunk, encoding, callback) {
                // Immediate disposal after processing
                callback();
            }
        });
        
        await pipeline(resultStream, processTransform, outputStream);
    }
    
    /**
     * Setup immediate processors for different data types
     */
    setupImmediateProcessors() {
        // Search results processor
        this.immediateProcessor.registerProcessor('searchResults', async (results, options) => {
            if (!results || !Array.isArray(results)) return;
            
            // Process each result immediately
            for (const result of results) {
                // Update statistics
                if (this.statsTracker) {
                    this.statsTracker.recordSearchResult(result);
                }
                
                // Log important results
                if (result.isTargetDomain) {
                    console.log(`🎯 Target domain found: ${result.title} - ${result.url}`);
                }
            }
            
            return { processed: results.length, timestamp: Date.now() };
        });
        
        // Search metadata processor
        this.immediateProcessor.registerProcessor('searchMetadata', async (metadata, options) => {
            if (!metadata) return;
            
            // Update search statistics
            this.stats.totalSearches++;
            if (metadata.success) {
                this.stats.successfulSearches++;
            } else {
                this.stats.failedSearches++;
            }
            
            // Update average search time
            if (metadata.searchTime) {
                const totalTime = this.stats.averageSearchTime * (this.stats.totalSearches - 1);
                this.stats.averageSearchTime = (totalTime + metadata.searchTime) / this.stats.totalSearches;
            }
            
            return { updated: true };
        });
        
        // Page data processor
        this.immediateProcessor.registerProcessor('pageData', async (pageData, options) => {
            if (!pageData) return;
            
            // Extract and process only essential data
            const essential = {
                url: pageData.url,
                title: pageData.title,
                timestamp: Date.now()
            };
            
            // Clear large data immediately
            if (pageData.content) {
                pageData.content = null;
            }
            if (pageData.html) {
                pageData.html = null;
            }
            
            return essential;
        });
        
        // Default disposer for all data types
        this.immediateProcessor.registerDisposer('default', async (data) => {
            if (data && typeof data === 'object') {
                // Clear object properties
                Object.keys(data).forEach(key => {
                    if (typeof data[key] === 'object' && data[key] !== null) {
                        data[key] = null;
                    }
                });
            }
        });
        
        // Search results specific disposer
        this.immediateProcessor.registerDisposer('searchResults', async (results) => {
            if (Array.isArray(results)) {
                results.forEach(result => {
                    if (result && typeof result === 'object') {
                        // Clear large properties
                        result.description = null;
                        result.snippet = null;
                        result.metadata = null;
                    }
                });
                results.length = 0; // Clear array
            }
        });
    }
    
    /**
     * Process search results immediately
     */
    async processSearchResultsImmediate(results, metadata = {}) {
        try {
            // Process results immediately
            await this.immediateProcessor.process(results, 'searchResults', { immediate: true });
            
            // Process metadata immediately
            await this.immediateProcessor.process(metadata, 'searchMetadata', { immediate: true });
            
        } catch (error) {
            console.error('Error in immediate processing:', error.message);
        }
    }
    
    /**
     * Get immediate processor metrics
     */
    getImmediateProcessorStats() {
        return this.immediateProcessor.getMetrics();
    }
    
    /**
     * Shutdown immediate processor
     */
    async shutdownImmediateProcessor() {
        if (this.immediateProcessor) {
            await this.immediateProcessor.shutdown();
        }
    }
}

module.exports = { SearchEngine };