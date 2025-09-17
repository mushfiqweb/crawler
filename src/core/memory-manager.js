/**
 * Memory Management Module
 * Handles memory optimization, garbage collection, and resource monitoring
 */

const { PERFORMANCE_CONFIG } = require('../config/performance');

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
        console.log('🧠 Starting memory monitoring...');
        
        // Start periodic garbage collection
        this.gcTimer = setInterval(() => {
            this.performGarbageCollection();
        }, this.gcInterval);

        // Monitor memory usage every 30 seconds
        setInterval(() => {
            this.recordMemoryUsage();
        }, 30000);

        console.log('✅ Memory monitoring started');
    }

    /**
     * Stop memory monitoring
     */
    stopMonitoring() {
        if (!this.monitoring) return;
        
        this.monitoring = false;
        
        if (this.gcTimer) {
            clearInterval(this.gcTimer);
            this.gcTimer = null;
        }
        
        console.log('🛑 Memory monitoring stopped');
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
            }
        } catch (error) {
            console.error('❌ Error during garbage collection:', error.message);
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
     * Generate memory report
     */
    generateReport() {
        const stats = this.getStats();
        const leakCheck = this.checkForMemoryLeaks();
        
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
            recommendations: this.getRecommendations(stats, leakCheck)
        };
    }

    /**
     * Get optimization recommendations
     */
    getRecommendations(stats, leakCheck) {
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

        return recommendations;
    }
}

module.exports = { MemoryManager };