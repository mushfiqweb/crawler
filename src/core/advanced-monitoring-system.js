const { EventEmitter } = require('events');
const fs = require('fs').promises;
const path = require('path');
const Logger = require('../utils/logger');

/**
 * Advanced Monitoring System
 * Provides comprehensive monitoring, metrics collection, and alerting
 */
class AdvancedMonitoringSystem extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            enableMetricsCollection: config.enableMetricsCollection !== false,
            enableAlerting: config.enableAlerting !== false,
            enableLogging: config.enableLogging !== false,
            metricsInterval: config.metricsInterval || 30000, // 30 seconds
            alertThresholds: {
                memoryUsage: config.memoryUsage || 80, // percentage
                cpuUsage: config.cpuUsage || 70, // percentage
                errorRate: config.errorRate || 5, // percentage
                responseTime: config.responseTime || 5000, // milliseconds
                ...config.alertThresholds
            },
            retentionPeriod: config.retentionPeriod || 24 * 60 * 60 * 1000, // 24 hours
            exportPath: config.exportPath || './monitoring-data',
            ...config
        };

        this.metrics = {
            system: {
                memory: [],
                cpu: [],
                disk: [],
                network: []
            },
            browserPool: {
                poolSize: [],
                busyBrowsers: [],
                availableBrowsers: [],
                queueLength: [],
                creationTime: [],
                recyclingRate: []
            },
            performance: {
                responseTime: [],
                throughput: [],
                errorRate: [],
                successRate: []
            },
            security: {
                violations: [],
                blockedRequests: [],
                sessionSecurity: []
            },
            organic: {
                sessionDuration: [],
                searchPatterns: [],
                behaviorMetrics: []
            }
        };

        this.alerts = {
            active: new Map(),
            history: [],
            suppressions: new Map()
        };

        this.dashboardData = {
            realTime: {},
            historical: {},
            trends: {}
        };

        this.isMonitoring = false;
        this.monitoringInterval = null;
        this.components = new Map();
    }

    /**
     * Initialize monitoring system
     */
    async initialize() {
        try {
            Logger.info('📊 Initializing Advanced Monitoring System...');
            
            // Create export directory
            await this.ensureExportDirectory();
            
            // Load historical data
            await this.loadHistoricalData();
            
            // Setup monitoring intervals
            this.setupMonitoringIntervals();
            
            Logger.info('📊 Advanced Monitoring System initialized');
            this.emit('initialized');
        } catch (error) {
            Logger.error('❌ Failed to initialize monitoring system:', error);
            throw error;
        }
    }

    /**
     * Register a component for monitoring
     */
    registerComponent(name, component) {
        this.components.set(name, component);
        
        // Setup event listeners for the component
        this.setupComponentListeners(name, component);
        
        Logger.info(`📊 Registered component for monitoring: ${name}`);
    }

    /**
     * Setup event listeners for components
     */
    setupComponentListeners(name, component) {
        // Browser pool events
        if (name === 'browserPool') {
            component.on('browserCreated', (data) => this.recordMetric('browserPool', 'creation', data));
            component.on('browserRecycled', (data) => this.recordMetric('browserPool', 'recycling', data));
            component.on('scaledUp', (data) => this.recordMetric('browserPool', 'scaleUp', data));
            component.on('scaledDown', (data) => this.recordMetric('browserPool', 'scaleDown', data));
        }

        // Security manager events
        if (name === 'securityManager') {
            component.on('securityViolation', (data) => this.recordSecurityEvent('violation', data));
            component.on('sessionCreated', (data) => this.recordSecurityEvent('sessionCreated', data));
        }

        // Organic behavior events
        if (name === 'organicBehavior') {
            component.on('searchPerformed', (data) => this.recordOrganicEvent('search', data));
            component.on('sessionCreated', (data) => this.recordOrganicEvent('sessionCreated', data));
        }

        // Memory manager events
        if (name === 'memoryManager') {
            component.on('memoryAlert', (data) => this.handleMemoryAlert(data));
            component.on('memoryCritical', (data) => this.handleCriticalAlert('memory', data));
        }
    }

    /**
     * Start monitoring
     */
    async startMonitoring() {
        if (this.isMonitoring) return;

        try {
            Logger.info('📊 Starting monitoring...');
            this.isMonitoring = true;
            
            // Start metrics collection
            this.monitoringInterval = setInterval(() => {
                this.collectSystemMetrics();
                this.collectComponentMetrics();
                this.checkAlertConditions();
                this.updateDashboard();
            }, this.config.metricsInterval);

            this.emit('monitoringStarted');
            Logger.info('📊 Monitoring started');
        } catch (error) {
            Logger.error('❌ Failed to start monitoring:', error);
            throw error;
        }
    }

    /**
     * Stop monitoring
     */
    async stopMonitoring() {
        if (!this.isMonitoring) return;

        try {
            Logger.info('📊 Stopping monitoring...');
            this.isMonitoring = false;
            
            if (this.monitoringInterval) {
                clearInterval(this.monitoringInterval);
                this.monitoringInterval = null;
            }

            // Export final metrics
            await this.exportMetrics();

            this.emit('monitoringStopped');
            Logger.info('📊 Monitoring stopped');
        } catch (error) {
            Logger.error('❌ Error stopping monitoring:', error);
        }
    }

    /**
     * Collect system metrics
     */
    collectSystemMetrics() {
        try {
            const timestamp = Date.now();
            
            // Memory metrics
            const memUsage = process.memoryUsage();
            this.recordMetric('system', 'memory', {
                timestamp,
                heapUsed: memUsage.heapUsed,
                heapTotal: memUsage.heapTotal,
                external: memUsage.external,
                rss: memUsage.rss,
                usage: (memUsage.heapUsed / memUsage.heapTotal) * 100
            });

            // CPU metrics
            const cpuUsage = process.cpuUsage();
            this.recordMetric('system', 'cpu', {
                timestamp,
                user: cpuUsage.user,
                system: cpuUsage.system,
                usage: this.calculateCpuUsage(cpuUsage)
            });

        } catch (error) {
            Logger.debug('⚠️ Error collecting system metrics:', error.message);
        }
    }

    /**
     * Collect metrics from registered components
     */
    collectComponentMetrics() {
        try {
            const timestamp = Date.now();

            // Browser pool metrics
            const browserPool = this.components.get('browserPool');
            if (browserPool) {
                const stats = browserPool.getStats();
                this.recordMetric('browserPool', 'poolSize', {
                    timestamp,
                    total: stats.totalBrowsers,
                    busy: stats.busyBrowsers,
                    available: stats.availableBrowsers,
                    queue: stats.queueLength
                });
            }

            // Security metrics
            const securityManager = this.components.get('securityManager');
            if (securityManager) {
                const stats = securityManager.getSecurityStats();
                this.recordMetric('security', 'overview', {
                    timestamp,
                    activeSessions: stats.activeSessions,
                    violations: stats.securityViolations,
                    blockedRequests: stats.blockedRequests
                });
            }

            // Organic behavior metrics
            const organicBehavior = this.components.get('organicBehavior');
            if (organicBehavior) {
                const stats = organicBehavior.getBehaviorStats();
                this.recordMetric('organic', 'behavior', {
                    timestamp,
                    activeSessions: stats.activeSessions,
                    searchesPerformed: stats.searchesPerformed,
                    averageSessionDuration: stats.averageSessionDuration
                });
            }

        } catch (error) {
            Logger.debug('⚠️ Error collecting component metrics:', error.message);
        }
    }

    /**
     * Record a metric
     */
    recordMetric(category, type, data) {
        try {
            if (!this.metrics[category]) {
                this.metrics[category] = {};
            }
            
            if (!this.metrics[category][type]) {
                this.metrics[category][type] = [];
            }

            this.metrics[category][type].push(data);

            // Cleanup old metrics
            this.cleanupOldMetrics(category, type);

            this.emit('metricRecorded', { category, type, data });
        } catch (error) {
            Logger.debug('⚠️ Error recording metric:', error.message);
        }
    }

    /**
     * Record security event
     */
    recordSecurityEvent(type, data) {
        this.recordMetric('security', type, {
            timestamp: Date.now(),
            ...data
        });
    }

    /**
     * Record organic behavior event
     */
    recordOrganicEvent(type, data) {
        this.recordMetric('organic', type, {
            timestamp: Date.now(),
            ...data
        });
    }

    /**
     * Check alert conditions
     */
    checkAlertConditions() {
        try {
            this.checkMemoryAlerts();
            this.checkCpuAlerts();
            this.checkErrorRateAlerts();
            this.checkResponseTimeAlerts();
            this.checkSecurityAlerts();
        } catch (error) {
            Logger.debug('⚠️ Error checking alert conditions:', error.message);
        }
    }

    /**
     * Check memory alerts
     */
    checkMemoryAlerts() {
        const memoryMetrics = this.metrics.system.memory;
        if (memoryMetrics.length === 0) return;

        const latest = memoryMetrics[memoryMetrics.length - 1];
        const threshold = this.config.alertThresholds.memoryUsage;

        if (latest.usage > threshold) {
            this.triggerAlert('memory_high', {
                current: latest.usage,
                threshold,
                severity: latest.usage > threshold * 1.2 ? 'critical' : 'warning'
            });
        } else {
            this.resolveAlert('memory_high');
        }
    }

    /**
     * Check CPU alerts
     */
    checkCpuAlerts() {
        const cpuMetrics = this.metrics.system.cpu;
        if (cpuMetrics.length === 0) return;

        const latest = cpuMetrics[cpuMetrics.length - 1];
        const threshold = this.config.alertThresholds.cpuUsage;

        if (latest.usage > threshold) {
            this.triggerAlert('cpu_high', {
                current: latest.usage,
                threshold,
                severity: latest.usage > threshold * 1.2 ? 'critical' : 'warning'
            });
        } else {
            this.resolveAlert('cpu_high');
        }
    }

    /**
     * Check error rate alerts
     */
    checkErrorRateAlerts() {
        const browserPool = this.components.get('browserPool');
        if (!browserPool) return;

        const stats = browserPool.getStats();
        const totalOperations = stats.created + stats.reused;
        const errorRate = totalOperations > 0 ? (stats.errors / totalOperations) * 100 : 0;
        const threshold = this.config.alertThresholds.errorRate;

        if (errorRate > threshold) {
            this.triggerAlert('error_rate_high', {
                current: errorRate,
                threshold,
                severity: errorRate > threshold * 2 ? 'critical' : 'warning'
            });
        } else {
            this.resolveAlert('error_rate_high');
        }
    }

    /**
     * Check response time alerts
     */
    checkResponseTimeAlerts() {
        const browserPool = this.components.get('browserPool');
        if (!browserPool) return;

        const stats = browserPool.getStats();
        const threshold = this.config.alertThresholds.responseTime;

        if (stats.averageResponseTime > threshold) {
            this.triggerAlert('response_time_high', {
                current: stats.averageResponseTime,
                threshold,
                severity: stats.averageResponseTime > threshold * 2 ? 'critical' : 'warning'
            });
        } else {
            this.resolveAlert('response_time_high');
        }
    }

    /**
     * Check security alerts
     */
    checkSecurityAlerts() {
        const securityManager = this.components.get('securityManager');
        if (!securityManager) return;

        const stats = securityManager.getSecurityStats();
        
        // Check for high violation rate
        if (stats.securityViolations > 10) { // More than 10 violations
            this.triggerAlert('security_violations_high', {
                current: stats.securityViolations,
                threshold: 10,
                severity: 'warning'
            });
        }
    }

    /**
     * Trigger an alert
     */
    triggerAlert(alertId, data) {
        if (this.alerts.active.has(alertId)) return; // Alert already active

        const alert = {
            id: alertId,
            timestamp: Date.now(),
            data,
            status: 'active'
        };

        this.alerts.active.set(alertId, alert);
        this.alerts.history.push(alert);

        Logger.warn(`🚨 Alert triggered: ${alertId}`, data);
        this.emit('alertTriggered', alert);
    }

    /**
     * Resolve an alert
     */
    resolveAlert(alertId) {
        const alert = this.alerts.active.get(alertId);
        if (!alert) return;

        alert.status = 'resolved';
        alert.resolvedAt = Date.now();
        
        this.alerts.active.delete(alertId);
        
        Logger.info(`✅ Alert resolved: ${alertId}`);
        this.emit('alertResolved', alert);
    }

    /**
     * Handle memory alert from memory manager
     */
    handleMemoryAlert(data) {
        this.triggerAlert('memory_manager_alert', {
            ...data,
            severity: 'warning'
        });
    }

    /**
     * Handle critical alert
     */
    handleCriticalAlert(type, data) {
        this.triggerAlert(`${type}_critical`, {
            ...data,
            severity: 'critical'
        });
    }

    /**
     * Update dashboard data
     */
    updateDashboard() {
        try {
            this.dashboardData.realTime = {
                timestamp: Date.now(),
                system: this.getLatestSystemMetrics(),
                browserPool: this.getLatestBrowserPoolMetrics(),
                security: this.getLatestSecurityMetrics(),
                organic: this.getLatestOrganicMetrics(),
                alerts: Array.from(this.alerts.active.values())
            };

            this.emit('dashboardUpdated', this.dashboardData.realTime);
        } catch (error) {
            Logger.debug('⚠️ Error updating dashboard:', error.message);
        }
    }

    /**
     * Get latest system metrics
     */
    getLatestSystemMetrics() {
        const memory = this.metrics.system.memory;
        const cpu = this.metrics.system.cpu;

        return {
            memory: memory.length > 0 ? memory[memory.length - 1] : null,
            cpu: cpu.length > 0 ? cpu[cpu.length - 1] : null
        };
    }

    /**
     * Get latest browser pool metrics
     */
    getLatestBrowserPoolMetrics() {
        const browserPool = this.components.get('browserPool');
        return browserPool ? browserPool.getStats() : null;
    }

    /**
     * Get latest security metrics
     */
    getLatestSecurityMetrics() {
        const securityManager = this.components.get('securityManager');
        return securityManager ? securityManager.getSecurityStats() : null;
    }

    /**
     * Get latest organic metrics
     */
    getLatestOrganicMetrics() {
        const organicBehavior = this.components.get('organicBehavior');
        return organicBehavior ? organicBehavior.getBehaviorStats() : null;
    }

    /**
     * Calculate CPU usage percentage
     */
    calculateCpuUsage(cpuUsage) {
        // Simplified CPU usage calculation
        const total = cpuUsage.user + cpuUsage.system;
        return Math.min(100, (total / 1000000) * 100); // Convert to percentage
    }

    /**
     * Cleanup old metrics
     */
    cleanupOldMetrics(category, type) {
        const metrics = this.metrics[category][type];
        const cutoff = Date.now() - this.config.retentionPeriod;
        
        this.metrics[category][type] = metrics.filter(metric => 
            metric.timestamp > cutoff
        );
    }

    /**
     * Setup monitoring intervals
     */
    setupMonitoringIntervals() {
        // Cleanup interval for old data
        setInterval(() => {
            this.cleanupOldData();
        }, 60 * 60 * 1000); // Every hour

        // Export interval for metrics
        setInterval(() => {
            this.exportMetrics();
        }, 10 * 60 * 1000); // Every 10 minutes
    }

    /**
     * Cleanup old data
     */
    cleanupOldData() {
        try {
            // Cleanup metrics
            Object.keys(this.metrics).forEach(category => {
                Object.keys(this.metrics[category]).forEach(type => {
                    this.cleanupOldMetrics(category, type);
                });
            });

            // Cleanup alert history
            const cutoff = Date.now() - this.config.retentionPeriod;
            this.alerts.history = this.alerts.history.filter(alert => 
                alert.timestamp > cutoff
            );

        } catch (error) {
            Logger.debug('⚠️ Error cleaning up old data:', error.message);
        }
    }

    /**
     * Ensure export directory exists
     */
    async ensureExportDirectory() {
        try {
            await fs.mkdir(this.config.exportPath, { recursive: true });
        } catch (error) {
            Logger.warn('⚠️ Error creating export directory:', error.message);
        }
    }

    /**
     * Export metrics to file
     */
    async exportMetrics() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `metrics-${timestamp}.json`;
            const filepath = path.join(this.config.exportPath, filename);

            const exportData = {
                timestamp: Date.now(),
                metrics: this.metrics,
                alerts: this.alerts.history,
                dashboard: this.dashboardData
            };

            await fs.writeFile(filepath, JSON.stringify(exportData, null, 2));
            Logger.debug(`📊 Metrics exported to ${filename}`);
        } catch (error) {
            Logger.debug('⚠️ Error exporting metrics:', error.message);
        }
    }

    /**
     * Load historical data
     */
    async loadHistoricalData() {
        try {
            // Implementation for loading historical data from files
            // This would read the most recent metrics file and restore state
        } catch (error) {
            Logger.debug('⚠️ Error loading historical data:', error.message);
        }
    }

    /**
     * Get monitoring report
     */
    getMonitoringReport() {
        return {
            system: this.getLatestSystemMetrics(),
            browserPool: this.getLatestBrowserPoolMetrics(),
            security: this.getLatestSecurityMetrics(),
            organic: this.getLatestOrganicMetrics(),
            alerts: {
                active: Array.from(this.alerts.active.values()),
                total: this.alerts.history.length
            },
            uptime: this.isMonitoring ? Date.now() - this.startTime : 0
        };
    }

    /**
     * Shutdown monitoring system
     */
    async shutdown() {
        try {
            Logger.info('📊 Shutting down Advanced Monitoring System...');
            
            await this.stopMonitoring();
            await this.exportMetrics();

            this.emit('shutdown');
            Logger.info('📊 Advanced Monitoring System shutdown complete');
        } catch (error) {
            Logger.error('❌ Error during monitoring system shutdown:', error);
        }
    }
}

module.exports = { AdvancedMonitoringSystem };