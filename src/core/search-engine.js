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

            // Detect and interact with target domain links
            await this.handleTargetDomainInteraction(page, results, platformConfig, keyword);

            // Simulate organic browsing behavior
            await this.simulateOrganicBehavior(page, results, platformConfig);

            return {
                keyword,
                platform: platformConfig.name,
                url: searchUrl,
                results: results.length,
                timestamp: new Date().toISOString(),
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
     * Batch search operations
     */
    async batchSearch(keywords, platforms = ['google'], options = {}) {
        const results = [];
        const batchSize = options.batchSize || PERFORMANCE_CONFIG.maxConcurrentSearches || 3;
        
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
        
        console.log(`🚀 Starting batch search: ${keywords.length} keywords across ${enabledPlatforms.length} enabled platforms`);
        
        for (let i = 0; i < keywords.length; i += batchSize) {
            const batch = keywords.slice(i, i + batchSize);
            const batchPromises = [];
            
            for (const keyword of batch) {
                for (const platform of enabledPlatforms) {
                    batchPromises.push(
                        this.performSearch(keyword, platform, options)
                            .then(result => ({ success: true, result }))
                            .catch(error => ({ success: false, error: error.message, keyword, platform }))
                    );
                }
            }
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            
            // Delay between batches
            if (i + batchSize < keywords.length) {
                await this.organicDelay(5000, 10000);
            }
        }
        
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        console.log(`✅ Batch search completed: ${successful} successful, ${failed} failed`);
        
        return results;
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
}

module.exports = { SearchEngine };