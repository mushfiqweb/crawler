# Quick Start Guide - Enhanced Browser Pool Management

## Prerequisites

- Node.js 16+ installed
- Puppeteer dependencies installed
- Sufficient system resources (minimum 4GB RAM recommended)

## Installation

1. **Install Dependencies**
```bash
npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth
npm install proxy-agent user-agents
```

2. **Copy Enhanced Components**
Ensure the following files are in your project:
- `src/core/enhanced-browser-pool.js`
- `src/core/security-isolation-manager.js`
- `src/core/organic-behavior-emulator.js`
- `src/core/advanced-monitoring-system.js`

## Basic Usage

### 1. Simple Browser Pool Setup

```javascript
const { EnhancedBrowserPool } = require('./src/core/enhanced-browser-pool');

// Basic configuration
const pool = new EnhancedBrowserPool({
    minBrowsers: 2,
    maxBrowsers: 8,
    enableAutoScaling: true,
    enableMemoryOptimization: true
});

// Initialize the pool
await pool.initialize();

// Get a browser
const browser = await pool.getBrowser();

// Use the browser
const page = await browser.newPage();
await page.goto('https://example.com');
const title = await page.title();
console.log('Page title:', title);

// Release the browser back to pool
await pool.releaseBrowser(browser.id);

// Shutdown when done
await pool.shutdown();
```

### 2. With Security Isolation

```javascript
const { EnhancedBrowserPool } = require('./src/core/enhanced-browser-pool');
const { SecurityIsolationManager } = require('./src/core/security-isolation-manager');

const pool = new EnhancedBrowserPool({ minBrowsers: 2, maxBrowsers: 8 });
const security = new SecurityIsolationManager({
    securityLevel: 'medium',
    blockedDomains: ['ads.example.com', 'tracker.com']
});

await pool.initialize();

// Get browser and create secure session
const browser = await pool.getBrowser();
const sessionId = await security.createSecureSession(browser.id, {
    incognito: true,
    permissions: []
});

// Use browser with security
const page = await browser.newPage();
await page.goto('https://secure-site.com');

// Cleanup
await security.destroySession(sessionId);
await pool.releaseBrowser(browser.id);
```

### 3. With Organic Behavior

```javascript
const { EnhancedBrowserPool } = require('./src/core/enhanced-browser-pool');
const { OrganicBehaviorEmulator } = require('./src/core/organic-behavior-emulator');

const pool = new EnhancedBrowserPool({ minBrowsers: 2, maxBrowsers: 8 });
const behavior = new OrganicBehaviorEmulator({
    enableRandomDelays: true,
    enableMouseMovement: true,
    enableScrolling: true
});

await pool.initialize();

// Get browser and create behavior session
const browser = await pool.getBrowser();
const sessionId = await behavior.createSearchSession(browser.id, {
    pattern: 'focused' // casual, focused, quick, deep
});

// Perform organic search
const page = await browser.newPage();
await behavior.performOrganicSearch(sessionId, page, 'search query');

// Cleanup
await behavior.destroySession(sessionId);
await pool.releaseBrowser(browser.id);
```

### 4. Complete System with Monitoring

```javascript
const { EnhancedBrowserPool } = require('./src/core/enhanced-browser-pool');
const { SecurityIsolationManager } = require('./src/core/security-isolation-manager');
const { OrganicBehaviorEmulator } = require('./src/core/organic-behavior-emulator');
const { AdvancedMonitoringSystem } = require('./src/core/advanced-monitoring-system');

class WebCrawler {
    constructor() {
        this.pool = new EnhancedBrowserPool({
            minBrowsers: 3,
            maxBrowsers: 12,
            enableAutoScaling: true,
            scaleUpThreshold: 0.8,
            scaleDownThreshold: 0.3
        });

        this.security = new SecurityIsolationManager({
            securityLevel: 'medium',
            enableContentFiltering: true
        });

        this.behavior = new OrganicBehaviorEmulator({
            enableRandomDelays: true,
            enableMouseMovement: true
        });

        this.monitoring = new AdvancedMonitoringSystem({
            metricsInterval: 30000,
            enableAlerting: true,
            alertThresholds: {
                memoryUsage: 80,
                cpuUsage: 70,
                errorRate: 5
            }
        });
    }

    async initialize() {
        await this.pool.initialize();
        await this.monitoring.initialize();
        
        // Register components for monitoring
        this.monitoring.registerComponent('browserPool', this.pool);
        this.monitoring.registerComponent('securityManager', this.security);
        this.monitoring.registerComponent('organicBehavior', this.behavior);
        
        await this.monitoring.startMonitoring();
        
        console.log('Web crawler initialized successfully');
    }

    async crawlPage(url, options = {}) {
        const browser = await this.pool.getBrowser(options);
        
        try {
            // Create secure session
            const securitySession = await this.security.createSecureSession(browser.id, {
                incognito: true
            });

            // Create behavior session
            const behaviorSession = await this.behavior.createSearchSession(browser.id, {
                pattern: options.pattern || 'focused'
            });

            const page = await browser.newPage();
            
            // Apply organic behavior
            await this.behavior.applySessionSettings(behaviorSession, page);
            
            // Navigate to page
            await page.goto(url, { waitUntil: 'networkidle2' });
            
            // Simulate human behavior
            await this.behavior.simulateMouseMovement(page);
            await this.behavior.simulateScrolling(page);
            
            // Extract data
            const data = await page.evaluate(() => ({
                title: document.title,
                url: window.location.href,
                text: document.body.innerText.substring(0, 1000)
            }));

            // Cleanup sessions
            await this.security.destroySession(securitySession);
            await this.behavior.destroySession(behaviorSession);

            return data;
        } finally {
            await this.pool.releaseBrowser(browser.id);
        }
    }

    async getStats() {
        return {
            pool: this.pool.getStats(),
            security: this.security.getStats(),
            behavior: this.behavior.getStats(),
            monitoring: this.monitoring.getDashboardData()
        };
    }

    async shutdown() {
        await this.monitoring.stopMonitoring();
        await this.pool.shutdown();
        await this.security.shutdown();
        await this.behavior.shutdown();
    }
}

// Usage
const crawler = new WebCrawler();
await crawler.initialize();

// Crawl multiple pages
const urls = ['https://example1.com', 'https://example2.com', 'https://example3.com'];
const results = await Promise.all(
    urls.map(url => crawler.crawlPage(url, { pattern: 'casual' }))
);

console.log('Crawling results:', results);

// Get system stats
const stats = await crawler.getStats();
console.log('System stats:', stats);

// Shutdown
await crawler.shutdown();
```

## Configuration Examples

### Development Configuration
```javascript
const devConfig = {
    pool: {
        minBrowsers: 1,
        maxBrowsers: 3,
        enableAutoScaling: false,
        enableMemoryOptimization: true,
        enableHealthChecks: true
    },
    security: {
        securityLevel: 'low',
        enableSandboxing: false
    },
    behavior: {
        enableRandomDelays: false,
        minDelay: 100,
        maxDelay: 500
    },
    monitoring: {
        metricsInterval: 60000,
        enableAlerting: false
    }
};
```

### Production Configuration
```javascript
const prodConfig = {
    pool: {
        minBrowsers: 5,
        maxBrowsers: 20,
        enableAutoScaling: true,
        scaleUpThreshold: 0.7,
        scaleDownThreshold: 0.3,
        enableMemoryOptimization: true,
        memoryOptimizationInterval: 300000,
        enableHealthChecks: true,
        healthCheckInterval: 30000
    },
    security: {
        securityLevel: 'high',
        enableSandboxing: true,
        enableIsolation: true,
        enableContentFiltering: true,
        maxSessionDuration: 1800000
    },
    behavior: {
        enableRandomDelays: true,
        enableMouseMovement: true,
        enableScrolling: true,
        enableTypingSimulation: true,
        userAgentRotation: true,
        viewportVariation: true
    },
    monitoring: {
        metricsInterval: 30000,
        enableAlerting: true,
        enableMetricsCollection: true,
        retentionPeriod: 86400000,
        alertThresholds: {
            memoryUsage: 85,
            cpuUsage: 75,
            errorRate: 3,
            responseTime: 10000
        }
    }
};
```

## Common Patterns

### 1. Batch Processing
```javascript
async function processBatch(urls, batchSize = 5) {
    const crawler = new WebCrawler();
    await crawler.initialize();

    const results = [];
    for (let i = 0; i < urls.length; i += batchSize) {
        const batch = urls.slice(i, i + batchSize);
        const batchResults = await Promise.all(
            batch.map(url => crawler.crawlPage(url))
        );
        results.push(...batchResults);
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    await crawler.shutdown();
    return results;
}
```

### 2. Error Handling
```javascript
async function robustCrawl(url, maxRetries = 3) {
    const crawler = new WebCrawler();
    await crawler.initialize();

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await crawler.crawlPage(url);
            await crawler.shutdown();
            return result;
        } catch (error) {
            console.log(`Attempt ${attempt} failed:`, error.message);
            
            if (attempt === maxRetries) {
                await crawler.shutdown();
                throw error;
            }
            
            // Exponential backoff
            await new Promise(resolve => 
                setTimeout(resolve, Math.pow(2, attempt) * 1000)
            );
        }
    }
}
```

### 3. Monitoring Integration
```javascript
async function monitoredCrawling() {
    const crawler = new WebCrawler();
    await crawler.initialize();

    // Set up monitoring alerts
    crawler.monitoring.on('alert', (alert) => {
        console.log('Alert triggered:', alert);
        // Send notification, log to external system, etc.
    });

    crawler.monitoring.on('alertResolved', (alert) => {
        console.log('Alert resolved:', alert);
    });

    // Periodic stats logging
    setInterval(async () => {
        const stats = await crawler.getStats();
        console.log('System stats:', JSON.stringify(stats, null, 2));
    }, 60000);

    // Your crawling logic here
    // ...

    await crawler.shutdown();
}
```

## Troubleshooting

### Common Issues

1. **High Memory Usage**
   - Reduce `maxBrowsers` setting
   - Enable memory optimization
   - Check for memory leaks in your code

2. **Slow Performance**
   - Increase `minBrowsers` for better responsiveness
   - Enable auto-scaling
   - Check system resources

3. **Browser Crashes**
   - Enable health checks
   - Reduce browser timeout
   - Check system stability

4. **Security Violations**
   - Review blocked domains list
   - Adjust security level
   - Check content filtering rules

### Debug Mode
```javascript
// Enable debug logging
process.env.DEBUG = 'enhanced-browser-pool:*';

const pool = new EnhancedBrowserPool({
    minBrowsers: 1,
    maxBrowsers: 3,
    enableHealthChecks: true,
    healthCheckInterval: 10000 // More frequent checks
});
```

## Next Steps

1. **Read the Full Documentation**: Check `enhanced-browser-pool-architecture.md` for detailed information
2. **Customize Configuration**: Adjust settings based on your specific needs
3. **Implement Monitoring**: Set up proper monitoring and alerting
4. **Test Performance**: Run performance tests with your workload
5. **Security Review**: Review security settings for your use case

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review configuration options
3. Enable debug logging
4. Monitor system metrics
5. Check component health status