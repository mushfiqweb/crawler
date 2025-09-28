const { EventEmitter } = require('events');
const { defaultLogger: Logger } = require('./logger');

/**
 * Concurrent Optimizer - Prevents memory bloat in concurrent operations
 */
class ConcurrentOptimizer extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            maxConcurrency: options.maxConcurrency || 5,
            memoryThreshold: options.memoryThreshold || 500 * 1024 * 1024, // 500MB
            batchSize: options.batchSize || 10,
            gcInterval: options.gcInterval || 30000, // 30 seconds
            promiseTimeout: options.promiseTimeout || 60000, // 60 seconds
            enableMemoryMonitoring: options.enableMemoryMonitoring !== false,
            enableGarbageCollection: options.enableGarbageCollection !== false,
            maxRetries: options.maxRetries || 3,
            retryDelay: options.retryDelay || 1000
        };
        
        this.stats = {
            totalOperations: 0,
            successfulOperations: 0,
            failedOperations: 0,
            retriedOperations: 0,
            memoryCleanups: 0,
            timeouts: 0,
            averageExecutionTime: 0,
            peakMemoryUsage: 0,
            currentConcurrency: 0
        };
        
        this.activePromises = new Map();
        this.promiseQueue = [];
        this.isShuttingDown = false;
        this.gcTimer = null;
        
        this.startMemoryMonitoring();
    }

    /**
     * Start memory monitoring and garbage collection
     */
    startMemoryMonitoring() {
        if (!this.config.enableMemoryMonitoring) return;
        
        this.gcTimer = setInterval(() => {
            this.performMemoryCheck();
        }, this.config.gcInterval);
    }

    /**
     * Stop memory monitoring
     */
    stopMemoryMonitoring() {
        if (this.gcTimer) {
            clearInterval(this.gcTimer);
            this.gcTimer = null;
        }
    }

    /**
     * Perform memory check and cleanup if needed
     */
    performMemoryCheck() {
        const memUsage = process.memoryUsage();
        const currentMemory = memUsage.heapUsed;
        
        // Update peak memory usage
        if (currentMemory > this.stats.peakMemoryUsage) {
            this.stats.peakMemoryUsage = currentMemory;
        }
        
        // Check if memory threshold is exceeded
        if (currentMemory > this.config.memoryThreshold) {
            Logger.warn(`🧠 Memory threshold exceeded: ${(currentMemory / 1024 / 1024).toFixed(2)}MB`);
            this.forceMemoryCleanup();
        }
        
        this.emit('memoryCheck', {
            current: currentMemory,
            threshold: this.config.memoryThreshold,
            peak: this.stats.peakMemoryUsage,
            activeConcurrency: this.stats.currentConcurrency
        });
    }

    /**
     * Force memory cleanup
     */
    forceMemoryCleanup() {
        try {
            // Clear completed promises from tracking
            this.cleanupCompletedPromises();
            
            // Force garbage collection if available
            if (this.config.enableGarbageCollection && global.gc) {
                global.gc();
                this.stats.memoryCleanups++;
                Logger.info('🗑️ Forced garbage collection completed');
            }
            
            this.emit('memoryCleanup', {
                activePromises: this.activePromises.size,
                queuedPromises: this.promiseQueue.length
            });
            
        } catch (error) {
            Logger.error('❌ Error during memory cleanup:', error);
        }
    }

    /**
     * Clean up completed promises from tracking
     */
    cleanupCompletedPromises() {
        const before = this.activePromises.size;
        
        for (const [id, promiseInfo] of this.activePromises.entries()) {
            if (promiseInfo.completed || promiseInfo.failed) {
                this.activePromises.delete(id);
            }
        }
        
        const cleaned = before - this.activePromises.size;
        if (cleaned > 0) {
            Logger.debug(`🧹 Cleaned up ${cleaned} completed promises`);
        }
    }

    /**
     * Execute concurrent operations with memory optimization
     */
    async executeConcurrent(operations, options = {}) {
        if (this.isShuttingDown) {
            throw new Error('ConcurrentOptimizer is shutting down');
        }
        
        const config = { ...this.config, ...options };
        const results = [];
        const errors = [];
        
        Logger.info(`🚀 Starting concurrent execution: ${operations.length} operations, max concurrency: ${config.maxConcurrency}`);
        
        try {
            // Process operations in batches to prevent memory bloat
            for (let i = 0; i < operations.length; i += config.batchSize) {
                const batch = operations.slice(i, i + config.batchSize);
                const batchResults = await this.processBatch(batch, config);
                
                results.push(...batchResults.filter(r => r.success));
                errors.push(...batchResults.filter(r => !r.success));
                
                // Memory check between batches
                if (i + config.batchSize < operations.length) {
                    this.performMemoryCheck();
                    await this.delay(100); // Small delay to allow GC
                }
            }
            
            Logger.info(`✅ Concurrent execution completed: ${results.length} successful, ${errors.length} failed`);
            
            return {
                results,
                errors,
                stats: this.getStats()
            };
            
        } catch (error) {
            Logger.error('❌ Concurrent execution failed:', error);
            throw error;
        }
    }

    /**
     * Process a batch of operations with concurrency control
     */
    async processBatch(operations, config) {
        const semaphore = new Semaphore(config.maxConcurrency);
        const promises = operations.map(async (operation, index) => {
            return semaphore.acquire(async () => {
                return this.executeWithOptimization(operation, index, config);
            });
        });
        
        const results = await Promise.allSettled(promises);
        return results.map((result, index) => {
            if (result.status === 'fulfilled') {
                return { success: true, result: result.value, index };
            } else {
                return { success: false, error: result.reason, index };
            }
        });
    }

    /**
     * Execute single operation with optimization and monitoring
     */
    async executeWithOptimization(operation, index, config) {
        const operationId = `op_${Date.now()}_${index}`;
        const startTime = Date.now();
        
        this.stats.totalOperations++;
        this.stats.currentConcurrency++;
        
        // Track the operation
        this.activePromises.set(operationId, {
            id: operationId,
            startTime,
            operation: operation.name || 'anonymous',
            completed: false,
            failed: false
        });
        
        try {
            // Execute with timeout
            const result = await this.withTimeout(
                this.executeWithRetry(operation, config),
                config.promiseTimeout,
                operationId
            );
            
            // Mark as completed
            const promiseInfo = this.activePromises.get(operationId);
            if (promiseInfo) {
                promiseInfo.completed = true;
                promiseInfo.endTime = Date.now();
                promiseInfo.duration = promiseInfo.endTime - promiseInfo.startTime;
            }
            
            this.stats.successfulOperations++;
            this.updateAverageExecutionTime(Date.now() - startTime);
            
            return result;
            
        } catch (error) {
            // Mark as failed
            const promiseInfo = this.activePromises.get(operationId);
            if (promiseInfo) {
                promiseInfo.failed = true;
                promiseInfo.error = error.message;
                promiseInfo.endTime = Date.now();
            }
            
            this.stats.failedOperations++;
            
            if (error.message.includes('timeout')) {
                this.stats.timeouts++;
            }
            
            throw error;
            
        } finally {
            this.stats.currentConcurrency--;
            
            // Immediate cleanup for this operation
            setTimeout(() => {
                this.activePromises.delete(operationId);
            }, 1000);
        }
    }

    /**
     * Execute operation with retry logic
     */
    async executeWithRetry(operation, config) {
        let lastError;
        
        for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
            try {
                if (typeof operation === 'function') {
                    return await operation();
                } else if (operation && typeof operation.execute === 'function') {
                    return await operation.execute();
                } else {
                    throw new Error('Invalid operation: must be function or object with execute method');
                }
                
            } catch (error) {
                lastError = error;
                
                if (attempt < config.maxRetries) {
                    this.stats.retriedOperations++;
                    Logger.debug(`🔄 Retrying operation (attempt ${attempt + 1}/${config.maxRetries}): ${error.message}`);
                    await this.delay(config.retryDelay * attempt);
                } else {
                    Logger.error(`❌ Operation failed after ${config.maxRetries} attempts: ${error.message}`);
                }
            }
        }
        
        throw lastError;
    }

    /**
     * Execute operation with timeout
     */
    async withTimeout(promise, timeout, operationId) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Operation ${operationId} timed out after ${timeout}ms`));
            }, timeout);
            
            promise
                .then(result => {
                    clearTimeout(timeoutId);
                    resolve(result);
                })
                .catch(error => {
                    clearTimeout(timeoutId);
                    reject(error);
                });
        });
    }

    /**
     * Update average execution time
     */
    updateAverageExecutionTime(duration) {
        const total = this.stats.successfulOperations;
        this.stats.averageExecutionTime = 
            ((this.stats.averageExecutionTime * (total - 1)) + duration) / total;
    }

    /**
     * Utility delay function
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get optimizer statistics
     */
    getStats() {
        return {
            ...this.stats,
            successRate: this.stats.totalOperations > 0 
                ? ((this.stats.successfulOperations / this.stats.totalOperations) * 100).toFixed(2) + '%'
                : '0%',
            memoryUsage: process.memoryUsage(),
            activePromises: this.activePromises.size,
            queuedPromises: this.promiseQueue.length
        };
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        Logger.info('🛑 Shutting down ConcurrentOptimizer...');
        this.isShuttingDown = true;
        
        this.stopMemoryMonitoring();
        
        // Wait for active promises to complete (with timeout)
        const shutdownTimeout = 30000; // 30 seconds
        const startTime = Date.now();
        
        while (this.activePromises.size > 0 && (Date.now() - startTime) < shutdownTimeout) {
            Logger.info(`⏳ Waiting for ${this.activePromises.size} active operations to complete...`);
            await this.delay(1000);
        }
        
        if (this.activePromises.size > 0) {
            Logger.warn(`⚠️ Forced shutdown with ${this.activePromises.size} operations still active`);
        }
        
        this.activePromises.clear();
        this.promiseQueue = [];
        
        Logger.info('✅ ConcurrentOptimizer shutdown complete');
    }
}

/**
 * Semaphore for concurrency control
 */
class Semaphore {
    constructor(maxConcurrency) {
        this.maxConcurrency = maxConcurrency;
        this.currentConcurrency = 0;
        this.queue = [];
    }

    async acquire(task) {
        return new Promise((resolve, reject) => {
            this.queue.push({
                task,
                resolve,
                reject
            });
            this.process();
        });
    }

    async process() {
        if (this.currentConcurrency >= this.maxConcurrency || this.queue.length === 0) {
            return;
        }

        this.currentConcurrency++;
        const { task, resolve, reject } = this.queue.shift();

        try {
            const result = await task();
            resolve(result);
        } catch (error) {
            reject(error);
        } finally {
            this.currentConcurrency--;
            this.process();
        }
    }
}

module.exports = { ConcurrentOptimizer, Semaphore };