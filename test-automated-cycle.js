/**
 * Test Automated Crawling Cycle System
 * Comprehensive test for the complete automated cycle with all components
 */

const { AutomatedCycleManager } = require('./src/core/automated-cycle-manager');
const { CycleMonitor } = require('./src/core/cycle-monitor');
const { GracefulShutdown } = require('./src/core/graceful-shutdown');
const { defaultLogger: Logger } = require('./src/utils/logger');

// Test configuration
const TEST_CONFIG = {
    // Shortened durations for testing
    sessionDuration: 2 * 60 * 1000, // 2 minutes instead of 60
    idleDuration: 30 * 1000, // 30 seconds instead of 15 minutes
    maxCycles: 3, // Run 3 cycles for testing
    
    // Monitoring configuration
    monitoring: {
        healthCheckInterval: 10000, // 10 seconds
        metricsCollectionInterval: 15000, // 15 seconds
        alertCheckInterval: 5000, // 5 seconds
        enableAlerts: true,
        enableAutoRecovery: true
    },
    
    // Graceful shutdown configuration
    shutdown: {
        gracefulTimeout: 20000, // 20 seconds
        forceTimeout: 30000, // 30 seconds
        enableSignalHandlers: true
    }
};

class AutomatedCycleTest {
    constructor() {
        this.cycleManager = null;
        this.monitor = null;
        this.gracefulShutdown = null;
        this.testStartTime = null;
        this.testResults = {
            cycles: [],
            errors: [],
            performance: {},
            monitoring: {},
            shutdown: {}
        };
    }

    /**
     * Run the complete test suite
     */
    async runTest() {
        try {
            this.testStartTime = Date.now();
            
            Logger.info('🧪 Starting Automated Cycle Test Suite');
            Logger.info('📋 Test Configuration:', {
                sessionDuration: `${TEST_CONFIG.sessionDuration / 1000}s`,
                idleDuration: `${TEST_CONFIG.idleDuration / 1000}s`,
                maxCycles: TEST_CONFIG.maxCycles
            });

            // Initialize components
            await this.initializeComponents();

            // Setup monitoring
            await this.setupMonitoring();

            // Setup graceful shutdown
            await this.setupGracefulShutdown();

            // Run the automated cycle
            await this.runAutomatedCycle();

            // Analyze results
            await this.analyzeResults();

            Logger.info('✅ Automated Cycle Test Suite completed successfully');

        } catch (error) {
            Logger.error('❌ Test suite failed:', error);
            this.testResults.errors.push({
                type: 'test_suite_failure',
                error: error.message,
                timestamp: Date.now()
            });
        } finally {
            await this.cleanup();
        }
    }

    /**
     * Initialize all components
     */
    async initializeComponents() {
        try {
            Logger.info('🔧 Initializing components...');

            // Initialize Cycle Manager
            this.cycleManager = new AutomatedCycleManager({
                sessionDuration: TEST_CONFIG.sessionDuration,
                idleDuration: TEST_CONFIG.idleDuration,
                maxRestartAttempts: 3,
                enableHealthChecks: true,
                enableDetailedLogging: true,
                
                // Mock crawler configuration
                crawler: {
                    enabled: false, // Disable actual crawling for testing
                    mockMode: true
                }
            });

            // Initialize Monitor
            this.monitor = new CycleMonitor(TEST_CONFIG.monitoring);

            // Initialize Graceful Shutdown
            this.gracefulShutdown = new GracefulShutdown(TEST_CONFIG.shutdown);

            Logger.info('✅ Components initialized successfully');

        } catch (error) {
            Logger.error('❌ Component initialization failed:', error);
            throw error;
        }
    }

    /**
     * Setup monitoring and event handlers
     */
    async setupMonitoring() {
        try {
            Logger.info('📊 Setting up monitoring...');

            // Setup cycle manager event handlers
            this.cycleManager.on('sessionStarted', (data) => {
                Logger.info('🟢 Session Started', data);
                this.testResults.cycles.push({
                    type: 'session_started',
                    timestamp: Date.now(),
                    data
                });
            });

            this.cycleManager.on('sessionTerminated', (data) => {
                Logger.info('🔴 Session Terminated', data);
                this.testResults.cycles.push({
                    type: 'session_terminated',
                    timestamp: Date.now(),
                    data
                });
            });

            this.cycleManager.on('cleanupCompleted', (data) => {
                Logger.info('🧹 Cleanup Completed', data);
                this.testResults.cycles.push({
                    type: 'cleanup_completed',
                    timestamp: Date.now(),
                    data
                });
            });

            this.cycleManager.on('idlePeriodStarted', (data) => {
                Logger.info('😴 Idle Period Started', data);
                this.testResults.cycles.push({
                    type: 'idle_started',
                    timestamp: Date.now(),
                    data
                });
            });

            this.cycleManager.on('idlePeriodEnded', (data) => {
                Logger.info('⏰ Idle Period Ended', data);
                this.testResults.cycles.push({
                    type: 'idle_ended',
                    timestamp: Date.now(),
                    data
                });
            });

            this.cycleManager.on('sessionRestarted', (data) => {
                Logger.info('🔄 Session Restarted', data);
                this.testResults.cycles.push({
                    type: 'session_restarted',
                    timestamp: Date.now(),
                    data
                });
            });

            // Setup monitor event handlers
            this.monitor.on('alert', (alert) => {
                Logger.warn('🚨 Monitor Alert', alert);
                this.testResults.monitoring.alerts = this.testResults.monitoring.alerts || [];
                this.testResults.monitoring.alerts.push(alert);
            });

            this.monitor.on('healthCheck', (health) => {
                Logger.debug('💓 Health Check', { overall: health.overall });
                this.testResults.monitoring.lastHealthCheck = health;
            });

            // Start monitoring
            await this.monitor.startMonitoring(this.cycleManager);

            Logger.info('✅ Monitoring setup completed');

        } catch (error) {
            Logger.error('❌ Monitoring setup failed:', error);
            throw error;
        }
    }

    /**
     * Setup graceful shutdown handling
     */
    async setupGracefulShutdown() {
        try {
            Logger.info('🛡️ Setting up graceful shutdown...');

            // Register components for graceful shutdown
            this.gracefulShutdown.registerComponent('cycleManager', this.cycleManager, {
                priority: 100,
                timeout: 15000,
                shutdownMethod: 'stop',
                required: true
            });

            this.gracefulShutdown.registerComponent('monitor', this.monitor, {
                priority: 90,
                timeout: 10000,
                shutdownMethod: 'stopMonitoring',
                required: false
            });

            // Setup shutdown event handlers
            this.gracefulShutdown.on('shutdownInitiated', (data) => {
                Logger.info('🛑 Shutdown Initiated', data);
                this.testResults.shutdown.initiated = data;
            });

            this.gracefulShutdown.on('shutdownCompleted', (data) => {
                Logger.info('✅ Shutdown Completed', data);
                this.testResults.shutdown.completed = data;
            });

            Logger.info('✅ Graceful shutdown setup completed');

        } catch (error) {
            Logger.error('❌ Graceful shutdown setup failed:', error);
            throw error;
        }
    }

    /**
     * Run the automated cycle for testing
     */
    async runAutomatedCycle() {
        try {
            Logger.info('🚀 Starting automated cycle...');

            // Start the cycle manager
            await this.cycleManager.start();

            // Wait for specified number of cycles or timeout
            const maxTestDuration = (TEST_CONFIG.sessionDuration + TEST_CONFIG.idleDuration) * TEST_CONFIG.maxCycles + 60000; // Extra minute
            const testTimeout = setTimeout(() => {
                Logger.info('⏰ Test timeout reached, stopping cycle...');
                this.cycleManager.stop();
            }, maxTestDuration);

            // Monitor cycle progress
            let completedCycles = 0;
            const cycleCheckInterval = setInterval(() => {
                const status = this.cycleManager.getStatus();
                
                if (status.cycleCount > completedCycles) {
                    completedCycles = status.cycleCount;
                    Logger.info(`📊 Cycle ${completedCycles} completed`);
                    
                    if (completedCycles >= TEST_CONFIG.maxCycles) {
                        Logger.info('🎯 Target cycles reached, stopping...');
                        clearInterval(cycleCheckInterval);
                        clearTimeout(testTimeout);
                        this.cycleManager.stop();
                    }
                }
            }, 5000);

            // Wait for cycle manager to complete
            await new Promise((resolve) => {
                this.cycleManager.on('stopped', () => {
                    clearInterval(cycleCheckInterval);
                    clearTimeout(testTimeout);
                    resolve();
                });
            });

            Logger.info('✅ Automated cycle completed');

        } catch (error) {
            Logger.error('❌ Automated cycle failed:', error);
            throw error;
        }
    }

    /**
     * Analyze test results
     */
    async analyzeResults() {
        try {
            Logger.info('📊 Analyzing test results...');

            const testDuration = Date.now() - this.testStartTime;
            const cycleManagerStatus = this.cycleManager.getStatus();
            const monitorReport = this.monitor.getReport();

            // Performance analysis
            this.testResults.performance = {
                totalTestDuration: testDuration,
                cyclesCompleted: cycleManagerStatus.cycleCount,
                totalErrors: cycleManagerStatus.errors,
                restartAttempts: cycleManagerStatus.restartAttempts,
                averageSessionDuration: this.calculateAverageSessionDuration(),
                averageIdleDuration: this.calculateAverageIdleDuration(),
                cleanupSuccessRate: this.calculateCleanupSuccessRate()
            };

            // Monitoring analysis
            this.testResults.monitoring = {
                ...monitorReport,
                alertsGenerated: (this.testResults.monitoring.alerts || []).length,
                healthChecksPerformed: monitorReport.monitoring.lastHealthCheck ? 1 : 0
            };

            // Log comprehensive results
            Logger.info('📋 TEST RESULTS SUMMARY', {
                duration: `${Math.round(testDuration / 1000)}s`,
                cyclesCompleted: this.testResults.performance.cyclesCompleted,
                targetCycles: TEST_CONFIG.maxCycles,
                success: this.testResults.performance.cyclesCompleted >= TEST_CONFIG.maxCycles,
                errors: this.testResults.errors.length,
                alerts: this.testResults.monitoring.alertsGenerated || 0
            });

            // Detailed performance metrics
            Logger.info('📊 PERFORMANCE METRICS', this.testResults.performance);

            // Monitoring metrics
            Logger.info('📈 MONITORING METRICS', {
                alertsGenerated: this.testResults.monitoring.alertsGenerated,
                memoryTrend: this.testResults.monitoring.resources?.memoryTrend,
                currentMemory: this.testResults.monitoring.resources?.currentMemory
            });

            // Validate test success
            this.validateTestResults();

        } catch (error) {
            Logger.error('❌ Results analysis failed:', error);
            throw error;
        }
    }

    /**
     * Calculate average session duration
     */
    calculateAverageSessionDuration() {
        const sessionEvents = this.testResults.cycles.filter(c => c.type === 'session_terminated');
        if (sessionEvents.length === 0) return 0;

        const durations = sessionEvents.map(e => e.data.actualDuration || 0);
        return Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length);
    }

    /**
     * Calculate average idle duration
     */
    calculateAverageIdleDuration() {
        const idleEvents = this.testResults.cycles.filter(c => c.type === 'idle_ended');
        if (idleEvents.length === 0) return 0;

        const durations = idleEvents.map(e => e.data.actualDuration || 0);
        return Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length);
    }

    /**
     * Calculate cleanup success rate
     */
    calculateCleanupSuccessRate() {
        const cleanupEvents = this.testResults.cycles.filter(c => c.type === 'cleanup_completed');
        if (cleanupEvents.length === 0) return 0;

        const successful = cleanupEvents.filter(e => e.data.success).length;
        return Math.round((successful / cleanupEvents.length) * 100);
    }

    /**
     * Validate test results
     */
    validateTestResults() {
        const issues = [];

        // Check if target cycles were completed
        if (this.testResults.performance.cyclesCompleted < TEST_CONFIG.maxCycles) {
            issues.push(`Only ${this.testResults.performance.cyclesCompleted}/${TEST_CONFIG.maxCycles} cycles completed`);
        }

        // Check for excessive errors
        if (this.testResults.errors.length > 2) {
            issues.push(`High error count: ${this.testResults.errors.length}`);
        }

        // Check cleanup success rate
        if (this.testResults.performance.cleanupSuccessRate < 90) {
            issues.push(`Low cleanup success rate: ${this.testResults.performance.cleanupSuccessRate}%`);
        }

        // Log validation results
        if (issues.length === 0) {
            Logger.info('✅ TEST VALIDATION: All checks passed');
        } else {
            Logger.warn('⚠️ TEST VALIDATION: Issues detected', { issues });
        }
    }

    /**
     * Cleanup test resources
     */
    async cleanup() {
        try {
            Logger.info('🧹 Cleaning up test resources...');

            // Stop monitoring
            if (this.monitor && this.monitor.state?.isMonitoring) {
                await this.monitor.stopMonitoring();
            }

            // Stop cycle manager
            if (this.cycleManager && this.cycleManager.isRunning()) {
                await this.cycleManager.stop();
            }

            Logger.info('✅ Test cleanup completed');

        } catch (error) {
            Logger.warn('⚠️ Test cleanup failed:', error);
        }
    }
}

// Mock crawler for testing
class MockCrawler {
    constructor() {
        this.isRunning = false;
    }

    async start() {
        this.isRunning = true;
        Logger.debug('🤖 Mock crawler started');
    }

    async stop() {
        this.isRunning = false;
        Logger.debug('🤖 Mock crawler stopped');
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            pagesProcessed: Math.floor(Math.random() * 100),
            errors: Math.floor(Math.random() * 5)
        };
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    const test = new AutomatedCycleTest();
    
    test.runTest().then(() => {
        Logger.info('🎉 Test suite finished');
        process.exit(0);
    }).catch((error) => {
        Logger.error('💥 Test suite failed:', error);
        process.exit(1);
    });
}

module.exports = { AutomatedCycleTest, MockCrawler };