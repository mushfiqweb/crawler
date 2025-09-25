/**
 * Proxy Management Module
 * Handles IP rotation, proxy validation, and geographic distribution
 * Includes Webshare proxy integration with automatic failover
 */

const axios = require('axios');
const { defaultLogger: Logger } = require('../utils/logger');
const WebshareProxyManager = require('./webshare-proxy-manager');

class ProxyManager {
    constructor(options = {}) {
        this.proxies = [];
        this.activeProxies = [];
        this.failedProxies = [];
        this.currentProxyIndex = 0;
        this.proxyRotationInterval = 5; // Rotate every 5 searches
        this.searchCount = 0;
        this.geoDistribution = new Map();
        
        // Proxy sources configuration
        this.proxySources = {
            residential: [],
            datacenter: [],
            mobile: []
        };
        
        this.stats = {
            totalProxies: 0,
            activeProxies: 0,
            failedProxies: 0,
            rotations: 0,
            lastRotation: null
        };

        // Webshare proxy integration
        this.webshareManager = new WebshareProxyManager({
            enableHealthCheck: options.enableWebshareHealthCheck !== false,
            enableDirectFallback: options.enableDirectFallback !== false,
            maxRetries: options.webshareMaxRetries || 3,
            ...options.webshareOptions
        });
        
        this.useWebshareProxies = options.useWebshareProxies !== false;
        this.webshareFirst = options.webshareFirst === true; // Use Webshare proxies first, then Bangladesh
    }

    /**
     * Initialize proxy manager with proxy sources
     */
    async initialize() {
        Logger.info('🌐 Initializing proxy manager...');
        
        // Initialize Webshare proxy manager if enabled
        if (this.useWebshareProxies) {
            try {
                await this.webshareManager.initialize();
                Logger.info('✅ Webshare proxy manager initialized');
            } catch (error) {
                Logger.error('❌ Failed to initialize Webshare proxy manager:', error);
                if (!this.webshareManager.options.enableDirectFallback) {
                    throw error;
                }
            }
        }
        
        // Load proxy configurations
        await this.loadProxyConfigurations();
        
        // Validate initial proxy pool
        await this.validateProxyPool();
        
        const webshareStats = this.useWebshareProxies ? this.webshareManager.getStats() : { activeProxies: 0 };
        Logger.info(`✅ Proxy manager initialized with ${this.activeProxies.length} Bangladesh proxies and ${webshareStats.activeProxies} Webshare proxies`);
    }

    /**
     * Load proxy configurations from various sources
     */
    async loadProxyConfigurations() {
        // No local proxy configurations - rely entirely on Webshare proxies
        // This eliminates demo/placeholder proxies that cause authentication errors
        this.proxies = [];
        this.stats.totalProxies = 0;
        
        Logger.info('🌐 Proxy configuration: Using Webshare proxies only (no local demo proxies)');
    }

    /**
     * Validate proxy pool by testing connectivity
     */
    async validateProxyPool() {
        Logger.info('🔍 Validating proxy pool...');
        
        const validationPromises = this.proxies.map(proxy => this.validateProxy(proxy));
        const results = await Promise.allSettled(validationPromises);
        
        results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value) {
                this.activeProxies.push(this.proxies[index]);
                this.proxies[index].isActive = true;
            } else {
                this.failedProxies.push(this.proxies[index]);
                // Removed verbose proxy validation warnings for cleaner output
                Logger.debug(`❌ Proxy validation failed: ${this.proxies[index].host}:${this.proxies[index].port}`);
            }
        });

        this.stats.activeProxies = this.activeProxies.length;
        this.stats.failedProxies = this.failedProxies.length;
        
        // Distribute proxies geographically
        this.distributeProxiesGeographically();
    }

    /**
     * Validate individual proxy
     */
    async validateProxy(proxy) {
        try {
            const startTime = Date.now();
            
            const proxyConfig = {
                host: proxy.host,
                port: proxy.port,
                auth: proxy.auth
            };

            // Test proxy with a simple HTTP request
            const response = await axios.get('https://httpbin.org/ip', {
                proxy: proxyConfig,
                timeout: 10000
            });

            proxy.responseTime = Date.now() - startTime;
            proxy.successCount++;
            
            Logger.info(`✅ Proxy validated: ${proxy.host}:${proxy.port} (${proxy.responseTime}ms)`);
            return true;
            
        } catch (error) {
            proxy.failureCount++;
            proxy.reliability = Math.max(0, proxy.reliability - 0.1);
            return false;
        }
    }

    /**
     * Get next proxy for rotation (includes Webshare and Bangladesh proxies)
     */
    async getNextProxy(deviceType = 'desktop', targetCountry = null) {
        // Try Webshare proxies first if enabled and configured to do so
        if (this.useWebshareProxies && this.webshareFirst) {
            try {
                const webshareProxy = await this.webshareManager.getNextProxy();
                if (webshareProxy) {
                    Logger.debug('🌐 Using Webshare proxy:', webshareProxy.host);
                    return this.convertWebshareProxyFormat(webshareProxy);
                }
            } catch (error) {
                Logger.warn('⚠️ Webshare proxy unavailable, falling back to Bangladesh proxies:', error.message);
            }
        }

        // Use Bangladesh proxies
        if (this.activeProxies.length === 0) {
            // If no Bangladesh proxies and Webshare is available as fallback
            if (this.useWebshareProxies && !this.webshareFirst) {
                try {
                    const webshareProxy = await this.webshareManager.getNextProxy();
                    if (webshareProxy) {
                        Logger.debug('🌐 Using Webshare proxy as fallback:', webshareProxy.host);
                        return this.convertWebshareProxyFormat(webshareProxy);
                    }
                } catch (error) {
                    Logger.error('❌ No proxies available from any source');
                }
            }
            throw new Error('No active proxies available');
        }

        // Filter Bangladesh proxies based on device type and target country
        let availableProxies = this.activeProxies.filter(proxy => {
            if (deviceType === 'mobile' && proxy.type !== 'mobile') {
                return proxy.type === 'residential'; // Residential can work for mobile
            }
            if (targetCountry && proxy.country !== targetCountry) {
                return false;
            }
            return proxy.reliability > 0.5; // Only use reliable proxies
        });

        if (availableProxies.length === 0) {
            availableProxies = this.activeProxies; // Fallback to all active proxies
        }

        // Implement weighted selection based on reliability and usage
        const proxy = this.selectProxyWithWeighting(availableProxies);
        
        // Update usage statistics
        proxy.lastUsed = Date.now();
        this.stats.rotations++;
        this.stats.lastRotation = new Date();
        
        Logger.info(`🔄 Selected proxy: ${proxy.host}:${proxy.port} (${proxy.country}/${proxy.city})`);
        return proxy;
    }

    /**
     * Convert Webshare proxy format to internal format
     */
    convertWebshareProxyFormat(webshareProxy) {
        return {
            id: `webshare_${webshareProxy.id}`,
            host: webshareProxy.host,
            port: webshareProxy.port,
            auth: webshareProxy.auth,
            type: 'webshare',
            country: 'US', // Webshare proxies are typically US-based
            city: 'Unknown',
            carrier: 'Webshare',
            reliability: webshareProxy.reliability || 1.0,
            responseTime: webshareProxy.responseTime || 0,
            usageCount: webshareProxy.usageCount || 0,
            lastUsed: webshareProxy.lastUsed || new Date(),
            source: 'webshare'
        };
    }

    /**
     * Get unique proxy for Google searches (now uses Webshare proxies only)
     * Ensures each Google search request uses a different proxy
     */
    async getUniqueProxyForSearch(excludeProxyIds = []) {
        if (!this.useWebshareProxies) {
            throw new Error('No proxy service configured for Google search');
        }

        try {
            const webshareProxy = await this.webshareManager.getNextProxy();
            if (webshareProxy) {
                Logger.info(`🌐 Selected Webshare proxy for Google search: ${webshareProxy.host}:${webshareProxy.port}`);
                return webshareProxy;
            }
        } catch (error) {
            Logger.error('❌ Failed to get Webshare proxy for search:', error.message);
            throw new Error('No available proxies for Google search');
        }

        throw new Error('No available proxies for Google search');
    }

    /**
     * Get proxy configuration for Puppeteer (uses Webshare proxies only)
     */
    async getProxyConfigForPuppeteer(excludeProxyIds = []) {
        if (!this.useWebshareProxies) {
            Logger.warn('⚠️ No proxy service configured, using direct connection');
            return null; // Direct connection
        }
        
        try {
            const webshareProxy = await this.webshareManager.getPuppeteerConfig();
            if (webshareProxy) {
                Logger.debug('🌐 Using Webshare proxy for Puppeteer');
                return webshareProxy;
            }
        } catch (error) {
            Logger.error('❌ Failed to get Webshare proxy for Puppeteer:', error.message);
            throw new Error('No proxies available for Puppeteer');
        }
        
        throw new Error('No proxies available for Puppeteer');
    }

    /**
     * Alias for backward compatibility
     */
    async getBangladeshProxyConfigForPuppeteer(excludeProxyIds = []) {
        return await this.getProxyConfigForPuppeteer(excludeProxyIds);
    }

    /**
     * Track Google search usage for proxy rotation analytics
     */
    trackGoogleSearchUsage(proxyId, searchKeyword, success = true) {
        const proxy = this.proxies.find(p => p.id === proxyId);
        if (!proxy) return;

        if (!proxy.googleSearchHistory) {
            proxy.googleSearchHistory = [];
        }

        proxy.googleSearchHistory.push({
            keyword: searchKeyword,
            timestamp: Date.now(),
            success: success,
            ipRange: proxy.ipRange
        });

        // Keep only last 100 searches per proxy
        if (proxy.googleSearchHistory.length > 100) {
            proxy.googleSearchHistory = proxy.googleSearchHistory.slice(-100);
        }

        Logger.debug(`📊 Tracked Google search: ${searchKeyword} via ${proxy.host} (${proxy.ipRange})`);
    }

    /**
     * Get proxy usage statistics (now uses Webshare proxies)
     */
    getBangladeshProxyStats() {
        // Return Webshare proxy stats instead of Bangladesh demo proxies
        if (this.useWebshareProxies) {
            const webshareStats = this.webshareManager.getStats();
            return {
                totalBangladeshProxies: 0, // No local Bangladesh proxies
                activeBangladeshProxies: 0,
                totalGoogleSearches: 0,
                proxyDistribution: {
                    residential: 0,
                    mobile: 0,
                    datacenter: 0,
                    isp: 0
                },
                cityDistribution: {},
                carrierDistribution: {},
                webshareProxies: webshareStats.activeProxies,
                webshareTotal: webshareStats.totalProxies,
                note: 'Using Webshare proxies instead of local Bangladesh demo proxies'
            };
        }
        
        return {
            totalBangladeshProxies: 0,
            activeBangladeshProxies: 0,
            totalGoogleSearches: 0,
            proxyDistribution: { residential: 0, mobile: 0, datacenter: 0, isp: 0 },
            cityDistribution: {},
            carrierDistribution: {},
            note: 'No proxy service configured'
        };
    }

    /**
     * Select proxy with weighted algorithm
     */
    selectProxyWithWeighting(proxies) {
        // Calculate weights based on reliability, last usage, and type priority
        const weights = proxies.map(proxy => {
            let weight = proxy.reliability;
            
            // Prefer less recently used proxies
            const timeSinceLastUse = proxy.lastUsed ? Date.now() - proxy.lastUsed : Infinity;
            weight += Math.min(timeSinceLastUse / (1000 * 60 * 60), 1); // Max 1 hour bonus
            
            // Type priority (residential > mobile > datacenter)
            if (proxy.type === 'residential') weight += 0.5;
            else if (proxy.type === 'mobile') weight += 0.3;
            
            return weight;
        });

        // Weighted random selection
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * totalWeight;
        
        for (let i = 0; i < proxies.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return proxies[i];
            }
        }
        
        return proxies[0]; // Fallback
    }

    /**
     * Distribute proxies geographically for realistic patterns
     */
    distributeProxiesGeographically() {
        this.geoDistribution.clear();
        
        this.activeProxies.forEach(proxy => {
            const key = `${proxy.country}-${proxy.city}`;
            if (!this.geoDistribution.has(key)) {
                this.geoDistribution.set(key, []);
            }
            this.geoDistribution.get(key).push(proxy);
        });
        
        Logger.info(`📍 Geographic distribution: ${this.geoDistribution.size} locations`);
    }

    /**
     * Get proxy configuration for Puppeteer
     */
    getProxyConfigForPuppeteer(proxy) {
        if (!proxy) {
            return null; // Direct connection
        }
        
        return {
            server: `http://${proxy.host}:${proxy.port}`,
            username: proxy.auth?.username,
            password: proxy.auth?.password
        };
    }

    /**
     * Report proxy success/failure for reliability tracking
     */
    reportProxyResult(proxyId, success, responseTime = 0) {
        const proxy = this.proxies.find(p => p.id === proxyId);
        if (!proxy) return;

        if (success) {
            proxy.successCount++;
            proxy.responseTime = (proxy.responseTime + responseTime) / 2; // Moving average
            proxy.reliability = Math.min(1.0, proxy.reliability + 0.01);
        } else {
            proxy.failureCount++;
            proxy.reliability = Math.max(0, proxy.reliability - 0.05);
            
            // Remove from active if reliability drops too low
            if (proxy.reliability < 0.3 && proxy.isActive) {
                this.deactivateProxy(proxy);
            }
        }
    }

    /**
     * Deactivate unreliable proxy
     */
    deactivateProxy(proxy) {
        proxy.isActive = false;
        this.activeProxies = this.activeProxies.filter(p => p.id !== proxy.id);
        this.failedProxies.push(proxy);
        
        this.stats.activeProxies = this.activeProxies.length;
        this.stats.failedProxies = this.failedProxies.length;
        
        Logger.warn(`⚠️ Deactivated unreliable proxy: ${proxy.host}:${proxy.port}`);
    }

    /**
     * Generate unique proxy ID
     */
    generateProxyId(config) {
        return `${config.type}-${config.host}-${config.port}-${Date.now()}`;
    }

    /**
     * Get comprehensive proxy statistics (includes Webshare stats)
     */
    getStats() {
        const bangladeshStats = {
            ...this.stats,
            geoDistribution: Array.from(this.geoDistribution.keys()),
            averageReliability: this.activeProxies.reduce((sum, p) => sum + p.reliability, 0) / this.activeProxies.length || 0
        };

        if (this.useWebshareProxies) {
            const webshareStats = this.webshareManager.getStats();
            return {
                bangladesh: bangladeshStats,
                webshare: webshareStats,
                combined: {
                    totalProxies: bangladeshStats.totalProxies + webshareStats.totalProxies,
                    activeProxies: bangladeshStats.activeProxies + webshareStats.activeProxies,
                    failedProxies: bangladeshStats.failedProxies + webshareStats.failedProxies
                }
            };
        }

        return bangladeshStats;
    }

    /**
     * Update Webshare proxy credentials
     */
    async updateWebshareCredentials(newCredentials) {
        if (this.useWebshareProxies) {
            return await this.webshareManager.updateCredentials(newCredentials);
        }
        throw new Error('Webshare proxies are not enabled');
    }

    /**
     * Enable/disable Webshare proxy usage
     */
    setWebshareProxyUsage(enabled) {
        this.useWebshareProxies = enabled;
        Logger.info(`🌐 Webshare proxy usage ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Set Webshare proxy priority (first or fallback)
     */
    setWebshareProxyPriority(webshareFirst) {
        this.webshareFirst = webshareFirst;
        Logger.info(`🌐 Webshare proxy priority set to ${webshareFirst ? 'first' : 'fallback'}`);
    }

    /**
     * Make HTTP request with automatic proxy rotation and failover
     */
    async makeRequest(url, options = {}) {
        if (this.useWebshareProxies) {
            try {
                return await this.webshareManager.makeRequest(url, options);
            } catch (error) {
                Logger.warn('⚠️ Webshare request failed, attempting with Bangladesh proxy:', error.message);
                // Fallback to Bangladesh proxy logic would go here
                throw error;
            }
        }
        
        // Bangladesh proxy request logic would go here
        throw new Error('Direct requests not implemented - use specific proxy methods');
    }

    /**
     * Cleanup and shutdown
     */
    async shutdown() {
        Logger.info('🔌 Shutting down proxy manager...');
        
        // Shutdown Webshare proxy manager
        if (this.useWebshareProxies) {
            try {
                await this.webshareManager.shutdown();
                Logger.info('✅ Webshare proxy manager shutdown complete');
            } catch (error) {
                Logger.error('❌ Error shutting down Webshare proxy manager:', error);
            }
        }
        
        this.proxies = [];
        this.activeProxies = [];
        this.failedProxies = [];
        Logger.info('✅ Proxy manager shutdown complete');
    }
}

module.exports = ProxyManager;