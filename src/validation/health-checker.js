/**
 * Health Checker Module
 * Monitors system health, performance metrics, and operational status
 */

const { EventEmitter } = require('events');
const { Logger } = require('../utils/logger');
const { Helpers } = require('../utils/helpers');

class HealthChecker extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.logger = new Logger('HealthChecker');
        this.options = {
            checkInterval: options.checkInterval || 30000, // 30 seconds
            memoryThreshold: options.memoryThreshold || 80, // 80% memory usage
            responseTimeThreshold: options.responseTimeThreshold || 5000, // 5 seconds
            errorRateThreshold: options.errorRateThreshold || 10, // 10% error rate
            enableAutoRestart: options.enableAutoRestart || false,
            maxRestartAttempts: options.maxRestartAttempts || 3,
            ...options
        };
        
        this.healthMetrics = {
            status: 'unknown',
            uptime: 0,
            lastCheck: null,
            memory: {
                usage: 0,
                threshold: this.options.memoryThreshold,
                status: 'unknown'
            },
            performance: {
                averageResponseTime: 0,
                requestCount: 0,
                errorCount: 0,
                errorRate: 0,
                status: 'unknown'
            },
            system: {
                cpuUsage: 0,
                loadAverage: 0,
                diskSpace: 0,
                status: 'unknown'
            },
            components: new Map(),
            alerts: [],
            history: []
        };
        
        this.isMonitoring = false;
        this.monitoringInterval = null;
        this.startTime = Date.now();
        this.restartAttempts = 0;
        
        // Component health trackers
        this.componentTrackers = new Map();
        
        // Bind methods
        this.performHealthCheck = this.performHealthCheck.bind(this);
    }

    /**
     * Start health monitoring
     */
    start() {
        if (this.isMonitoring) {
            this.logger.warn('Health monitoring is already running');
            return;
        }

        this.logger.info('Starting health monitoring...');
        this.isMonitoring = true;
        this.startTime = Date.now();
        
        // Perform initial health check
        this.performHealthCheck();
        
        // Set up periodic health checks
        this.monitoringInterval = setInterval(
            this.performHealthCheck,
            this.options.checkInterval
        );
        
        this.emit('monitoring:started');
    }

    /**
     * Stop health monitoring
     */
    stop() {
        if (!this.isMonitoring) {
            this.logger.warn('Health monitoring is not running');
            return;
        }

        this.logger.info('Stopping health monitoring...');
        this.isMonitoring = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        this.emit('monitoring:stopped');
    }

    /**
     * Perform comprehensive health check
     */
    async performHealthCheck() {
        try {
            const checkStartTime = Date.now();
            
            // Update uptime
            this.healthMetrics.uptime = Date.now() - this.startTime;
            this.healthMetrics.lastCheck = new Date().toISOString();
            
            // Check memory usage
            await this.checkMemoryHealth();
            
            // Check system resources
            await this.checkSystemHealth();
            
            // Check component health
            await this.checkComponentsHealth();
            
            // Calculate overall health status
            this.calculateOverallHealth();
            
            // Store health check in history
            this.storeHealthHistory();
            
            // Check for alerts
            this.checkAlerts();
            
            const checkDuration = Date.now() - checkStartTime;
            this.logger.debug(`Health check completed in ${checkDuration}ms`);
            
            this.emit('health:checked', this.healthMetrics);
            
        } catch (error) {
            this.logger.error('Health check failed:', error);
            this.healthMetrics.status = 'error';
            this.emit('health:error', error);
        }
    }

    /**
     * Check memory health
     */
    async checkMemoryHealth() {
        try {
            const memoryUsage = process.memoryUsage();
            const totalMemory = require('os').totalmem();
            const freeMemory = require('os').freemem();
            const usedMemory = totalMemory - freeMemory;
            const memoryUsagePercent = (usedMemory / totalMemory) * 100;
            
            this.healthMetrics.memory = {
                usage: memoryUsagePercent,
                threshold: this.options.memoryThreshold,
                rss: memoryUsage.rss,
                heapTotal: memoryUsage.heapTotal,
                heapUsed: memoryUsage.heapUsed,
                external: memoryUsage.external,
                status: memoryUsagePercent > this.options.memoryThreshold ? 'critical' : 
                       memoryUsagePercent > (this.options.memoryThreshold * 0.8) ? 'warning' : 'healthy'
            };
            
        } catch (error) {
            this.logger.error('Memory health check failed:', error);
            this.healthMetrics.memory.status = 'error';
        }
    }

    /**
     * Check system health
     */
    async checkSystemHealth() {
        try {
            const os = require('os');
            
            // CPU usage (simplified)
            const cpus = os.cpus();
            const cpuCount = cpus.length;
            
            // Load average (Unix-like systems)
            let loadAverage = 0;
            try {
                const loadAvg = os.loadavg();
                loadAverage = loadAvg[0]; // 1-minute load average
            } catch (error) {
                // Windows doesn't support loadavg
                loadAverage = 0;
            }
            
            // Disk space check (simplified)
            let diskSpace = 0;
            try {
                const fs = require('fs');
                const stats = fs.statSync(process.cwd());
                diskSpace = 100; // Assume healthy if accessible
            } catch (error) {
                diskSpace = 0;
            }
            
            this.healthMetrics.system = {
                cpuCount,
                loadAverage,
                diskSpace,
                platform: os.platform(),
                arch: os.arch(),
                nodeVersion: process.version,
                status: loadAverage > cpuCount * 2 ? 'critical' : 
                       loadAverage > cpuCount ? 'warning' : 'healthy'
            };
            
        } catch (error) {
            this.logger.error('System health check failed:', error);
            this.healthMetrics.system.status = 'error';
        }
    }

    /**
     * Check components health
     */
    async checkComponentsHealth() {
        const healthPromises = [];
        
        for (const [componentName, tracker] of this.componentTrackers) {
            healthPromises.push(this.checkComponentHealth(componentName, tracker));
        }
        
        await Promise.allSettled(healthPromises);
    }

    /**
     * Check individual component health
     */
    async checkComponentHealth(componentName, tracker) {
        try {
            const now = Date.now();
            const windowSize = 5 * 60 * 1000; // 5 minutes
            
            // Filter recent metrics
            const recentMetrics = tracker.metrics.filter(
                metric => now - metric.timestamp < windowSize
            );
            
            if (recentMetrics.length === 0) {
                this.healthMetrics.components.set(componentName, {
                    status: 'inactive',
                    lastActivity: tracker.lastActivity,
                    message: 'No recent activity'
                });
                return;
            }
            
            // Calculate metrics
            const totalRequests = recentMetrics.length;
            const errors = recentMetrics.filter(m => !m.success).length;
            const errorRate = (errors / totalRequests) * 100;
            const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests;
            
            // Determine status
            let status = 'healthy';
            let message = 'Operating normally';
            
            if (errorRate > this.options.errorRateThreshold) {
                status = 'critical';
                message = `High error rate: ${errorRate.toFixed(1)}%`;
            } else if (avgResponseTime > this.options.responseTimeThreshold) {
                status = 'warning';
                message = `Slow response time: ${avgResponseTime.toFixed(0)}ms`;
            } else if (errorRate > this.options.errorRateThreshold / 2) {
                status = 'warning';
                message = `Elevated error rate: ${errorRate.toFixed(1)}%`;
            }
            
            this.healthMetrics.components.set(componentName, {
                status,
                message,
                totalRequests,
                errors,
                errorRate,
                avgResponseTime,
                lastActivity: tracker.lastActivity
            });
            
        } catch (error) {
            this.logger.error(`Component health check failed for ${componentName}:`, error);
            this.healthMetrics.components.set(componentName, {
                status: 'error',
                message: error.message,
                lastActivity: tracker.lastActivity
            });
        }
    }

    /**
     * Calculate overall health status
     */
    calculateOverallHealth() {
        const statuses = [
            this.healthMetrics.memory.status,
            this.healthMetrics.system.status
        ];
        
        // Add component statuses
        for (const component of this.healthMetrics.components.values()) {
            statuses.push(component.status);
        }
        
        // Determine overall status
        if (statuses.includes('error') || statuses.includes('critical')) {
            this.healthMetrics.status = 'critical';
        } else if (statuses.includes('warning')) {
            this.healthMetrics.status = 'warning';
        } else if (statuses.every(status => status === 'healthy')) {
            this.healthMetrics.status = 'healthy';
        } else {
            this.healthMetrics.status = 'unknown';
        }
    }

    /**
     * Store health check in history
     */
    storeHealthHistory() {
        const historyEntry = {
            timestamp: Date.now(),
            status: this.healthMetrics.status,
            memory: this.healthMetrics.memory.usage,
            systemLoad: this.healthMetrics.system.loadAverage,
            componentCount: this.healthMetrics.components.size
        };
        
        this.healthMetrics.history.push(historyEntry);
        
        // Keep only last 100 entries
        if (this.healthMetrics.history.length > 100) {
            this.healthMetrics.history = this.healthMetrics.history.slice(-100);
        }
    }

    /**
     * Check for alerts and trigger notifications
     */
    checkAlerts() {
        const alerts = [];
        
        // Memory alerts
        if (this.healthMetrics.memory.status === 'critical') {
            alerts.push({
                type: 'memory',
                severity: 'critical',
                message: `Memory usage critical: ${this.healthMetrics.memory.usage.toFixed(1)}%`,
                timestamp: Date.now()
            });
        }
        
        // System alerts
        if (this.healthMetrics.system.status === 'critical') {
            alerts.push({
                type: 'system',
                severity: 'critical',
                message: `System load critical: ${this.healthMetrics.system.loadAverage}`,
                timestamp: Date.now()
            });
        }
        
        // Component alerts
        for (const [componentName, component] of this.healthMetrics.components) {
            if (component.status === 'critical') {
                alerts.push({
                    type: 'component',
                    component: componentName,
                    severity: 'critical',
                    message: `Component ${componentName}: ${component.message}`,
                    timestamp: Date.now()
                });
            }
        }
        
        // Store new alerts
        alerts.forEach(alert => {
            this.healthMetrics.alerts.unshift(alert);
            this.emit('health:alert', alert);
            this.logger.warn(`Health Alert: ${alert.message}`);
        });
        
        // Keep only last 50 alerts
        if (this.healthMetrics.alerts.length > 50) {
            this.healthMetrics.alerts = this.healthMetrics.alerts.slice(0, 50);
        }
        
        // Auto-restart if enabled and conditions are met
        if (this.options.enableAutoRestart && this.shouldAutoRestart()) {
            this.attemptAutoRestart();
        }
    }

    /**
     * Register a component for health monitoring
     */
    registerComponent(componentName, options = {}) {
        this.componentTrackers.set(componentName, {
            metrics: [],
            lastActivity: Date.now(),
            options: {
                maxMetrics: options.maxMetrics || 1000,
                ...options
            }
        });
        
        this.logger.info(`Registered component for health monitoring: ${componentName}`);
    }

    /**
     * Record component activity
     */
    recordActivity(componentName, success, responseTime, metadata = {}) {
        const tracker = this.componentTrackers.get(componentName);
        if (!tracker) {
            this.logger.warn(`Component not registered: ${componentName}`);
            return;
        }
        
        const metric = {
            timestamp: Date.now(),
            success,
            responseTime,
            metadata
        };
        
        tracker.metrics.push(metric);
        tracker.lastActivity = Date.now();
        
        // Keep only recent metrics
        if (tracker.metrics.length > tracker.options.maxMetrics) {
            tracker.metrics = tracker.metrics.slice(-tracker.options.maxMetrics);
        }
    }

    /**
     * Get health status
     */
    getHealthStatus() {
        return {
            ...this.healthMetrics,
            isMonitoring: this.isMonitoring,
            uptime: Helpers.formatDuration(this.healthMetrics.uptime),
            components: Object.fromEntries(this.healthMetrics.components)
        };
    }

    /**
     * Get health summary
     */
    getHealthSummary() {
        const componentStatuses = Array.from(this.healthMetrics.components.values())
            .map(c => c.status);
        
        return {
            status: this.healthMetrics.status,
            uptime: Helpers.formatDuration(this.healthMetrics.uptime),
            memory: `${this.healthMetrics.memory.usage.toFixed(1)}%`,
            components: {
                total: this.healthMetrics.components.size,
                healthy: componentStatuses.filter(s => s === 'healthy').length,
                warning: componentStatuses.filter(s => s === 'warning').length,
                critical: componentStatuses.filter(s => s === 'critical').length,
                error: componentStatuses.filter(s => s === 'error').length
            },
            alerts: this.healthMetrics.alerts.length,
            lastCheck: this.healthMetrics.lastCheck
        };
    }

    /**
     * Generate health report
     */
    generateHealthReport() {
        const summary = this.getHealthSummary();
        let report = '\n';
        report += '╔══════════════════════════════════════════════════════════════════════════════╗\n';
        report += '║                              HEALTH REPORT                                  ║\n';
        report += '╠══════════════════════════════════════════════════════════════════════════════╣\n';
        
        // Status indicator
        const statusIcon = {
            'healthy': '✅',
            'warning': '⚠️',
            'critical': '❌',
            'error': '💥',
            'unknown': '❓'
        }[summary.status] || '❓';
        
        report += `║ Status: ${statusIcon} ${summary.status.toUpperCase().padEnd(20)} │ Uptime: ${summary.uptime.padEnd(20)} ║\n`;
        report += `║ Memory: ${summary.memory.padEnd(20)} │ Last Check: ${(summary.lastCheck || 'Never').slice(11, 19).padEnd(15)} ║\n`;
        report += '╠══════════════════════════════════════════════════════════════════════════════╣\n';
        
        // Components summary
        report += `║ Components: ${summary.components.total.toString().padEnd(3)} │ Healthy: ${summary.components.healthy.toString().padEnd(3)} │ Warning: ${summary.components.warning.toString().padEnd(3)} │ Critical: ${summary.components.critical.toString().padEnd(3)} │ Error: ${summary.components.error.toString().padEnd(3)} ║\n`;
        report += '╠══════════════════════════════════════════════════════════════════════════════╣\n';
        
        // Recent alerts
        if (summary.alerts > 0) {
            report += `║ Active Alerts: ${summary.alerts.toString().padEnd(10)}                                                    ║\n`;
            
            const recentAlerts = this.healthMetrics.alerts.slice(0, 3);
            recentAlerts.forEach(alert => {
                const alertTime = new Date(alert.timestamp).toLocaleTimeString();
                const alertMsg = alert.message.substring(0, 50);
                report += `║   ${alertTime} - ${alertMsg.padEnd(50)} ║\n`;
            });
        } else {
            report += '║ No Active Alerts                                                            ║\n';
        }
        
        report += '╚══════════════════════════════════════════════════════════════════════════════╝\n';
        
        return report;
    }

    /**
     * Check if auto-restart should be triggered
     */
    shouldAutoRestart() {
        if (this.restartAttempts >= this.options.maxRestartAttempts) {
            return false;
        }
        
        // Check for critical conditions
        const criticalConditions = [
            this.healthMetrics.memory.status === 'critical',
            this.healthMetrics.status === 'critical',
            Array.from(this.healthMetrics.components.values())
                .filter(c => c.status === 'critical').length > 0
        ];
        
        return criticalConditions.some(condition => condition);
    }

    /**
     * Attempt auto-restart
     */
    async attemptAutoRestart() {
        this.restartAttempts++;
        this.logger.warn(`Attempting auto-restart (attempt ${this.restartAttempts}/${this.options.maxRestartAttempts})`);
        
        try {
            this.emit('health:restart:attempt', this.restartAttempts);
            
            // Perform cleanup
            await this.performCleanup();
            
            // Reset metrics
            this.resetMetrics();
            
            this.emit('health:restart:success', this.restartAttempts);
            this.logger.info('Auto-restart completed successfully');
            
        } catch (error) {
            this.logger.error('Auto-restart failed:', error);
            this.emit('health:restart:failed', error);
        }
    }

    /**
     * Perform cleanup operations
     */
    async performCleanup() {
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }
        
        // Clear component metrics
        for (const tracker of this.componentTrackers.values()) {
            tracker.metrics = tracker.metrics.slice(-100); // Keep only recent metrics
        }
        
        // Clear old history
        this.healthMetrics.history = this.healthMetrics.history.slice(-50);
        this.healthMetrics.alerts = this.healthMetrics.alerts.slice(0, 10);
    }

    /**
     * Reset health metrics
     */
    resetMetrics() {
        this.healthMetrics.performance = {
            averageResponseTime: 0,
            requestCount: 0,
            errorCount: 0,
            errorRate: 0,
            status: 'unknown'
        };
        
        // Reset component metrics
        for (const tracker of this.componentTrackers.values()) {
            tracker.metrics = [];
        }
        
        this.restartAttempts = 0;
    }

    /**
     * Get component health
     */
    getComponentHealth(componentName) {
        return this.healthMetrics.components.get(componentName);
    }

    /**
     * Get all component health statuses
     */
    getAllComponentHealth() {
        return Object.fromEntries(this.healthMetrics.components);
    }

    /**
     * Clear alerts
     */
    clearAlerts() {
        this.healthMetrics.alerts = [];
        this.emit('health:alerts:cleared');
    }

    /**
     * Export health data
     */
    exportHealthData() {
        return {
            timestamp: Date.now(),
            status: this.getHealthStatus(),
            summary: this.getHealthSummary(),
            components: this.getAllComponentHealth(),
            history: this.healthMetrics.history.slice(-20), // Last 20 entries
            alerts: this.healthMetrics.alerts.slice(0, 10) // Last 10 alerts
        };
    }
}

module.exports = { HealthChecker };