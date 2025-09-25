/**
 * KMS Marketplace Specialized Crawler
 * Advanced behavioral simulation specifically designed for kmsmarketplace.com
 */

const { AdvancedBehavioralEngine } = require('./advanced-behavioral-engine');
const { HumanBehaviorSimulator } = require('../utils/human-behavior-simulator');
const { defaultLogger: Logger } = require('../utils/logger');

class KMSMarketplaceCrawler {
    constructor(browserPool, statsTracker, options = {}) {
        this.browserPool = browserPool;
        this.statsTracker = statsTracker;
        
        this.config = {
            // Domain configuration
            targetDomain: 'kmsmarketplace.com',
            allowedSubdomains: ['www.kmsmarketplace.com', 'shop.kmsmarketplace.com'],
            
            // Navigation patterns
            navigationPatterns: options.navigationPatterns || [
                'homepage_browse',
                'category_exploration',
                'product_search',
                'product_detail_view',
                'comparison_shopping'
            ],
            
            // Page-specific behavior
            pageTypes: {
                homepage: {
                    dwellTime: { min: 45000, max: 75000 }, // 45-75 seconds
                    interactions: { min: 5, max: 12 },
                    scrollPattern: 'exploratory'
                },
                category: {
                    dwellTime: { min: 35000, max: 55000 }, // 35-55 seconds
                    interactions: { min: 4, max: 10 },
                    scrollPattern: 'scanning'
                },
                product: {
                    dwellTime: { min: 50000, max: 90000 }, // 50-90 seconds
                    interactions: { min: 6, max: 15 },
                    scrollPattern: 'reading'
                },
                search: {
                    dwellTime: { min: 30000, max: 50000 }, // 30-50 seconds
                    interactions: { min: 3, max: 8 },
                    scrollPattern: 'scanning'
                }
            },
            
            // Behavioral realism
            sessionDuration: options.sessionDuration || { min: 300000, max: 900000 }, // 5-15 minutes
            pagesPerSession: options.pagesPerSession || { min: 3, max: 8 },
            bounceRate: options.bounceRate || 0.15, // 15% chance of single page visit
            
            // Advanced features
            enableProductInteraction: options.enableProductInteraction !== false,
            enableCartSimulation: options.enableCartSimulation !== false,
            enableSearchSimulation: options.enableSearchSimulation !== false,
            respectRateLimit: options.respectRateLimit !== false
        };

        // Initialize behavioral components
        this.behavioralEngine = new AdvancedBehavioralEngine({
            targetDomain: this.config.targetDomain,
            logPath: './src/logs/kms-marketplace',
            detailedLogging: true
        });

        // Note: LinkInteractionSystem integration handled externally to avoid circular dependency

        this.sessionState = {
            sessionId: this.generateSessionId(),
            startTime: Date.now(),
            currentPage: null,
            visitedPages: new Set(),
            navigationPath: [],
            currentPattern: null,
            sessionGoal: this.selectSessionGoal()
        };

        this.analytics = {
            sessionsCompleted: 0,
            totalPageViews: 0,
            averageSessionDuration: 0,
            navigationPatterns: new Map(),
            pageTypeDistribution: new Map(),
            conversionEvents: 0
        };
    }

    /**
     * Execute a complete browsing session on KMS Marketplace
     * @param {Object} options - Session options
     * @returns {Promise<Object>} Session results
     */
    async executeSession(options = {}) {
        try {
            Logger.info(`🛍️ Starting KMS Marketplace session: ${this.sessionState.sessionGoal}`);
            
            const sessionStartTime = Date.now();
            const sessionDuration = this.calculateSessionDuration();
            const targetPages = this.calculatePagesPerSession();
            
            Logger.info(`📊 Session plan: ${targetPages} pages over ${Math.round(sessionDuration / 1000)}s`);
            
            // Get browser instance
            const browser = await this.browserPool.getBrowser();
            const page = await browser.newPage();
            
            try {
                // Configure page for realistic behavior
                await this.configurePage(page);
                
                // Execute navigation pattern
                const results = await this.executeNavigationPattern(page, {
                    duration: sessionDuration,
                    targetPages,
                    sessionGoal: this.sessionState.sessionGoal
                });
                
                // Finalize session
                await this.finalizeSession(results);
                
                Logger.info(`✅ KMS Marketplace session completed successfully`);
                return results;
                
            } finally {
                await page.close();
                this.browserPool.releaseBrowser(browser);
            }
            
        } catch (error) {
            Logger.error(`❌ KMS Marketplace session failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Configure page with realistic settings
     * @param {Object} page - Puppeteer page object
     */
    async configurePage(page) {
        // Set realistic viewport
        const viewports = [
            { width: 1920, height: 1080 },
            { width: 1366, height: 768 },
            { width: 1440, height: 900 },
            { width: 1536, height: 864 }
        ];
        const viewport = viewports[Math.floor(Math.random() * viewports.length)];
        await page.setViewport(viewport);
        
        // Set user agent
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ];
        await page.setUserAgent(userAgents[Math.floor(Math.random() * userAgents.length)]);
        
        // Enable JavaScript and images
        await page.setJavaScriptEnabled(true);
        
        // Set realistic headers
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Upgrade-Insecure-Requests': '1'
        });
        
        Logger.debug(`🔧 Page configured with viewport: ${viewport.width}x${viewport.height}`);
    }

    /**
     * Execute navigation pattern based on session goal
     * @param {Object} page - Puppeteer page object
     * @param {Object} options - Navigation options
     * @returns {Promise<Object>} Navigation results
     */
    async executeNavigationPattern(page, options) {
        const { duration, targetPages, sessionGoal } = options;
        const startTime = Date.now();
        const endTime = startTime + duration;
        
        let pagesVisited = 0;
        const navigationResults = [];
        
        // Start with homepage or direct entry
        let currentUrl = await this.selectEntryPoint(sessionGoal);
        
        while (Date.now() < endTime && pagesVisited < targetPages) {
            try {
                Logger.info(`🌐 Navigating to: ${currentUrl}`);
                
                // Navigate to page
                await page.goto(currentUrl, { 
                    waitUntil: 'networkidle2',
                    timeout: 30000 
                });
                
                // Detect page type
                const pageType = await this.detectPageType(page, currentUrl);
                Logger.debug(`📄 Page type detected: ${pageType}`);
                
                // Execute behavioral simulation
                const behaviorConfig = this.getPageBehaviorConfig(pageType);
                const behaviorResults = await this.behavioralEngine.simulatePageBehavior(
                    page, currentUrl, { pageType, sessionGoal, ...behaviorConfig }
                );
                
                // Perform page-specific interactions
                const interactionResults = await this.performPageSpecificInteractions(
                    page, pageType, sessionGoal
                );
                
                // Update session state
                this.updateSessionState(currentUrl, pageType, behaviorResults);
                
                navigationResults.push({
                    url: currentUrl,
                    pageType,
                    behaviorResults,
                    interactionResults,
                    timestamp: Date.now()
                });
                
                pagesVisited++;
                
                // Decide next page (if not last page)
                if (pagesVisited < targetPages && Date.now() < endTime) {
                    currentUrl = await this.selectNextPage(page, pageType, sessionGoal);
                    
                    // Natural pause between pages
                    const pauseTime = 2000 + Math.random() * 5000;
                    await new Promise(resolve => setTimeout(resolve, pauseTime));
                }
                
            } catch (error) {
                Logger.warn(`⚠️ Page navigation failed: ${error.message}`);
                
                // Try to recover with a different page
                currentUrl = await this.selectRecoveryPage();
                continue;
            }
        }
        
        const sessionDuration = Date.now() - startTime;
        
        return {
            sessionId: this.sessionState.sessionId,
            sessionGoal,
            duration: sessionDuration,
            pagesVisited,
            navigationResults,
            success: pagesVisited > 0
        };
    }

    /**
     * Select entry point based on session goal
     * @param {string} sessionGoal - Current session goal
     * @returns {string} Entry URL
     */
    async selectEntryPoint(sessionGoal) {
        const entryPoints = {
            browse_products: 'https://kmsmarketplace.com/',
            search_specific: 'https://kmsmarketplace.com/search',
            category_exploration: 'https://kmsmarketplace.com/categories',
            product_research: 'https://kmsmarketplace.com/',
            comparison_shopping: 'https://kmsmarketplace.com/compare'
        };
        
        return entryPoints[sessionGoal] || 'https://kmsmarketplace.com/';
    }

    /**
     * Detect page type from URL and content
     * @param {Object} page - Puppeteer page object
     * @param {string} url - Current URL
     * @returns {string} Page type
     */
    async detectPageType(page, url) {
        try {
            // URL-based detection
            if (url.includes('/product/') || url.includes('/item/')) {
                return 'product';
            } else if (url.includes('/category/') || url.includes('/categories')) {
                return 'category';
            } else if (url.includes('/search') || url.includes('?q=')) {
                return 'search';
            } else if (url === 'https://kmsmarketplace.com/' || url.includes('/home')) {
                return 'homepage';
            }
            
            // Content-based detection
            const pageTitle = await page.title();
            const hasProductInfo = await page.$('.product-details, .product-info, [data-product-id]');
            const hasCategoryList = await page.$('.category-list, .categories, [data-category]');
            const hasSearchResults = await page.$('.search-results, .search-items, [data-search]');
            
            if (hasProductInfo) return 'product';
            if (hasCategoryList) return 'category';
            if (hasSearchResults) return 'search';
            
            return 'homepage';
            
        } catch (error) {
            Logger.warn(`⚠️ Page type detection failed: ${error.message}`);
            return 'homepage';
        }
    }

    /**
     * Get behavior configuration for page type
     * @param {string} pageType - Type of page
     * @returns {Object} Behavior configuration
     */
    getPageBehaviorConfig(pageType) {
        const config = this.config.pageTypes[pageType] || this.config.pageTypes.homepage;
        
        return {
            minDwellTime: config.dwellTime.min,
            maxDwellTime: config.dwellTime.max,
            clicksPerPage: {
                min: config.interactions.min,
                max: config.interactions.max
            },
            scrollPatterns: [config.scrollPattern]
        };
    }

    /**
     * Perform page-specific interactions
     * @param {Object} page - Puppeteer page object
     * @param {string} pageType - Type of page
     * @param {string} sessionGoal - Current session goal
     * @returns {Promise<Object>} Interaction results
     */
    async performPageSpecificInteractions(page, pageType, sessionGoal) {
        const results = { interactions: [], success: true };
        
        try {
            switch (pageType) {
                case 'homepage':
                    await this.performHomepageInteractions(page, results);
                    break;
                case 'category':
                    await this.performCategoryInteractions(page, results);
                    break;
                case 'product':
                    await this.performProductInteractions(page, results);
                    break;
                case 'search':
                    await this.performSearchInteractions(page, results);
                    break;
            }
            
        } catch (error) {
            Logger.warn(`⚠️ Page-specific interactions failed: ${error.message}`);
            results.success = false;
            results.error = error.message;
        }
        
        return results;
    }

    /**
     * Perform homepage-specific interactions
     * @param {Object} page - Puppeteer page object
     * @param {Object} results - Results object to update
     */
    async performHomepageInteractions(page, results) {
        // Look for featured products
        const featuredProducts = await page.$$('.featured-product, .product-card, [data-product]');
        if (featuredProducts.length > 0) {
            const randomProduct = featuredProducts[Math.floor(Math.random() * featuredProducts.length)];
            await this.behavioralEngine.behaviorSimulator.simulateHover(page, randomProduct);
            results.interactions.push({ type: 'hover_featured_product', timestamp: Date.now() });
        }
        
        // Look for navigation menu
        const navItems = await page.$$('nav a, .navigation a, .menu a');
        if (navItems.length > 0 && Math.random() < 0.4) {
            const randomNav = navItems[Math.floor(Math.random() * navItems.length)];
            await this.behavioralEngine.behaviorSimulator.simulateHover(page, randomNav);
            results.interactions.push({ type: 'hover_navigation', timestamp: Date.now() });
        }
        
        // Simulate banner interaction
        const banners = await page.$$('.banner, .hero, .carousel-item');
        if (banners.length > 0 && Math.random() < 0.3) {
            await this.behavioralEngine.behaviorSimulator.simulateClick(page, banners[0]);
            results.interactions.push({ type: 'banner_interaction', timestamp: Date.now() });
        }
    }

    /**
     * Perform category page interactions
     * @param {Object} page - Puppeteer page object
     * @param {Object} results - Results object to update
     */
    async performCategoryInteractions(page, results) {
        // Interact with filters
        const filters = await page.$$('.filter, .facet, [data-filter]');
        if (filters.length > 0 && Math.random() < 0.5) {
            const randomFilter = filters[Math.floor(Math.random() * filters.length)];
            await this.behavioralEngine.behaviorSimulator.simulateClick(page, randomFilter);
            results.interactions.push({ type: 'filter_interaction', timestamp: Date.now() });
        }
        
        // Browse product listings
        const productCards = await page.$$('.product-card, .product-item, [data-product]');
        if (productCards.length > 0) {
            const viewCount = Math.min(3, Math.floor(Math.random() * productCards.length) + 1);
            for (let i = 0; i < viewCount; i++) {
                const randomProduct = productCards[Math.floor(Math.random() * productCards.length)];
                await this.behavioralEngine.behaviorSimulator.simulateHover(page, randomProduct);
                await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
                results.interactions.push({ type: 'product_hover', timestamp: Date.now() });
            }
        }
        
        // Interact with sorting
        const sortOptions = await page.$$('.sort, .order-by, [data-sort]');
        if (sortOptions.length > 0 && Math.random() < 0.3) {
            const randomSort = sortOptions[Math.floor(Math.random() * sortOptions.length)];
            await this.behavioralEngine.behaviorSimulator.simulateClick(page, randomSort);
            results.interactions.push({ type: 'sort_interaction', timestamp: Date.now() });
        }
    }

    /**
     * Perform product page interactions
     * @param {Object} page - Puppeteer page object
     * @param {Object} results - Results object to update
     */
    async performProductInteractions(page, results) {
        // View product images
        const productImages = await page.$$('.product-image, .gallery img, [data-image]');
        if (productImages.length > 0) {
            const imageCount = Math.min(3, productImages.length);
            for (let i = 0; i < imageCount; i++) {
                await this.behavioralEngine.behaviorSimulator.simulateClick(page, productImages[i]);
                await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));
                results.interactions.push({ type: 'image_view', timestamp: Date.now() });
            }
        }
        
        // Read product details
        const detailSections = await page.$$('.product-details, .description, .specifications');
        if (detailSections.length > 0) {
            for (const section of detailSections) {
                await this.behavioralEngine.behaviorSimulator.simulateReading(page, section);
                results.interactions.push({ type: 'read_details', timestamp: Date.now() });
            }
        }
        
        // Interact with quantity/options
        const quantityInputs = await page.$$('input[type="number"], .quantity-input');
        if (quantityInputs.length > 0 && Math.random() < 0.4) {
            await this.behavioralEngine.behaviorSimulator.simulateClick(page, quantityInputs[0]);
            results.interactions.push({ type: 'quantity_interaction', timestamp: Date.now() });
        }
        
        // Simulate add to cart consideration (hover over button)
        const addToCartButtons = await page.$$('.add-to-cart, [data-add-cart], .btn-cart');
        if (addToCartButtons.length > 0 && Math.random() < 0.6) {
            await this.behavioralEngine.behaviorSimulator.simulateHover(page, addToCartButtons[0]);
            results.interactions.push({ type: 'cart_consideration', timestamp: Date.now() });
        }
    }

    /**
     * Perform search page interactions
     * @param {Object} page - Puppeteer page object
     * @param {Object} results - Results object to update
     */
    async performSearchInteractions(page, results) {
        // Refine search
        const searchBox = await page.$('input[type="search"], .search-input, [data-search]');
        if (searchBox && Math.random() < 0.3) {
            await this.behavioralEngine.behaviorSimulator.simulateClick(page, searchBox);
            results.interactions.push({ type: 'search_refinement', timestamp: Date.now() });
        }
        
        // Browse search results
        const searchResults = await page.$$('.search-result, .result-item, [data-result]');
        if (searchResults.length > 0) {
            const viewCount = Math.min(5, Math.floor(Math.random() * searchResults.length) + 1);
            for (let i = 0; i < viewCount; i++) {
                const randomResult = searchResults[Math.floor(Math.random() * searchResults.length)];
                await this.behavioralEngine.behaviorSimulator.simulateHover(page, randomResult);
                await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1500));
                results.interactions.push({ type: 'result_hover', timestamp: Date.now() });
            }
        }
        
        // Use search filters
        const searchFilters = await page.$$('.search-filter, .result-filter, [data-filter]');
        if (searchFilters.length > 0 && Math.random() < 0.4) {
            const randomFilter = searchFilters[Math.floor(Math.random() * searchFilters.length)];
            await this.behavioralEngine.behaviorSimulator.simulateClick(page, randomFilter);
            results.interactions.push({ type: 'search_filter', timestamp: Date.now() });
        }
    }

    /**
     * Select next page to visit
     * @param {Object} page - Puppeteer page object
     * @param {string} currentPageType - Current page type
     * @param {string} sessionGoal - Session goal
     * @returns {string} Next page URL
     */
    async selectNextPage(page, currentPageType, sessionGoal) {
        try {
            // Get available links
            const links = await page.$$eval('a[href]', links => 
                links.map(link => ({
                    href: link.href,
                    text: link.textContent.trim(),
                    className: link.className
                })).filter(link => 
                    link.href.includes('kmsmarketplace.com') && 
                    !link.href.includes('#') &&
                    !this.visitedPages.has(link.href)
                )
            );
            
            if (links.length === 0) {
                return this.selectRecoveryPage();
            }
            
            // Filter links based on session goal and current page
            const relevantLinks = this.filterLinksByGoal(links, currentPageType, sessionGoal);
            
            if (relevantLinks.length > 0) {
                const selectedLink = relevantLinks[Math.floor(Math.random() * relevantLinks.length)];
                return selectedLink.href;
            }
            
            // Fallback to any available link
            const randomLink = links[Math.floor(Math.random() * links.length)];
            return randomLink.href;
            
        } catch (error) {
            Logger.warn(`⚠️ Next page selection failed: ${error.message}`);
            return this.selectRecoveryPage();
        }
    }

    /**
     * Filter links based on session goal
     * @param {Array} links - Available links
     * @param {string} currentPageType - Current page type
     * @param {string} sessionGoal - Session goal
     * @returns {Array} Filtered links
     */
    filterLinksByGoal(links, currentPageType, sessionGoal) {
        const goalPatterns = {
            browse_products: ['/product/', '/category/', '/shop'],
            search_specific: ['/search', '/product/', '/category/'],
            category_exploration: ['/category/', '/products/', '/shop'],
            product_research: ['/product/', '/compare', '/reviews'],
            comparison_shopping: ['/product/', '/compare', '/category/']
        };
        
        const patterns = goalPatterns[sessionGoal] || [];
        
        return links.filter(link => 
            patterns.some(pattern => link.href.includes(pattern))
        );
    }

    /**
     * Select recovery page when navigation fails
     * @returns {string} Recovery page URL
     */
    async selectRecoveryPage() {
        const recoveryPages = [
            'https://kmsmarketplace.com/',
            'https://kmsmarketplace.com/categories',
            'https://kmsmarketplace.com/products',
            'https://kmsmarketplace.com/search'
        ];
        
        return recoveryPages[Math.floor(Math.random() * recoveryPages.length)];
    }

    /**
     * Update session state with page visit
     * @param {string} url - Visited URL
     * @param {string} pageType - Page type
     * @param {Object} behaviorResults - Behavior results
     */
    updateSessionState(url, pageType, behaviorResults) {
        this.sessionState.visitedPages.add(url);
        this.sessionState.navigationPath.push({
            url,
            pageType,
            timestamp: Date.now(),
            dwellTime: behaviorResults.dwellTime
        });
        
        // Update analytics
        this.analytics.totalPageViews++;
        this.analytics.pageTypeDistribution.set(pageType, 
            (this.analytics.pageTypeDistribution.get(pageType) || 0) + 1);
    }

    /**
     * Calculate session duration
     * @returns {number} Session duration in milliseconds
     */
    calculateSessionDuration() {
        const min = this.config.sessionDuration.min;
        const max = this.config.sessionDuration.max;
        return min + Math.random() * (max - min);
    }

    /**
     * Calculate pages per session
     * @returns {number} Number of pages to visit
     */
    calculatePagesPerSession() {
        // Check for bounce
        if (Math.random() < this.config.bounceRate) {
            return 1;
        }
        
        const min = this.config.pagesPerSession.min;
        const max = this.config.pagesPerSession.max;
        return Math.floor(min + Math.random() * (max - min + 1));
    }

    /**
     * Select session goal
     * @returns {string} Session goal
     */
    selectSessionGoal() {
        const goals = [
            'browse_products',
            'search_specific',
            'category_exploration',
            'product_research',
            'comparison_shopping'
        ];
        
        return goals[Math.floor(Math.random() * goals.length)];
    }

    /**
     * Finalize session and save analytics
     * @param {Object} results - Session results
     */
    async finalizeSession(results) {
        const sessionDuration = Date.now() - this.sessionState.startTime;
        
        // Update analytics
        this.analytics.sessionsCompleted++;
        this.analytics.averageSessionDuration = 
            (this.analytics.averageSessionDuration * (this.analytics.sessionsCompleted - 1) + sessionDuration) / 
            this.analytics.sessionsCompleted;
        
        // Save behavioral logs
        await this.behavioralEngine.finalizeLogs();
        
        // Update stats tracker
        if (this.statsTracker) {
            this.statsTracker.recordKMSSession({
                sessionId: this.sessionState.sessionId,
                duration: sessionDuration,
                pagesVisited: results.pagesVisited,
                sessionGoal: this.sessionState.sessionGoal,
                success: results.success
            });
        }
        
        Logger.info(`📊 Session finalized: ${results.pagesVisited} pages, ${Math.round(sessionDuration / 1000)}s`);
    }

    /**
     * Generate unique session ID
     * @returns {string} Session ID
     */
    generateSessionId() {
        return `kms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get browser configuration for stealth and human-like behavior
     * @returns {Object} Browser configuration
     */
    getBrowserConfiguration() {
        return {
            headless: false, // Run in visible mode for more realistic behavior
            args: [
                '--disable-blink-features=AutomationControlled',
                '--disable-web-security',
                '--no-first-run',
                '--no-default-browser-check',
                '--disable-extensions-file-access-check',
                '--disable-extensions',
                '--disable-plugins-discovery',
                '--start-maximized'
            ],
            defaultViewport: {
                width: 1366,
                height: 768,
                deviceScaleFactor: 1,
                isMobile: false,
                hasTouch: false,
                isLandscape: true
            },
            ignoreDefaultArgs: ['--enable-automation'],
            ignoreHTTPSErrors: true
        };
    }

    /**
     * Get comprehensive analytics
     * @returns {Object} Analytics data
     */
    getAnalytics() {
        return {
            ...this.analytics,
            pageTypeDistribution: Object.fromEntries(this.analytics.pageTypeDistribution),
            navigationPatterns: Object.fromEntries(this.analytics.navigationPatterns),
            currentSession: {
                sessionId: this.sessionState.sessionId,
                startTime: this.sessionState.startTime,
                visitedPages: Array.from(this.sessionState.visitedPages),
                navigationPath: this.sessionState.navigationPath,
                sessionGoal: this.sessionState.sessionGoal
            }
        };
    }

    /**
     * Reset for new session
     */
    resetSession() {
        this.sessionState = {
            sessionId: this.generateSessionId(),
            startTime: Date.now(),
            currentPage: null,
            visitedPages: new Set(),
            navigationPath: [],
            currentPattern: null,
            sessionGoal: this.selectSessionGoal()
        };
        
        this.behavioralEngine.resetSession();
    }
}

module.exports = KMSMarketplaceCrawler;