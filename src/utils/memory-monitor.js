/**
 * Memory Monitor - Real-time memory tracking and reporting
 * Provides comprehensive memory usage statistics and alerts
 */

const { EventEmitter } = require('events');
const { defaultLogger: Logger } = require('./logger');

class MemoryMonitor extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            monitoringInterval: options.monitoringInterval || 30000, // 30 seconds
            alertThresholds: {
                heapUsed: options.heapUsedThreshold || 500 * 1024 * 1024, // 500MB
                heapTotal: options.heapTotalThreshold || 1024 * 1024 * 1024, // 1GB
                external: options.externalThreshold || 100 * 1024 * 1024, // 100MB
                rss: options.rssThreshold || 2 * 1024 * 1024 * 1024 // 2GB
            },
            criticalThresholds: {
                heapUsed: options.criticalHeapUsed || 800 * 1024 * 1024, // 800MB
                heapTotal: options.criticalHeapTotal || 1.5 * 1024 * 1024 * 1024, // 1.5GB
                rss: options.criticalRss || 3 * 1024 * 1024 * 1024 // 3GB
            },
            historySize: options.historySize || 100,
            enableGCStats: options.enableGCStats || false
        };

        this.isMonitoring = false;
        this.monitoringTimer = null;
        this.memoryHistory = [];
        this.gcStats = {
            collections: 0,
            totalTime: 0,
            lastCollection: null
        };
        
        this.startTime = Date.now();
        this.lastAlert = {};
        
        // Initialize GC monitoring if enabled
        if (this.config.enableGCStats && global.gc) {
            this.setupGCMonitoring();
        }
    }

    /**
     * Start memory monitoring
     */
    startMonitoring() {
        if (this.isMonitoring) {
            Logger.warn('Memory monitoring is already running');
            return;
        }

        this.isMonitoring = true;
        Logger.info('🔍 Starting memory monitoring', {
            interval: `${this.config.monitoringInterval / 1000}s`,
            alertThresholds: this.formatBytes(this.config.alertThresholds),
            criticalThresholds: this.formatBytes(this.config.criticalThresholds)
        });

        this.monitoringTimer = setInterval(() => {
            this.collectMemoryStats();
        }, this.config.monitoringInterval);

        // Initial collection
        this.collectMemoryStats();
    }

    /**
     * Stop memory monitoring
     */
    stopMonitoring() {
        if (!this.isMonitoring) {
            return;
        }

        this.isMonitoring = false;
        if (this.monitoringTimer) {
            clearInterval(this.monitoringTimer);
            this.monitoringTimer = null;
        }

        Logger.info('🛑 Memory monitoring stopped');
    }

    /**
     * Collect current memory statistics
     */
    collectMemoryStats() {
        const memoryUsage = process.memoryUsage();
        const timestamp = Date.now();
        const uptime = timestamp - this.startTime;

        const stats = {
            timestamp,
            uptime,
            memory: {
                ...memoryUsage,
                heapUsedPercent: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
            },
            gc: { ...this.gcStats }
        };

        // Add to history
        this.memoryHistory.push(stats);
        if (this.memoryHistory.length > this.config.historySize) {
            this.memoryHistory.shift();
        }

        // Check for alerts
        this.checkAlerts(stats);

        // Emit stats event
        this.emit('memoryStats', stats);

        return stats;
    }

    /**
     * Check for memory alerts and critical conditions
     */
    checkAlerts(stats) {
        const { memory } = stats;
        const now = Date.now();

        // Check alert thresholds
        for (const [metric, threshold] of Object.entries(this.config.alertThresholds)) {
            if (memory[metric] > threshold) {
                const alertKey = `alert_${metric}`;
                
                // Throttle alerts (max once per 5 minutes)
                if (!this.lastAlert[alertKey] || now - this.lastAlert[alertKey] > 300000) {
                    this.lastAlert[alertKey] = now;
                    
                    Logger.warn(`⚠️ Memory alert: ${metric} exceeded threshold`, {
                        current: this.formatBytes(memory[metric]),
                        threshold: this.formatBytes(threshold),
                        percentage: ((memory[metric] / threshold) * 100).toFixed(1) + '%'
                    });

                    this.emit('memoryAlert', {
                        type: 'warning',
                        metric,
                        current: memory[metric],
                        threshold,
                        stats
                    });
                }
            }
        }

        // Check critical thresholds
        for (const [metric, threshold] of Object.entries(this.config.criticalThresholds)) {
            if (memory[metric] > threshold) {
                const criticalKey = `critical_${metric}`;
                
                // Throttle critical alerts (max once per 2 minutes)
                if (!this.lastAlert[criticalKey] || now - this.lastAlert[criticalKey] > 120000) {
                    this.lastAlert[criticalKey] = now;
                    
                    Logger.error(`🚨 Critical memory usage: ${metric}`, {
                        current: this.formatBytes(memory[metric]),
                        threshold: this.formatBytes(threshold),
                        percentage: ((memory[metric] / threshold) * 100).toFixed(1) + '%'
                    });

                    this.emit('memoryCritical', {
                        type: 'critical',
                        metric,
                        current: memory[metric],
                        threshold,
                        stats
                    });
                }
            }
        }
    }

    /**
     * Setup garbage collection monitoring
     */
    setupGCMonitoring() {
        if (!global.gc) {
            Logger.warn('Garbage collection monitoring requires --expose-gc flag');
            return;
        }

        // Override global.gc to track statistics
        const originalGC = global.gc;
        global.gc = () => {
            const startTime = process.hrtime.bigint();
            originalGC();
            const endTime = process.hrtime.bigint();
            
            const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
            
            this.gcStats.collections++;
            this.gcStats.totalTime += duration;
            this.gcStats.lastCollection = {
                timestamp: Date.now(),
                duration
            };

            Logger.debug('🗑️ Garbage collection completed', {
                duration: `${duration.toFixed(2)}ms`,
                totalCollections: this.gcStats.collections,
                averageTime: `${(this.gcStats.totalTime / this.gcStats.collections).toFixed(2)}ms`
            });
        };
    }

    /**
     * Get comprehensive memory report
     */
    getMemoryReport() {
        const currentStats = this.collectMemoryStats();
        const history = this.getMemoryTrends();

        return {
            current: currentStats,
            trends: history,
            summary: this.getMemorySummary(),
            recommendations: this.getMemoryRecommendations(currentStats)
        };
    }

    /**
     * Get memory usage trends
     */
    getMemoryTrends() {
        if (this.memoryHistory.length < 2) {
            return null;
        }

        const recent = this.memoryHistory.slice(-10);
        const older = this.memoryHistory.slice(-20, -10);

        if (older.length === 0) {
            return null;
        }

        const recentAvg = this.calculateAverage(recent, 'memory.heapUsed');
        const olderAvg = this.calculateAverage(older, 'memory.heapUsed');

        const trend = recentAvg > olderAvg ? 'increasing' : 'decreasing';
        const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;

        return {
            trend,
            changePercent: changePercent.toFixed(2),
            recentAverage: this.formatBytes(recentAvg),
            olderAverage: this.formatBytes(olderAvg)
        };
    }

    /**
     * Get memory usage summary
     */
    getMemorySummary() {
        if (this.memoryHistory.length === 0) {
            return null;
        }

        const heapUsedValues = this.memoryHistory.map(h => h.memory.heapUsed);
        const rssValues = this.memoryHistory.map(h => h.memory.rss);

        return {
            heapUsed: {
                min: this.formatBytes(Math.min(...heapUsedValues)),
                max: this.formatBytes(Math.max(...heapUsedValues)),
                average: this.formatBytes(this.calculateAverage(this.memoryHistory, 'memory.heapUsed'))
            },
            rss: {
                min: this.formatBytes(Math.min(...rssValues)),
                max: this.formatBytes(Math.max(...rssValues)),
                average: this.formatBytes(this.calculateAverage(this.memoryHistory, 'memory.rss'))
            },
            gc: this.gcStats,
            uptime: this.formatUptime(Date.now() - this.startTime)
        };
    }

    /**
     * Get memory optimization recommendations
     */
    getMemoryRecommendations(stats) {
        const recommendations = [];
        const { memory } = stats;

        // High heap usage
        if (memory.heapUsedPercent > 80) {
            recommendations.push({
                type: 'warning',
                message: 'Heap usage is high (>80%). Consider triggering garbage collection.',
                action: 'gc'
            });
        }

        // Memory growth trend
        const trends = this.getMemoryTrends();
        if (trends && trends.trend === 'increasing' && parseFloat(trends.changePercent) > 20) {
            recommendations.push({
                type: 'warning',
                message: `Memory usage is increasing rapidly (+${trends.changePercent}%).`,
                action: 'investigate_leaks'
            });
        }

        // High external memory
        if (memory.external > this.config.alertThresholds.external) {
            recommendations.push({
                type: 'info',
                message: 'High external memory usage detected. Check for large buffers or native modules.',
                action: 'check_external'
            });
        }

        // GC recommendations
        if (this.gcStats.collections > 0) {
            const avgGCTime = this.gcStats.totalTime / this.gcStats.collections;
            if (avgGCTime > 100) {
                recommendations.push({
                    type: 'warning',
                    message: `Garbage collection is taking too long (avg: ${avgGCTime.toFixed(2)}ms).`,
                    action: 'optimize_gc'
                });
            }
        }

        return recommendations;
    }

    /**
     * Force garbage collection and report results
     */
    forceGarbageCollection() {
        if (!global.gc) {
            Logger.warn('Garbage collection not available. Run with --expose-gc flag.');
            return null;
        }

        const beforeStats = process.memoryUsage();
        global.gc();
        const afterStats = process.memoryUsage();

        const freed = {
            heapUsed: beforeStats.heapUsed - afterStats.heapUsed,
            heapTotal: beforeStats.heapTotal - afterStats.heapTotal,
            external: beforeStats.external - afterStats.external,
            rss: beforeStats.rss - afterStats.rss
        };

        Logger.info('🗑️ Forced garbage collection completed', {
            before: this.formatBytes(beforeStats),
            after: this.formatBytes(afterStats),
            freed: this.formatBytes(freed)
        });

        return { before: beforeStats, after: afterStats, freed };
    }

    /**
     * Calculate average value from history
     */
    calculateAverage(history, path) {
        const values = history.map(item => {
            const keys = path.split('.');
            let value = item;
            for (const key of keys) {
                value = value[key];
            }
            return value;
        });

        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }

    /**
     * Format bytes to human readable format
     */
    formatBytes(bytes) {
        if (typeof bytes === 'object') {
            const formatted = {};
            for (const [key, value] of Object.entries(bytes)) {
                formatted[key] = this.formatBytes(value);
            }
            return formatted;
        }

        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Format uptime to human readable format
     */
    formatUptime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
        if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    /**
     * Export memory data for analysis
     */
    exportMemoryData(format = 'json') {
        const data = {
            config: this.config,
            history: this.memoryHistory,
            summary: this.getMemorySummary(),
            exportTime: new Date().toISOString()
        };

        if (format === 'csv') {
            return this.convertToCSV(this.memoryHistory);
        }

        return JSON.stringify(data, null, 2);
    }

    /**
     * Convert memory history to CSV format
     */
    convertToCSV(history) {
        if (history.length === 0) return '';

        const headers = [
            'timestamp',
            'uptime',
            'heapUsed',
            'heapTotal',
            'external',
            'rss',
            'heapUsedPercent',
            'gcCollections',
            'gcTotalTime'
        ];

        const rows = history.map(item => [
            new Date(item.timestamp).toISOString(),
            item.uptime,
            item.memory.heapUsed,
            item.memory.heapTotal,
            item.memory.external,
            item.memory.rss,
            item.memory.heapUsedPercent.toFixed(2),
            item.gc.collections,
            item.gc.totalTime.toFixed(2)
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
}

module.exports = { MemoryMonitor };