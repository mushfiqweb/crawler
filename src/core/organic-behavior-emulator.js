const { EventEmitter } = require('events');
const Logger = require('../utils/logger');

/**
 * Organic Behavior Emulator
 * Simulates human-like search patterns and interactions
 */
class OrganicBehaviorEmulator extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            enableRandomDelays: config.enableRandomDelays !== false,
            enableMouseMovement: config.enableMouseMovement !== false,
            enableScrolling: config.enableScrolling !== false,
            enableTypingSimulation: config.enableTypingSimulation !== false,
            minDelay: config.minDelay || 1000,
            maxDelay: config.maxDelay || 5000,
            searchPatterns: config.searchPatterns || ['random', 'sequential', 'focused'],
            userAgentRotation: config.userAgentRotation !== false,
            viewportVariation: config.viewportVariation !== false,
            ...config
        };

        this.behaviorPatterns = new Map();
        this.searchSessions = new Map();
        this.userAgents = this.generateUserAgents();
        this.viewports = this.generateViewports();
        
        this.stats = {
            sessionsCreated: 0,
            searchesPerformed: 0,
            averageSessionDuration: 0,
            behaviorPatternsUsed: 0
        };

        this.setupBehaviorPatterns();
    }

    /**
     * Setup different behavior patterns
     */
    setupBehaviorPatterns() {
        // Casual browsing pattern
        this.behaviorPatterns.set('casual', {
            searchFrequency: { min: 3000, max: 8000 },
            scrollBehavior: { speed: 'slow', pauses: true },
            mouseMovement: { frequency: 'low', randomness: 'high' },
            typingSpeed: { min: 80, max: 200 }, // ms per character
            sessionDuration: { min: 5 * 60 * 1000, max: 20 * 60 * 1000 }
        });

        // Focused research pattern
        this.behaviorPatterns.set('focused', {
            searchFrequency: { min: 1000, max: 3000 },
            scrollBehavior: { speed: 'medium', pauses: false },
            mouseMovement: { frequency: 'medium', randomness: 'low' },
            typingSpeed: { min: 50, max: 120 },
            sessionDuration: { min: 10 * 60 * 1000, max: 45 * 60 * 1000 }
        });

        // Quick browsing pattern
        this.behaviorPatterns.set('quick', {
            searchFrequency: { min: 500, max: 2000 },
            scrollBehavior: { speed: 'fast', pauses: false },
            mouseMovement: { frequency: 'high', randomness: 'medium' },
            typingSpeed: { min: 30, max: 80 },
            sessionDuration: { min: 2 * 60 * 1000, max: 10 * 60 * 1000 }
        });

        // Deep research pattern
        this.behaviorPatterns.set('deep', {
            searchFrequency: { min: 5000, max: 15000 },
            scrollBehavior: { speed: 'slow', pauses: true },
            mouseMovement: { frequency: 'low', randomness: 'low' },
            typingSpeed: { min: 100, max: 250 },
            sessionDuration: { min: 30 * 60 * 1000, max: 120 * 60 * 1000 }
        });
    }

    /**
     * Generate realistic user agents
     */
    generateUserAgents() {
        return [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ];
    }

    /**
     * Generate realistic viewport sizes
     */
    generateViewports() {
        return [
            { width: 1920, height: 1080 },
            { width: 1366, height: 768 },
            { width: 1536, height: 864 },
            { width: 1440, height: 900 },
            { width: 1280, height: 720 },
            { width: 1024, height: 768 },
            { width: 1600, height: 900 },
            { width: 2560, height: 1440 }
        ];
    }

    /**
     * Create a new organic search session
     */
    async createSearchSession(browserId, options = {}) {
        try {
            const sessionId = this.generateSessionId();
            const pattern = options.pattern || this.selectRandomPattern();
            const behaviorConfig = this.behaviorPatterns.get(pattern);
            
            const session = {
                id: sessionId,
                browserId,
                pattern,
                behaviorConfig,
                createdAt: Date.now(),
                lastActivity: Date.now(),
                searchCount: 0,
                userAgent: this.selectRandomUserAgent(),
                viewport: this.selectRandomViewport(),
                isActive: true,
                searchHistory: [],
                currentState: 'idle'
            };

            this.searchSessions.set(sessionId, session);
            this.stats.sessionsCreated++;

            Logger.info(`🎭 Created organic search session ${sessionId} with pattern: ${pattern}`);
            this.emit('sessionCreated', { sessionId, pattern, browserId });

            return sessionId;
        } catch (error) {
            Logger.error('❌ Failed to create search session:', error);
            throw error;
        }
    }

    /**
     * Perform organic search behavior
     */
    async performOrganicSearch(sessionId, page, searchQuery, options = {}) {
        const session = this.searchSessions.get(sessionId);
        if (!session || !session.isActive) {
            throw new Error('Invalid or inactive session');
        }

        try {
            session.currentState = 'searching';
            session.lastActivity = Date.now();

            // Apply user agent and viewport
            await this.applySessionSettings(page, session);

            // Pre-search behavior
            await this.performPreSearchBehavior(page, session);

            // Perform the actual search with organic typing
            await this.performOrganicTyping(page, searchQuery, session);

            // Post-search behavior
            await this.performPostSearchBehavior(page, session);

            // Record search
            session.searchHistory.push({
                query: searchQuery,
                timestamp: Date.now(),
                duration: Date.now() - session.lastActivity
            });
            session.searchCount++;
            this.stats.searchesPerformed++;

            session.currentState = 'idle';
            
            Logger.debug(`🔍 Performed organic search: "${searchQuery}" in session ${sessionId}`);
            this.emit('searchPerformed', { sessionId, query: searchQuery });

        } catch (error) {
            session.currentState = 'error';
            Logger.error('❌ Error performing organic search:', error);
            throw error;
        }
    }

    /**
     * Apply session settings to page
     */
    async applySessionSettings(page, session) {
        try {
            // Set user agent
            if (this.config.userAgentRotation) {
                await page.setUserAgent(session.userAgent);
            }

            // Set viewport
            if (this.config.viewportVariation) {
                await page.setViewport(session.viewport);
            }

        } catch (error) {
            Logger.warn('⚠️ Error applying session settings:', error.message);
        }
    }

    /**
     * Perform pre-search behavior (mouse movement, scrolling, etc.)
     */
    async performPreSearchBehavior(page, session) {
        try {
            const { behaviorConfig } = session;

            // Random delay before starting
            if (this.config.enableRandomDelays) {
                const delay = this.randomBetween(
                    behaviorConfig.searchFrequency.min,
                    behaviorConfig.searchFrequency.max
                );
                await this.sleep(delay);
            }

            // Mouse movement
            if (this.config.enableMouseMovement) {
                await this.simulateMouseMovement(page, behaviorConfig.mouseMovement);
            }

            // Scrolling behavior
            if (this.config.enableScrolling) {
                await this.simulateScrolling(page, behaviorConfig.scrollBehavior);
            }

        } catch (error) {
            Logger.debug('⚠️ Error in pre-search behavior:', error.message);
        }
    }

    /**
     * Perform organic typing simulation
     */
    async performOrganicTyping(page, text, session) {
        if (!this.config.enableTypingSimulation) {
            // Just type normally if simulation is disabled
            const searchInput = await page.$('input[type="search"], input[name="q"], #search-input, .search-input');
            if (searchInput) {
                await searchInput.type(text);
                await page.keyboard.press('Enter');
            }
            return;
        }

        try {
            const { behaviorConfig } = session;
            const searchInput = await page.$('input[type="search"], input[name="q"], #search-input, .search-input');
            
            if (searchInput) {
                await searchInput.click();
                
                // Clear existing text
                await page.keyboard.down('Control');
                await page.keyboard.press('KeyA');
                await page.keyboard.up('Control');
                
                // Type with human-like delays
                for (const char of text) {
                    await page.keyboard.type(char);
                    
                    // Random delay between characters
                    const delay = this.randomBetween(
                        behaviorConfig.typingSpeed.min,
                        behaviorConfig.typingSpeed.max
                    );
                    await this.sleep(delay);
                }

                // Random delay before pressing Enter
                await this.sleep(this.randomBetween(500, 1500));
                await page.keyboard.press('Enter');
            }

        } catch (error) {
            Logger.warn('⚠️ Error in organic typing:', error.message);
        }
    }

    /**
     * Perform post-search behavior
     */
    async performPostSearchBehavior(page, session) {
        try {
            const { behaviorConfig } = session;

            // Wait for results to load
            await this.sleep(this.randomBetween(1000, 3000));

            // Simulate reading behavior (scrolling through results)
            if (this.config.enableScrolling) {
                await this.simulateResultsReading(page, behaviorConfig.scrollBehavior);
            }

            // Random mouse movements over results
            if (this.config.enableMouseMovement) {
                await this.simulateResultsHovering(page, behaviorConfig.mouseMovement);
            }

        } catch (error) {
            Logger.debug('⚠️ Error in post-search behavior:', error.message);
        }
    }

    /**
     * Simulate mouse movement
     */
    async simulateMouseMovement(page, config) {
        try {
            const viewport = await page.viewport();
            const movements = config.frequency === 'high' ? 5 : config.frequency === 'medium' ? 3 : 1;

            for (let i = 0; i < movements; i++) {
                const x = this.randomBetween(0, viewport.width);
                const y = this.randomBetween(0, viewport.height);
                
                await page.mouse.move(x, y, { steps: this.randomBetween(5, 15) });
                await this.sleep(this.randomBetween(100, 500));
            }

        } catch (error) {
            Logger.debug('⚠️ Error simulating mouse movement:', error.message);
        }
    }

    /**
     * Simulate scrolling behavior
     */
    async simulateScrolling(page, config) {
        try {
            const scrolls = config.speed === 'fast' ? 3 : config.speed === 'medium' ? 2 : 1;
            
            for (let i = 0; i < scrolls; i++) {
                const scrollDistance = this.randomBetween(200, 800);
                await page.evaluate((distance) => {
                    window.scrollBy(0, distance);
                }, scrollDistance);

                if (config.pauses) {
                    await this.sleep(this.randomBetween(500, 2000));
                }
            }

        } catch (error) {
            Logger.debug('⚠️ Error simulating scrolling:', error.message);
        }
    }

    /**
     * Simulate reading search results
     */
    async simulateResultsReading(page, config) {
        try {
            // Scroll through results with reading pauses
            const scrollSteps = this.randomBetween(3, 8);
            
            for (let i = 0; i < scrollSteps; i++) {
                const scrollDistance = this.randomBetween(150, 400);
                await page.evaluate((distance) => {
                    window.scrollBy(0, distance);
                }, scrollDistance);

                // Pause to "read"
                const readingTime = this.randomBetween(1000, 4000);
                await this.sleep(readingTime);
            }

        } catch (error) {
            Logger.debug('⚠️ Error simulating results reading:', error.message);
        }
    }

    /**
     * Simulate hovering over search results
     */
    async simulateResultsHovering(page, config) {
        try {
            // Find result elements and hover over them
            const results = await page.$$('a[href*="http"], .result, .search-result');
            
            if (results.length > 0) {
                const hoverCount = Math.min(this.randomBetween(1, 3), results.length);
                
                for (let i = 0; i < hoverCount; i++) {
                    const randomResult = results[this.randomBetween(0, results.length - 1)];
                    await randomResult.hover();
                    await this.sleep(this.randomBetween(500, 1500));
                }
            }

        } catch (error) {
            Logger.debug('⚠️ Error simulating results hovering:', error.message);
        }
    }

    /**
     * Select random behavior pattern
     */
    selectRandomPattern() {
        const patterns = Array.from(this.behaviorPatterns.keys());
        return patterns[Math.floor(Math.random() * patterns.length)];
    }

    /**
     * Select random user agent
     */
    selectRandomUserAgent() {
        return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    }

    /**
     * Select random viewport
     */
    selectRandomViewport() {
        return this.viewports[Math.floor(Math.random() * this.viewports.length)];
    }

    /**
     * Generate random number between min and max
     */
    randomBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Sleep for specified milliseconds
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Generate session ID
     */
    generateSessionId() {
        return `organic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get session information
     */
    getSessionInfo(sessionId) {
        const session = this.searchSessions.get(sessionId);
        if (!session) return null;

        return {
            id: session.id,
            browserId: session.browserId,
            pattern: session.pattern,
            createdAt: session.createdAt,
            searchCount: session.searchCount,
            isActive: session.isActive,
            currentState: session.currentState
        };
    }

    /**
     * Get behavior statistics
     */
    getBehaviorStats() {
        const activeSessions = Array.from(this.searchSessions.values()).filter(s => s.isActive);
        const totalDuration = activeSessions.reduce((sum, session) => {
            return sum + (Date.now() - session.createdAt);
        }, 0);

        return {
            ...this.stats,
            activeSessions: activeSessions.length,
            averageSessionDuration: activeSessions.length > 0 ? totalDuration / activeSessions.length : 0,
            patternDistribution: this.getPatternDistribution()
        };
    }

    /**
     * Get pattern distribution
     */
    getPatternDistribution() {
        const distribution = {};
        for (const session of this.searchSessions.values()) {
            distribution[session.pattern] = (distribution[session.pattern] || 0) + 1;
        }
        return distribution;
    }

    /**
     * Cleanup expired sessions
     */
    cleanupExpiredSessions() {
        const now = Date.now();
        const expiredSessions = [];

        for (const [sessionId, session] of this.searchSessions) {
            const maxDuration = session.behaviorConfig.sessionDuration.max;
            if (now - session.createdAt > maxDuration) {
                expiredSessions.push(sessionId);
            }
        }

        expiredSessions.forEach(sessionId => {
            this.searchSessions.delete(sessionId);
        });

        if (expiredSessions.length > 0) {
            Logger.info(`🧹 Cleaned up ${expiredSessions.length} expired organic sessions`);
        }
    }

    /**
     * Shutdown behavior emulator
     */
    async shutdown() {
        try {
            Logger.info('🎭 Shutting down Organic Behavior Emulator...');
            
            // Mark all sessions as inactive
            for (const session of this.searchSessions.values()) {
                session.isActive = false;
            }

            this.emit('shutdown');
            Logger.info('🎭 Organic Behavior Emulator shutdown complete');
        } catch (error) {
            Logger.error('❌ Error during behavior emulator shutdown:', error);
        }
    }
}

module.exports = { OrganicBehaviorEmulator };