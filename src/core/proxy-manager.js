/**
 * Proxy Management Module
 * Handles IP rotation, proxy validation, and geographic distribution
 */

const axios = require('axios');
const { defaultLogger: Logger } = require('../utils/logger');

class ProxyManager {
    constructor() {
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
    }

    /**
     * Initialize proxy manager with proxy sources
     */
    async initialize() {
        Logger.info('🌐 Initializing proxy manager...');
        
        // Load proxy configurations
        await this.loadProxyConfigurations();
        
        // Validate initial proxy pool
        await this.validateProxyPool();
        
        Logger.info(`✅ Proxy manager initialized with ${this.activeProxies.length} active proxies`);
    }

    /**
     * Load proxy configurations from various sources
     */
    async loadProxyConfigurations() {
        // Example proxy configurations (replace with your actual proxy sources)
        const proxyConfigs = [
            // Residential proxies (highest priority for organic behavior)
            { type: 'residential', host: 'residential-proxy-1.com', port: 8080, auth: { username: 'user1', password: 'pass1' }, country: 'US', city: 'New York' },
            { type: 'residential', host: 'residential-proxy-2.com', port: 8080, auth: { username: 'user2', password: 'pass2' }, country: 'UK', city: 'London' },
            { type: 'residential', host: 'residential-proxy-3.com', port: 8080, auth: { username: 'user3', password: 'pass3' }, country: 'CA', city: 'Toronto' },
            
            // Mobile proxies (for mobile device simulation)
            { type: 'mobile', host: 'mobile-proxy-1.com', port: 8080, auth: { username: 'mobile1', password: 'pass1' }, country: 'US', city: 'Los Angeles' },
            { type: 'mobile', host: 'mobile-proxy-2.com', port: 8080, auth: { username: 'mobile2', password: 'pass2' }, country: 'DE', city: 'Berlin' },
            
            // Datacenter proxies (backup option)
            { type: 'datacenter', host: 'datacenter-proxy-1.com', port: 8080, auth: { username: 'dc1', password: 'pass1' }, country: 'NL', city: 'Amsterdam' },
            { type: 'datacenter', host: 'datacenter-proxy-2.com', port: 8080, auth: { username: 'dc2', password: 'pass2' }, country: 'SG', city: 'Singapore' }
        ];

        this.proxies = proxyConfigs.map(config => ({
            ...config,
            id: this.generateProxyId(config),
            isActive: false,
            lastUsed: null,
            successCount: 0,
            failureCount: 0,
            responseTime: 0,
            reliability: 1.0
        }));

        this.stats.totalProxies = this.proxies.length;
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
                Logger.warn(`❌ Proxy validation failed: ${this.proxies[index].host}:${this.proxies[index].port}`);
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
     * Get next proxy for rotation
     */
    getNextProxy(deviceType = 'desktop', targetCountry = null) {
        if (this.activeProxies.length === 0) {
            throw new Error('No active proxies available');
        }

        // Filter proxies based on device type and target country
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
     * Get proxy statistics
     */
    getStats() {
        return {
            ...this.stats,
            geoDistribution: Array.from(this.geoDistribution.keys()),
            averageReliability: this.activeProxies.reduce((sum, p) => sum + p.reliability, 0) / this.activeProxies.length || 0
        };
    }

    /**
     * Cleanup and shutdown
     */
    async shutdown() {
        Logger.info('🔌 Shutting down proxy manager...');
        this.proxies = [];
        this.activeProxies = [];
        this.failedProxies = [];
    }
}

module.exports = { ProxyManager };