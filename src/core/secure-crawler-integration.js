/**
 * Secure Crawler Integration
 * Demonstrates how to integrate all security components with the existing crawler
 */

const { SessionManager } = require('./session-manager');
const { defaultLogger: Logger } = require('../utils/logger');

class SecureCrawlerIntegration {
    constructor() {
        this.sessionManager = new SessionManager();
        this.isInitialized = false;
    }

    /**
     * Initialize the secure crawler system
     */
    async initialize() {
        if (this.isInitialized) return;
        
        Logger.info('🔐 Initializing Secure Crawler Integration...');
        
        try {
            await this.sessionManager.initialize();
            this.isInitialized = true;
            Logger.info('✅ Secure Crawler Integration initialized successfully');
        } catch (error) {
            Logger.error(`❌ Secure Crawler Integration initialization failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Execute a secure search with all protection measures
     * This method replaces your existing search execution
     */
    async executeSecureSearch(searchParams) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            // Create a new session for this search operation
            const session = await this.sessionManager.createSession({
                sessionType: searchParams.sessionType || 'researcher',
                deviceType: searchParams.deviceType || 'desktop',
                targetCountry: searchParams.targetCountry || 'US'
            });

            Logger.info(`🔍 Executing secure search in session: ${session.id}`);

            // Execute the search with full security measures
            const searchResult = await this.sessionManager.executeSessionSearch(
                session.id, 
                searchParams
            );

            return {
                success: true,
                sessionId: session.id,
                searchResult: searchResult,
                securityMetrics: {
                    proxyUsed: session.proxy?.country,
                    fingerprintGenerated: !!session.fingerprint,
                    behaviorSimulated: session.behaviorState,
                    detectionFlags: session.metrics.detectionFlags
                }
            };

        } catch (error) {
            Logger.error(`❌ Secure search execution failed: ${error.message}`);
            return {
                success: false,
                error: error.message,
                securityMetrics: null
            };
        }
    }

    /**
     * Execute multiple searches in a realistic session
     */
    async executeSearchSession(searchList, sessionOptions = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const results = [];
        let session = null;

        try {
            // Create session
            session = await this.sessionManager.createSession(sessionOptions);
            Logger.info(`🎭 Starting search session: ${session.id} with ${searchList.length} searches`);

            // Execute searches in sequence with realistic delays
            for (let i = 0; i < searchList.length; i++) {
                const searchParams = searchList[i];
                
                try {
                    const result = await this.sessionManager.executeSessionSearch(
                        session.id, 
                        searchParams
                    );
                    
                    results.push({
                        index: i,
                        success: true,
                        result: result,
                        timestamp: Date.now()
                    });

                    // Apply next delay if not the last search
                    if (i < searchList.length - 1 && result.nextDelay) {
                        Logger.info(`⏱️ Waiting ${result.nextDelay}ms before next search...`);
                        await this.sleep(result.nextDelay);
                    }

                } catch (searchError) {
                    Logger.error(`❌ Search ${i} failed: ${searchError.message}`);
                    results.push({
                        index: i,
                        success: false,
                        error: searchError.message,
                        timestamp: Date.now()
                    });

                    // Check if we should continue or abort
                    if (this.shouldAbortSession(searchError)) {
                        Logger.warn(`🛑 Aborting session due to critical error`);
                        break;
                    }
                }
            }

            return {
                sessionId: session.id,
                totalSearches: searchList.length,
                completedSearches: results.filter(r => r.success).length,
                results: results,
                sessionStats: this.sessionManager.getStats()
            };

        } finally {
            // End session if it was created
            if (session) {
                await this.sessionManager.endSession(session.id);
            }
        }
    }

    /**
     * Get comprehensive security statistics
     */
    getSecurityStats() {
        if (!this.isInitialized) {
            return { error: 'System not initialized' };
        }

        return this.sessionManager.getStats();
    }

    /**
     * Example integration with your existing crawler
     * Replace your existing search execution with this method
     */
    async integrateWithExistingCrawler(originalSearchFunction, searchParams) {
        // Wrap your existing search function with security measures
        const secureSearchParams = await this.prepareSecureSearchParams(searchParams);
        
        try {
            // Execute your original search function with secure parameters
            const result = await originalSearchFunction(secureSearchParams);
            
            // Log success metrics
            this.logSecurityMetrics(secureSearchParams, result, true);
            
            return result;
            
        } catch (error) {
            // Log failure metrics
            this.logSecurityMetrics(secureSearchParams, null, false);
            throw error;
        }
    }

    /**
     * Prepare search parameters with security enhancements
     */
    async prepareSecureSearchParams(originalParams) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        // Create a temporary session for parameter preparation
        const session = await this.sessionManager.createSession({
            sessionType: originalParams.sessionType || 'casual'
        });

        // Extract security configurations
        const secureParams = {
            ...originalParams,
            
            // Proxy configuration
            proxy: session.proxy ? {
                server: session.proxy.server || (session.proxy.host + ':' + session.proxy.port),
                username: session.proxy.username,
                password: session.proxy.password
            } : null,
            
            // Browser fingerprint
            userAgent: session.fingerprint.userAgent,
            viewport: session.fingerprint.viewport,
            extraHTTPHeaders: {
                'Accept-Language': session.fingerprint.languages.join(','),
                'Accept-Encoding': 'gzip, deflate, br'
            },
            
            // Behavior simulation
            delays: {
                beforeSearch: await session.behaviorSimulator?.calculateNextDelay() || 2000,
                afterResults: Math.random() * 3000 + 1000,
                betweenClicks: Math.random() * 1000 + 500
            },
            
            // Session context
            sessionId: session.id,
            securityLevel: 'maximum'
        };

        return secureParams;
    }

    /**
     * Log security metrics for monitoring
     */
    logSecurityMetrics(searchParams, result, success) {
        const metrics = {
            timestamp: Date.now(),
            sessionId: searchParams.sessionId,
            success: success,
            proxyUsed: !!searchParams.proxy,
            fingerprintApplied: !!searchParams.userAgent,
            delaysApplied: !!searchParams.delays,
            securityLevel: searchParams.securityLevel
        };

        Logger.info(`📊 Security Metrics: ${JSON.stringify(metrics)}`);
    }

    /**
     * Utility methods
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    shouldAbortSession(error) {
        const criticalErrors = [
            'maximum detection flags reached',
            'proxy pool exhausted',
            'session terminated',
            'rate limit exceeded'
        ];
        
        return criticalErrors.some(criticalError => 
            error.message.toLowerCase().includes(criticalError)
        );
    }

    /**
     * Shutdown the secure crawler system
     */
    async shutdown() {
        if (this.sessionManager) {
            await this.sessionManager.shutdown();
        }
        this.isInitialized = false;
        Logger.info('🔌 Secure Crawler Integration shutdown complete');
    }
}

/**
 * Example usage of the Secure Crawler Integration
 */
async function exampleUsage() {
    const secureCrawler = new SecureCrawlerIntegration();
    
    try {
        // Initialize the system
        await secureCrawler.initialize();
        
        // Example 1: Single secure search
        const singleSearchResult = await secureCrawler.executeSecureSearch({
            query: 'KMS Marketplace',
            platform: 'google',
            sessionType: 'researcher',
            deviceType: 'desktop',
            targetCountry: 'US'
        });
        
        console.log('Single search result:', singleSearchResult);
        
        // Example 2: Multiple searches in a session
        const searchList = [
            { query: 'KMS Marketplace', platform: 'google' },
            { query: 'KMS Tech solutions', platform: 'google' },
            { query: 'KMS Marketplace reviews', platform: 'google' }
        ];
        
        const sessionResult = await secureCrawler.executeSearchSession(searchList, {
            sessionType: 'professional',
            deviceType: 'desktop',
            targetCountry: 'US'
        });
        
        console.log('Session result:', sessionResult);
        
        // Example 3: Get security statistics
        const stats = secureCrawler.getSecurityStats();
        console.log('Security stats:', stats);
        
    } catch (error) {
        console.error('Example usage failed:', error);
    } finally {
        await secureCrawler.shutdown();
    }
}

module.exports = { 
    SecureCrawlerIntegration,
    exampleUsage
};

// Uncomment to run the example
// exampleUsage();