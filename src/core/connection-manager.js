/**
 * Connection Manager
 * Provides seamless transition between direct and proxy connections
 * Handles automatic failover and connection optimization
 */

const { defaultLogger: Logger } = require('../utils/logger');

class ConnectionManager {
    constructor(proxyManager, options = {}) {
        this.proxyManager = proxyManager;
        this.options = {
            enableDirectFallback: options.enableDirectFallback !== false,
            enableProxyFirst: options.enableProxyFirst !== false,
            maxDirectRetries: options.maxDirectRetries || 2,
            maxProxyRetries: options.maxProxyRetries || 3,
            connectionTimeout: options.connectionTimeout || 10000,
            requestTimeout: options.requestTimeout || 30000,
            healthCheckInterval: options.healthCheckInterval || 300000, // 5 minutes
            ...options
        };
        
        this.connectionStats = {
            directConnections: 0,
            proxyConnections: 0,
            directFailures: 0,
            proxyFailures: 0,
            totalRequests: 0,
            averageResponseTime: 0
        };
        
        this.connectionMode = 'auto'; // 'auto', 'proxy-only', 'direct-only'
        this.lastHealthCheck = null;
        this.isHealthy = true;
    }

    /**
     * Make a request with automatic connection method selection
     */
    async makeRequest(url, options = {}) {
        const startTime = Date.now();
        this.connectionStats.totalRequests++;
        
        try {
            let response;
            
            switch (this.connectionMode) {
                case 'proxy-only':
                    response = await this.makeProxyRequest(url, options);
                    break;
                    
                case 'direct-only':
                    response = await this.makeDirectRequest(url, options);
                    break;
                    
                default: // 'auto'
                    response = await this.makeAutoRequest(url, options);
            }
            
            const responseTime = Date.now() - startTime;
            this.updateAverageResponseTime(responseTime);
            
            return response;
            
        } catch (error) {
            Logger.error('❌ All connection methods failed:', error.message);
            throw error;
        }
    }

    /**
     * Automatic request with intelligent fallback
     */
    async makeAutoRequest(url, options = {}) {
        const useProxyFirst = this.options.enableProxyFirst && this.isProxyHealthy();
        
        if (useProxyFirst) {
            try {
                const response = await this.makeProxyRequest(url, options);
                this.connectionStats.proxyConnections++;
                Logger.debug('✅ Request successful via proxy connection');
                return response;
            } catch (proxyError) {
                Logger.warn('⚠️ Proxy request failed, attempting direct connection:', proxyError.message);
                this.connectionStats.proxyFailures++;
                
                if (this.options.enableDirectFallback) {
                    try {
                        const response = await this.makeDirectRequest(url, options);
                        this.connectionStats.directConnections++;
                        Logger.debug('✅ Request successful via direct connection fallback');
                        return response;
                    } catch (directError) {
                        this.connectionStats.directFailures++;
                        throw new Error(`Both proxy and direct connections failed. Proxy: ${proxyError.message}, Direct: ${directError.message}`);
                    }
                }
                
                throw proxyError;
            }
        } else {
            // Try direct first
            try {
                const response = await this.makeDirectRequest(url, options);
                this.connectionStats.directConnections++;
                Logger.debug('✅ Request successful via direct connection');
                return response;
            } catch (directError) {
                Logger.warn('⚠️ Direct request failed, attempting proxy connection:', directError.message);
                this.connectionStats.directFailures++;
                
                try {
                    const response = await this.makeProxyRequest(url, options);
                    this.connectionStats.proxyConnections++;
                    Logger.debug('✅ Request successful via proxy connection fallback');
                    return response;
                } catch (proxyError) {
                    this.connectionStats.proxyFailures++;
                    throw new Error(`Both direct and proxy connections failed. Direct: ${directError.message}, Proxy: ${proxyError.message}`);
                }
            }
        }
    }

    /**
     * Make request through proxy
     */
    async makeProxyRequest(url, options = {}) {
        if (!this.proxyManager) {
            throw new Error('Proxy manager not available');
        }
        
        const requestOptions = {
            ...options,
            timeout: this.options.requestTimeout,
            connectTimeout: this.options.connectionTimeout,
            maxRetries: this.options.maxProxyRetries
        };
        
        return await this.proxyManager.makeRequest(url, requestOptions);
    }

    /**
     * Make direct request
     */
    async makeDirectRequest(url, options = {}) {
        const axios = require('axios');
        
        const requestOptions = {
            ...options,
            timeout: this.options.requestTimeout,
            validateStatus: (status) => status < 500,
            maxRedirects: options.maxRedirects || 5
        };
        
        let lastError;
        
        for (let attempt = 1; attempt <= this.options.maxDirectRetries; attempt++) {
            try {
                const response = await axios.get(url, requestOptions);
                return response;
            } catch (error) {
                lastError = error;
                Logger.warn(`🔄 Direct request attempt ${attempt}/${this.options.maxDirectRetries} failed:`, error.message);
                
                if (attempt < this.options.maxDirectRetries) {
                    await this.delay(1000 * attempt);
                }
            }
        }
        
        throw lastError;
    }

    /**
     * Check if proxy system is healthy
     */
    isProxyHealthy() {
        if (!this.proxyManager) return false;
        
        try {
            const stats = this.proxyManager.getStats();
            const hasActiveProxies = stats.combined ? 
                stats.combined.activeProxies > 0 : 
                stats.activeProxies > 0;
            
            return hasActiveProxies;
        } catch (error) {
            return false;
        }
    }

    /**
     * Set connection mode
     */
    setConnectionMode(mode) {
        const validModes = ['auto', 'proxy-only', 'direct-only'];
        if (!validModes.includes(mode)) {
            throw new Error(`Invalid connection mode: ${mode}. Valid modes: ${validModes.join(', ')}`);
        }
        
        this.connectionMode = mode;
        Logger.info(`🔄 Connection mode set to: ${mode}`);
    }

    /**
     * Get current connection mode
     */
    getConnectionMode() {
        return this.connectionMode;
    }

    /**
     * Perform health check
     */
    async performHealthCheck() {
        Logger.info('🔍 Performing connection health check...');
        
        const testUrl = 'https://httpbin.org/ip';
        const healthResults = {
            direct: false,
            proxy: false,
            timestamp: new Date()
        };
        
        // Test direct connection
        try {
            await this.makeDirectRequest(testUrl, { timeout: 10000 });
            healthResults.direct = true;
            Logger.info('✅ Direct connection healthy');
        } catch (error) {
            Logger.warn('❌ Direct connection unhealthy:', error.message);
        }
        
        // Test proxy connection
        try {
            await this.makeProxyRequest(testUrl, { timeout: 10000 });
            healthResults.proxy = true;
            Logger.info('✅ Proxy connection healthy');
        } catch (error) {
            Logger.warn('❌ Proxy connection unhealthy:', error.message);
        }
        
        this.isHealthy = healthResults.direct || healthResults.proxy;
        this.lastHealthCheck = healthResults.timestamp;
        
        return healthResults;
    }

    /**
     * Start automatic health checks
     */
    startHealthChecks() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        
        this.healthCheckInterval = setInterval(async () => {
            try {
                await this.performHealthCheck();
            } catch (error) {
                Logger.error('❌ Health check failed:', error);
            }
        }, this.options.healthCheckInterval);
        
        Logger.info(`🔄 Started health checks (interval: ${this.options.healthCheckInterval}ms)`);
    }

    /**
     * Stop health checks
     */
    stopHealthChecks() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
            Logger.info('⏹️ Stopped health checks');
        }
    }

    /**
     * Get connection statistics
     */
    getStats() {
        const totalConnections = this.connectionStats.directConnections + this.connectionStats.proxyConnections;
        const totalFailures = this.connectionStats.directFailures + this.connectionStats.proxyFailures;
        const successRate = totalConnections > 0 ? 
            ((totalConnections / (totalConnections + totalFailures)) * 100).toFixed(2) : 0;
        
        return {
            ...this.connectionStats,
            connectionMode: this.connectionMode,
            isHealthy: this.isHealthy,
            lastHealthCheck: this.lastHealthCheck,
            successRate: `${successRate}%`,
            proxyHealthy: this.isProxyHealthy()
        };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.connectionStats = {
            directConnections: 0,
            proxyConnections: 0,
            directFailures: 0,
            proxyFailures: 0,
            totalRequests: 0,
            averageResponseTime: 0
        };
        Logger.info('📊 Connection statistics reset');
    }

    /**
     * Update average response time
     */
    updateAverageResponseTime(responseTime) {
        const totalRequests = this.connectionStats.totalRequests;
        const currentAverage = this.connectionStats.averageResponseTime;
        
        this.connectionStats.averageResponseTime = 
            ((currentAverage * (totalRequests - 1)) + responseTime) / totalRequests;
    }

    /**
     * Delay utility
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        Logger.info('🔄 Shutting down connection manager...');
        
        this.stopHealthChecks();
        
        if (this.proxyManager && typeof this.proxyManager.shutdown === 'function') {
            await this.proxyManager.shutdown();
        }
        
        Logger.info('✅ Connection manager shutdown complete');
    }
}

module.exports = ConnectionManager;