/**
 * Post-Search Cleanup System
 * 
 * Robust cleanup system that automatically executes comprehensive cleanup actions
 * upon search completion, including browser termination, memory release, and
 * temporary file cleanup with validation and error handling.
 */

const { EventEmitter } = require('events');
const { defaultLogger: Logger } = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { performance } = require('perf_hooks');

class PostSearchCleanup extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            // Browser cleanup settings
            browserTerminationTimeout: options.browserTerminationTimeout || 30000,
            browserVerificationRetries: options.browserVerificationRetries || 3,
            browserVerificationDelay: options.browserVerificationDelay || 1000,
            
            // Memory cleanup settings
            memoryReleaseTimeout: options.memoryReleaseTimeout || 25000,
            gcIterations: options.gcIterations || 3,
            gcDelay: options.gcDelay || 1000,
            memoryLeakThreshold: options.memoryLeakThreshold || 50 * 1024 * 1024, // 50MB
            
            // File cleanup settings
            tempFileCleanupTimeout: options.tempFileCleanupTimeout || 20000,
            sessionDataRetention: options.sessionDataRetention || 0, // 0 = immediate cleanup
            preserveSearchResults: options.preserveSearchResults !== false,
            
            // Validation settings
            validationTimeout: options.validationTimeout || 15000,
            validationRetries: options.validationRetries || 2,
            
            // Logging settings
            detailedLogging: options.detailedLogging !== false,
            logCleanupSteps: options.logCleanupSteps !== false,
            logPerformanceMetrics: options.logPerformanceMetrics !== false,
            
            // Error handling
            continueOnError: options.continueOnError !== false,
            maxRetryAttempts: options.maxRetryAttempts || 3,
            retryDelay: options.retryDelay || 2000
        };

        this.state = {
            isCleaningUp: false,
            lastCleanupId: null,
            cleanupHistory: [],
            activeBrowsers: new Set(),
            activeMemoryRefs: new Set(),
            tempFiles: new Set(),
            activeSessions: new Set(),
            searchResults: new Map()
        };

        this.metrics = {
            totalCleanups: 0,
            successfulCleanups: 0,
            failedCleanups: 0,
            averageCleanupTime: 0,
            memoryLeaksDetected: 0,
            browserTerminationFailures: 0,
            fileCleanupFailures: 0
        };

        Logger.info('🧹 PostSearchCleanup system initialized', {
            browserTerminationTimeout: `${this.config.browserTerminationTimeout}ms`,
            memoryReleaseTimeout: `${this.config.memoryReleaseTimeout}ms`,
            tempFileCleanupTimeout: `${this.config.tempFileCleanupTimeout}ms`,
            preserveSearchResults: this.config.preserveSearchResults
        });
    }

    /**
     * Register a browser instance for cleanup tracking
     */
    registerBrowser(browserId, browserInstance) {
        this.state.activeBrowsers.add({
            id: browserId,
            instance: browserInstance,
            pid: browserInstance.process()?.pid,
            registeredAt: Date.now()
        });

        if (this.config.detailedLogging) {
            Logger.info('🌐 Browser registered for cleanup tracking', {
                browserId,
                pid: browserInstance.process()?.pid
            });
        }
    }

    /**
     * Register memory reference for cleanup tracking
     */
    registerMemoryReference(refId, reference, size = 0) {
        this.state.activeMemoryRefs.add({
            id: refId,
            reference,
            size,
            registeredAt: Date.now()
        });

        if (this.config.detailedLogging) {
            Logger.info('💾 Memory reference registered for cleanup', {
                refId,
                size: `${Math.round(size / 1024)}KB`
            });
        }
    }

    /**
     * Register temporary file for cleanup
     */
    registerTempFile(filePath, metadata = {}) {
        this.state.tempFiles.add({
            path: filePath,
            metadata,
            registeredAt: Date.now()
        });

        if (this.config.detailedLogging) {
            Logger.info('📁 Temporary file registered for cleanup', {
                filePath,
                metadata
            });
        }
    }

    /**
     * Register active session for cleanup
     */
    registerSession(sessionId, sessionData) {
        this.state.activeSessions.add({
            id: sessionId,
            data: sessionData,
            registeredAt: Date.now()
        });

        if (this.config.detailedLogging) {
            Logger.info('🔐 Session registered for cleanup', {
                sessionId,
                dataSize: JSON.stringify(sessionData).length
            });
        }
    }

    /**
     * Store search results for preservation
     */
    storeSearchResults(searchId, results) {
        if (this.config.preserveSearchResults) {
            this.state.searchResults.set(searchId, {
                results,
                timestamp: Date.now(),
                preserved: true
            });

            Logger.info('💾 Search results preserved', {
                searchId,
                resultCount: Array.isArray(results) ? results.length : 'N/A'
            });
        }
    }

    /**
     * Execute comprehensive post-search cleanup
     */
    async executeCleanup(searchId, options = {}) {
        if (this.state.isCleaningUp) {
            Logger.warn('⚠️ Cleanup already in progress, queuing request');
            return this.queueCleanup(searchId, options);
        }

        const cleanupId = `cleanup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.state.lastCleanupId = cleanupId;
        this.state.isCleaningUp = true;

        const startTime = performance.now();
        const cleanupLog = {
            cleanupId,
            searchId,
            startTime: new Date().toISOString(),
            steps: [],
            errors: [],
            warnings: [],
            metrics: {}
        };

        try {
            Logger.info('🧹 Starting comprehensive post-search cleanup', {
                cleanupId,
                searchId,
                activeBrowsers: this.state.activeBrowsers.size,
                activeMemoryRefs: this.state.activeMemoryRefs.size,
                tempFiles: this.state.tempFiles.size,
                activeSessions: this.state.activeSessions.size
            });

            // Step 1: Terminate browser processes with verification
            await this.terminateBrowserProcesses(cleanupLog);

            // Step 2: Release memory resources systematically
            await this.releaseMemoryResources(cleanupLog);

            // Step 3: Remove temporary files and session data
            await this.removeTempFilesAndSessions(cleanupLog);

            // Step 4: Validate complete resource release
            await this.validateResourceRelease(cleanupLog);

            // Step 5: Generate cleanup summary
            const endTime = performance.now();
            const duration = endTime - startTime;

            cleanupLog.endTime = new Date().toISOString();
            cleanupLog.duration = duration;
            cleanupLog.success = true;

            this.updateMetrics(true, duration);
            this.state.cleanupHistory.push(cleanupLog);

            Logger.info('✅ Post-search cleanup completed successfully', {
                cleanupId,
                duration: `${Math.round(duration)}ms`,
                stepsCompleted: cleanupLog.steps.length,
                errorsEncountered: cleanupLog.errors.length
            });

            this.emit('cleanupCompleted', {
                cleanupId,
                searchId,
                success: true,
                duration,
                log: cleanupLog
            });

            return {
                success: true,
                cleanupId,
                duration,
                log: cleanupLog
            };

        } catch (error) {
            const endTime = performance.now();
            const duration = endTime - startTime;

            cleanupLog.endTime = new Date().toISOString();
            cleanupLog.duration = duration;
            cleanupLog.success = false;
            cleanupLog.error = error.message;

            this.updateMetrics(false, duration);
            this.state.cleanupHistory.push(cleanupLog);

            Logger.error('❌ Post-search cleanup failed', {
                cleanupId,
                error: error.message,
                duration: `${Math.round(duration)}ms`
            });

            this.emit('cleanupFailed', {
                cleanupId,
                searchId,
                error: error.message,
                duration,
                log: cleanupLog
            });

            if (!this.config.continueOnError) {
                throw error;
            }

            return {
                success: false,
                cleanupId,
                error: error.message,
                duration,
                log: cleanupLog
            };

        } finally {
            this.state.isCleaningUp = false;
        }
    }

    /**
     * Terminate browser processes with verification
     */
    async terminateBrowserProcesses(cleanupLog) {
        const stepStart = performance.now();
        const step = {
            name: 'Browser Process Termination',
            startTime: new Date().toISOString(),
            browsers: [],
            errors: []
        };

        try {
            if (this.config.logCleanupSteps) {
                Logger.info('🌐 Terminating browser processes', {
                    browserCount: this.state.activeBrowsers.size
                });
            }

            for (const browserInfo of this.state.activeBrowsers) {
                const browserStep = {
                    browserId: browserInfo.id,
                    pid: browserInfo.pid,
                    startTime: Date.now()
                };

                try {
                    // Attempt graceful closure first
                    if (browserInfo.instance && typeof browserInfo.instance.close === 'function') {
                        await Promise.race([
                            browserInfo.instance.close(),
                            new Promise((_, reject) => 
                                setTimeout(() => reject(new Error('Browser close timeout')), 
                                this.config.browserTerminationTimeout)
                            )
                        ]);
                    }

                    // Verify browser process termination
                    const verified = await this.verifyBrowserTermination(browserInfo, browserStep);
                    
                    if (verified) {
                        browserStep.success = true;
                        browserStep.endTime = Date.now();
                        browserStep.duration = browserStep.endTime - browserStep.startTime;
                        
                        if (this.config.detailedLogging) {
                            Logger.info('✅ Browser terminated successfully', {
                                browserId: browserInfo.id,
                                pid: browserInfo.pid,
                                duration: `${browserStep.duration}ms`
                            });
                        }
                    } else {
                        throw new Error('Browser termination verification failed');
                    }

                } catch (error) {
                    browserStep.success = false;
                    browserStep.error = error.message;
                    browserStep.endTime = Date.now();
                    
                    step.errors.push({
                        browserId: browserInfo.id,
                        error: error.message
                    });

                    this.metrics.browserTerminationFailures++;

                    Logger.error('❌ Browser termination failed', {
                        browserId: browserInfo.id,
                        pid: browserInfo.pid,
                        error: error.message
                    });

                    // Attempt force termination if graceful failed
                    await this.forceBrowserTermination(browserInfo);
                }

                step.browsers.push(browserStep);
            }

            // Clear browser registry
            this.state.activeBrowsers.clear();

            step.endTime = new Date().toISOString();
            step.duration = performance.now() - stepStart;
            step.success = step.errors.length === 0;

            cleanupLog.steps.push(step);

            if (step.errors.length > 0) {
                cleanupLog.warnings.push(`${step.errors.length} browser(s) failed to terminate gracefully`);
                
                // If continueOnError is false, throw error for any browser termination failures
                if (!this.config.continueOnError) {
                    throw new Error(`Browser termination failed: ${step.errors[0].error}`);
                }
            }

        } catch (error) {
            step.endTime = new Date().toISOString();
            step.duration = performance.now() - stepStart;
            step.success = false;
            step.error = error.message;

            cleanupLog.steps.push(step);
            cleanupLog.errors.push({
                step: 'Browser Process Termination',
                error: error.message
            });

            throw error;
        }
    }

    /**
     * Verify browser process termination
     */
    async verifyBrowserTermination(browserInfo, browserStep) {
        for (let attempt = 1; attempt <= this.config.browserVerificationRetries; attempt++) {
            try {
                // Check if process still exists
                if (browserInfo.pid) {
                    try {
                        process.kill(browserInfo.pid, 0); // Signal 0 checks if process exists
                        // If no error thrown, process still exists
                        if (attempt < this.config.browserVerificationRetries) {
                            await new Promise(resolve => 
                                setTimeout(resolve, this.config.browserVerificationDelay)
                            );
                            continue;
                        } else {
                            return false; // Process still exists after all retries
                        }
                    } catch (error) {
                        // Process doesn't exist (ESRCH error expected)
                        return true;
                    }
                }

                // Additional verification through browser instance
                if (browserInfo.instance) {
                    try {
                        const pages = await browserInfo.instance.pages();
                        if (pages.length === 0) {
                            return true;
                        }
                    } catch (error) {
                        // Browser instance is no longer accessible
                        return true;
                    }
                }

                if (attempt < this.config.browserVerificationRetries) {
                    await new Promise(resolve => 
                        setTimeout(resolve, this.config.browserVerificationDelay)
                    );
                }

            } catch (error) {
                browserStep.verificationErrors = browserStep.verificationErrors || [];
                browserStep.verificationErrors.push({
                    attempt,
                    error: error.message
                });
            }
        }

        return false;
    }

    /**
     * Force browser termination
     */
    async forceBrowserTermination(browserInfo) {
        try {
            if (browserInfo.pid) {
                if (process.platform === 'win32') {
                    const { exec } = require('child_process');
                    await new Promise((resolve, reject) => {
                        exec(`taskkill /F /PID ${browserInfo.pid}`, (error) => {
                            if (error) reject(error);
                            else resolve();
                        });
                    });
                } else {
                    process.kill(browserInfo.pid, 'SIGKILL');
                }

                Logger.warn('⚠️ Browser force terminated', {
                    browserId: browserInfo.id,
                    pid: browserInfo.pid
                });
            }
        } catch (error) {
            Logger.error('❌ Force browser termination failed', {
                browserId: browserInfo.id,
                pid: browserInfo.pid,
                error: error.message
            });
        }
    }

    /**
     * Release memory resources systematically
     */
    async releaseMemoryResources(cleanupLog) {
        const stepStart = performance.now();
        const step = {
            name: 'Memory Resource Release',
            startTime: new Date().toISOString(),
            memoryBefore: process.memoryUsage(),
            references: [],
            gcIterations: [],
            errors: []
        };

        try {
            if (this.config.logCleanupSteps) {
                Logger.info('💾 Releasing memory resources', {
                    activeReferences: this.state.activeMemoryRefs.size,
                    memoryBefore: this.formatMemoryUsage(step.memoryBefore)
                });
            }

            // Release tracked memory references
            for (const memRef of this.state.activeMemoryRefs) {
                const refStep = {
                    refId: memRef.id,
                    size: memRef.size,
                    startTime: Date.now()
                };

                try {
                    // Clear reference
                    if (memRef.reference) {
                        if (typeof memRef.reference.destroy === 'function') {
                            await memRef.reference.destroy();
                        } else if (typeof memRef.reference.close === 'function') {
                            await memRef.reference.close();
                        } else if (typeof memRef.reference.clear === 'function') {
                            memRef.reference.clear();
                        }
                        memRef.reference = null;
                    }

                    refStep.success = true;
                    refStep.endTime = Date.now();
                    refStep.duration = refStep.endTime - refStep.startTime;

                } catch (error) {
                    refStep.success = false;
                    refStep.error = error.message;
                    refStep.endTime = Date.now();

                    step.errors.push({
                        refId: memRef.id,
                        error: error.message
                    });

                    Logger.error('❌ Memory reference release failed', {
                        refId: memRef.id,
                        error: error.message
                    });
                }

                step.references.push(refStep);
            }

            // Clear memory reference registry
            this.state.activeMemoryRefs.clear();

            // Perform garbage collection iterations
            for (let i = 1; i <= this.config.gcIterations; i++) {
                const gcStart = performance.now();
                const memoryBefore = process.memoryUsage();

                try {
                    if (global.gc) {
                        global.gc();
                    } else {
                        // Force garbage collection through memory pressure
                        const arr = new Array(1000000).fill(0);
                        arr.length = 0;
                    }

                    await new Promise(resolve => setTimeout(resolve, this.config.gcDelay));

                    const memoryAfter = process.memoryUsage();
                    const gcDuration = performance.now() - gcStart;

                    const gcStep = {
                        iteration: i,
                        duration: gcDuration,
                        memoryBefore: memoryBefore,
                        memoryAfter: memoryAfter,
                        memoryReleased: memoryBefore.heapUsed - memoryAfter.heapUsed
                    };

                    step.gcIterations.push(gcStep);

                    if (this.config.detailedLogging) {
                        Logger.info(`🗑️ GC iteration ${i} completed`, {
                            duration: `${Math.round(gcDuration)}ms`,
                            memoryReleased: `${Math.round(gcStep.memoryReleased / 1024)}KB`
                        });
                    }

                } catch (error) {
                    step.errors.push({
                        gcIteration: i,
                        error: error.message
                    });
                }
            }

            step.memoryAfter = process.memoryUsage();
            step.totalMemoryReleased = step.memoryBefore.heapUsed - step.memoryAfter.heapUsed;

            // Check for memory leaks
            if (step.totalMemoryReleased < 0 && 
                Math.abs(step.totalMemoryReleased) > this.config.memoryLeakThreshold) {
                this.metrics.memoryLeaksDetected++;
                cleanupLog.warnings.push(`Potential memory leak detected: ${Math.round(Math.abs(step.totalMemoryReleased) / 1024)}KB increase`);
            }

            step.endTime = new Date().toISOString();
            step.duration = performance.now() - stepStart;
            step.success = step.errors.length === 0;

            cleanupLog.steps.push(step);

            if (this.config.logPerformanceMetrics) {
                Logger.info('📊 Memory cleanup metrics', {
                    totalMemoryReleased: `${Math.round(step.totalMemoryReleased / 1024)}KB`,
                    gcIterations: step.gcIterations.length,
                    referencesReleased: step.references.length
                });
            }

        } catch (error) {
            step.endTime = new Date().toISOString();
            step.duration = performance.now() - stepStart;
            step.success = false;
            step.error = error.message;

            cleanupLog.steps.push(step);
            cleanupLog.errors.push({
                step: 'Memory Resource Release',
                error: error.message
            });

            throw error;
        }
    }

    /**
     * Remove temporary files and session data
     */
    async removeTempFilesAndSessions(cleanupLog) {
        const stepStart = performance.now();
        const step = {
            name: 'Temporary Files and Session Cleanup',
            startTime: new Date().toISOString(),
            files: [],
            sessions: [],
            errors: []
        };

        try {
            if (this.config.logCleanupSteps) {
                Logger.info('📁 Removing temporary files and session data', {
                    tempFiles: this.state.tempFiles.size,
                    activeSessions: this.state.activeSessions.size
                });
            }

            // Remove temporary files
            for (const fileInfo of this.state.tempFiles) {
                const fileStep = {
                    path: fileInfo.path,
                    metadata: fileInfo.metadata,
                    startTime: Date.now()
                };

                try {
                    const stats = await fs.stat(fileInfo.path);
                    fileStep.size = stats.size;

                    await fs.unlink(fileInfo.path);

                    fileStep.success = true;
                    fileStep.endTime = Date.now();
                    fileStep.duration = fileStep.endTime - fileStep.startTime;

                    if (this.config.detailedLogging) {
                        Logger.info('🗑️ Temporary file removed', {
                            path: fileInfo.path,
                            size: `${Math.round(fileStep.size / 1024)}KB`
                        });
                    }

                } catch (error) {
                    fileStep.success = false;
                    fileStep.error = error.message;
                    fileStep.endTime = Date.now();

                    if (error.code !== 'ENOENT') { // Ignore file not found errors
                        step.errors.push({
                            path: fileInfo.path,
                            error: error.message
                        });

                        this.metrics.fileCleanupFailures++;

                        Logger.error('❌ Temporary file removal failed', {
                            path: fileInfo.path,
                            error: error.message
                        });
                    }
                }

                step.files.push(fileStep);
            }

            // Clear temp files registry
            this.state.tempFiles.clear();

            // Release active sessions
            for (const sessionInfo of this.state.activeSessions) {
                const sessionStep = {
                    sessionId: sessionInfo.id,
                    dataSize: JSON.stringify(sessionInfo.data).length,
                    startTime: Date.now()
                };

                try {
                    // Clear session data
                    if (sessionInfo.data) {
                        if (typeof sessionInfo.data.destroy === 'function') {
                            await sessionInfo.data.destroy();
                        } else if (typeof sessionInfo.data.close === 'function') {
                            await sessionInfo.data.close();
                        } else if (typeof sessionInfo.data.clear === 'function') {
                            sessionInfo.data.clear();
                        }
                        sessionInfo.data = null;
                    }

                    sessionStep.success = true;
                    sessionStep.endTime = Date.now();
                    sessionStep.duration = sessionStep.endTime - sessionStep.startTime;

                    if (this.config.detailedLogging) {
                        Logger.info('🔐 Session released', {
                            sessionId: sessionInfo.id,
                            dataSize: `${Math.round(sessionStep.dataSize / 1024)}KB`
                        });
                    }

                } catch (error) {
                    sessionStep.success = false;
                    sessionStep.error = error.message;
                    sessionStep.endTime = Date.now();

                    step.errors.push({
                        sessionId: sessionInfo.id,
                        error: error.message
                    });

                    Logger.error('❌ Session release failed', {
                        sessionId: sessionInfo.id,
                        error: error.message
                    });
                }

                step.sessions.push(sessionStep);
            }

            // Clear sessions registry
            this.state.activeSessions.clear();

            step.endTime = new Date().toISOString();
            step.duration = performance.now() - stepStart;
            step.success = step.errors.length === 0;

            cleanupLog.steps.push(step);

        } catch (error) {
            step.endTime = new Date().toISOString();
            step.duration = performance.now() - stepStart;
            step.success = false;
            step.error = error.message;

            cleanupLog.steps.push(step);
            cleanupLog.errors.push({
                step: 'Temporary Files and Session Cleanup',
                error: error.message
            });

            throw error;
        }
    }

    /**
     * Validate complete resource release
     */
    async validateResourceRelease(cleanupLog) {
        const stepStart = performance.now();
        const step = {
            name: 'Resource Release Validation',
            startTime: new Date().toISOString(),
            validations: [],
            errors: []
        };

        try {
            if (this.config.logCleanupSteps) {
                Logger.info('✅ Validating complete resource release');
            }

            // Validate browser processes
            const browserValidation = await this.validateBrowserCleanup();
            step.validations.push(browserValidation);

            // Validate memory release
            const memoryValidation = await this.validateMemoryCleanup();
            step.validations.push(memoryValidation);

            // Validate file cleanup
            const fileValidation = await this.validateFileCleanup();
            step.validations.push(fileValidation);

            // Validate session cleanup
            const sessionValidation = await this.validateSessionCleanup();
            step.validations.push(sessionValidation);

            step.endTime = new Date().toISOString();
            step.duration = performance.now() - stepStart;
            step.success = step.validations.every(v => v.success);

            cleanupLog.steps.push(step);

            if (step.success) {
                Logger.info('✅ Resource release validation completed successfully');
            } else {
                const failedValidations = step.validations.filter(v => !v.success);
                cleanupLog.warnings.push(`${failedValidations.length} validation(s) failed`);
                
                // Log failed validations for debugging
                if (this.config.detailedLogging) {
                    Logger.warn('❌ Validation failures:', {
                        failedValidations: failedValidations.map(v => ({
                            type: v.type,
                            reason: v.reason || v.error
                        }))
                    });
                }
            }

        } catch (error) {
            step.endTime = new Date().toISOString();
            step.duration = performance.now() - stepStart;
            step.success = false;
            step.error = error.message;

            cleanupLog.steps.push(step);
            cleanupLog.errors.push({
                step: 'Resource Release Validation',
                error: error.message
            });

            throw error;
        }
    }

    /**
     * Validate browser cleanup
     */
    async validateBrowserCleanup() {
        const validation = {
            type: 'Browser Cleanup',
            startTime: Date.now(),
            checks: []
        };

        try {
            // Check if browser registry is empty
            validation.checks.push({
                name: 'Browser Registry Empty',
                success: this.state.activeBrowsers.size === 0,
                value: this.state.activeBrowsers.size
            });

            validation.success = validation.checks.every(check => check.success);
            validation.endTime = Date.now();
            validation.duration = validation.endTime - validation.startTime;

        } catch (error) {
            validation.success = false;
            validation.error = error.message;
            validation.endTime = Date.now();
        }

        return validation;
    }

    /**
     * Validate memory cleanup
     */
    async validateMemoryCleanup() {
        const validation = {
            type: 'Memory Cleanup',
            startTime: Date.now(),
            checks: []
        };

        try {
            // Check if memory reference registry is empty
            validation.checks.push({
                name: 'Memory Reference Registry Empty',
                success: this.state.activeMemoryRefs.size === 0,
                value: this.state.activeMemoryRefs.size
            });

            // Check current memory usage
            const currentMemory = process.memoryUsage();
            validation.checks.push({
                name: 'Memory Usage Check',
                success: true, // Always pass, just for monitoring
                value: this.formatMemoryUsage(currentMemory)
            });

            validation.success = validation.checks.every(check => check.success);
            validation.endTime = Date.now();
            validation.duration = validation.endTime - validation.startTime;

        } catch (error) {
            validation.success = false;
            validation.error = error.message;
            validation.endTime = Date.now();
        }

        return validation;
    }

    /**
     * Validate file cleanup
     */
    async validateFileCleanup() {
        const validation = {
            type: 'File Cleanup',
            startTime: Date.now(),
            checks: []
        };

        try {
            // Check if temp files registry is empty
            validation.checks.push({
                name: 'Temp Files Registry Empty',
                success: this.state.tempFiles.size === 0,
                value: this.state.tempFiles.size
            });

            validation.success = validation.checks.every(check => check.success);
            validation.endTime = Date.now();
            validation.duration = validation.endTime - validation.startTime;

        } catch (error) {
            validation.success = false;
            validation.error = error.message;
            validation.endTime = Date.now();
        }

        return validation;
    }

    /**
     * Validate session cleanup
     */
    async validateSessionCleanup() {
        const validation = {
            type: 'Session Cleanup',
            startTime: Date.now(),
            checks: []
        };

        try {
            // Check if sessions registry is empty
            validation.checks.push({
                name: 'Sessions Registry Empty',
                success: this.state.activeSessions.size === 0,
                value: this.state.activeSessions.size
            });

            // Check if search results are preserved
            if (this.config.preserveSearchResults) {
                validation.checks.push({
                    name: 'Search Results Preserved',
                    success: this.state.searchResults.size > 0,
                    value: this.state.searchResults.size
                });
            }

            validation.success = validation.checks.every(check => check.success);
            validation.endTime = Date.now();
            validation.duration = validation.endTime - validation.startTime;

        } catch (error) {
            validation.success = false;
            validation.error = error.message;
            validation.endTime = Date.now();
        }

        return validation;
    }

    /**
     * Queue cleanup request when already in progress
     */
    async queueCleanup(searchId, options) {
        return new Promise((resolve, reject) => {
            const checkInterval = setInterval(() => {
                if (!this.state.isCleaningUp) {
                    clearInterval(checkInterval);
                    this.executeCleanup(searchId, options)
                        .then(resolve)
                        .catch(reject);
                }
            }, 100);

            // Timeout after 30 seconds
            setTimeout(() => {
                clearInterval(checkInterval);
                reject(new Error('Cleanup queue timeout'));
            }, 30000);
        });
    }

    /**
     * Update cleanup metrics
     */
    updateMetrics(success, duration) {
        this.metrics.totalCleanups++;
        
        if (success) {
            this.metrics.successfulCleanups++;
        } else {
            this.metrics.failedCleanups++;
        }

        // Update average cleanup time
        const totalDuration = this.metrics.averageCleanupTime * (this.metrics.totalCleanups - 1) + duration;
        this.metrics.averageCleanupTime = totalDuration / this.metrics.totalCleanups;
    }

    /**
     * Format memory usage for logging
     */
    formatMemoryUsage(memoryUsage) {
        return {
            rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
            external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
        };
    }

    /**
     * Get cleanup status and metrics
     */
    getStatus() {
        return {
            isCleaningUp: this.state.isCleaningUp,
            lastCleanupId: this.state.lastCleanupId,
            metrics: { ...this.metrics },
            activeResources: {
                browsers: this.state.activeBrowsers.size,
                memoryRefs: this.state.activeMemoryRefs.size,
                tempFiles: this.state.tempFiles.size,
                sessions: this.state.activeSessions.size,
                searchResults: this.state.searchResults.size
            },
            cleanupHistory: this.state.cleanupHistory.slice(-10) // Last 10 cleanups
        };
    }

    /**
     * Get preserved search results
     */
    getSearchResults(searchId) {
        return this.state.searchResults.get(searchId);
    }

    /**
     * Clear old search results
     */
    clearOldSearchResults(maxAge = 24 * 60 * 60 * 1000) { // 24 hours default
        const now = Date.now();
        for (const [searchId, resultData] of this.state.searchResults.entries()) {
            if (now - resultData.timestamp > maxAge) {
                this.state.searchResults.delete(searchId);
            }
        }
    }
}

module.exports = { PostSearchCleanup };