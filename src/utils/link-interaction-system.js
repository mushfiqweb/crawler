/**
 * Link Interaction System
 * Handles automated clicking with proper headers and analytics compliance
 */

const { HumanBehaviorSimulator } = require('./human-behavior-simulator');
const { DomainDetector } = require('./domain-detector');
const KMSMarketplaceCrawler = require('../core/kms-marketplace-crawler');
const { defaultLogger: Logger } = require('./logger');

class LinkInteractionSystem {
    constructor(options = {}) {
        this.config = {
            // Target domain configuration
            targetDomain: options.targetDomain || 'kmsmarketplace.com',
            
            // Browser configuration
            userAgents: options.userAgents || this.getDefaultUserAgents(),
            viewportSizes: options.viewportSizes || this.getDefaultViewports(),
            
            // Traffic legitimacy
            maintainReferrer: options.maintainReferrer !== false,
            simulateRealUser: options.simulateRealUser !== false,
            respectRobotsTxt: options.respectRobotsTxt !== false,
            
            // Interaction limits
            maxClicksPerSession: options.maxClicksPerSession || 5,
            minTimeBetweenClicks: options.minTimeBetweenClicks || 30000, // 30 seconds
            maxTimeBetweenClicks: options.maxTimeBetweenClicks || 300000, // 5 minutes
            
            // Page interaction
            minPageStayTime: options.minPageStayTime || 10000, // 10 seconds
            maxPageStayTime: options.maxPageStayTime || 60000, // 1 minute
            enablePageInteraction: options.enablePageInteraction !== false,
            
            // Analytics compliance
            enableJavaScript: options.enableJavaScript !== false,
            loadImages: options.loadImages !== false,
            enableCookies: options.enableCookies !== false,
            
            // Error handling
            maxRetries: options.maxRetries || 3,
            retryDelay: options.retryDelay || 5000,
            timeoutDuration: options.timeoutDuration || 30000
        };

        this.behaviorSimulator = new HumanBehaviorSimulator(options.behaviorOptions);
        this.domainDetector = new DomainDetector({ targetDomain: this.config.targetDomain });
        
        // Initialize KMS Marketplace crawler if targeting that domain
        if (this.config.targetDomain === 'kmsmarketplace.com') {
            this.kmsMarketplaceCrawler = new KMSMarketplaceCrawler();
        }
        
        this.sessionState = {
            clicksPerformed: 0,
            lastClickTime: 0,
            visitedUrls: new Set(),
            currentUserAgent: null,
            currentViewport: null,
            sessionStartTime: Date.now()
        };

        this.analytics = {
            totalClicks: 0,
            successfulClicks: 0,
            failedClicks: 0,
            averageStayTime: 0,
            uniqueUrlsVisited: 0
        };
    }

    /**
     * Process search results and interact with target domain links
     * @param {Object} page - Puppeteer page object
     * @param {Array} searchResults - Array of search result objects
     * @param {Object} searchContext - Context about the search (keyword, platform, etc.)
     * @returns {Promise<Object>} Interaction results
     */
    async processSearchResults(page, searchResults, searchContext = {}) {
        try {
            Logger.info(`🔍 Processing ${searchResults.length} search results for ${this.config.targetDomain}`);
            
            // Detect target domain links
            const targetLinks = this.domainDetector.analyzeSearchResults(searchResults);
            
            // If KMS Marketplace links found, use advanced behavioral crawler
            if (targetLinks.length > 0 && this.config.targetDomain === 'kmsmarketplace.com') {
                return await this.processKMSMarketplaceLinks(page, targetLinks, searchContext);
            }
            
            if (targetLinks.length === 0) {
                Logger.info(`ℹ️ No ${this.config.targetDomain} links found in search results`);
                return { success: true, interactions: 0, message: 'No target links found' };
            }

            Logger.info(`🎯 Found ${targetLinks.length} target domain links`);
            
            // Setup browser for legitimate traffic
            await this.setupBrowserForLegitimateTraffic(page, searchContext);
            
            // Simulate initial page scanning
            await this.behaviorSimulator.simulatePageScanning(page, 
                searchResults.slice(0, 5).map(result => `a[href*="${result.url}"]`)
            );
            
            // Process each target link
            const interactionResults = [];
            for (const linkData of targetLinks.slice(0, this.config.maxClicksPerSession)) {
                if (this.shouldSkipInteraction()) {
                    Logger.info(`⏭️ Skipping interaction due to session limits`);
                    break;
                }
                
                const result = await this.interactWithLink(page, linkData, searchContext);
                interactionResults.push(result);
                
                // Wait between interactions
                if (interactionResults.length < targetLinks.length) {
                    await this.waitBetweenInteractions();
                }
            }
            
            // Update analytics
            this.updateAnalytics(interactionResults);
            
            return {
                success: true,
                interactions: interactionResults.length,
                results: interactionResults,
                analytics: this.getAnalyticsSummary()
            };
            
        } catch (error) {
            Logger.error(`❌ Error processing search results: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Setup browser to generate legitimate traffic
     * @param {Object} page - Puppeteer page object
     * @param {Object} searchContext - Search context information
     */
    async setupBrowserForLegitimateTraffic(page, searchContext) {
        try {
            // Set realistic user agent
            const userAgent = this.selectUserAgent();
            await page.setUserAgent(userAgent);
            this.sessionState.currentUserAgent = userAgent;
            
            // Set realistic viewport
            const viewport = this.selectViewport();
            await page.setViewport(viewport);
            this.sessionState.currentViewport = viewport;
            
            // Configure page settings for analytics compliance
            await page.setJavaScriptEnabled(this.config.enableJavaScript);
            
            // Set extra HTTP headers for legitimacy
            const headers = this.generateLegitimateHeaders(searchContext);
            await page.setExtraHTTPHeaders(headers);
            
            // Enable request interception for referrer management
            if (this.config.maintainReferrer) {
                await page.setRequestInterception(true);
                page.on('request', (request) => {
                    const headers = request.headers();
                    
                    // Maintain proper referrer chain
                    if (searchContext.searchUrl && !headers.referer) {
                        headers.referer = searchContext.searchUrl;
                    }
                    
                    request.continue({ headers });
                });
            }
            
            Logger.debug(`🔧 Browser configured for legitimate traffic`);
            Logger.debug(`   User Agent: ${userAgent.substring(0, 50)}...`);
            Logger.debug(`   Viewport: ${viewport.width}x${viewport.height}`);
            
        } catch (error) {
            Logger.warn(`⚠️ Browser setup warning: ${error.message}`);
        }
    }

    /**
     * Interact with a specific target link
     * @param {Object} page - Puppeteer page object
     * @param {Object} linkData - Link data from domain detector
     * @param {Object} searchContext - Search context information
     * @returns {Promise<Object>} Interaction result
     */
    async interactWithLink(page, linkData, searchContext) {
        const startTime = Date.now();
        let result = {
            url: linkData.url,
            success: false,
            stayTime: 0,
            error: null,
            timestamp: new Date().toISOString()
        };

        try {
            Logger.info(`🖱️ Interacting with: ${linkData.url}`);
            
            // Check if URL was already visited
            if (this.sessionState.visitedUrls.has(linkData.url)) {
                Logger.info(`⏭️ URL already visited: ${linkData.url}`);
                result.success = true;
                result.skipped = true;
                return result;
            }
            
            // Find the link element on the page
            const linkSelector = await this.findLinkSelector(page, linkData);
            if (!linkSelector) {
                throw new Error('Link element not found on page');
            }
            
            // Simulate human-like interaction
            await this.behaviorSimulator.simulateClick(page, linkSelector);
            
            // Wait for navigation
            await Promise.race([
                page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Navigation timeout')), this.config.timeoutDuration)
                )
            ]);
            
            // Verify we're on the target domain
            const currentUrl = page.url();
            if (!currentUrl.includes(this.config.targetDomain)) {
                throw new Error(`Navigation failed - not on target domain: ${currentUrl}`);
            }
            
            Logger.info(`✅ Successfully navigated to: ${currentUrl}`);
            
            // Simulate realistic page interaction
            const stayTime = await this.simulatePageVisit(page, linkData);
            
            // Update session state
            this.sessionState.clicksPerformed++;
            this.sessionState.lastClickTime = Date.now();
            this.sessionState.visitedUrls.add(linkData.url);
            
            result.success = true;
            result.stayTime = stayTime;
            result.finalUrl = currentUrl;
            
            Logger.info(`🎉 Interaction completed successfully - Stay time: ${stayTime}ms`);
            
        } catch (error) {
            Logger.warn(`⚠️ Interaction failed: ${error.message}`);
            result.error = error.message;
            this.analytics.failedClicks++;
        }
        
        result.duration = Date.now() - startTime;
        return result;
    }

    /**
     * Find the CSS selector for a link on the page
     * @param {Object} page - Puppeteer page object
     * @param {Object} linkData - Link data object
     * @returns {Promise<string|null>} CSS selector or null
     */
    async findLinkSelector(page, linkData) {
        try {
            // Try multiple strategies to find the link
            const strategies = [
                `a[href="${linkData.url}"]`,
                `a[href*="${linkData.url}"]`,
                `a[href*="${this.config.targetDomain}"]`,
                `a:contains("${linkData.title}")` // If title is available
            ];
            
            for (const selector of strategies) {
                try {
                    const element = await page.$(selector);
                    if (element) {
                        // Verify element is visible and clickable
                        const isVisible = await page.evaluate((el) => {
                            const rect = el.getBoundingClientRect();
                            return rect.width > 0 && rect.height > 0 && 
                                   window.getComputedStyle(el).visibility !== 'hidden';
                        }, element);
                        
                        if (isVisible) {
                            Logger.debug(`🎯 Found link with selector: ${selector}`);
                            return selector;
                        }
                    }
                } catch (selectorError) {
                    // Continue to next strategy
                    continue;
                }
            }
            
            return null;
        } catch (error) {
            Logger.warn(`⚠️ Error finding link selector: ${error.message}`);
            return null;
        }
    }

    /**
     * Simulate realistic page visit behavior
     * @param {Object} page - Puppeteer page object
     * @param {Object} linkData - Link data object
     * @returns {Promise<number>} Stay time in milliseconds
     */
    async simulatePageVisit(page, linkData) {
        const startTime = Date.now();
        
        try {
            // Wait for page to fully load
            await page.waitForLoadState?.('networkidle') || 
                  await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Simulate reading/browsing behavior
            if (this.config.enablePageInteraction) {
                // Scroll through the page
                await this.behaviorSimulator.simulateScrolling(page, {
                    direction: 'down',
                    distance: Math.random() * 800 + 200
                });
                
                // Look for interesting elements to interact with
                const interactiveElements = await page.$$eval('a, button, input', elements => 
                    elements.slice(0, 3).map(el => el.tagName.toLowerCase())
                );
                
                // Simulate some micro-interactions
                for (let i = 0; i < Math.min(2, interactiveElements.length); i++) {
                    try {
                        await this.behaviorSimulator.simulateHover(page, 
                            `${interactiveElements[i]}:nth-of-type(${i + 1})`);
                    } catch (hoverError) {
                        // Skip if element interaction fails
                        continue;
                    }
                }
            }
            
            // Stay for a realistic duration
            const baseStayTime = this.randomBetween(
                this.config.minPageStayTime,
                this.config.maxPageStayTime
            );
            
            // Adjust based on content (if we can detect it)
            let adjustedStayTime = baseStayTime;
            try {
                const contentLength = await page.evaluate(() => document.body.textContent.length);
                const contentFactor = Math.min(2, Math.max(0.5, contentLength / 5000));
                adjustedStayTime = baseStayTime * contentFactor;
            } catch (contentError) {
                // Use base stay time if content analysis fails
            }
            
            await this.behaviorSimulator.humanDelay(adjustedStayTime, 0.3);
            
        } catch (error) {
            Logger.warn(`⚠️ Page visit simulation error: ${error.message}`);
        }
        
        return Date.now() - startTime;
    }

    /**
     * Check if interaction should be skipped based on session limits
     * @returns {boolean} True if interaction should be skipped
     */
    shouldSkipInteraction() {
        // Check click limit
        if (this.sessionState.clicksPerformed >= this.config.maxClicksPerSession) {
            return true;
        }
        
        // Check time since last click
        const timeSinceLastClick = Date.now() - this.sessionState.lastClickTime;
        if (timeSinceLastClick < this.config.minTimeBetweenClicks) {
            return true;
        }
        
        return false;
    }

    /**
     * Wait between interactions with human-like timing
     */
    async waitBetweenInteractions() {
        const waitTime = this.randomBetween(
            this.config.minTimeBetweenClicks,
            this.config.maxTimeBetweenClicks
        );
        
        Logger.debug(`⏳ Waiting ${Math.round(waitTime / 1000)}s before next interaction`);
        await this.behaviorSimulator.humanDelay(waitTime, 0.2);
    }

    /**
     * Generate legitimate HTTP headers
     * @param {Object} searchContext - Search context information
     * @returns {Object} HTTP headers object
     */
    generateLegitimateHeaders(searchContext) {
        const headers = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'cross-site',
            'Cache-Control': 'max-age=0'
        };
        
        // Add referrer if available
        if (searchContext.searchUrl && this.config.maintainReferrer) {
            headers.Referer = searchContext.searchUrl;
        }
        
        return headers;
    }

    /**
     * Select a realistic user agent
     * @returns {string} User agent string
     */
    selectUserAgent() {
        const userAgents = this.config.userAgents;
        return userAgents[Math.floor(Math.random() * userAgents.length)];
    }

    /**
     * Select a realistic viewport size
     * @returns {Object} Viewport configuration
     */
    selectViewport() {
        const viewports = this.config.viewportSizes;
        return viewports[Math.floor(Math.random() * viewports.length)];
    }

    /**
     * Get default user agents
     * @returns {Array} Array of user agent strings
     */
    getDefaultUserAgents() {
        return [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ];
    }

    /**
     * Get default viewport sizes
     * @returns {Array} Array of viewport configurations
     */
    getDefaultViewports() {
        return [
            { width: 1920, height: 1080 },
            { width: 1366, height: 768 },
            { width: 1536, height: 864 },
            { width: 1440, height: 900 },
            { width: 1280, height: 720 }
        ];
    }

    /**
     * Update analytics with interaction results
     * @param {Array} results - Array of interaction results
     */
    updateAnalytics(results) {
        this.analytics.totalClicks += results.length;
        this.analytics.successfulClicks += results.filter(r => r.success).length;
        this.analytics.failedClicks += results.filter(r => !r.success).length;
        
        const stayTimes = results.filter(r => r.stayTime > 0).map(r => r.stayTime);
        if (stayTimes.length > 0) {
            this.analytics.averageStayTime = stayTimes.reduce((a, b) => a + b, 0) / stayTimes.length;
        }
        
        this.analytics.uniqueUrlsVisited = this.sessionState.visitedUrls.size;
    }

    /**
     * Get analytics summary
     * @returns {Object} Analytics summary
     */
    getAnalyticsSummary() {
        return {
            ...this.analytics,
            sessionDuration: Date.now() - this.sessionState.sessionStartTime,
            successRate: this.analytics.totalClicks > 0 ? 
                (this.analytics.successfulClicks / this.analytics.totalClicks * 100).toFixed(2) + '%' : '0%'
        };
    }

    /**
     * Generate random number between min and max
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random number
     */
    randomBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Process KMS Marketplace links with advanced behavioral simulation
     * @param {Object} page - Puppeteer page object
     * @param {Array} targetLinks - Array of KMS Marketplace links
     * @param {Object} searchContext - Search context information
     * @returns {Promise<Object>} Interaction results
     */
    async processKMSMarketplaceLinks(page, targetLinks, searchContext) {
        try {
            Logger.info(`🎯 Processing ${targetLinks.length} KMS Marketplace links with advanced behavioral simulation`);
            
            const results = {
                totalLinks: targetLinks.length,
                successfulInteractions: 0,
                failedInteractions: 0,
                totalTimeSpent: 0,
                behavioralData: [],
                searchContext
            };

            for (const linkData of targetLinks) {
                try {
                    Logger.info(`🔗 Initiating advanced behavioral crawling for: ${linkData.url}`);
                    
                    // Use KMS Marketplace crawler for sophisticated behavioral simulation
                    const crawlResult = await this.kmsMarketplaceCrawler.crawlPage(linkData.url, {
                        sessionContext: searchContext,
                        referrer: page.url(),
                        userAgent: this.selectUserAgent(),
                        viewport: this.selectViewport()
                    });

                    if (crawlResult.success) {
                        results.successfulInteractions++;
                        results.totalTimeSpent += crawlResult.timeSpent;
                        results.behavioralData.push(crawlResult.behavioralData);
                        
                        // Update analytics
                        this.analytics.totalInteractions++;
                        this.analytics.successfulInteractions++;
                        this.analytics.totalTimeSpent += crawlResult.timeSpent;
                        
                        Logger.info(`✅ Advanced behavioral crawling completed for ${linkData.url} (${crawlResult.timeSpent}ms)`);
                    } else {
                        results.failedInteractions++;
                        this.analytics.failedInteractions++;
                        Logger.warn(`❌ Advanced behavioral crawling failed for ${linkData.url}: ${crawlResult.error}`);
                    }

                    // Wait between interactions to maintain natural pacing
                    if (targetLinks.indexOf(linkData) < targetLinks.length - 1) {
                        await this.waitBetweenInteractions();
                    }

                } catch (error) {
                    results.failedInteractions++;
                    this.analytics.failedInteractions++;
                    Logger.error(`💥 Error in advanced behavioral crawling for ${linkData.url}: ${error.message}`);
                }
            }

            Logger.info(`📊 KMS Marketplace behavioral crawling completed: ${results.successfulInteractions}/${results.totalLinks} successful`);
            return results;

        } catch (error) {
            Logger.error(`💥 Error processing KMS Marketplace links: ${error.message}`);
            throw error;
        }
    }

    /**
     * Reset session state
     */
    resetSession() {
        this.sessionState = {
            clicksPerformed: 0,
            lastClickTime: 0,
            visitedUrls: new Set(),
            currentUserAgent: null,
            currentViewport: null,
            sessionStartTime: Date.now()
        };
        
        this.behaviorSimulator.resetSession();
        Logger.info('🔄 Link interaction session reset');
    }

    /**
     * Get current session status
     * @returns {Object} Session status
     */
    getSessionStatus() {
        return {
            ...this.sessionState,
            visitedUrlsCount: this.sessionState.visitedUrls.size,
            canPerformMoreClicks: this.sessionState.clicksPerformed < this.config.maxClicksPerSession,
            timeSinceLastClick: Date.now() - this.sessionState.lastClickTime
        };
    }
}

module.exports = { LinkInteractionSystem };