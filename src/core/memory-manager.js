/**
 * Memory Management Module
 * Handles memory optimization, garbage collection, and resource monitoring
 */

const { PERFORMANCE_CONFIG } = require('../config/performance');
const { MemoryMonitor } = require('../utils/memory-monitor');
const { defaultLogger: Logger } = require('../utils/logger');

class MemoryManager {
    constructor() {
        this.memoryThreshold = PERFORMANCE_CONFIG.memoryThreshold || 1024 * 1024 * 1024; // 1GB
        this.gcInterval = PERFORMANCE_CONFIG.gcInterval || 300000; // 5 minutes
        this.monitoring = false;
        this.stats = {
            gcRuns: 0,
            memoryLeaks: 0,
            peakMemory: 0,
            averageMemory: 0,
            memoryReadings: []
        };
        this.gcTimer = null;
        
        // Initialize memory monitor
        this.memoryMonitor = new MemoryMonitor({
            monitoringInterval: 30000, // 30 seconds
            heapUsedThreshold: this.memoryThreshold * 0.7, // 70% of threshold
            criticalHeapUsed: this.memoryThreshold * 0.9, // 90% of threshold
            enableGCStats: true
        });
        
        this.setupMemoryMonitorEvents();
    }

    /**
     * Setup memory monitor event handlers
     */
    setupMemoryMonitorEvents() {
        this.memoryMonitor.on('memoryAlert', (alert) => {
            Logger.warn('Memory alert received', alert);
            this.handleMemoryAlert(alert);
        });

        this.memoryMonitor.on('memoryCritical', (critical) => {
            Logger.error('Critical memory condition', critical);
            this.handleCriticalMemory(critical);
        });

        this.memoryMonitor.on('memoryStats', (stats) => {
            // Update internal stats with monitor data
            this.updateInternalStats(stats);
        });
    }

    /**
     * Handle memory alerts
     */
    async handleMemoryAlert(alert) {
        Logger.info('Handling memory alert', { type: alert.type, metric: alert.metric });
        
        // Perform cleanup based on alert type
        switch (alert.metric) {
            case 'heapUsed':
                await this.performMemoryCleanup();
                break;
            case 'external':
                await this.clearLargeObjectReferences();
                break;
            case 'rss':
                await this.comprehensiveMemoryCleanup();
                break;
        }
    }

    /**
     * Handle critical memory conditions
     */
    async handleCriticalMemory(critical) {
        Logger.error('Handling critical memory condition', { metric: critical.metric });
        
        // Perform emergency cleanup
        await this.performEmergencyCleanup();
        
        // Force garbage collection
        this.memoryMonitor.forceGarbageCollection();
    }

    /**
     * Update internal stats with monitor data
     */
    updateInternalStats(monitorStats) {
        const { memory } = monitorStats;
        
        // Update peak memory
        if (memory.heapUsed > this.stats.peakMemory) {
            this.stats.peakMemory = memory.heapUsed;
        }
        
        // Add to readings
        this.stats.memoryReadings.push({
            timestamp: monitorStats.timestamp,
            heapUsed: memory.heapUsed,
            heapTotal: memory.heapTotal,
            external: memory.external,
            rss: memory.rss
        });
        
        // Keep only last 100 readings
        if (this.stats.memoryReadings.length > 100) {
            this.stats.memoryReadings.shift();
        }
        
        // Calculate average
        const totalMemory = this.stats.memoryReadings.reduce((sum, reading) => sum + reading.heapUsed, 0);
        this.stats.averageMemory = totalMemory / this.stats.memoryReadings.length;
    }

    /**
     * Initialize memory manager
     */
    async initialize() {
        console.log('🧠 Memory manager initialized');
        return true;
    }

    /**
     * Start memory monitoring
     */
    startMonitoring() {
        if (this.monitoring) return;
        
        this.monitoring = true;
        Logger.info('🧠 Starting comprehensive memory monitoring...');
        
        // Start the advanced memory monitor
        this.memoryMonitor.startMonitoring();
        
        // Start periodic garbage collection
        this.gcTimer = setInterval(() => {
            this.performGarbageCollection();
        }, this.gcInterval);

        Logger.info('✅ Memory monitoring started with advanced features');
    }

    /**
     * Stop memory monitoring
     */
    stopMonitoring() {
        if (!this.monitoring) return;
        
        this.monitoring = false;
        
        // Stop the advanced memory monitor
        this.memoryMonitor.stopMonitoring();
        
        if (this.gcTimer) {
            clearInterval(this.gcTimer);
            this.gcTimer = null;
        }
        
        Logger.info('🛑 Memory monitoring stopped');
    }

    /**
     * Record current memory usage
     */
    recordMemoryUsage() {
        const memUsage = process.memoryUsage();
        const heapUsed = memUsage.heapUsed;
        
        this.stats.memoryReadings.push({
            timestamp: Date.now(),
            heapUsed,
            heapTotal: memUsage.heapTotal,
            external: memUsage.external,
            rss: memUsage.rss
        });

        // Keep only last 100 readings
        if (this.stats.memoryReadings.length > 100) {
            this.stats.memoryReadings.shift();
        }

        // Update peak memory
        if (heapUsed > this.stats.peakMemory) {
            this.stats.peakMemory = heapUsed;
        }

        // Calculate average
        const totalMemory = this.stats.memoryReadings.reduce((sum, reading) => sum + reading.heapUsed, 0);
        this.stats.averageMemory = totalMemory / this.stats.memoryReadings.length;

        // Check for memory threshold breach
        if (heapUsed > this.memoryThreshold) {
            console.warn(`⚠️ Memory usage high: ${this.formatBytes(heapUsed)}`);
            this.performEmergencyCleanup();
        }
    }

    /**
     * Perform garbage collection
     */
    performGarbageCollection() {
        try {
            const beforeMemory = process.memoryUsage().heapUsed;
            
            if (global.gc) {
                global.gc();
                this.stats.gcRuns++;
                
                const afterMemory = process.memoryUsage().heapUsed;
                const freed = beforeMemory - afterMemory;
                
                if (freed > 0) {
                    console.log(`🗑️ GC freed ${this.formatBytes(freed)} memory`);
                }
            } else {
                console.warn('⚠️ Garbage collection not available. Run with --expose-gc flag.');
                // Fallback: trigger manual cleanup
                this.manualMemoryCleanup();
            }
        } catch (error) {
            console.error('❌ Error during garbage collection:', error.message);
        }
    }

    /**
     * Force aggressive garbage collection
     */
    forceGarbageCollection() {
        try {
            const beforeMemory = process.memoryUsage().heapUsed;
            
            if (global.gc) {
                // Run multiple GC cycles for thorough cleanup
                for (let i = 0; i < 5; i++) {
                    global.gc();
                }
                this.stats.gcRuns += 5;
                
                const afterMemory = process.memoryUsage().heapUsed;
                const freed = beforeMemory - afterMemory;
                
                console.log(`🗑️ Aggressive GC freed ${this.formatBytes(freed)} memory`);
            } else {
                // Fallback: comprehensive manual cleanup
                this.comprehensiveMemoryCleanup();
            }
        } catch (error) {
            console.error('❌ Error during aggressive garbage collection:', error.message);
        }
    }

    /**
     * Manual memory cleanup when GC is not available
     */
    manualMemoryCleanup() {
        try {
            // Clear require cache for non-essential modules
            this.clearNonEssentialCache();
            
            // Force buffer cleanup
            if (Buffer.poolSize) {
                Buffer.poolSize = 0;
            }
            
            // Clear timers and intervals
            this.clearOrphanedTimers();
            
            console.log('🧹 Manual memory cleanup completed');
        } catch (error) {
            console.error('❌ Error during manual cleanup:', error.message);
        }
    }

    /**
     * Comprehensive memory cleanup
     */
    comprehensiveMemoryCleanup() {
        try {
            this.manualMemoryCleanup();
            
            // Additional cleanup for large objects
            this.clearLargeObjectReferences();
            
            // Force V8 to release unused memory
            if (process.memoryUsage) {
                const usage = process.memoryUsage();
                if (usage.heapUsed > this.memoryThreshold * 0.8) {
                    console.log('🚨 High memory usage detected, performing deep cleanup');
                    this.deepMemoryCleanup();
                }
            }
            
            console.log('🧹 Comprehensive memory cleanup completed');
        } catch (error) {
            console.error('❌ Error during comprehensive cleanup:', error.message);
        }
    }

    /**
     * Perform emergency memory cleanup
     */
    performEmergencyCleanup() {
        console.log('🚨 Performing emergency memory cleanup...');
        
        try {
            // Force garbage collection multiple times
            if (global.gc) {
                for (let i = 0; i < 3; i++) {
                    global.gc();
                }
            }

            // Clear any large objects that might be cached
            this.clearCaches();
            
            this.stats.gcRuns += 3;
            console.log('✅ Emergency cleanup completed');
            
        } catch (error) {
            console.error('❌ Error during emergency cleanup:', error.message);
        }
    }

    /**
     * Clear internal caches
     */
    clearCaches() {
        // Clear require cache for non-core modules
        Object.keys(require.cache).forEach(key => {
            if (!key.includes('node_modules') && !key.includes('core')) {
                delete require.cache[key];
            }
        });
    }

    /**
     * Clear non-essential require cache
     */
    clearNonEssentialCache() {
        const essentialModules = [
            'fs', 'path', 'os', 'crypto', 'util', 'events', 'stream',
            'puppeteer', 'dotenv'
        ];
        
        Object.keys(require.cache).forEach(key => {
            const isEssential = essentialModules.some(module => 
                key.includes(module) || key.includes('node_modules')
            );
            
            if (!isEssential && !key.includes('core')) {
                try {
                    delete require.cache[key];
                } catch (error) {
                    // Ignore errors when clearing cache
                }
            }
        });
    }

    /**
     * Clear orphaned timers and intervals
     */
    clearOrphanedTimers() {
        // Clear any global timers that might be holding references
        if (global._scheduledTimers) {
            global._scheduledTimers.clear();
        }
        
        // Force cleanup of timer handles
        if (process._getActiveHandles) {
            const handles = process._getActiveHandles();
            handles.forEach(handle => {
                if (handle && handle.constructor && handle.constructor.name === 'Timeout') {
                    try {
                        handle.close();
                    } catch (error) {
                        // Ignore errors when closing handles
                    }
                }
            });
        }
    }

    /**
     * Clear large object references
     */
    clearLargeObjectReferences() {
        // Clear global references that might hold large objects
        if (global.searchResults) {
            global.searchResults = null;
        }
        
        if (global.browserInstances) {
            global.browserInstances = null;
        }
        
        if (global.cachedData) {
            global.cachedData = null;
        }
        
        // Clear any large arrays or objects in global scope
        Object.keys(global).forEach(key => {
            if (key.startsWith('_large') || key.startsWith('_cache')) {
                try {
                    global[key] = null;
                } catch (error) {
                    // Ignore errors when clearing global references
                }
            }
        });
    }

    /**
     * Deep memory cleanup for critical situations
     */
    deepMemoryCleanup() {
        try {
            // Clear all possible caches
            this.clearNonEssentialCache();
            this.clearLargeObjectReferences();
            this.clearOrphanedTimers();
            
            // Force buffer cleanup
            if (Buffer.poolSize) {
                Buffer.poolSize = 0;
            }
            
            // Clear V8 compilation cache
            if (process.binding && process.binding('v8')) {
                try {
                    process.binding('v8').cachedDataVersionTag = 0;
                } catch (error) {
                    // Ignore if not available
                }
            }
            
            // Reduce memory readings to minimum
            if (this.stats.memoryReadings.length > 10) {
                this.stats.memoryReadings = this.stats.memoryReadings.slice(-10);
            }
            
            console.log('🔧 Deep memory cleanup completed');
        } catch (error) {
            console.error('❌ Error during deep cleanup:', error.message);
        }
    }

    /**
     * Get current memory usage
     */
    getCurrentMemoryUsage() {
        const memUsage = process.memoryUsage();
        return {
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            external: memUsage.external,
            rss: memUsage.rss,
            formatted: {
                heapUsed: this.formatBytes(memUsage.heapUsed),
                heapTotal: this.formatBytes(memUsage.heapTotal),
                external: this.formatBytes(memUsage.external),
                rss: this.formatBytes(memUsage.rss)
            }
        };
    }

    /**
     * Get memory statistics
     */
    getStats() {
        const current = this.getCurrentMemoryUsage();
        
        return {
            ...this.stats,
            current,
            peakMemoryFormatted: this.formatBytes(this.stats.peakMemory),
            averageMemoryFormatted: this.formatBytes(this.stats.averageMemory),
            thresholdFormatted: this.formatBytes(this.memoryThreshold),
            isNearThreshold: current.heapUsed > (this.memoryThreshold * 0.8)
        };
    }

    /**
     * Check for memory leaks
     */
    checkForMemoryLeaks() {
        if (this.stats.memoryReadings.length < 10) {
            return { hasLeak: false, trend: 'insufficient_data' };
        }

        // Get recent readings (last 10)
        const recentReadings = this.stats.memoryReadings.slice(-10);
        const oldReadings = this.stats.memoryReadings.slice(-20, -10);

        if (oldReadings.length === 0) {
            return { hasLeak: false, trend: 'insufficient_data' };
        }

        const recentAvg = recentReadings.reduce((sum, r) => sum + r.heapUsed, 0) / recentReadings.length;
        const oldAvg = oldReadings.reduce((sum, r) => sum + r.heapUsed, 0) / oldReadings.length;

        const growthRate = (recentAvg - oldAvg) / oldAvg;
        const hasLeak = growthRate > 0.1; // 10% growth indicates potential leak

        if (hasLeak) {
            this.stats.memoryLeaks++;
            console.warn(`🚨 Potential memory leak detected! Growth rate: ${(growthRate * 100).toFixed(2)}%`);
        }

        return {
            hasLeak,
            growthRate,
            trend: growthRate > 0.05 ? 'increasing' : growthRate < -0.05 ? 'decreasing' : 'stable',
            recentAverage: this.formatBytes(recentAvg),
            oldAverage: this.formatBytes(oldAvg)
        };
    }

    /**
     * Optimize memory for specific operations
     */
    optimizeForOperation(operationType) {
        switch (operationType) {
            case 'search':
                // Prepare for search operations
                this.performGarbageCollection();
                break;
                
            case 'batch':
                // Prepare for batch operations
                this.performGarbageCollection();
                this.clearCaches();
                break;
                
            case 'idle':
                // Optimize during idle time
                this.performGarbageCollection();
                this.clearCaches();
                break;
                
            default:
                this.performGarbageCollection();
        }
    }

    /**
     * Format bytes to human readable format
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Health check for memory system
     */
    healthCheck() {
        const stats = this.getStats();
        const leakCheck = this.checkForMemoryLeaks();
        const issues = [];

        // Check memory usage
        if (stats.isNearThreshold) {
            issues.push('Memory usage near threshold');
        }

        // Check for memory leaks
        if (leakCheck.hasLeak) {
            issues.push('Potential memory leak detected');
        }

        // Check if monitoring is active
        if (!this.monitoring) {
            issues.push('Memory monitoring not active');
        }

        return {
            healthy: issues.length === 0,
            issues,
            stats,
            leakCheck
        };
    }

    /**
     * Generate comprehensive memory report
     */
    generateReport() {
        const stats = this.getStats();
        const leakCheck = this.checkForMemoryLeaks();
        const monitorReport = this.memoryMonitor.getMemoryReport();
        
        return {
            timestamp: new Date().toISOString(),
            summary: {
                currentUsage: stats.current.formatted.heapUsed,
                peakUsage: stats.peakMemoryFormatted,
                averageUsage: stats.averageMemoryFormatted,
                gcRuns: stats.gcRuns,
                memoryLeaks: stats.memoryLeaks
            },
            details: {
                threshold: stats.thresholdFormatted,
                nearThreshold: stats.isNearThreshold,
                trend: leakCheck.trend,
                growthRate: leakCheck.growthRate ? `${(leakCheck.growthRate * 100).toFixed(2)}%` : 'N/A'
            },
            monitor: {
                current: monitorReport.current,
                trends: monitorReport.trends,
                summary: monitorReport.summary,
                recommendations: monitorReport.recommendations
            },
            recommendations: this.getRecommendations(stats, leakCheck, monitorReport)
        };
    }

    /**
     * Get memory monitor report
     */
    getMemoryMonitorReport() {
        return this.memoryMonitor.getMemoryReport();
    }

    /**
     * Export memory data for analysis
     */
    exportMemoryData(format = 'json') {
        return this.memoryMonitor.exportMemoryData(format);
    }

    /**
     * Force garbage collection through monitor
     */
    forceGarbageCollectionAdvanced() {
        return this.memoryMonitor.forceGarbageCollection();
    }

    /**
     * Get optimization recommendations
     */
    getRecommendations(stats, leakCheck, monitorReport = null) {
        const recommendations = [];

        if (stats.isNearThreshold) {
            recommendations.push('Consider increasing memory threshold or optimizing memory usage');
        }

        if (leakCheck.hasLeak) {
            recommendations.push('Investigate potential memory leaks in recent code changes');
        }

        if (stats.gcRuns < 5) {
            recommendations.push('Consider running with --expose-gc flag for better memory management');
        }

        if (leakCheck.trend === 'increasing') {
            recommendations.push('Monitor memory usage closely - upward trend detected');
        }

        // Add monitor-specific recommendations
        if (monitorReport && monitorReport.recommendations) {
            recommendations.push(...monitorReport.recommendations.map(rec => rec.message));
        }

        return recommendations;
    }
}

module.exports = { MemoryManager };