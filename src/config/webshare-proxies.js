/**
 * Webshare Proxy Configuration and Management
 * Handles proxy rotation, health checks, and statistics
 */

require('dotenv').config();
const { defaultLogger: Logger } = require('../utils/logger');
const { HttpsProxyAgent } = require('https-proxy-agent');

class WebshareProxyConfig {
    constructor() {
        // Load proxy configuration from environment variables
        this.proxies = this.loadProxiesFromEnv();

        this.settings = {
            rotationStrategy: process.env.WEBSHARE_ROTATION_STRATEGY || 'round_robin',
            maxRetries: parseInt(process.env.WEBSHARE_MAX_RETRIES) || 3,
            timeoutMs: parseInt(process.env.WEBSHARE_TIMEOUT_MS) || 30000,
            healthCheckInterval: parseInt(process.env.WEBSHARE_HEALTH_CHECK_INTERVAL) || 300000,
            failureThreshold: parseInt(process.env.WEBSHARE_FAILURE_THRESHOLD) || 5,
            recoveryTime: parseInt(process.env.WEBSHARE_RECOVERY_TIME) || 600000,
            enableIPWhitelisting: process.env.WEBSHARE_ENABLE_IP_WHITELISTING === 'true',
            whitelistedIPs: [], // Add your IPs here if using IP whitelisting
            userAgent: process.env.WEBSHARE_USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        };

        this.currentIndex = 0;
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            proxyUsageDistribution: {}
        };

        this.initializeStats();
    }

    /**
     * Load proxy configuration from environment variables
     */
    loadProxiesFromEnv() {
        const proxies = [];
        const username = process.env.WEBSHARE_USERNAME;
        const password = process.env.WEBSHARE_PASSWORD;

        if (!username || !password) {
            throw new Error('WEBSHARE_USERNAME and WEBSHARE_PASSWORD must be set in environment variables');
        }

        // Load all proxy endpoints from environment variables
        for (let i = 1; i <= 10; i++) {
            const proxyKey = `WEBSHARE_PROXY_${i.toString().padStart(3, '0')}`;
            const proxyEndpoint = process.env[proxyKey];
            
            if (proxyEndpoint) {
                const [host, port] = proxyEndpoint.split(':');
                if (host && port) {
                    proxies.push({
                        id: `webshare_${i.toString().padStart(3, '0')}`,
                        host: host.trim(),
                        port: parseInt(port.trim()),
                        username: username,
                        password: password,
                        type: 'residential',
                        location: 'US',
                        active: true,
                        lastUsed: null,
                        successCount: 0,
                        failureCount: 0,
                        responseTime: 0,
                        reliability: 1.0
                    });
                }
            }
        }

        if (proxies.length === 0) {
            throw new Error('No valid proxy endpoints found in environment variables');
        }

        Logger.info(`Loaded ${proxies.length} proxy endpoints from environment variables`);
        return proxies;
    }

    initializeStats() {
        this.proxies.forEach(proxy => {
            this.stats.proxyUsageDistribution[proxy.id] = {
                requests: 0,
                successes: 0,
                failures: 0,
                averageResponseTime: 0
            };
        });
    }

    /**
     * Get all active proxies
     */
    getActiveProxies() {
        return this.proxies.filter(proxy => proxy.active);
    }

    /**
     * Get next proxy based on rotation strategy
     */
    getNextProxy() {
        const activeProxies = this.getActiveProxies();
        
        if (activeProxies.length === 0) {
            throw new Error('No active Webshare proxies available');
        }

        let selectedProxy;

        switch (this.settings.rotationStrategy) {
            case 'round_robin':
                selectedProxy = this.getRoundRobinProxy(activeProxies);
                break;
            case 'least_used':
                selectedProxy = this.getLeastUsedProxy(activeProxies);
                break;
            case 'best_performance':
                selectedProxy = this.getBestPerformanceProxy(activeProxies);
                break;
            case 'random':
                selectedProxy = this.getRandomProxy(activeProxies);
                break;
            default:
                selectedProxy = this.getRoundRobinProxy(activeProxies);
        }

        selectedProxy.lastUsed = Date.now();
        return selectedProxy;
    }

    /**
     * Round robin proxy selection
     */
    getRoundRobinProxy(activeProxies) {
        const proxy = activeProxies[this.currentIndex % activeProxies.length];
        this.currentIndex = (this.currentIndex + 1) % activeProxies.length;
        return proxy;
    }

    /**
     * Least used proxy selection
     */
    getLeastUsedProxy(activeProxies) {
        return activeProxies.reduce((least, current) => {
            const leastUsage = this.stats.proxyUsageDistribution[least.id].requests;
            const currentUsage = this.stats.proxyUsageDistribution[current.id].requests;
            return currentUsage < leastUsage ? current : least;
        });
    }

    /**
     * Best performance proxy selection
     */
    getBestPerformanceProxy(activeProxies) {
        return activeProxies.reduce((best, current) => {
            return current.reliability > best.reliability ? current : best;
        });
    }

    /**
     * Random proxy selection
     */
    getRandomProxy(activeProxies) {
        const randomIndex = Math.floor(Math.random() * activeProxies.length);
        return activeProxies[randomIndex];
    }

    /**
     * Format proxy for HTTP requests
     */
    formatProxyUrl(proxy) {
        if (this.settings.enableIPWhitelisting) {
            return `http://${proxy.host}:${proxy.port}`;
        } else {
            return `http://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`;
        }
    }

    /**
     * Format proxy for Puppeteer
     */
    formatProxyForPuppeteer(proxy) {
        const config = {
            server: `${proxy.host}:${proxy.port}`,
            username: proxy.username,
            password: proxy.password,
            proxyId: proxy.id
        };

        if (this.settings.enableIPWhitelisting) {
            delete config.username;
            delete config.password;
        }

        return config;
    }

    /**
     * Record proxy usage statistics
     */
    recordProxyUsage(proxyId, success, responseTime = 0) {
        const proxy = this.proxies.find(p => p.id === proxyId);
        const stats = this.stats.proxyUsageDistribution[proxyId];

        if (proxy && stats) {
            stats.requests++;
            this.stats.totalRequests++;

            if (success) {
                proxy.successCount++;
                stats.successes++;
                this.stats.successfulRequests++;
                
                if (responseTime > 0) {
                    proxy.responseTime = (proxy.responseTime + responseTime) / 2;
                    stats.averageResponseTime = (stats.averageResponseTime + responseTime) / 2;
                }
            } else {
                proxy.failureCount++;
                stats.failures++;
                this.stats.failedRequests++;
            }

            // Update reliability score
            const totalAttempts = proxy.successCount + proxy.failureCount;
            proxy.reliability = totalAttempts > 0 ? proxy.successCount / totalAttempts : 1.0;

            // Disable proxy if failure threshold exceeded
            if (proxy.failureCount >= this.settings.failureThreshold) {
                proxy.active = false;
                console.warn(`Webshare proxy ${proxyId} disabled due to excessive failures`);
                
                // Schedule recovery
                setTimeout(() => {
                    proxy.active = true;
                    proxy.failureCount = 0;
                    console.info(`Webshare proxy ${proxyId} reactivated after recovery period`);
                }, this.settings.recoveryTime);
            }
        }

        // Update average response time
        if (this.stats.totalRequests > 0) {
            this.stats.averageResponseTime = this.proxies.reduce((sum, p) => sum + p.responseTime, 0) / this.proxies.length;
        }
    }

    /**
     * Get proxy statistics
     */
    getStats() {
        return {
            ...this.stats,
            activeProxies: this.getActiveProxies().length,
            totalProxies: this.proxies.length,
            successRate: this.stats.totalRequests > 0 ? this.stats.successfulRequests / this.stats.totalRequests : 0
        };
    }

    /**
     * Health check for all proxies
     */
    async performHealthCheck() {
        console.log('Performing Webshare proxy health check...');
        
        const healthCheckPromises = this.proxies.map(async (proxy) => {
            try {
                const startTime = Date.now();
                const proxyUrl = this.formatProxyUrl(proxy);
                
                // Simple health check using a lightweight endpoint
                const response = await fetch('https://httpbin.org/ip', {
                    method: 'GET',
                    timeout: this.settings.timeoutMs,
                    agent: new HttpsProxyAgent(proxyUrl)
                });

                const responseTime = Date.now() - startTime;
                
                if (response.ok) {
                    this.recordProxyUsage(proxy.id, true, responseTime);
                    return { proxyId: proxy.id, status: 'healthy', responseTime };
                } else {
                    this.recordProxyUsage(proxy.id, false);
                    return { proxyId: proxy.id, status: 'unhealthy', error: `HTTP ${response.status}` };
                }
            } catch (error) {
                this.recordProxyUsage(proxy.id, false);
                return { proxyId: proxy.id, status: 'unhealthy', error: error.message };
            }
        });

        const results = await Promise.allSettled(healthCheckPromises);
        const healthResults = results.map(result => result.status === 'fulfilled' ? result.value : { status: 'error' });
        
        console.log('Webshare proxy health check completed:', healthResults);
        return healthResults;
    }

    /**
     * Update proxy credentials (for easy modification)
     */
    updateProxyCredentials(updates) {
        updates.forEach(update => {
            const proxy = this.proxies.find(p => p.id === update.id);
            if (proxy) {
                Object.assign(proxy, update);
                console.log(`Updated credentials for proxy ${update.id}`);
            }
        });
    }

    /**
     * Set rotation strategy for proxy selection
     */
    setRotationStrategy(strategy) {
        // Convert kebab-case to snake_case for internal consistency
        const internalStrategy = strategy.replace(/-/g, '_');
        const validStrategies = ['round_robin', 'least_used', 'best_performance', 'random'];
        
        if (!validStrategies.includes(internalStrategy)) {
            throw new Error(`Invalid rotation strategy: ${strategy}. Valid strategies: round-robin, least-used, best-performance, random`);
        }
        
        this.settings.rotationStrategy = internalStrategy;
        console.log(`Webshare proxy rotation strategy set to: ${internalStrategy}`);
        return true;
    }

    /**
     * Enable/disable IP whitelisting
     */
    setIPWhitelisting(enabled, whitelistedIPs = []) {
        this.settings.enableIPWhitelisting = enabled;
        this.settings.whitelistedIPs = whitelistedIPs;
        console.log(`IP whitelisting ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Get proxy configuration for external use
     */
    getProxyConfig() {
        return {
            proxies: this.proxies.map(proxy => ({
                id: proxy.id,
                host: proxy.host,
                port: proxy.port,
                active: proxy.active,
                reliability: proxy.reliability,
                type: proxy.type,
                location: proxy.location
            })),
            settings: { ...this.settings },
            stats: this.getStats()
        };
    }
}

module.exports = WebshareProxyConfig;