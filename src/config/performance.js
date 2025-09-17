/**
 * Performance Optimization Configuration
 * Defines browser pool, memory management, and resource optimization settings
 */

const PERFORMANCE_CONFIG = {
    // Browser pool configuration
    browserPool: {
        maxBrowsers: 3,
        minBrowsers: 1,
        browserTimeout: 30000,
        launchTimeout: 10000,
        closeTimeout: 5000
    },
    
    // System validator expected properties
    maxConcurrentBrowsers: 3,
    requestTimeout: 30000,
    retryAttempts: 3,
    enableBrowserReuse: true,
    maxConcurrentSearches: 3, // Limit concurrent searches to prevent resource exhaustion
    browserPoolSize: 2, // Number of browser instances to maintain
    enableMemoryOptimization: true,
    enableConnectionPooling: true,
    searchTimeout: 30000, // 30 seconds timeout per search
    enableBatchProcessing: true,
    batchSize: 5, // Process searches in batches
    enableResourceBlocking: true, // Block images, CSS, fonts to speed up loading
    enableCacheOptimization: true
};

const LOGGING_CONFIG = {
    enableDetailedLogs: true,
    enableStatistics: true,
    logInterval: 10, // Log statistics every N searches
    enableProgressBar: true,
    enableCategoryBreakdown: true
};

const VALIDATION_CONFIG = {
    enableSystemValidation: true,
    enablePlatformTesting: true,
    enableGeolocationTesting: true,
    enableDeviceSimulationTesting: true,
    testTimeout: 30000,
    maxTestRetries: 2,
    enablePerformanceMetrics: true
};

const RELIABILITY_CONFIG = {
    enableHealthChecks: true,
    healthCheckInterval: 60000, // 1 minute
    maxConsecutiveFailures: 5,
    enableAutoRecovery: true,
    enableFailureLogging: true
};

module.exports = {
    PERFORMANCE_CONFIG,
    LOGGING_CONFIG,
    VALIDATION_CONFIG,
    RELIABILITY_CONFIG
};