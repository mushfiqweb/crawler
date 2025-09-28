/**
 * Automated Cycle Manager
 * Manages continuous crawling cycles with precise timing and resource management
 */

const { EventEmitter } = require('events');
const { defaultLogger: Logger } = require('../utils/logger');
const { ResourceCleanup } = require('./resource-cleanup');
const { GracefulShutdown } = require('./graceful-shutdown');
const { performance } = require('perf_hooks');

class AutomatedCycleManager extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            // Timing configuration
            sessionDuration: options.sessionDuration || 60 * 60 * 1000, // 60 minutes in ms
            idlePeriod: options.idlePeriod || 15 * 60 * 1000, // 15 minutes in ms
            clockSyncInterval: options.clockSyncInterval || 5 * 60 * 1000, // 5 minutes
            
            // Validation and monitoring
            enableClockSync: options.enableClockSync !== false,
            enableHealthChecks: options.enableHealthChecks !== false,
            maxRestartAttempts: options.maxRestartAttempts || 3,
            
            // Logging
            logLevel: options.logLevel || 'info',
            enableDetailedLogging: options.enableDetailedLogging !== false
        };

        // State management
        this.state = {
            phase: 'stopped', // stopped, running, terminating, idle, restarting
            cycleCount: 0,
            currentSessionStart: null,
            currentSessionEnd: null,
            lastCleanupTime: null,
            restartAttempts: 0,
            isShuttingDown: false,
            errors: []
        };

        // Timers and intervals
        this.timers = {
            sessionTimer: null,
            idleTimer: null,
            clockSyncTimer: null,
            healthCheckTimer: null
        };

        // Performance tracking
        this.performance = {
            sessionStartTime: null,
            sessionEndTime: null,
            cleanupStartTime: null,
            cleanupEndTime: null,
            idleStartTime: null,
            idleEndTime: null
        };

        // Clock synchronization
        this.clockSync = {
            systemTimeOffset: 0,
            lastSyncTime: null,
            syncAccuracy: 0
        };

        // Resource cleanup system
        this.resourceCleanup = new ResourceCleanup({
            enableDetailedLogging: this.config.enableDetailedLogging,
            forceGarbageCollection: true,
            gcIterations: 3
        });

        // Initialize graceful shutdown
        this.gracefulShutdown = new GracefulShutdown({
            gracefulTimeout: options.gracefulTimeout || 30000,
            forceTimeout: options.forceTimeout || 60000,
            enableSignalHandlers: options.enableSignalHandlers !== false,
            saveStateOnShutdown: options.saveStateOnShutdown !== false
        });

        // Register this component for graceful shutdown
        this.gracefulShutdown.registerComponent('automatedCycleManager', this, {
            priority: 100,
            timeout: 25000,
            shutdownMethod: 'shutdown',
            required: true
        });

        // Event handlers
        this.setupEventHandlers();
        
        Logger.info('🔄 AutomatedCycleManager initialized', {
            sessionDuration: `${this.config.sessionDuration / 1000 / 60} minutes`,
            idlePeriod: `${this.config.idlePeriod / 1000 / 60} minutes`,
            clockSyncEnabled: this.config.enableClockSync
        });
    }

    /**
     * Setup event handlers for graceful shutdown
     */
    setupEventHandlers() {
        // Handle process termination signals
        process.on('SIGINT', () => this.handleGracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => this.handleGracefulShutdown('SIGTERM'));
        process.on('SIGHUP', () => this.handleGracefulShutdown('SIGHUP'));
        
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            Logger.error('❌ Uncaught exception in cycle manager:', error);
            this.handleEmergencyShutdown(error);
        });
        
        process.on('unhandledRejection', (reason, promise) => {
            Logger.error('❌ Unhandled rejection in cycle manager:', { reason, promise });
            this.handleEmergencyShutdown(reason);
        });
    }

    /**
     * Start the automated crawling cycle
     */
    async start() {
        return this.startCycle();
    }

    /**
     * Start the automated crawling cycle
     */
    async startCycle() {
        if (this.state.phase !== 'stopped') {
            throw new Error(`Cannot start cycle: currently in ${this.state.phase} phase`);
        }

        try {
            Logger.info('🚀 Starting automated crawling cycle');
            
            // Initialize clock synchronization
            if (this.config.enableClockSync) {
                await this.initializeClockSync();
            }
            
            // Start the first session
            await this.startCrawlingSession();
            
            this.emit('cycleStarted', {
                timestamp: this.getCurrentTime(),
                cycleCount: this.state.cycleCount
            });
            
        } catch (error) {
            Logger.error('❌ Failed to start automated cycle:', error);
            this.state.errors.push({
                type: 'startup_error',
                error: error.message,
                timestamp: this.getCurrentTime()
            });
            throw error;
        }
    }

    /**
     * Start a crawling session with precise timing
     */
    async startCrawlingSession() {
        try {
            this.state.phase = 'running';
            this.state.cycleCount++;
            this.state.currentSessionStart = this.getCurrentTime();
            this.performance.sessionStartTime = performance.now();
            
            Logger.info('🔍 Starting crawling session', {
                cycleNumber: this.state.cycleCount,
                sessionStart: new Date(this.state.currentSessionStart).toISOString(),
                plannedDuration: `${this.config.sessionDuration / 1000 / 60} minutes`
            });

            // Set session termination timer
            this.timers.sessionTimer = setTimeout(() => {
                this.terminateSession();
            }, this.config.sessionDuration);

            // Start health monitoring if enabled
            if (this.config.enableHealthChecks) {
                this.startHealthMonitoring();
            }

            this.emit('sessionStarted', {
                cycleNumber: this.state.cycleCount,
                sessionStart: this.state.currentSessionStart,
                plannedEnd: this.state.currentSessionStart + this.config.sessionDuration
            });

        } catch (error) {
            Logger.error('❌ Failed to start crawling session:', error);
            this.state.errors.push({
                type: 'session_start_error',
                error: error.message,
                timestamp: this.getCurrentTime()
            });
            throw error;
        }
    }

    /**
     * Terminate the current crawling session
     */
    async terminateSession() {
        if (this.state.phase !== 'running') {
            Logger.warn('⚠️ Attempted to terminate session but not in running phase');
            return;
        }

        try {
            this.state.phase = 'terminating';
            this.state.currentSessionEnd = this.getCurrentTime();
            this.performance.sessionEndTime = performance.now();
            
            const actualDuration = this.state.currentSessionEnd - this.state.currentSessionStart;
            const plannedDuration = this.config.sessionDuration;
            const timingAccuracy = Math.abs(actualDuration - plannedDuration);

            Logger.info('🛑 Terminating crawling session', {
                cycleNumber: this.state.cycleCount,
                sessionEnd: new Date(this.state.currentSessionEnd).toISOString(),
                actualDuration: `${Math.round(actualDuration / 1000 / 60 * 100) / 100} minutes`,
                timingAccuracy: `${timingAccuracy}ms`,
                timingAccuracyPercent: `${Math.round(timingAccuracy / plannedDuration * 10000) / 100}%`
            });

            // Clear session timer
            if (this.timers.sessionTimer) {
                clearTimeout(this.timers.sessionTimer);
                this.timers.sessionTimer = null;
            }

            // Stop health monitoring
            this.stopHealthMonitoring();

            this.emit('sessionTerminated', {
                cycleNumber: this.state.cycleCount,
                sessionEnd: this.state.currentSessionEnd,
                actualDuration,
                timingAccuracy
            });

            // Start cleanup process
            await this.performCleanup();

        } catch (error) {
            Logger.error('❌ Failed to terminate session:', error);
            this.state.errors.push({
                type: 'session_termination_error',
                error: error.message,
                timestamp: this.getCurrentTime()
            });
            
            // Force cleanup even if termination failed
            await this.performCleanup();
        }
    }

    /**
     * Get current time with clock synchronization
     */
    getCurrentTime() {
        const systemTime = Date.now();
        return systemTime + this.clockSync.systemTimeOffset;
    }

    /**
     * Initialize clock synchronization
     */
    async initializeClockSync() {
        try {
            Logger.info('🕐 Initializing clock synchronization');
            
            // Perform initial sync
            await this.performClockSync();
            
            // Set up periodic sync
            this.timers.clockSyncTimer = setInterval(() => {
                this.performClockSync().catch(error => {
                    Logger.warn('⚠️ Clock sync failed:', error.message);
                });
            }, this.config.clockSyncInterval);
            
        } catch (error) {
            Logger.warn('⚠️ Clock synchronization initialization failed:', error.message);
            // Continue without clock sync
        }
    }

    /**
     * Perform clock synchronization with system time
     */
    async performClockSync() {
        try {
            const startTime = performance.now();
            const systemTime = Date.now();
            const endTime = performance.now();
            
            // Calculate network delay (minimal for local system)
            const networkDelay = (endTime - startTime) / 2;
            
            // Update clock sync data
            this.clockSync.lastSyncTime = systemTime;
            this.clockSync.syncAccuracy = networkDelay;
            
            if (this.config.enableDetailedLogging) {
                Logger.debug('🕐 Clock sync completed', {
                    systemTime: new Date(systemTime).toISOString(),
                    networkDelay: `${networkDelay}ms`,
                    accuracy: `${this.clockSync.syncAccuracy}ms`
                });
            }
            
        } catch (error) {
            Logger.warn('⚠️ Clock synchronization failed:', error.message);
            throw error;
        }
    }

    /**
     * Start health monitoring during session
     */
    startHealthMonitoring() {
        this.timers.healthCheckTimer = setInterval(() => {
            this.performHealthCheck().catch(error => {
                Logger.warn('⚠️ Health check failed:', error.message);
            });
        }, 30000); // Check every 30 seconds
    }

    /**
     * Stop health monitoring
     */
    stopHealthMonitoring() {
        if (this.timers.healthCheckTimer) {
            clearInterval(this.timers.healthCheckTimer);
            this.timers.healthCheckTimer = null;
        }
    }

    /**
     * Perform health check during session
     */
    async performHealthCheck() {
        try {
            const memoryUsage = process.memoryUsage();
            const uptime = process.uptime();
            
            // Check for memory issues
            const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
            if (heapUsedMB > 1000) { // 1GB threshold
                Logger.warn('⚠️ High memory usage detected', {
                    heapUsed: `${Math.round(heapUsedMB)}MB`,
                    cycleNumber: this.state.cycleCount
                });
            }
            
            // Check session timing
            if (this.state.currentSessionStart) {
                const elapsed = this.getCurrentTime() - this.state.currentSessionStart;
                const remaining = this.config.sessionDuration - elapsed;
                
                if (this.config.enableDetailedLogging && remaining < 5 * 60 * 1000) { // Last 5 minutes
                    Logger.debug('⏰ Session ending soon', {
                        remainingTime: `${Math.round(remaining / 1000 / 60)} minutes`,
                        cycleNumber: this.state.cycleCount
                    });
                }
            }
            
        } catch (error) {
            Logger.warn('⚠️ Health check error:', error.message);
        }
    }

    /**
     * Stop the cycle manager
     */
    async stop() {
        if (this.state.isShuttingDown) {
            Logger.warn('⚠️ Stop already in progress');
            return;
        }

        this.state.isShuttingDown = true;
        Logger.info('🛑 Stopping AutomatedCycleManager');

        try {
            // Clear all timers
            Object.values(this.timers).forEach(timer => {
                if (timer) clearTimeout(timer);
            });

            // Stop health monitoring
            this.stopHealthMonitoring();

            // Emit stop event
            this.emit('stopped', { timestamp: this.getCurrentTime() });

            Logger.info('✅ AutomatedCycleManager stopped successfully');

        } catch (error) {
            Logger.error('❌ Error during AutomatedCycleManager stop:', error);
            throw error;
        }
    }

    /**
     * Graceful shutdown method for integration with GracefulShutdown
     */
    async shutdown() {
        try {
            Logger.info('🛑 Graceful shutdown initiated for AutomatedCycleManager');
            
            // Stop the cycle manager
            await this.stop();
            
            Logger.info('✅ AutomatedCycleManager shutdown completed');
            
        } catch (error) {
            Logger.error('❌ Error during AutomatedCycleManager shutdown:', error);
            throw error;
        }
    }

    /**
     * Get current cycle status
     */
    getStatus() {
        const currentTime = this.getCurrentTime();
        let timeRemaining = null;
        let nextPhaseTime = null;

        if (this.state.phase === 'running' && this.state.currentSessionStart) {
            const elapsed = currentTime - this.state.currentSessionStart;
            timeRemaining = Math.max(0, this.config.sessionDuration - elapsed);
            nextPhaseTime = this.state.currentSessionStart + this.config.sessionDuration;
        } else if (this.state.phase === 'idle' && this.performance.idleStartTime) {
            const elapsed = currentTime - this.performance.idleStartTime;
            timeRemaining = Math.max(0, this.config.idlePeriod - elapsed);
            nextPhaseTime = this.performance.idleStartTime + this.config.idlePeriod;
        }

        return {
            phase: this.state.phase,
            cycleCount: this.state.cycleCount,
            currentTime: new Date(currentTime).toISOString(),
            timeRemaining: timeRemaining ? Math.round(timeRemaining / 1000 / 60) + ' minutes' : null,
            nextPhaseTime: nextPhaseTime ? new Date(nextPhaseTime).toISOString() : null,
            restartAttempts: this.state.restartAttempts,
            errors: this.state.errors.length,
            clockSync: {
                lastSync: this.clockSync.lastSyncTime ? new Date(this.clockSync.lastSyncTime).toISOString() : null,
                accuracy: `${this.clockSync.syncAccuracy}ms`
            },
            gracefulShutdown: this.gracefulShutdown ? this.gracefulShutdown.getStatus() : null
        };
    }

    /**
     * Handle graceful shutdown
     */
    async handleGracefulShutdown(signal) {
        if (this.state.isShuttingDown) {
            Logger.warn('⚠️ Shutdown already in progress');
            return;
        }

        this.state.isShuttingDown = true;
        Logger.info(`🛑 Received ${signal}, initiating graceful shutdown`);

        try {
            // Clear all timers
            Object.values(this.timers).forEach(timer => {
                if (timer) clearTimeout(timer);
            });

            // Emit shutdown event
            this.emit('shutdown', { signal, timestamp: this.getCurrentTime() });

            // Perform final cleanup
            await this.performCleanup();

            Logger.info('✅ Graceful shutdown completed');
            process.exit(0);

        } catch (error) {
            Logger.error('❌ Error during graceful shutdown:', error);
            process.exit(1);
        }
    }

    /**
     * Handle emergency shutdown
     */
    async handleEmergencyShutdown(error) {
        Logger.error('🚨 Emergency shutdown triggered:', error);
        
        try {
            // Clear all timers immediately
            Object.values(this.timers).forEach(timer => {
                if (timer) clearTimeout(timer);
            });

            // Emit emergency shutdown event
            this.emit('emergencyShutdown', { error, timestamp: this.getCurrentTime() });

            // Force exit after brief cleanup attempt
            setTimeout(() => {
                process.exit(1);
            }, 5000); // 5 second timeout

            await this.performCleanup();

        } catch (cleanupError) {
            Logger.error('❌ Emergency cleanup failed:', cleanupError);
        }
        
        process.exit(1);
    }

    /**
     * Perform comprehensive resource cleanup
     */
    async performCleanup() {
        try {
            Logger.info('🧹 Starting comprehensive resource cleanup');
            this.performance.cleanupStartTime = performance.now();
            this.state.lastCleanupTime = this.getCurrentTime();

            // Perform comprehensive cleanup using the resource cleanup system
            const cleanupResult = await this.resourceCleanup.performCleanup({
                forced: true
            });

            this.performance.cleanupEndTime = performance.now();
            const cleanupDuration = this.performance.cleanupEndTime - this.performance.cleanupStartTime;

            Logger.info('✅ Comprehensive cleanup completed', {
                duration: `${Math.round(cleanupDuration)}ms`,
                success: cleanupResult.success,
                memoryFreed: cleanupResult.results?.memory?.memoryFreed || 0,
                filesRemoved: cleanupResult.results?.files?.filesRemoved || 0,
                networkConnectionsClosed: cleanupResult.results?.network?.connectionsClosed || 0,
                databaseConnectionsClosed: cleanupResult.results?.database?.connectionsClosed || 0,
                errors: cleanupResult.errors?.length || 0
            });

            this.emit('cleanupCompleted', {
                duration: cleanupDuration,
                result: cleanupResult,
                timestamp: this.getCurrentTime()
            });

            // Start idle period after successful cleanup
            await this.startIdlePeriod();

        } catch (error) {
            Logger.error('❌ Cleanup process failed:', error);
            this.state.errors.push({
                type: 'cleanup_error',
                error: error.message,
                timestamp: this.getCurrentTime()
            });

            // Still attempt idle period even if cleanup failed
            await this.startIdlePeriod();
        }
    }

    /**
     * Start the mandatory 15-minute idle period
     */
    async startIdlePeriod() {
        try {
            this.state.phase = 'idle';
            this.performance.idleStartTime = this.getCurrentTime();
            
            Logger.info('😴 Starting mandatory idle period', {
                cycleNumber: this.state.cycleCount,
                idleStart: new Date(this.performance.idleStartTime).toISOString(),
                idleDuration: `${this.config.idlePeriod / 1000 / 60} minutes`,
                nextSessionTime: new Date(this.performance.idleStartTime + this.config.idlePeriod).toISOString()
            });

            // Set idle period timer
            this.timers.idleTimer = setTimeout(() => {
                this.endIdlePeriod();
            }, this.config.idlePeriod);

            this.emit('idlePeriodStarted', {
                cycleNumber: this.state.cycleCount,
                idleStart: this.performance.idleStartTime,
                plannedEnd: this.performance.idleStartTime + this.config.idlePeriod
            });

        } catch (error) {
            Logger.error('❌ Failed to start idle period:', error);
            this.state.errors.push({
                type: 'idle_start_error',
                error: error.message,
                timestamp: this.getCurrentTime()
            });
            
            // Attempt immediate restart if idle period fails
            setTimeout(() => this.attemptRestart(), 5000);
        }
    }

    /**
     * End the idle period and attempt restart
     */
    async endIdlePeriod() {
        if (this.state.phase !== 'idle') {
            Logger.warn('⚠️ Attempted to end idle period but not in idle phase');
            return;
        }

        try {
            this.performance.idleEndTime = this.getCurrentTime();
            const actualIdleDuration = this.performance.idleEndTime - this.performance.idleStartTime;
            const plannedIdleDuration = this.config.idlePeriod;
            const timingAccuracy = Math.abs(actualIdleDuration - plannedIdleDuration);

            Logger.info('⏰ Idle period completed', {
                cycleNumber: this.state.cycleCount,
                idleEnd: new Date(this.performance.idleEndTime).toISOString(),
                actualDuration: `${Math.round(actualIdleDuration / 1000 / 60 * 100) / 100} minutes`,
                timingAccuracy: `${timingAccuracy}ms`,
                timingAccuracyPercent: `${Math.round(timingAccuracy / plannedIdleDuration * 10000) / 100}%`
            });

            // Clear idle timer
            if (this.timers.idleTimer) {
                clearTimeout(this.timers.idleTimer);
                this.timers.idleTimer = null;
            }

            this.emit('idlePeriodEnded', {
                cycleNumber: this.state.cycleCount,
                idleEnd: this.performance.idleEndTime,
                actualDuration: actualIdleDuration,
                timingAccuracy
            });

            // Attempt to restart the crawling session
            await this.attemptRestart();

        } catch (error) {
            Logger.error('❌ Failed to end idle period:', error);
            this.state.errors.push({
                type: 'idle_end_error',
                error: error.message,
                timestamp: this.getCurrentTime()
            });
            
            // Force restart attempt
            setTimeout(() => this.attemptRestart(), 5000);
        }
    }

    /**
     * Attempt to restart the crawling session with validation
     */
    async attemptRestart() {
        if (this.state.isShuttingDown) {
            Logger.info('🛑 Skipping restart due to shutdown in progress');
            return;
        }

        try {
            this.state.phase = 'restarting';
            this.state.restartAttempts++;

            Logger.info('🔄 Attempting to restart crawling session', {
                cycleNumber: this.state.cycleCount,
                restartAttempt: this.state.restartAttempts,
                maxAttempts: this.config.maxRestartAttempts
            });

            // Validate system state before restart
            const validationResult = await this.validateSystemState();
            
            if (!validationResult.valid) {
                throw new Error(`System validation failed: ${validationResult.errors.join(', ')}`);
            }

            // Reset restart attempts on successful validation
            this.state.restartAttempts = 0;

            // Start new crawling session
            await this.startCrawlingSession();

            Logger.info('✅ Crawling session restarted successfully', {
                cycleNumber: this.state.cycleCount,
                validationPassed: true
            });

            this.emit('sessionRestarted', {
                cycleNumber: this.state.cycleCount,
                restartTime: this.getCurrentTime(),
                validationResult
            });

        } catch (error) {
            Logger.error('❌ Failed to restart crawling session:', error);
            this.state.errors.push({
                type: 'restart_error',
                error: error.message,
                timestamp: this.getCurrentTime(),
                attempt: this.state.restartAttempts
            });

            // Check if we should retry or give up
            if (this.state.restartAttempts < this.config.maxRestartAttempts) {
                const retryDelay = Math.min(30000, 5000 * this.state.restartAttempts); // Exponential backoff, max 30s
                
                Logger.warn(`⚠️ Retrying restart in ${retryDelay / 1000} seconds`, {
                    attempt: this.state.restartAttempts,
                    maxAttempts: this.config.maxRestartAttempts
                });

                setTimeout(() => this.attemptRestart(), retryDelay);
            } else {
                Logger.error('❌ Maximum restart attempts exceeded, entering error state');
                this.state.phase = 'error';
                
                this.emit('restartFailed', {
                    cycleNumber: this.state.cycleCount,
                    attempts: this.state.restartAttempts,
                    finalError: error.message
                });
            }
        }
    }

    /**
     * Validate system state before restart
     */
    async validateSystemState() {
        const errors = [];
        
        try {
            // Check memory usage
            const memoryUsage = process.memoryUsage();
            const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
            
            if (heapUsedMB > 2000) { // 2GB threshold
                errors.push(`High memory usage: ${Math.round(heapUsedMB)}MB`);
            }

            // Check if cleanup was recent
            if (this.state.lastCleanupTime) {
                const timeSinceCleanup = this.getCurrentTime() - this.state.lastCleanupTime;
                if (timeSinceCleanup > 5 * 60 * 1000) { // 5 minutes
                    errors.push('Cleanup was not recent enough');
                }
            } else {
                errors.push('No cleanup performed yet');
            }

            // Check resource cleanup stats
            const cleanupStats = this.resourceCleanup.getStats();
            const totalTrackedResources = Object.values(cleanupStats.trackedResources)
                .reduce((total, category) => {
                    return total + Object.values(category).reduce((sum, count) => sum + count, 0);
                }, 0);

            if (totalTrackedResources > 100) {
                errors.push(`Too many tracked resources: ${totalTrackedResources}`);
            }

            // Check for recent errors
            const recentErrors = this.state.errors.filter(error => 
                this.getCurrentTime() - error.timestamp < 5 * 60 * 1000 // Last 5 minutes
            );

            if (recentErrors.length > 5) {
                errors.push(`Too many recent errors: ${recentErrors.length}`);
            }

            return {
                valid: errors.length === 0,
                errors,
                memoryUsage: heapUsedMB,
                trackedResources: totalTrackedResources,
                recentErrors: recentErrors.length
            };

        } catch (error) {
            errors.push(`Validation error: ${error.message}`);
            return {
                valid: false,
                errors
            };
        }
    }
}

module.exports = { AutomatedCycleManager };