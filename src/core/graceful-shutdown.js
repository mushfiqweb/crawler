/**
 * Graceful Shutdown Handler
 * Manages graceful interruption handling for all cycle phases
 */

const { EventEmitter } = require('events');
const { defaultLogger: Logger } = require('../utils/logger');

class GracefulShutdown extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            // Shutdown timeouts
            gracefulTimeout: options.gracefulTimeout || 30000, // 30 seconds
            forceTimeout: options.forceTimeout || 60000, // 60 seconds
            cleanupTimeout: options.cleanupTimeout || 15000, // 15 seconds
            
            // Signal handling
            signals: options.signals || ['SIGTERM', 'SIGINT', 'SIGQUIT'],
            enableSignalHandlers: options.enableSignalHandlers !== false,
            
            // Shutdown behavior
            exitOnComplete: options.exitOnComplete !== false,
            exitCode: options.exitCode || 0,
            saveStateOnShutdown: options.saveStateOnShutdown !== false,
            
            // Logging
            enableDetailedLogging: options.enableDetailedLogging !== false
        };

        // Shutdown state
        this.state = {
            isShuttingDown: false,
            shutdownStarted: null,
            shutdownReason: null,
            shutdownPhase: null,
            componentsToShutdown: new Map(),
            shutdownPromises: [],
            forceShutdownTimer: null,
            gracefulShutdownTimer: null
        };

        // Component registry
        this.components = new Map();
        this.shutdownOrder = [];

        // Setup signal handlers
        if (this.config.enableSignalHandlers) {
            this.setupSignalHandlers();
        }

        Logger.info('🛡️ GracefulShutdown initialized', {
            gracefulTimeout: `${this.config.gracefulTimeout / 1000}s`,
            forceTimeout: `${this.config.forceTimeout / 1000}s`,
            signals: this.config.signals,
            signalHandlersEnabled: this.config.enableSignalHandlers
        });
    }

    /**
     * Register a component for graceful shutdown
     */
    registerComponent(name, component, options = {}) {
        if (this.state.isShuttingDown) {
            Logger.warn('⚠️ Cannot register component during shutdown:', name);
            return;
        }

        const componentConfig = {
            name,
            component,
            priority: options.priority || 0, // Higher priority shuts down first
            timeout: options.timeout || this.config.cleanupTimeout,
            shutdownMethod: options.shutdownMethod || 'shutdown',
            required: options.required !== false, // Required components must shutdown successfully
            dependencies: options.dependencies || [], // Components that depend on this one
            ...options
        };

        this.components.set(name, componentConfig);
        this.updateShutdownOrder();

        Logger.debug('📝 Component registered for graceful shutdown', {
            name,
            priority: componentConfig.priority,
            timeout: `${componentConfig.timeout / 1000}s`,
            required: componentConfig.required
        });
    }

    /**
     * Unregister a component
     */
    unregisterComponent(name) {
        if (this.state.isShuttingDown) {
            Logger.warn('⚠️ Cannot unregister component during shutdown:', name);
            return;
        }

        if (this.components.delete(name)) {
            this.updateShutdownOrder();
            Logger.debug('📝 Component unregistered from graceful shutdown:', name);
        }
    }

    /**
     * Update shutdown order based on priorities and dependencies
     */
    updateShutdownOrder() {
        const components = Array.from(this.components.values());
        
        // Sort by priority (higher first) and handle dependencies
        this.shutdownOrder = components
            .sort((a, b) => {
                // First sort by priority
                if (a.priority !== b.priority) {
                    return b.priority - a.priority;
                }
                
                // Then handle dependencies
                if (a.dependencies.includes(b.name)) {
                    return 1; // a depends on b, so b should shutdown first
                }
                if (b.dependencies.includes(a.name)) {
                    return -1; // b depends on a, so a should shutdown first
                }
                
                return 0;
            })
            .map(comp => comp.name);
    }

    /**
     * Setup signal handlers for graceful shutdown
     */
    setupSignalHandlers() {
        this.config.signals.forEach(signal => {
            process.on(signal, () => {
                this.initiateShutdown(`Signal received: ${signal}`);
            });
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            Logger.error('💥 Uncaught exception, initiating emergency shutdown:', error);
            this.initiateShutdown('Uncaught exception', { emergency: true, error });
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            Logger.error('💥 Unhandled promise rejection, initiating emergency shutdown:', {
                reason,
                promise
            });
            this.initiateShutdown('Unhandled promise rejection', { emergency: true, reason });
        });

        Logger.debug('📡 Signal handlers setup for:', this.config.signals);
    }

    /**
     * Initiate graceful shutdown
     */
    async initiateShutdown(reason = 'Manual shutdown', options = {}) {
        if (this.state.isShuttingDown) {
            Logger.warn('⚠️ Shutdown already in progress');
            return;
        }

        try {
            this.state.isShuttingDown = true;
            this.state.shutdownStarted = Date.now();
            this.state.shutdownReason = reason;
            this.state.shutdownPhase = 'initiated';

            const isEmergency = options.emergency || false;

            Logger.info(`🛑 ${isEmergency ? 'EMERGENCY' : 'GRACEFUL'} SHUTDOWN INITIATED`, {
                reason,
                timestamp: new Date().toISOString(),
                registeredComponents: this.components.size,
                emergency: isEmergency
            });

            this.emit('shutdownInitiated', {
                reason,
                timestamp: this.state.shutdownStarted,
                emergency: isEmergency
            });

            // Setup force shutdown timer
            this.setupForceShutdownTimer();

            // Setup graceful shutdown timer
            if (!isEmergency) {
                this.setupGracefulShutdownTimer();
            }

            // Begin shutdown process
            await this.executeShutdown(isEmergency);

        } catch (error) {
            Logger.error('❌ Error during shutdown initiation:', error);
            await this.forceShutdown('Shutdown initiation failed');
        }
    }

    /**
     * Execute the shutdown process
     */
    async executeShutdown(isEmergency = false) {
        try {
            this.state.shutdownPhase = 'executing';

            // Save state if enabled
            if (this.config.saveStateOnShutdown && !isEmergency) {
                await this.saveShutdownState();
            }

            // Shutdown components in order
            await this.shutdownComponents(isEmergency);

            // Complete shutdown
            await this.completeShutdown();

        } catch (error) {
            Logger.error('❌ Error during shutdown execution:', error);
            await this.forceShutdown('Shutdown execution failed');
        }
    }

    /**
     * Shutdown all registered components
     */
    async shutdownComponents(isEmergency = false) {
        this.state.shutdownPhase = 'components';
        
        Logger.info('🔄 Shutting down components', {
            count: this.components.size,
            order: this.shutdownOrder,
            emergency: isEmergency
        });

        const results = new Map();

        for (const componentName of this.shutdownOrder) {
            const componentConfig = this.components.get(componentName);
            if (!componentConfig) continue;

            try {
                Logger.debug(`🔄 Shutting down component: ${componentName}`);
                
                const result = await this.shutdownComponent(componentConfig, isEmergency);
                results.set(componentName, result);

                if (result.success) {
                    Logger.debug(`✅ Component shutdown successful: ${componentName}`);
                } else {
                    Logger.warn(`⚠️ Component shutdown failed: ${componentName}`, {
                        error: result.error,
                        required: componentConfig.required
                    });

                    // If this is a required component and shutdown failed, consider emergency shutdown
                    if (componentConfig.required && !isEmergency) {
                        Logger.error(`❌ Required component shutdown failed: ${componentName}`);
                        // Continue with other components but log the failure
                    }
                }

            } catch (error) {
                Logger.error(`❌ Error shutting down component ${componentName}:`, error);
                results.set(componentName, {
                    success: false,
                    error: error.message,
                    duration: 0
                });
            }
        }

        // Log shutdown summary
        const successful = Array.from(results.values()).filter(r => r.success).length;
        const failed = results.size - successful;

        Logger.info('📊 Component shutdown summary', {
            total: results.size,
            successful,
            failed,
            results: Object.fromEntries(results)
        });

        this.emit('componentsShutdown', {
            results: Object.fromEntries(results),
            successful,
            failed
        });
    }

    /**
     * Shutdown a single component
     */
    async shutdownComponent(componentConfig, isEmergency = false) {
        const startTime = Date.now();
        
        try {
            const { component, shutdownMethod, timeout } = componentConfig;
            const actualTimeout = isEmergency ? Math.min(timeout, 5000) : timeout; // 5s max for emergency

            // Check if component has the shutdown method
            if (!component || typeof component[shutdownMethod] !== 'function') {
                return {
                    success: false,
                    error: `Component does not have ${shutdownMethod} method`,
                    duration: Date.now() - startTime
                };
            }

            // Create shutdown promise with timeout
            const shutdownPromise = Promise.race([
                component[shutdownMethod](),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Shutdown timeout')), actualTimeout)
                )
            ]);

            await shutdownPromise;

            return {
                success: true,
                duration: Date.now() - startTime
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                duration: Date.now() - startTime
            };
        }
    }

    /**
     * Save shutdown state
     */
    async saveShutdownState() {
        try {
            this.state.shutdownPhase = 'saving_state';
            
            Logger.debug('💾 Saving shutdown state');

            const shutdownState = {
                timestamp: this.state.shutdownStarted,
                reason: this.state.shutdownReason,
                components: Array.from(this.components.keys()),
                shutdownOrder: this.shutdownOrder
            };

            this.emit('stateSaved', shutdownState);
            
            Logger.debug('✅ Shutdown state saved');

        } catch (error) {
            Logger.warn('⚠️ Failed to save shutdown state:', error);
        }
    }

    /**
     * Complete the shutdown process
     */
    async completeShutdown() {
        try {
            this.state.shutdownPhase = 'completing';

            // Clear timers
            if (this.state.forceShutdownTimer) {
                clearTimeout(this.state.forceShutdownTimer);
            }
            if (this.state.gracefulShutdownTimer) {
                clearTimeout(this.state.gracefulShutdownTimer);
            }

            const shutdownDuration = Date.now() - this.state.shutdownStarted;

            Logger.info('✅ GRACEFUL SHUTDOWN COMPLETED', {
                duration: `${Math.round(shutdownDuration / 1000)}s`,
                reason: this.state.shutdownReason,
                componentsShutdown: this.components.size
            });

            this.emit('shutdownCompleted', {
                duration: shutdownDuration,
                reason: this.state.shutdownReason,
                timestamp: Date.now()
            });

            // Exit process if configured
            if (this.config.exitOnComplete) {
                process.exit(this.config.exitCode);
            }

        } catch (error) {
            Logger.error('❌ Error completing shutdown:', error);
            await this.forceShutdown('Shutdown completion failed');
        }
    }

    /**
     * Force shutdown when graceful shutdown fails
     */
    async forceShutdown(reason = 'Force shutdown') {
        try {
            this.state.shutdownPhase = 'force';

            Logger.error('💥 FORCE SHUTDOWN INITIATED', {
                reason,
                originalReason: this.state.shutdownReason,
                duration: this.state.shutdownStarted ? Date.now() - this.state.shutdownStarted : 0
            });

            this.emit('forceShutdown', {
                reason,
                originalReason: this.state.shutdownReason,
                timestamp: Date.now()
            });

            // Clear all timers
            if (this.state.forceShutdownTimer) {
                clearTimeout(this.state.forceShutdownTimer);
            }
            if (this.state.gracefulShutdownTimer) {
                clearTimeout(this.state.gracefulShutdownTimer);
            }

            // Force exit
            process.exit(1);

        } catch (error) {
            Logger.error('💥 CRITICAL: Force shutdown failed:', error);
            process.exit(2);
        }
    }

    /**
     * Setup force shutdown timer
     */
    setupForceShutdownTimer() {
        this.state.forceShutdownTimer = setTimeout(() => {
            this.forceShutdown('Force shutdown timeout reached');
        }, this.config.forceTimeout);
    }

    /**
     * Setup graceful shutdown timer
     */
    setupGracefulShutdownTimer() {
        this.state.gracefulShutdownTimer = setTimeout(() => {
            Logger.warn('⚠️ Graceful shutdown timeout, escalating to force shutdown');
            this.forceShutdown('Graceful shutdown timeout');
        }, this.config.gracefulTimeout);
    }

    /**
     * Check if shutdown is in progress
     */
    isShuttingDown() {
        return this.state.isShuttingDown;
    }

    /**
     * Get shutdown status
     */
    getStatus() {
        return {
            isShuttingDown: this.state.isShuttingDown,
            shutdownStarted: this.state.shutdownStarted,
            shutdownReason: this.state.shutdownReason,
            shutdownPhase: this.state.shutdownPhase,
            registeredComponents: this.components.size,
            shutdownOrder: this.shutdownOrder,
            uptime: this.state.shutdownStarted ? Date.now() - this.state.shutdownStarted : null
        };
    }

    /**
     * Manually trigger shutdown (for testing or manual control)
     */
    async shutdown(reason = 'Manual shutdown') {
        return this.initiateShutdown(reason);
    }

    /**
     * Emergency shutdown (immediate, minimal cleanup)
     */
    async emergencyShutdown(reason = 'Emergency shutdown') {
        return this.initiateShutdown(reason, { emergency: true });
    }
}

module.exports = { GracefulShutdown };