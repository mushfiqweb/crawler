# API Reference - Enhanced Browser Pool Management

## Table of Contents

1. [EnhancedBrowserPool](#enhancedbrowserpool)
2. [SecurityIsolationManager](#securityisolationmanager)
3. [OrganicBehaviorEmulator](#organicbehavioremulator)
4. [AdvancedMonitoringSystem](#advancedmonitoringsystem)
5. [Events](#events)
6. [Types and Interfaces](#types-and-interfaces)

## EnhancedBrowserPool

The main browser pool management class that handles browser allocation, recycling, and optimization.

### Constructor

```javascript
new EnhancedBrowserPool(config)
```

**Parameters:**
- `config` (Object): Configuration options

**Config Options:**
```javascript
{
    minBrowsers: 2,                    // Minimum browsers to maintain
    maxBrowsers: 10,                   // Maximum browsers allowed
    enableAutoScaling: true,           // Enable automatic scaling
    scaleUpThreshold: 0.8,            // Scale up threshold (0-1)
    scaleDownThreshold: 0.3,          // Scale down threshold (0-1)
    enableMemoryOptimization: true,    // Enable memory optimization
    enableHealthChecks: true,          // Enable health monitoring
    healthCheckInterval: 60000,        // Health check interval (ms)
    memoryOptimizationInterval: 300000, // Memory optimization interval (ms)
    browserTimeout: 30000,             // Browser operation timeout (ms)
    maxBrowserAge: 1800000,           // Maximum browser age (ms)
    maxBrowserUsage: 100,             // Maximum browser usage count
    enablePredictiveScaling: true,     // Enable predictive scaling
    enableResourceBlocking: true,      // Enable resource blocking
    enableCacheOptimization: true      // Enable cache optimization
}
```

### Methods

#### initialize()

Initializes the browser pool and starts all services.

```javascript
await pool.initialize()
```

**Returns:** `Promise<void>`

#### getBrowser(options)

Gets an available browser from the pool.

```javascript
const browser = await pool.getBrowser(options)
```

**Parameters:**
- `options` (Object, optional): Browser request options
  ```javascript
  {
      proxy: 'http://proxy:8080',      // Proxy configuration
      userAgent: 'custom-agent',       // Custom user agent
      viewport: { width: 1920, height: 1080 }, // Viewport size
      incognito: true,                 // Use incognito mode
      timeout: 30000,                  // Request timeout
      priority: 'high'                 // Request priority (low/medium/high)
  }
  ```

**Returns:** `Promise<Browser>` - Browser instance with additional metadata

#### releaseBrowser(browserId)

Returns a browser to the pool.

```javascript
await pool.releaseBrowser(browserId)
```

**Parameters:**
- `browserId` (string): Browser ID to release

**Returns:** `Promise<void>`

#### getStats()

Gets current pool statistics.

```javascript
const stats = pool.getStats()
```

**Returns:** `Object`
```javascript
{
    totalBrowsers: 5,
    availableBrowsers: 3,
    busyBrowsers: 2,
    queueLength: 0,
    totalAllocations: 150,
    totalReleases: 145,
    averageResponseTime: 250,
    memoryUsage: 512000000,
    cpuUsage: 45.2,
    uptime: 3600000,
    scalingHistory: [...],
    performanceMetrics: {...}
}
```

#### shutdown()

Gracefully shuts down the browser pool.

```javascript
await pool.shutdown()
```

**Returns:** `Promise<void>`

### Events

```javascript
pool.on('browserCreated', (browser) => {
    console.log('Browser created:', browser.id);
});

pool.on('browserDestroyed', (browserId) => {
    console.log('Browser destroyed:', browserId);
});

pool.on('scaleUp', (details) => {
    console.log('Scaling up:', details);
});

pool.on('scaleDown', (details) => {
    console.log('Scaling down:', details);
});

pool.on('memoryAlert', (alert) => {
    console.log('Memory alert:', alert);
});

pool.on('healthCheckFailed', (browser) => {
    console.log('Health check failed:', browser.id);
});
```

## SecurityIsolationManager

Manages browser security, sandboxing, and isolation features.

### Constructor

```javascript
new SecurityIsolationManager(config)
```

**Parameters:**
- `config` (Object): Security configuration

**Config Options:**
```javascript
{
    enableSandboxing: true,           // Enable browser sandboxing
    enableIsolation: true,            // Enable session isolation
    enableSecurityHeaders: true,      // Enable security headers
    enableContentFiltering: true,     // Enable content filtering
    securityLevel: 'medium',          // Security level (low/medium/high)
    maxSessionDuration: 1800000,      // Maximum session duration (ms)
    allowedDomains: [],               // Whitelisted domains
    blockedDomains: [],               // Blacklisted domains
    securityPolicies: {               // Custom security policies
        blockImages: false,
        blockCSS: false,
        blockJavaScript: false,
        blockFonts: false
    }
}
```

### Methods

#### createSecureSession(browserId, options)

Creates a secure browsing session.

```javascript
const sessionId = await security.createSecureSession(browserId, options)
```

**Parameters:**
- `browserId` (string): Browser ID
- `options` (Object): Session options
  ```javascript
  {
      incognito: true,                 // Use incognito mode
      permissions: ['geolocation'],    // Allowed permissions
      securityLevel: 'high',          // Override security level
      customPolicies: {...}           // Custom security policies
  }
  ```

**Returns:** `Promise<string>` - Session ID

#### destroySession(sessionId)

Destroys a secure session.

```javascript
await security.destroySession(sessionId)
```

**Parameters:**
- `sessionId` (string): Session ID to destroy

**Returns:** `Promise<void>`

#### getSessionInfo(sessionId)

Gets information about a session.

```javascript
const info = security.getSessionInfo(sessionId)
```

**Parameters:**
- `sessionId` (string): Session ID

**Returns:** `Object`
```javascript
{
    id: 'session-123',
    browserId: 'browser-456',
    createdAt: 1640995200000,
    lastActivity: 1640995800000,
    securityLevel: 'medium',
    violationCount: 0,
    isActive: true
}
```

#### getStats()

Gets security statistics.

```javascript
const stats = security.getStats()
```

**Returns:** `Object`
```javascript
{
    totalSessions: 50,
    activeSessions: 5,
    securityViolations: 2,
    blockedRequests: 15,
    isolationBreaches: 0,
    averageSessionDuration: 600000
}
```

#### shutdown()

Shuts down the security manager.

```javascript
await security.shutdown()
```

**Returns:** `Promise<void>`

## OrganicBehaviorEmulator

Simulates human-like browsing patterns and interactions.

### Constructor

```javascript
new OrganicBehaviorEmulator(config)
```

**Parameters:**
- `config` (Object): Behavior configuration

**Config Options:**
```javascript
{
    enableRandomDelays: true,         // Enable random delays
    enableMouseMovement: true,        // Enable mouse simulation
    enableScrolling: true,            // Enable scroll simulation
    enableTypingSimulation: true,     // Enable typing simulation
    minDelay: 1000,                   // Minimum delay (ms)
    maxDelay: 5000,                   // Maximum delay (ms)
    userAgentRotation: true,          // Enable user agent rotation
    viewportVariation: true,          // Enable viewport variation
    behaviorPatterns: {               // Behavior pattern definitions
        casual: { speed: 'slow', focus: 'low' },
        focused: { speed: 'medium', focus: 'high' },
        quick: { speed: 'fast', focus: 'medium' },
        deep: { speed: 'slow', focus: 'very_high' }
    }
}
```

### Methods

#### createSearchSession(browserId, options)

Creates an organic behavior session.

```javascript
const sessionId = await behavior.createSearchSession(browserId, options)
```

**Parameters:**
- `browserId` (string): Browser ID
- `options` (Object): Session options
  ```javascript
  {
      pattern: 'focused',              // Behavior pattern
      duration: 1800000,              // Session duration (ms)
      searchFrequency: 'medium',      // Search frequency
      customBehavior: {...}           // Custom behavior settings
  }
  ```

**Returns:** `Promise<string>` - Session ID

#### performOrganicSearch(sessionId, page, query)

Performs an organic search with human-like behavior.

```javascript
await behavior.performOrganicSearch(sessionId, page, query)
```

**Parameters:**
- `sessionId` (string): Session ID
- `page` (Page): Puppeteer page instance
- `query` (string): Search query

**Returns:** `Promise<void>`

#### simulateMouseMovement(page, options)

Simulates realistic mouse movement.

```javascript
await behavior.simulateMouseMovement(page, options)
```

**Parameters:**
- `page` (Page): Puppeteer page instance
- `options` (Object, optional): Movement options
  ```javascript
  {
      duration: 2000,                 // Movement duration (ms)
      steps: 10,                      // Number of movement steps
      randomness: 0.5                 // Movement randomness (0-1)
  }
  ```

**Returns:** `Promise<void>`

#### simulateScrolling(page, options)

Simulates human-like scrolling behavior.

```javascript
await behavior.simulateScrolling(page, options)
```

**Parameters:**
- `page` (Page): Puppeteer page instance
- `options` (Object, optional): Scrolling options
  ```javascript
  {
      direction: 'down',              // Scroll direction (up/down)
      distance: 500,                  // Scroll distance (pixels)
      speed: 'medium',               // Scroll speed (slow/medium/fast)
      pauses: true                   // Include random pauses
  }
  ```

**Returns:** `Promise<void>`

#### simulateTyping(page, selector, text, options)

Simulates human-like typing.

```javascript
await behavior.simulateTyping(page, selector, text, options)
```

**Parameters:**
- `page` (Page): Puppeteer page instance
- `selector` (string): Element selector
- `text` (string): Text to type
- `options` (Object, optional): Typing options
  ```javascript
  {
      delay: 100,                     // Delay between keystrokes (ms)
      randomDelay: true,              // Use random delays
      mistakes: true,                 // Include typing mistakes
      corrections: true               // Correct mistakes
  }
  ```

**Returns:** `Promise<void>`

#### getStats()

Gets behavior statistics.

```javascript
const stats = behavior.getStats()
```

**Returns:** `Object`
```javascript
{
    totalSessions: 25,
    activeSessions: 3,
    totalSearches: 150,
    averageSessionDuration: 900000,
    patternDistribution: {
        casual: 10,
        focused: 8,
        quick: 5,
        deep: 2
    }
}
```

## AdvancedMonitoringSystem

Provides comprehensive monitoring, metrics collection, and alerting.

### Constructor

```javascript
new AdvancedMonitoringSystem(config)
```

**Parameters:**
- `config` (Object): Monitoring configuration

**Config Options:**
```javascript
{
    enableMetricsCollection: true,    // Enable metrics collection
    enableAlerting: true,             // Enable alerting system
    enableLogging: true,              // Enable detailed logging
    metricsInterval: 30000,           // Metrics collection interval (ms)
    retentionPeriod: 86400000,        // Data retention period (ms)
    exportPath: './monitoring-data',  // Metrics export path
    alertThresholds: {
        memoryUsage: 80,              // Memory usage threshold (%)
        cpuUsage: 70,                 // CPU usage threshold (%)
        errorRate: 5,                 // Error rate threshold (%)
        responseTime: 5000            // Response time threshold (ms)
    }
}
```

### Methods

#### initialize()

Initializes the monitoring system.

```javascript
await monitoring.initialize()
```

**Returns:** `Promise<void>`

#### registerComponent(name, component)

Registers a component for monitoring.

```javascript
monitoring.registerComponent('browserPool', pool)
```

**Parameters:**
- `name` (string): Component name
- `component` (Object): Component instance

**Returns:** `void`

#### startMonitoring()

Starts the monitoring process.

```javascript
await monitoring.startMonitoring()
```

**Returns:** `Promise<void>`

#### stopMonitoring()

Stops the monitoring process.

```javascript
await monitoring.stopMonitoring()
```

**Returns:** `Promise<void>`

#### recordEvent(category, event, data)

Records a custom event.

```javascript
monitoring.recordEvent('security', 'violation', {
    type: 'blocked_domain',
    domain: 'malicious-site.com',
    sessionId: 'session-123'
})
```

**Parameters:**
- `category` (string): Event category
- `event` (string): Event type
- `data` (Object): Event data

**Returns:** `void`

#### getDashboardData()

Gets real-time dashboard data.

```javascript
const dashboard = monitoring.getDashboardData()
```

**Returns:** `Object`
```javascript
{
    realTime: {
        timestamp: 1640995200000,
        system: { memoryUsage: 75, cpuUsage: 45 },
        browserPool: { totalBrowsers: 8, queueLength: 2 },
        security: { activeSessions: 5, violations: 0 },
        organicBehavior: { activeSessions: 3, searches: 25 }
    },
    historical: {
        last24Hours: [...],
        trends: {...}
    },
    alerts: {
        active: [...],
        recent: [...]
    }
}
```

#### exportMetrics(format, timeRange)

Exports metrics data.

```javascript
const exported = await monitoring.exportMetrics('json', {
    start: Date.now() - 3600000,
    end: Date.now()
})
```

**Parameters:**
- `format` (string): Export format ('json', 'csv')
- `timeRange` (Object): Time range for export
  ```javascript
  {
      start: 1640991600000,           // Start timestamp
      end: 1640995200000              // End timestamp
  }
  ```

**Returns:** `Promise<Object>` - Exported data

#### generateReport(type, options)

Generates a monitoring report.

```javascript
const report = await monitoring.generateReport('performance', {
    period: '24h',
    includeCharts: true
})
```

**Parameters:**
- `type` (string): Report type ('performance', 'security', 'usage')
- `options` (Object): Report options
  ```javascript
  {
      period: '24h',                  // Report period
      includeCharts: true,            // Include charts
      format: 'html'                  // Report format
  }
  ```

**Returns:** `Promise<Object>` - Generated report

## Events

### EnhancedBrowserPool Events

```javascript
// Browser lifecycle events
pool.on('browserCreated', (browser) => {});
pool.on('browserDestroyed', (browserId) => {});
pool.on('browserRecycled', (browserId) => {});

// Scaling events
pool.on('scaleUp', (details) => {});
pool.on('scaleDown', (details) => {});
pool.on('scalingDecision', (decision) => {});

// Performance events
pool.on('memoryAlert', (alert) => {});
pool.on('performanceAlert', (alert) => {});
pool.on('healthCheckFailed', (browser) => {});

// Queue events
pool.on('queueEmpty', () => {});
pool.on('queueFull', (queueLength) => {});
pool.on('requestTimeout', (request) => {});
```

### SecurityIsolationManager Events

```javascript
// Session events
security.on('sessionCreated', (session) => {});
security.on('sessionDestroyed', (sessionId) => {});
security.on('sessionExpired', (sessionId) => {});

// Security events
security.on('securityViolation', (violation) => {});
security.on('requestBlocked', (request) => {});
security.on('isolationBreach', (breach) => {});
security.on('contentFiltered', (content) => {});
```

### OrganicBehaviorEmulator Events

```javascript
// Session events
behavior.on('sessionCreated', (session) => {});
behavior.on('sessionCompleted', (sessionId) => {});
behavior.on('searchPerformed', (search) => {});

// Behavior events
behavior.on('patternChanged', (pattern) => {});
behavior.on('userAgentRotated', (userAgent) => {});
behavior.on('viewportChanged', (viewport) => {});
```

### AdvancedMonitoringSystem Events

```javascript
// Alert events
monitoring.on('alert', (alert) => {});
monitoring.on('alertResolved', (alert) => {});
monitoring.on('criticalAlert', (alert) => {});

// Metrics events
monitoring.on('metricsCollected', (metrics) => {});
monitoring.on('thresholdExceeded', (threshold) => {});
monitoring.on('anomalyDetected', (anomaly) => {});

// System events
monitoring.on('componentRegistered', (component) => {});
monitoring.on('monitoringStarted', () => {});
monitoring.on('monitoringStopped', () => {});
```

## Types and Interfaces

### Browser Object

```javascript
{
    id: 'browser-123',               // Unique browser ID
    instance: puppeteerBrowser,      // Puppeteer browser instance
    createdAt: 1640995200000,       // Creation timestamp
    lastUsed: 1640995800000,        // Last usage timestamp
    usageCount: 15,                 // Number of times used
    isHealthy: true,                // Health status
    proxy: 'http://proxy:8080',     // Proxy configuration
    userAgent: 'Mozilla/5.0...',    // User agent string
    viewport: { width: 1920, height: 1080 }, // Viewport size
    metadata: {                     // Additional metadata
        memoryUsage: 150000000,
        cpuUsage: 25.5,
        pageCount: 3
    }
}
```

### Session Object

```javascript
{
    id: 'session-456',              // Unique session ID
    browserId: 'browser-123',       // Associated browser ID
    type: 'security',               // Session type
    createdAt: 1640995200000,       // Creation timestamp
    lastActivity: 1640995800000,    // Last activity timestamp
    isActive: true,                 // Active status
    config: {...},                  // Session configuration
    stats: {                        // Session statistics
        requestCount: 25,
        violationCount: 0,
        duration: 600000
    }
}
```

### Alert Object

```javascript
{
    id: 'alert-789',                // Unique alert ID
    type: 'memory',                 // Alert type
    severity: 'warning',            // Severity level
    message: 'Memory usage high',   // Alert message
    threshold: 80,                  // Threshold value
    currentValue: 85,               // Current value
    component: 'browserPool',       // Component name
    timestamp: 1640995200000,       // Alert timestamp
    resolved: false,                // Resolution status
    resolvedAt: null                // Resolution timestamp
}
```

### Metrics Object

```javascript
{
    timestamp: 1640995200000,       // Metrics timestamp
    system: {
        memoryUsage: 75,            // Memory usage (%)
        cpuUsage: 45,               // CPU usage (%)
        diskUsage: 60,              // Disk usage (%)
        networkIO: 1024000          // Network I/O (bytes)
    },
    browserPool: {
        totalBrowsers: 8,           // Total browsers
        availableBrowsers: 5,       // Available browsers
        queueLength: 2,             // Queue length
        averageResponseTime: 250    // Average response time (ms)
    },
    security: {
        activeSessions: 5,          // Active sessions
        violations: 0,              // Security violations
        blockedRequests: 15         // Blocked requests
    },
    organicBehavior: {
        activeSessions: 3,          // Active behavior sessions
        totalSearches: 150,         // Total searches performed
        averageSessionDuration: 900000 // Average session duration (ms)
    }
}
```

## Error Handling

All methods that return promises can throw the following error types:

### BrowserPoolError

```javascript
class BrowserPoolError extends Error {
    constructor(message, code, details) {
        super(message);
        this.name = 'BrowserPoolError';
        this.code = code;
        this.details = details;
    }
}
```

**Error Codes:**
- `POOL_FULL`: Browser pool is at maximum capacity
- `BROWSER_NOT_FOUND`: Requested browser not found
- `ALLOCATION_TIMEOUT`: Browser allocation timed out
- `HEALTH_CHECK_FAILED`: Browser health check failed
- `MEMORY_LIMIT_EXCEEDED`: Memory limit exceeded

### SecurityError

```javascript
class SecurityError extends Error {
    constructor(message, violation, sessionId) {
        super(message);
        this.name = 'SecurityError';
        this.violation = violation;
        this.sessionId = sessionId;
    }
}
```

### MonitoringError

```javascript
class MonitoringError extends Error {
    constructor(message, component, metric) {
        super(message);
        this.name = 'MonitoringError';
        this.component = component;
        this.metric = metric;
    }
}
```

## Usage Examples

See the [Quick Start Guide](quick-start-guide.md) for comprehensive usage examples and patterns.