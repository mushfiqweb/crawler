const puppeteer = require('puppeteer');
const { AdvancedBehavioralEngine } = require('./advanced-behavioral-engine');
const { FingerprintRandomizer } = require('./fingerprint-randomizer');
const { defaultLogger: Logger } = require('../utils/logger');
const { HumanBehaviorSimulator } = require('../utils/human-behavior-simulator');
const { BrowserPool } = require('./browser-pool');

/**
 * KMS Search Protocol Engine
 * Implements sophisticated search and browsing protocol for kmsmarketplace.com
 * with realistic user simulation and detection avoidance
 */
class KMSSearchProtocol {
    constructor(options = {}) {
        this.config = {
            targetDomain: 'kmsmarketplace.com',
            fallbackUrl: 'https://kmsmarketplace.com/collections/all',
            minEngagementTime: 30000, // 30 seconds
            maxEngagementTime: 60000, // 60 seconds
            searchEngine: 'google.com',
            maxSearchResults: 10,
            enableAdvancedEvasion: options.enableAdvancedEvasion !== false,
            respectRateLimit: options.respectRateLimit !== false,
            logPath: options.logPath || './src/logs/kms-search-protocol'
        };

        // Initialize behavioral components
        this.behavioralEngine = new AdvancedBehavioralEngine({
            targetDomain: this.config.targetDomain,
            logPath: this.config.logPath,
            detailedLogging: true
        });

        this.fingerprintRandomizer = new FingerprintRandomizer();
        this.humanBehavior = new HumanBehaviorSimulator();
        this.browserPool = new BrowserPool(); // Initialize browser pool for Bangladesh proxy support

        this.sessionState = {
            activeSessions: new Map(),
            searchResults: new Map(),
            engagementMetrics: new Map(),
            protocolStats: {
                totalSearches: 0,
                directHits: 0,
                fallbackNavigations: 0,
                averageEngagementTime: 0
            }
        };
    }

    /**
     * Execute search and browsing protocol for specified keywords
     */
    async executeSearchProtocol(keywords, options = {}) {
        const sessionId = this.generateSessionId();
        Logger.info(`🔍 Starting enhanced search protocol for keywords: "${keywords}" [Session: ${sessionId}]`);

        // Determine execution mode (legacy or enhanced redirection)
        const useRedirection = options.useRedirection !== false; // Default to true
        const maintainSearchTab = options.maintainSearchTab !== false; // Default to true

        try {
            // Create isolated browser session
            const browser = await this.createIsolatedBrowser(sessionId);
            const page = await browser.newPage();

            // Configure page for realistic behavior
            await this.configurePage(page, sessionId);

            // Execute search phase
            const searchResults = await this.performGoogleSearch(page, keywords, sessionId);
            
            // Analyze search results for kmsmarketplace.com presence
            const kmsResult = this.analyzeSearchResults(searchResults);

            let browsingResults;

            if (useRedirection) {
                // Enhanced mode: Execute browsing protocol with redirection
                browsingResults = await this.executeBrowsingProtocol(
                    page, 
                    kmsResult, 
                    sessionId,
                    { ...options, useRedirection: true }
                );
            } else {
                // Legacy mode: Execute browsing protocol in same tab
                browsingResults = await this.executeLegacyBrowsingProtocol(
                    page, 
                    kmsResult, 
                    sessionId,
                    options
                );
            }

            // Finalize session (handles both main browser and redirection contexts)
            await this.finalizeSession(browser, sessionId, browsingResults);

            return {
                sessionId,
                searchResults,
                kmsResult,
                browsingResults,
                mode: useRedirection ? 'enhanced_redirection' : 'legacy',
                success: true
            };

        } catch (error) {
            Logger.error(`❌ Search protocol failed for session ${sessionId}:`, error);
            return {
                sessionId,
                error: error.message,
                success: false
            };
        }
    }

    /**
     * Execute legacy browsing protocol (same tab navigation)
     */
    async executeLegacyBrowsingProtocol(page, kmsResult, sessionId, options = {}) {
        Logger.info(`🌐 Executing legacy browsing protocol [${sessionId}] - Strategy: ${kmsResult.strategy}`);

        let targetUrl;
        
        if (kmsResult.found) {
            targetUrl = kmsResult.url;
            if (kmsResult.isFirstResult) {
                this.sessionState.protocolStats.directHits++;
            }
        } else {
            targetUrl = this.config.fallbackUrl;
            this.sessionState.protocolStats.fallbackNavigations++;
        }

        // Navigate to target URL in same tab
        await this.navigateToTarget(page, targetUrl, sessionId);

        // Execute realistic user engagement
        const engagementResults = await this.executeUserEngagement(page, sessionId, options);

        return {
            targetUrl,
            strategy: kmsResult.strategy,
            engagementResults,
            mode: 'legacy',
            success: true
        };
    }

    /**
     * Create isolated browser session with unique fingerprint
     * Uses Bangladesh proxy for Google searches
     */
    async createIsolatedBrowser(sessionId) {
        // Use Bangladesh proxy browser for Google searches
        const browser = await this.browserPool.getBangladeshBrowserForGoogle();
        
        const fingerprint = this.fingerprintRandomizer.generateFingerprint();
        
        // Store session reference
        this.sessionState.activeSessions.set(sessionId, {
            browser,
            fingerprint,
            startTime: Date.now(),
            status: 'active',
            browserConfig: 'bangladesh_proxy',
            proxyInfo: browser._proxyConfig
        });

        Logger.info(`🇧🇩 Created isolated Bangladesh proxy browser session [${sessionId}] via ${browser._proxyConfig?.server} (IP: ${browser._proxyConfig?.ipRange})`);
        
        return browser;
    }

    /**
     * Get browser configuration based on environment
     */
    getBrowserConfiguration(fingerprint) {
        const platform = process.platform;
        const isWindows = platform === 'win32';
        const isMac = platform === 'darwin';
        const isLinux = platform === 'linux';

        let config = {
            type: 'chromium',
            baseArgs: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor'
            ],
            ignoreDefaultArgs: false
        };

        // Platform-specific optimizations
        if (isWindows) {
            config.baseArgs.push(
                '--disable-extensions-except',
                '--disable-plugins-discovery',
                '--disable-background-timer-throttling'
            );
        } else if (isMac) {
            config.baseArgs.push(
                '--enable-font-antialiasing',
                '--force-color-profile=srgb',
                '--disable-backgrounding-occluded-windows'
            );
        } else if (isLinux) {
            config.baseArgs.push(
                '--disable-software-rasterizer',
                '--disable-background-networking',
                '--disable-renderer-backgrounding'
            );
        }

        return config;
    }

    /**
     * Get device-specific browser arguments
     */
    getDeviceSpecificArgs() {
        const deviceArgs = [];

        // Memory optimization based on available system resources
        const totalMemory = require('os').totalmem();
        const memoryInGB = totalMemory / (1024 * 1024 * 1024);

        if (memoryInGB < 4) {
            deviceArgs.push(
                '--memory-pressure-off',
                '--max_old_space_size=1024'
            );
        } else if (memoryInGB >= 8) {
            deviceArgs.push(
                '--max_old_space_size=4096'
            );
        }

        // CPU optimization
        const cpuCount = require('os').cpus().length;
        if (cpuCount <= 2) {
            deviceArgs.push(
                '--single-process',
                '--disable-background-timer-throttling'
            );
        }

        return deviceArgs;
    }

    /**
     * Get security-focused browser arguments
     */
    getSecurityArgs() {
        return [
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
            '--disable-hang-monitor',
            '--disable-prompt-on-repost',
            '--disable-domain-reliability',
            '--disable-component-extensions-with-background-pages'
        ];
    }

    /**
     * Configure page with realistic settings and evasion techniques
     */
    async configurePage(page, sessionId) {
        const session = this.sessionState.activeSessions.get(sessionId);
        
        // Set realistic viewport and user agent
        await page.setViewport(session.fingerprint.viewport);
        await page.setUserAgent(session.fingerprint.userAgent);

        // Configure realistic browser behavior
        await page.evaluateOnNewDocument(() => {
            // Override webdriver detection
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
            });

            // Add realistic navigator properties
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en'],
            });

            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
            });
        });

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

        Logger.info(`⚙️ Configured page for session [${sessionId}] with realistic browser settings`);
    }

    /**
     * Perform Google search for specified keywords
     */
    async performGoogleSearch(page, keywords, sessionId) {
        Logger.info(`🔍 Performing Google search for: "${keywords}" [${sessionId}]`);

        try {
            // Navigate to Google with realistic timing
            await page.goto('https://www.google.com', { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });

            // Wait for page to load completely
            await this.humanBehavior.humanDelay(2000, 4000);

            // Find and interact with search box
            const searchBox = await page.waitForSelector('input[name="q"]', { timeout: 10000 });
            
            // Simulate human typing
            await this.simulateHumanTyping(page, searchBox, keywords);

            // Submit search with realistic delay
            await this.humanBehavior.humanDelay(1000, 2000);
            await page.keyboard.press('Enter');

            // Wait for search results
            await page.waitForSelector('#search', { timeout: 15000 });
            await this.humanBehavior.humanDelay(2000, 3000);

            // Extract search results
            const searchResults = await this.extractSearchResults(page);
            
            this.sessionState.searchResults.set(sessionId, searchResults);
            this.sessionState.protocolStats.totalSearches++;

            Logger.info(`📊 Extracted ${searchResults.length} search results for session [${sessionId}]`);
            
            return searchResults;

        } catch (error) {
            Logger.error(`❌ Google search failed for session [${sessionId}]:`, error);
            throw error;
        }
    }

    /**
     * Simulate realistic human typing patterns
     */
    async simulateHumanTyping(page, element, text) {
        await element.click();
        await this.humanBehavior.randomDelay(500, 1000);

        for (let i = 0; i < text.length; i++) {
            await page.keyboard.type(text[i]);
            // Random typing speed variation
            await this.humanBehavior.humanDelay(80, 200);
        }
    }

    /**
     * Extract and parse Google search results with CAPTCHA detection
     */
    async extractSearchResults(page) {
        try {
            // First check if we're on a CAPTCHA page
            const captchaDetected = await this.detectCaptchaPage(page);
            if (captchaDetected) {
                Logger.warn('🚫 CAPTCHA detected - implementing fallback strategy');
                return await this.handleCaptchaFallback(page);
            }

            // Check for different Google result layouts
            const results = await page.evaluate(() => {
                const results = [];
                
                // Try multiple selectors for different Google layouts
                const selectors = [
                    '#search .g',           // Standard layout
                    '.g',                   // Alternative layout
                    '[data-ved] .g',        // Mobile layout
                    '.srg .g',              // Classic layout
                    '#rso .g'               // Results container layout
                ];

                let searchItems = [];
                for (const selector of selectors) {
                    searchItems = document.querySelectorAll(selector);
                    if (searchItems.length > 0) break;
                }

                searchItems.forEach((item, index) => {
                    try {
                        // Try multiple title selectors
                        const titleElement = item.querySelector('h3') || 
                                           item.querySelector('[role="heading"]') ||
                                           item.querySelector('.LC20lb');
                        
                        // Try multiple link selectors
                        const linkElement = item.querySelector('a[href]') ||
                                          item.querySelector('a');
                        
                        // Try multiple snippet selectors
                        const snippetElement = item.querySelector('.VwiC3b') ||
                                             item.querySelector('.s') ||
                                             item.querySelector('.st') ||
                                             item.querySelector('[data-sncf]');

                        if (titleElement && linkElement && linkElement.href) {
                            const url = linkElement.href;
                            
                            // Skip Google internal links
                            if (url.includes('google.com/search') || 
                                url.includes('google.com/url') ||
                                url.startsWith('javascript:')) {
                                return;
                            }

                            results.push({
                                position: index + 1,
                                title: titleElement.textContent.trim(),
                                url: url,
                                snippet: snippetElement ? snippetElement.textContent.trim() : '',
                                domain: new URL(url).hostname
                            });
                        }
                    } catch (error) {
                        console.warn(`Error processing search result ${index}:`, error.message);
                    }
                });

                return results;
            });

            // If no results found, try alternative extraction methods
            if (results.length === 0) {
                Logger.warn('⚠️ No results found with standard extraction - trying alternative methods');
                return await this.extractResultsAlternativeMethod(page);
            }

            return results;

        } catch (error) {
            Logger.error('❌ Search result extraction failed:', error);
            return [];
        }
    }

    /**
     * Detect if current page is a CAPTCHA page
     */
    async detectCaptchaPage(page) {
        return await page.evaluate(() => {
            const captchaIndicators = [
                'Our systems have detected unusual traffic',
                'unusual traffic from your computer network',
                'captcha',
                'verify you are human',
                'robot',
                'automated queries'
            ];

            const pageText = document.body.textContent.toLowerCase();
            return captchaIndicators.some(indicator => pageText.includes(indicator));
        });
    }

    /**
     * Handle CAPTCHA detection with fallback strategies
     */
    async handleCaptchaFallback(page) {
        Logger.info('🔄 Implementing CAPTCHA fallback strategy');
        
        // Strategy 1: Direct navigation to kmsmarketplace.com
        const fallbackResults = [{
            position: 1,
            title: 'KMS Marketplace - Direct Navigation',
            url: 'https://kmsmarketplace.com/',
            snippet: 'Direct navigation to KMS Marketplace due to search restrictions',
            domain: 'kmsmarketplace.com'
        }];

        Logger.info('✅ Using direct navigation fallback for kmsmarketplace.com');
        return fallbackResults;
    }

    /**
     * Alternative search result extraction method
     */
    async extractResultsAlternativeMethod(page) {
        return await page.evaluate(() => {
            const results = [];
            
            // Look for any links that might be search results
            const allLinks = document.querySelectorAll('a[href]');
            
            allLinks.forEach((link, index) => {
                try {
                    const href = link.href;
                    
                    // Skip Google internal links and invalid URLs
                    if (href.includes('google.com') || 
                        href.startsWith('javascript:') ||
                        href.startsWith('#') ||
                        href.length < 10) {
                        return;
                    }

                    // Look for text content that might be a title
                    const titleText = link.textContent.trim() ||
                                    link.querySelector('h3')?.textContent.trim() ||
                                    link.getAttribute('aria-label') ||
                                    'Search Result';

                    if (titleText && titleText.length > 3) {
                        results.push({
                            position: results.length + 1,
                            title: titleText,
                            url: href,
                            snippet: '',
                            domain: new URL(href).hostname
                        });
                    }
                } catch (error) {
                    // Skip invalid URLs
                }
            });

            // Limit to reasonable number of results
            return results.slice(0, 10);
        });
    }

    /**
     * Analyze search results for kmsmarketplace.com presence and ranking
     */
    analyzeSearchResults(searchResults) {
        Logger.info(`🔍 Analyzing ${searchResults.length} search results for kmsmarketplace.com`);
        
        // Enhanced domain matching for kmsmarketplace.com
        const kmsResults = searchResults.filter(result => {
            return this.isKMSMarketplaceDomain(result.domain, result.url, result.title);
        });

        if (kmsResults.length === 0) {
            Logger.info(`ℹ️ No kmsmarketplace.com links found in search results for "${this.currentKeyword || 'search'}"`);
            
            // Log all domains found for debugging
            const domains = searchResults.map(r => r.domain).slice(0, 5);
            Logger.debug(`🔍 Found domains: ${domains.join(', ')}`);
            
            return {
                found: false,
                position: null,
                url: null,
                strategy: 'fallback',
                fallbackUrl: this.config.fallbackUrl || 'https://kmsmarketplace.com/collections/all'
            };
        }

        // Sort by position to get the highest ranking result
        kmsResults.sort((a, b) => a.position - b.position);
        const topResult = kmsResults[0];
        const isFirstResult = topResult.position === 1;

        Logger.info(`🎯 Found kmsmarketplace.com at position ${topResult.position}: ${topResult.url}`);
        Logger.info(`📝 Title: ${topResult.title}`);

        return {
            found: true,
            position: topResult.position,
            url: topResult.url,
            title: topResult.title,
            isFirstResult,
            strategy: isFirstResult ? 'direct_hit' : 'ranked_result',
            allKMSResults: kmsResults
        };
    }

    /**
     * Enhanced domain detection for kmsmarketplace.com
     */
    isKMSMarketplaceDomain(domain, url, title) {
        if (!domain && !url) return false;

        // Normalize domain and URL for comparison
        const normalizedDomain = (domain || '').toLowerCase();
        const normalizedUrl = (url || '').toLowerCase();
        const normalizedTitle = (title || '').toLowerCase();

        // Direct domain matches
        const domainMatches = [
            'kmsmarketplace.com',
            'www.kmsmarketplace.com',
            'shop.kmsmarketplace.com',
            'm.kmsmarketplace.com'
        ];

        // Check direct domain matches
        if (domainMatches.some(match => normalizedDomain === match)) {
            return true;
        }

        // Check if domain contains kmsmarketplace
        if (normalizedDomain.includes('kmsmarketplace')) {
            return true;
        }

        // Check URL for kmsmarketplace references
        if (normalizedUrl.includes('kmsmarketplace.com')) {
            return true;
        }

        // Check for redirect URLs that might point to kmsmarketplace
        if (normalizedUrl.includes('kmsmarketplace') || 
            normalizedUrl.includes('kms-marketplace') ||
            normalizedUrl.includes('kms_marketplace')) {
            return true;
        }

        // Check title for kmsmarketplace references
        if (normalizedTitle.includes('kms marketplace') ||
            normalizedTitle.includes('kmsmarketplace') ||
            normalizedTitle.includes('kms-marketplace')) {
            return true;
        }

        return false;
    }

    /**
     * Execute browsing protocol based on search analysis
     */
    async executeBrowsingProtocol(page, kmsResult, sessionId, options = {}) {
        Logger.info(`🌐 Executing browsing protocol [${sessionId}] - Strategy: ${kmsResult.strategy}`);

        try {
            if (kmsResult.found) {
                // Navigate to found kmsmarketplace.com URL
                Logger.info(`✅ Navigating to found kmsmarketplace.com URL: ${kmsResult.url}`);
                const redirectionResults = await this.executeRedirectionProtocol(page, kmsResult.url, sessionId, options);
                
                if (kmsResult.isFirstResult) {
                    this.sessionState.protocolStats.directHits++;
                }
                
                return {
                    targetUrl: kmsResult.url,
                    strategy: kmsResult.strategy,
                    redirectionResults,
                    success: true
                };
            } else {
                // Fallback to direct navigation
                const fallbackUrl = kmsResult.fallbackUrl || this.config.fallbackUrl || 'https://kmsmarketplace.com/collections/all';
                Logger.info(`🔄 No kmsmarketplace.com found in search results - using fallback navigation`);
                Logger.info(`🎯 Fallback URL: ${fallbackUrl}`);
                
                // Update session state to track fallback usage
                this.sessionState.protocolStats.fallbackNavigations++;
                
                const redirectionResults = await this.executeRedirectionProtocol(page, fallbackUrl, sessionId, {
                    ...options,
                    isFallback: true,
                    reason: 'No kmsmarketplace.com links found in search results'
                });
                
                return {
                    targetUrl: fallbackUrl,
                    strategy: kmsResult.strategy,
                    redirectionResults,
                    success: true
                };
            }

        } catch (error) {
            Logger.error(`❌ Browsing protocol failed [${sessionId}]:`, error);
            throw error;
        }
    }

    /**
     * Execute redirection protocol - opens kmsmarketplace.com in new browser window/tab
     */
    async executeRedirectionProtocol(searchPage, targetUrl, sessionId, options = {}) {
        Logger.info(`🔄 Executing redirection protocol to: ${targetUrl} [${sessionId}]`);

        try {
            // Get browser instance from search page
            const browser = searchPage.browser();
            
            // Create new browser context for isolation
            const newContext = await browser.createIncognitoBrowserContext();
            
            // Create new page in isolated context
            const newPage = await newContext.newPage();
            
            // Configure new page with unique fingerprint
            await this.configureRedirectionPage(newPage, sessionId);
            
            // Navigate to target URL in new window
            await this.navigateToTargetInNewWindow(newPage, targetUrl, sessionId);

            // Execute realistic user engagement in new window
            const engagementResults = await this.executeUserEngagement(newPage, sessionId, options);

            // Store redirection session info
            this.sessionState.activeSessions.set(`${sessionId}_redirect`, {
                context: newContext,
                page: newPage,
                targetUrl,
                startTime: Date.now()
            });

            Logger.info(`✅ Redirection protocol completed successfully [${sessionId}]`);

            return {
                newWindowOpened: true,
                targetUrl,
                engagementResults,
                contextId: `${sessionId}_redirect`,
                success: true
            };

        } catch (error) {
            Logger.error(`❌ Redirection protocol failed [${sessionId}]:`, error);
            throw error;
        }
    }

    /**
     * Configure redirection page with unique fingerprint for new window
     */
    async configureRedirectionPage(page, sessionId) {
        Logger.info(`⚙️ Configuring redirection page [${sessionId}]`);

        try {
            // Generate unique fingerprint for redirection window
            const fingerprint = this.fingerprintRandomizer.generateFingerprint();
            
            // Set viewport for cross-browser compatibility
            await page.setViewport({
                width: fingerprint.viewport.width,
                height: fingerprint.viewport.height,
                deviceScaleFactor: fingerprint.viewport.deviceScaleFactor || 1,
                isMobile: fingerprint.viewport.isMobile || false,
                hasTouch: fingerprint.viewport.hasTouch || false
            });

            // Set user agent for browser compatibility
            await page.setUserAgent(fingerprint.userAgent);

            // Configure additional headers for authenticity
            await page.setExtraHTTPHeaders({
                'Accept-Language': fingerprint.language || 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Upgrade-Insecure-Requests': '1'
            });

            // Enable JavaScript for full functionality
            await page.setJavaScriptEnabled(true);

            // Configure geolocation if available
            if (fingerprint.geolocation) {
                await page.setGeolocation(fingerprint.geolocation);
            }

            Logger.info(`✅ Redirection page configured successfully [${sessionId}]`);

        } catch (error) {
            Logger.error(`❌ Failed to configure redirection page [${sessionId}]:`, error);
            throw error;
        }
    }

    /**
     * Validate and enhance URL for proper domain and page navigation
     */
    validateAndEnhanceUrl(url) {
        try {
            // Ensure URL has proper protocol
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }

            const urlObj = new URL(url);
            
            // Ensure we're targeting the correct domain
            if (!urlObj.hostname.includes(this.config.targetDomain)) {
                Logger.warn(`⚠️ URL domain mismatch. Expected: ${this.config.targetDomain}, Got: ${urlObj.hostname}`);
                // If it's not the target domain, use fallback URL
                return this.config.fallbackUrl;
            }

            // Validate common page paths for kmsmarketplace.com
            const validPaths = [
                '/collections/all',
                '/collections/',
                '/products/',
                '/pages/',
                '/search',
                '/'
            ];

            const isValidPath = validPaths.some(path => 
                urlObj.pathname === '/' || 
                urlObj.pathname.startsWith(path)
            );

            if (!isValidPath) {
                Logger.info(`🔄 Redirecting to collections page for better navigation experience`);
                return this.config.fallbackUrl;
            }

            return url;

        } catch (error) {
            Logger.error(`❌ URL validation failed, using fallback:`, error);
            return this.config.fallbackUrl;
        }
    }

    /**
     * Navigate to target URL in new window with enhanced compatibility
     */
    async navigateToTargetInNewWindow(page, url, sessionId) {
        // Validate and enhance URL before navigation
        const validatedUrl = this.validateAndEnhanceUrl(url);
        
        Logger.info(`🔗 Navigating to validated target in new window: ${validatedUrl} [${sessionId}]`);

        try {
            // Navigate with multiple fallback strategies for browser compatibility
            const navigationOptions = {
                waitUntil: ['networkidle2', 'domcontentloaded'],
                timeout: 45000
            };

            await page.goto(validatedUrl, navigationOptions);

            // Verify page loaded correctly
            const currentUrl = page.url();
            const title = await page.title();
            
            Logger.info(`📄 Page loaded - URL: ${currentUrl}, Title: "${title}" [${sessionId}]`);

            // Comprehensive domain and page validation
            const validationResult = await this.validatePageNavigation(page, validatedUrl, sessionId);
            
            if (!validationResult.success) {
                Logger.warn(`⚠️ Page validation failed, attempting recovery [${sessionId}]`);
                await this.attemptNavigationRecovery(page, sessionId);
            }

            // Wait for page to fully stabilize
            await this.humanBehavior.humanDelay(3000, 6000);

            // Verify page is interactive
            await page.waitForFunction(() => document.readyState === 'complete', { timeout: 10000 });

            Logger.info(`✅ Successfully loaded and validated target in new window: ${validatedUrl} [${sessionId}]`);

        } catch (error) {
            Logger.error(`❌ Navigation failed in new window for ${validatedUrl} [${sessionId}]:`, error);
            throw error;
        }
    }

    /**
     * Validate page navigation to ensure correct domain and page loading
     */
    async validatePageNavigation(page, expectedUrl, sessionId) {
        try {
            const currentUrl = page.url();
            const title = await page.title();
            
            // Check if we're on the correct domain
            const isCorrectDomain = currentUrl.includes(this.config.targetDomain);
            
            // Check if page has loaded content (not an error page)
            const hasContent = await page.evaluate(() => {
                const body = document.body;
                return body && body.innerText.length > 100;
            });

            // Check for common error indicators
            const hasErrors = await page.evaluate(() => {
                const errorIndicators = [
                    'page not found',
                    '404',
                    'error',
                    'something went wrong',
                    'access denied'
                ];
                
                const pageText = document.body.innerText.toLowerCase();
                return errorIndicators.some(indicator => pageText.includes(indicator));
            });

            const validation = {
                success: isCorrectDomain && hasContent && !hasErrors,
                domain: isCorrectDomain,
                content: hasContent,
                errors: hasErrors,
                currentUrl,
                title
            };

            Logger.info(`🔍 Page validation [${sessionId}]: Domain: ${validation.domain}, Content: ${validation.content}, Errors: ${validation.errors}`);

            return validation;

        } catch (error) {
            Logger.error(`❌ Page validation failed [${sessionId}]:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Attempt navigation recovery if initial navigation fails
     */
    async attemptNavigationRecovery(page, sessionId) {
        Logger.info(`🔄 Attempting navigation recovery [${sessionId}]`);

        try {
            // Try navigating to the fallback URL
            await page.goto(this.config.fallbackUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });

            await this.humanBehavior.humanDelay(2000, 4000);

            const recoveryValidation = await this.validatePageNavigation(page, this.config.fallbackUrl, sessionId);
            
            if (recoveryValidation.success) {
                Logger.info(`✅ Navigation recovery successful [${sessionId}]`);
            } else {
                Logger.warn(`⚠️ Navigation recovery partially successful [${sessionId}]`);
            }

        } catch (error) {
            Logger.error(`❌ Navigation recovery failed [${sessionId}]:`, error);
        }
    }

    /**
     * Navigate to target URL with realistic behavior (legacy method)
     */
    async navigateToTarget(page, url, sessionId) {
        Logger.info(`🔗 Navigating to: ${url} [${sessionId}]`);

        try {
            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            // Wait for page to fully load
            await this.humanBehavior.humanDelay(3000, 5000);

            Logger.info(`✅ Successfully loaded: ${url} [${sessionId}]`);

        } catch (error) {
            Logger.error(`❌ Navigation failed for ${url} [${sessionId}]:`, error);
            throw error;
        }
    }

    /**
     * Execute realistic user engagement simulation
     */
    async executeUserEngagement(page, sessionId, options = {}) {
        const engagementTime = this.calculateEngagementTime();
        const startTime = Date.now();

        Logger.info(`🎭 Starting user engagement simulation for ${engagementTime/1000}s [${sessionId}]`);

        const engagementResults = {
            totalTime: engagementTime,
            scrollActions: 0,
            clickActions: 0,
            mouseMovements: 0,
            interactions: []
        };

        try {
            // Execute engagement actions over the specified time
            const endTime = startTime + engagementTime;
            
            while (Date.now() < endTime) {
                const action = this.selectRandomEngagementAction();
                
                switch (action) {
                    case 'scroll':
                        await this.performRealisticScrolling(page);
                        engagementResults.scrollActions++;
                        break;
                        
                    case 'click':
                        await this.performRandomClick(page);
                        engagementResults.clickActions++;
                        break;
                        
                    case 'mouse_move':
                        await this.performMouseMovement(page);
                        engagementResults.mouseMovements++;
                        break;
                }

                engagementResults.interactions.push({
                    action,
                    timestamp: Date.now() - startTime
                });

                // Random pause between actions
                await this.humanBehavior.humanDelay(2000, 8000);
            }

            const actualTime = Date.now() - startTime;
            this.updateEngagementMetrics(sessionId, actualTime);

            Logger.info(`✅ Completed user engagement simulation [${sessionId}] - Actual time: ${actualTime/1000}s`);

            return engagementResults;

        } catch (error) {
            Logger.error(`❌ User engagement failed [${sessionId}]:`, error);
            throw error;
        }
    }

    /**
     * Calculate realistic engagement time
     */
    calculateEngagementTime() {
        const min = this.config.minEngagementTime;
        const max = this.config.maxEngagementTime;
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Select random engagement action with weighted probability
     */
    selectRandomEngagementAction() {
        const actions = [
            { action: 'scroll', weight: 0.5 },
            { action: 'mouse_move', weight: 0.3 },
            { action: 'click', weight: 0.2 }
        ];

        const random = Math.random();
        let cumulative = 0;

        for (const item of actions) {
            cumulative += item.weight;
            if (random <= cumulative) {
                return item.action;
            }
        }

        return 'scroll'; // fallback
    }

    /**
     * Perform realistic scrolling behavior
     */
    async performRealisticScrolling(page) {
        try {
            const scrollDistance = Math.floor(Math.random() * 500) + 200;
            const direction = Math.random() > 0.1 ? 'down' : 'up'; // 90% down, 10% up

            await page.evaluate((distance, dir) => {
                const scrollAmount = dir === 'down' ? distance : -distance;
                window.scrollBy({
                    top: scrollAmount,
                    behavior: 'smooth'
                });
            }, scrollDistance, direction);

            await this.humanBehavior.humanDelay(1000, 3000);

        } catch (error) {
            Logger.warn(`⚠️ Scrolling action failed:`, error.message);
        }
    }

    /**
     * Perform random click on page elements
     */
    async performRandomClick(page) {
        try {
            const clickableElements = await page.$$('a, button, [onclick], .btn, .link');
            
            if (clickableElements.length > 0) {
                const randomElement = clickableElements[Math.floor(Math.random() * clickableElements.length)];
                
                // Get element position for realistic clicking
                const box = await randomElement.boundingBox();
                if (box) {
                    const x = box.x + Math.random() * box.width;
                    const y = box.y + Math.random() * box.height;
                    
                    await page.mouse.click(x, y);
                    await this.humanBehavior.humanDelay(1000, 2000);
                }
            }

        } catch (error) {
            Logger.warn(`⚠️ Click action failed:`, error.message);
        }
    }

    /**
     * Perform realistic mouse movement
     */
    async performMouseMovement(page) {
        try {
            const viewport = await page.viewport();
            const x = Math.random() * viewport.width;
            const y = Math.random() * viewport.height;

            await page.mouse.move(x, y);
            await this.humanBehavior.humanDelay(500, 1500);

        } catch (error) {
            Logger.warn(`⚠️ Mouse movement failed:`, error.message);
        }
    }

    /**
     * Update engagement metrics for analytics
     */
    updateEngagementMetrics(sessionId, engagementTime) {
        this.sessionState.engagementMetrics.set(sessionId, {
            engagementTime,
            timestamp: Date.now()
        });

        // Update average engagement time
        const allTimes = Array.from(this.sessionState.engagementMetrics.values())
            .map(m => m.engagementTime);
        
        this.sessionState.protocolStats.averageEngagementTime = 
            allTimes.reduce((sum, time) => sum + time, 0) / allTimes.length;
    }

    /**
     * Finalize session and cleanup resources
     */
    async finalizeSession(browser, sessionId, results) {
        try {
            // Close redirection context if it exists
            const redirectionSessionId = `${sessionId}_redirect`;
            const redirectionSession = this.sessionState.activeSessions.get(redirectionSessionId);
            
            if (redirectionSession) {
                Logger.info(`🧹 Cleaning up redirection session [${redirectionSessionId}]`);
                
                try {
                    // Close redirection page
                    if (redirectionSession.page && !redirectionSession.page.isClosed()) {
                        await redirectionSession.page.close();
                    }
                    
                    // Close redirection context
                    if (redirectionSession.context) {
                        await redirectionSession.context.close();
                    }
                    
                    // Update redirection session status
                    redirectionSession.status = 'completed';
                    redirectionSession.endTime = Date.now();
                    redirectionSession.duration = redirectionSession.endTime - redirectionSession.startTime;
                    
                    Logger.info(`✅ Redirection session cleaned up [${redirectionSessionId}] - Duration: ${redirectionSession.duration/1000}s`);
                    
                } catch (redirectError) {
                    Logger.error(`❌ Failed to cleanup redirection session [${redirectionSessionId}]:`, redirectError);
                }
            }

            // Check if this is a Bangladesh proxy browser and release it properly
            const session = this.sessionState.activeSessions.get(sessionId);
            if (session && session.isBangladeshProxy) {
                Logger.info(`🇧🇩 Releasing Bangladesh proxy browser back to pool [${sessionId}]`);
                
                // Release the Bangladesh proxy browser back to the pool
                if (this.browserPool && typeof this.browserPool.releaseBrowser === 'function') {
                    await this.browserPool.releaseBrowser(browser);
                } else {
                    // Fallback: close browser directly
                    if (browser && (!browser.isConnected || browser.isConnected())) {
                        await browser.close();
                    }
                }
                
                // Track proxy usage completion
                if (session.proxyInfo && this.browserPool.proxyManager) {
                    // Extract host from server string (format: "host:port")
                    const proxyHost = session.proxyInfo.server ? session.proxyInfo.server.split(':')[0] : 'unknown';
                    this.browserPool.proxyManager.trackGoogleSearchUsage(
                        proxyHost,
                        'completed',
                        { sessionId, duration: session.duration }
                    );
                }
            } else {
                // Standard browser cleanup
                if (browser && (!browser.isConnected || browser.isConnected())) {
                    await browser.close();
                }
            }
            
            // Update main session status
            if (session) {
                session.status = 'completed';
                session.endTime = Date.now();
                session.duration = session.endTime - session.startTime;
            }

            // Update protocol statistics
            this.sessionState.protocolStats.totalSearches++;

            Logger.info(`🏁 Finalized complete session [${sessionId}] - Duration: ${session?.duration/1000}s`);

        } catch (error) {
            Logger.error(`❌ Session finalization failed [${sessionId}]:`, error);
        }
    }

    /**
     * Generate unique session identifier
     */
    generateSessionId() {
        return `kms-search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get protocol analytics and statistics
     */
    getAnalytics() {
        return {
            protocolStats: { ...this.sessionState.protocolStats },
            activeSessions: this.sessionState.activeSessions.size,
            totalEngagements: this.sessionState.engagementMetrics.size,
            averageEngagementTime: this.sessionState.protocolStats.averageEngagementTime
        };
    }

    /**
     * Reset protocol state
     */
    resetProtocol() {
        this.sessionState.activeSessions.clear();
        this.sessionState.searchResults.clear();
        this.sessionState.engagementMetrics.clear();
        this.sessionState.protocolStats = {
            totalSearches: 0,
            directHits: 0,
            fallbackNavigations: 0,
            averageEngagementTime: 0
        };

        Logger.info(`🔄 Protocol state reset completed`);
    }
}

module.exports = KMSSearchProtocol;