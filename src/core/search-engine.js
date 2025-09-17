/**
 * Search Engine Module
 * Handles search operations across different platforms with optimization
 */

const { SEARCH_PLATFORMS } = require('../config/search-platforms');
const { ORGANIC_BEHAVIOR } = require('../config/organic-behavior');
const { PERFORMANCE_CONFIG } = require('../config/performance');

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
        const startTime = Date.now();
        let browser = null;
        let success = false;

        try {
            console.log(`🔍 Starting search for "${keyword}" on ${platform}`);
            
            // Get browser from pool
            browser = await this.browserPool.getBrowser();
            
            // Get platform configuration
            const platformConfig = SEARCH_PLATFORMS.find(p => p.name.toLowerCase() === platform.toLowerCase());
            if (!platformConfig) {
                throw new Error(`Platform "${platform}" not supported`);
            }

            // Create new page
            const page = await browser.newPage();
            
            try {
                // Configure page
                await this.configurePage(page, options);
                
                // Perform the search
                const result = await this.executeSearch(page, keyword, platformConfig, options);
                
                success = true;
                this.stats.successfulSearches++;
                
                console.log(`✅ Search completed for "${keyword}" on ${platform}`);
                return result;
                
            } finally {
                // Close page
                try {
                    await page.close();
                } catch (error) {
                    console.warn('⚠️ Error closing page:', error.message);
                }
            }
            
        } catch (error) {
            console.error(`❌ Search failed for "${keyword}" on ${platform}:`, error.message);
            this.stats.failedSearches++;
            throw error;
            
        } finally {
            // Calculate search time
            const searchTime = (Date.now() - startTime) / 1000;
            this.stats.totalSearches++;
            this.stats.averageSearchTime = 
                ((this.stats.averageSearchTime * (this.stats.totalSearches - 1)) + searchTime) / this.stats.totalSearches;
            
            // Record in stats tracker
            if (this.statsTracker) {
                await this.statsTracker.recordKeywordSearch(keyword, platform, success, searchTime);
            }
            
            // Return browser to pool
            if (browser) {
                await this.browserPool.releaseBrowser(browser);
            }
        }
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

            // Simulate organic browsing behavior
            await this.simulateOrganicBehavior(page, results);

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
        let url = platformConfig.searchUrl;
        
        // Replace keyword placeholder
        url = url.replace('{keyword}', encodeURIComponent(keyword));
        
        // Add additional parameters
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
            }, platformConfig.resultsSelector);

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
    async simulateOrganicBehavior(page, results) {
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
            if (Math.random() < 0.3 && results.length > 0) {
                const randomResult = Math.floor(Math.random() * Math.min(results.length, 3));
                try {
                    const resultSelector = `${SEARCH_PLATFORMS[0].resultsSelector}:nth-child(${randomResult + 1}) a`;
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
     * Batch search operations
     */
    async batchSearch(keywords, platforms = ['google'], options = {}) {
        const results = [];
        const batchSize = options.batchSize || PERFORMANCE_CONFIG.maxConcurrentSearches || 3;
        
        console.log(`🚀 Starting batch search: ${keywords.length} keywords across ${platforms.length} platforms`);
        
        for (let i = 0; i < keywords.length; i += batchSize) {
            const batch = keywords.slice(i, i + batchSize);
            const batchPromises = [];
            
            for (const keyword of batch) {
                for (const platform of platforms) {
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