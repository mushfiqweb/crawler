/**
 * Cycle Monitor
 * Comprehensive monitoring and error handling for automated crawling cycles
 */

const { EventEmitter } = require('events');
const { defaultLogger: Logger } = require('../utils/logger');
const { performance } = require('perf_hooks');
const fs = require('fs').promises;
const path = require('path');

class CycleMonitor extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            // Monitoring intervals
            healthCheckInterval: options.healthCheckInterval || 30000, // 30 seconds
            metricsCollectionInterval: options.metricsCollectionInterval || 60000, // 1 minute
            alertCheckInterval: options.alertCheckInterval || 15000, // 15 seconds
            
            // Thresholds
            memoryThreshold: options.memoryThreshold || 1500, // MB
            errorRateThreshold: options.errorRateThreshold || 0.1, // 10%
            responseTimeThreshold: options.responseTimeThreshold || 30000, // 30 seconds
            diskSpaceThreshold: options.diskSpaceThreshold || 1000, // MB
            
            // Alerting
            enableAlerts: options.enableAlerts !== false,
            alertCooldown: options.alertCooldown || 5 * 60 * 1000, // 5 minutes
            maxAlertsPerHour: options.maxAlertsPerHour || 10,
            
            // Logging and persistence
            enableMetricsPersistence: options.enableMetricsPersistence !== false,
            metricsRetentionDays: options.metricsRetentionDays || 7,
            logDirectory: options.logDirectory || './logs/cycle-metrics',
            
            // Recovery
            enableAutoRecovery: options.enableAutoRecovery !== false,
            recoveryAttempts: options.recoveryAttempts || 3,
            recoveryDelay: options.recoveryDelay || 30000 // 30 seconds
        };

        // Monitoring state
        this.state = {
            isMonitoring: false,
            startTime: null,
            lastHealthCheck: null,
            lastMetricsCollection: null,
            currentCycle: null,
            alerts: [],
            recoveryAttempts: 0
        };

        // Metrics storage
        this.metrics = {
            cycles: [],
            performance: {
                sessionDurations: [],
                cleanupDurations: [],
                idleDurations: [],
                restartTimes: []
            },
            resources: {
                memoryUsage: [],
                diskUsage: [],
                networkConnections: [],
                databaseConnections: []
            },
            errors: {
                byType: new Map(),
                byPhase: new Map(),
                timeline: []
            },
            alerts: []
        };

        // Timers
        this.timers = {
            healthCheck: null,
            metricsCollection: null,
            alertCheck: null
        };

        Logger.info('📊 CycleMonitor initialized', {
            healthCheckInterval: `${this.config.healthCheckInterval / 1000}s`,
            metricsInterval: `${this.config.metricsCollectionInterval / 1000}s`,
            alertsEnabled: this.config.enableAlerts,
            autoRecoveryEnabled: this.config.enableAutoRecovery
        });
    }

    /**
     * Start monitoring the automated cycle
     */
    async startMonitoring(cycleManager) {
        if (this.state.isMonitoring) {
            Logger.warn('⚠️ Monitoring already active');
            return;
        }

        try {
            this.state.isMonitoring = true;
            this.state.startTime = Date.now();
            this.cycleManager = cycleManager;

            Logger.info('📊 Starting cycle monitoring');

            // Setup event listeners for cycle manager
            this.setupCycleEventListeners();

            // Start monitoring timers
            this.startHealthChecks();
            this.startMetricsCollection();
            
            if (this.config.enableAlerts) {
                this.startAlertChecks();
            }

            // Create log directory if needed
            if (this.config.enableMetricsPersistence) {
                await this.ensureLogDirectory();
            }

            this.emit('monitoringStarted', {
                timestamp: this.state.startTime
            });

        } catch (error) {
            Logger.error('❌ Failed to start monitoring:', error);
            this.state.isMonitoring = false;
            throw error;
        }
    }

    /**
     * Stop monitoring
     */
    async stopMonitoring() {
        if (!this.state.isMonitoring) {
            return;
        }

        try {
            Logger.info('📊 Stopping cycle monitoring');

            this.state.isMonitoring = false;

            // Clear all timers
            Object.values(this.timers).forEach(timer => {
                if (timer) clearInterval(timer);
            });

            // Remove event listeners
            if (this.cycleManager) {
                this.cycleManager.removeAllListeners();
            }

            // Save final metrics if persistence is enabled
            if (this.config.enableMetricsPersistence) {
                await this.saveMetrics();
            }

            this.emit('monitoringStopped', {
                timestamp: Date.now(),
                duration: Date.now() - this.state.startTime
            });

        } catch (error) {
            Logger.error('❌ Error stopping monitoring:', error);
        }
    }

    /**
     * Setup event listeners for cycle manager
     */
    setupCycleEventListeners() {
        if (!this.cycleManager) return;

        // Session events
        this.cycleManager.on('sessionStarted', (data) => {
            this.handleSessionStarted(data);
        });

        this.cycleManager.on('sessionTerminated', (data) => {
            this.handleSessionTerminated(data);
        });

        this.cycleManager.on('sessionRestarted', (data) => {
            this.handleSessionRestarted(data);
        });

        // Cleanup events
        this.cycleManager.on('cleanupCompleted', (data) => {
            this.handleCleanupCompleted(data);
        });

        // Idle period events
        this.cycleManager.on('idlePeriodStarted', (data) => {
            this.handleIdlePeriodStarted(data);
        });

        this.cycleManager.on('idlePeriodEnded', (data) => {
            this.handleIdlePeriodEnded(data);
        });

        // Error events
        this.cycleManager.on('restartFailed', (data) => {
            this.handleRestartFailed(data);
        });

        this.cycleManager.on('emergencyShutdown', (data) => {
            this.handleEmergencyShutdown(data);
        });
    }

    /**
     * Start health checks
     */
    startHealthChecks() {
        this.timers.healthCheck = setInterval(() => {
            this.performHealthCheck().catch(error => {
                Logger.warn('⚠️ Health check failed:', error.message);
            });
        }, this.config.healthCheckInterval);
    }

    /**
     * Start metrics collection
     */
    startMetricsCollection() {
        this.timers.metricsCollection = setInterval(() => {
            this.collectMetrics().catch(error => {
                Logger.warn('⚠️ Metrics collection failed:', error.message);
            });
        }, this.config.metricsCollectionInterval);
    }

    /**
     * Start alert checks
     */
    startAlertChecks() {
        this.timers.alertCheck = setInterval(() => {
            this.checkAlerts().catch(error => {
                Logger.warn('⚠️ Alert check failed:', error.message);
            });
        }, this.config.alertCheckInterval);
    }

    /**
     * Perform comprehensive health check
     */
    async performHealthCheck() {
        try {
            this.state.lastHealthCheck = Date.now();
            
            const health = {
                timestamp: this.state.lastHealthCheck,
                memory: this.checkMemoryHealth(),
                disk: await this.checkDiskHealth(),
                network: this.checkNetworkHealth(),
                cycle: this.checkCycleHealth(),
                overall: 'healthy'
            };

            // Determine overall health
            const issues = [];
            if (health.memory.status !== 'healthy') issues.push('memory');
            if (health.disk.status !== 'healthy') issues.push('disk');
            if (health.network.status !== 'healthy') issues.push('network');
            if (health.cycle.status !== 'healthy') issues.push('cycle');

            if (issues.length > 0) {
                health.overall = issues.length > 2 ? 'critical' : 'warning';
                health.issues = issues;
            }

            // Log health status
            if (health.overall !== 'healthy') {
                Logger.warn('⚠️ Health check detected issues', {
                    overall: health.overall,
                    issues: health.issues,
                    memory: health.memory,
                    disk: health.disk,
                    cycle: health.cycle
                });
            }

            this.emit('healthCheck', health);
            return health;

        } catch (error) {
            Logger.error('❌ Health check error:', error);
            throw error;
        }
    }

    /**
     * Check memory health
     */
    checkMemoryHealth() {
        const memoryUsage = process.memoryUsage();
        const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
        const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
        const externalMB = memoryUsage.external / 1024 / 1024;

        let status = 'healthy';
        const warnings = [];

        if (heapUsedMB > this.config.memoryThreshold) {
            status = 'critical';
            warnings.push(`High heap usage: ${Math.round(heapUsedMB)}MB`);
        } else if (heapUsedMB > this.config.memoryThreshold * 0.8) {
            status = 'warning';
            warnings.push(`Elevated heap usage: ${Math.round(heapUsedMB)}MB`);
        }

        if (externalMB > 500) { // 500MB threshold for external memory
            status = status === 'critical' ? 'critical' : 'warning';
            warnings.push(`High external memory: ${Math.round(externalMB)}MB`);
        }

        return {
            status,
            warnings,
            heapUsed: Math.round(heapUsedMB),
            heapTotal: Math.round(heapTotalMB),
            external: Math.round(externalMB),
            rss: Math.round(memoryUsage.rss / 1024 / 1024)
        };
    }

    /**
     * Check disk health
     */
    async checkDiskHealth() {
        try {
            const stats = await fs.stat('./');
            // Note: Getting actual disk space requires platform-specific code
            // For now, we'll do a basic check
            
            return {
                status: 'healthy',
                warnings: [],
                available: 'unknown' // Would need platform-specific implementation
            };

        } catch (error) {
            return {
                status: 'warning',
                warnings: ['Could not check disk space'],
                error: error.message
            };
        }
    }

    /**
     * Check network health
     */
    checkNetworkHealth() {
        // Basic network health check
        // In a real implementation, this would check actual network connectivity
        
        return {
            status: 'healthy',
            warnings: [],
            connections: 'unknown' // Would need actual network monitoring
        };
    }

    /**
     * Check cycle health
     */
    checkCycleHealth() {
        if (!this.cycleManager) {
            return {
                status: 'warning',
                warnings: ['No cycle manager attached'],
                phase: 'unknown'
            };
        }

        const status = this.cycleManager.getStatus();
        const warnings = [];
        let healthStatus = 'healthy';

        // Check for error phase
        if (status.phase === 'error') {
            healthStatus = 'critical';
            warnings.push('Cycle in error state');
        }

        // Check for excessive restart attempts
        if (status.restartAttempts > 1) {
            healthStatus = healthStatus === 'critical' ? 'critical' : 'warning';
            warnings.push(`Multiple restart attempts: ${status.restartAttempts}`);
        }

        // Check for recent errors
        if (status.errors > 5) {
            healthStatus = healthStatus === 'critical' ? 'critical' : 'warning';
            warnings.push(`High error count: ${status.errors}`);
        }

        return {
            status: healthStatus,
            warnings,
            phase: status.phase,
            cycleCount: status.cycleCount,
            restartAttempts: status.restartAttempts,
            errors: status.errors
        };
    }

    /**
     * Collect performance metrics
     */
    async collectMetrics() {
        try {
            this.state.lastMetricsCollection = Date.now();

            const metrics = {
                timestamp: this.state.lastMetricsCollection,
                memory: process.memoryUsage(),
                uptime: process.uptime(),
                cpu: process.cpuUsage(),
                cycle: this.cycleManager ? this.cycleManager.getStatus() : null
            };

            // Store metrics
            this.metrics.resources.memoryUsage.push({
                timestamp: metrics.timestamp,
                heapUsed: metrics.memory.heapUsed,
                heapTotal: metrics.memory.heapTotal,
                external: metrics.memory.external,
                rss: metrics.memory.rss
            });

            // Limit stored metrics to prevent memory growth
            this.limitMetricsStorage();

            this.emit('metricsCollected', metrics);

        } catch (error) {
            Logger.error('❌ Metrics collection error:', error);
        }
    }

    /**
     * Check for alert conditions
     */
    async checkAlerts() {
        try {
            const now = Date.now();
            const alerts = [];

            // Check memory alerts
            const memoryHealth = this.checkMemoryHealth();
            if (memoryHealth.status === 'critical') {
                alerts.push({
                    type: 'memory_critical',
                    severity: 'critical',
                    message: `Critical memory usage: ${memoryHealth.heapUsed}MB`,
                    timestamp: now,
                    data: memoryHealth
                });
            }

            // Check cycle alerts
            const cycleHealth = this.checkCycleHealth();
            if (cycleHealth.status === 'critical') {
                alerts.push({
                    type: 'cycle_critical',
                    severity: 'critical',
                    message: `Cycle in critical state: ${cycleHealth.warnings.join(', ')}`,
                    timestamp: now,
                    data: cycleHealth
                });
            }

            // Check error rate
            const recentErrors = this.getRecentErrors(5 * 60 * 1000); // Last 5 minutes
            if (recentErrors.length > 10) {
                alerts.push({
                    type: 'high_error_rate',
                    severity: 'warning',
                    message: `High error rate: ${recentErrors.length} errors in 5 minutes`,
                    timestamp: now,
                    data: { errorCount: recentErrors.length }
                });
            }

            // Process alerts
            for (const alert of alerts) {
                await this.processAlert(alert);
            }

        } catch (error) {
            Logger.error('❌ Alert check error:', error);
        }
    }

    /**
     * Process an alert
     */
    async processAlert(alert) {
        try {
            // Check cooldown
            const recentSimilarAlerts = this.state.alerts.filter(a => 
                a.type === alert.type && 
                Date.now() - a.timestamp < this.config.alertCooldown
            );

            if (recentSimilarAlerts.length > 0) {
                return; // Skip due to cooldown
            }

            // Check rate limiting
            const recentAlerts = this.state.alerts.filter(a => 
                Date.now() - a.timestamp < 60 * 60 * 1000 // Last hour
            );

            if (recentAlerts.length >= this.config.maxAlertsPerHour) {
                return; // Skip due to rate limiting
            }

            // Store alert
            this.state.alerts.push(alert);
            this.metrics.alerts.push(alert);

            // Log alert
            Logger.warn(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`, {
                type: alert.type,
                timestamp: new Date(alert.timestamp).toISOString(),
                data: alert.data
            });

            // Emit alert event
            this.emit('alert', alert);

            // Attempt auto-recovery if enabled
            if (this.config.enableAutoRecovery && alert.severity === 'critical') {
                await this.attemptAutoRecovery(alert);
            }

        } catch (error) {
            Logger.error('❌ Alert processing error:', error);
        }
    }

    /**
     * Attempt automatic recovery
     */
    async attemptAutoRecovery(alert) {
        if (this.state.recoveryAttempts >= this.config.recoveryAttempts) {
            Logger.warn('⚠️ Maximum recovery attempts reached, skipping auto-recovery');
            return;
        }

        try {
            this.state.recoveryAttempts++;
            
            Logger.info('🔧 Attempting auto-recovery', {
                alertType: alert.type,
                attempt: this.state.recoveryAttempts,
                maxAttempts: this.config.recoveryAttempts
            });

            // Recovery actions based on alert type
            switch (alert.type) {
                case 'memory_critical':
                    await this.recoverFromMemoryIssue();
                    break;
                case 'cycle_critical':
                    await this.recoverFromCycleIssue();
                    break;
                default:
                    Logger.warn('⚠️ No recovery action defined for alert type:', alert.type);
            }

            // Wait before next recovery attempt
            await new Promise(resolve => setTimeout(resolve, this.config.recoveryDelay));

        } catch (error) {
            Logger.error('❌ Auto-recovery failed:', error);
        }
    }

    /**
     * Recover from memory issues
     */
    async recoverFromMemoryIssue() {
        try {
            Logger.info('🔧 Attempting memory recovery');

            // Force garbage collection if available
            if (global.gc) {
                global.gc();
                Logger.info('✅ Forced garbage collection');
            }

            // Trigger cleanup if cycle manager is available
            if (this.cycleManager && this.cycleManager.resourceCleanup) {
                await this.cycleManager.resourceCleanup.performCleanup({ forced: true });
                Logger.info('✅ Forced resource cleanup');
            }

        } catch (error) {
            Logger.error('❌ Memory recovery failed:', error);
            throw error;
        }
    }

    /**
     * Recover from cycle issues
     */
    async recoverFromCycleIssue() {
        try {
            Logger.info('🔧 Attempting cycle recovery');

            // This would implement cycle-specific recovery logic
            // For now, just log the attempt
            Logger.info('✅ Cycle recovery attempted');

        } catch (error) {
            Logger.error('❌ Cycle recovery failed:', error);
            throw error;
        }
    }

    /**
     * Event handlers for cycle events
     */
    handleSessionStarted(data) {
        Logger.debug('📊 Session started event received', data);
        this.state.currentCycle = data;
    }

    handleSessionTerminated(data) {
        Logger.debug('📊 Session terminated event received', data);
        this.metrics.performance.sessionDurations.push(data.actualDuration);
    }

    handleSessionRestarted(data) {
        Logger.debug('📊 Session restarted event received', data);
        this.metrics.performance.restartTimes.push(data.restartTime);
    }

    handleCleanupCompleted(data) {
        Logger.debug('📊 Cleanup completed event received', data);
        this.metrics.performance.cleanupDurations.push(data.duration);
    }

    handleIdlePeriodStarted(data) {
        Logger.debug('📊 Idle period started event received', data);
    }

    handleIdlePeriodEnded(data) {
        Logger.debug('📊 Idle period ended event received', data);
        this.metrics.performance.idleDurations.push(data.actualDuration);
    }

    handleRestartFailed(data) {
        Logger.warn('📊 Restart failed event received', data);
        this.recordError('restart_failed', data);
    }

    handleEmergencyShutdown(data) {
        Logger.error('📊 Emergency shutdown event received', data);
        this.recordError('emergency_shutdown', data);
    }

    /**
     * Record an error for tracking
     */
    recordError(type, data) {
        const error = {
            type,
            timestamp: Date.now(),
            data
        };

        this.metrics.errors.timeline.push(error);
        
        // Update error counts by type
        const currentCount = this.metrics.errors.byType.get(type) || 0;
        this.metrics.errors.byType.set(type, currentCount + 1);
    }

    /**
     * Get recent errors
     */
    getRecentErrors(timeWindow) {
        const cutoff = Date.now() - timeWindow;
        return this.metrics.errors.timeline.filter(error => error.timestamp > cutoff);
    }

    /**
     * Limit metrics storage to prevent memory growth
     */
    limitMetricsStorage() {
        const maxEntries = 1000;
        
        // Limit memory usage metrics
        if (this.metrics.resources.memoryUsage.length > maxEntries) {
            this.metrics.resources.memoryUsage = this.metrics.resources.memoryUsage.slice(-maxEntries);
        }

        // Limit error timeline
        if (this.metrics.errors.timeline.length > maxEntries) {
            this.metrics.errors.timeline = this.metrics.errors.timeline.slice(-maxEntries);
        }

        // Limit alerts
        if (this.metrics.alerts.length > maxEntries) {
            this.metrics.alerts = this.metrics.alerts.slice(-maxEntries);
        }
    }

    /**
     * Ensure log directory exists
     */
    async ensureLogDirectory() {
        try {
            await fs.mkdir(this.config.logDirectory, { recursive: true });
        } catch (error) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }

    /**
     * Save metrics to disk
     */
    async saveMetrics() {
        if (!this.config.enableMetricsPersistence) {
            return;
        }

        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `cycle-metrics-${timestamp}.json`;
            const filepath = path.join(this.config.logDirectory, filename);

            const metricsData = {
                timestamp: Date.now(),
                monitoring: {
                    startTime: this.state.startTime,
                    duration: Date.now() - this.state.startTime
                },
                metrics: this.metrics,
                config: this.config
            };

            await fs.writeFile(filepath, JSON.stringify(metricsData, null, 2));
            Logger.info('💾 Metrics saved to disk', { filepath });

        } catch (error) {
            Logger.error('❌ Failed to save metrics:', error);
        }
    }

    /**
     * Get comprehensive monitoring report
     */
    getReport() {
        const now = Date.now();
        const uptime = this.state.startTime ? now - this.state.startTime : 0;

        return {
            monitoring: {
                isActive: this.state.isMonitoring,
                uptime: Math.round(uptime / 1000),
                lastHealthCheck: this.state.lastHealthCheck ? new Date(this.state.lastHealthCheck).toISOString() : null,
                lastMetricsCollection: this.state.lastMetricsCollection ? new Date(this.state.lastMetricsCollection).toISOString() : null
            },
            currentCycle: this.state.currentCycle,
            performance: {
                averageSessionDuration: this.calculateAverage(this.metrics.performance.sessionDurations),
                averageCleanupDuration: this.calculateAverage(this.metrics.performance.cleanupDurations),
                averageIdleDuration: this.calculateAverage(this.metrics.performance.idleDurations),
                totalRestarts: this.metrics.performance.restartTimes.length
            },
            errors: {
                totalErrors: this.metrics.errors.timeline.length,
                recentErrors: this.getRecentErrors(60 * 60 * 1000).length, // Last hour
                errorsByType: Object.fromEntries(this.metrics.errors.byType)
            },
            alerts: {
                totalAlerts: this.metrics.alerts.length,
                recentAlerts: this.state.alerts.filter(a => now - a.timestamp < 60 * 60 * 1000).length,
                recoveryAttempts: this.state.recoveryAttempts
            },
            resources: {
                currentMemory: process.memoryUsage(),
                memoryTrend: this.getMemoryTrend()
            }
        };
    }

    /**
     * Calculate average of an array
     */
    calculateAverage(array) {
        if (array.length === 0) return 0;
        return Math.round(array.reduce((sum, val) => sum + val, 0) / array.length);
    }

    /**
     * Get memory usage trend
     */
    getMemoryTrend() {
        const recent = this.metrics.resources.memoryUsage.slice(-10); // Last 10 entries
        if (recent.length < 2) return 'stable';

        const first = recent[0].heapUsed;
        const last = recent[recent.length - 1].heapUsed;
        const change = (last - first) / first;

        if (change > 0.1) return 'increasing';
        if (change < -0.1) return 'decreasing';
        return 'stable';
    }
}

module.exports = { CycleMonitor };