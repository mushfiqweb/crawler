const { EventEmitter } = require('events');
const { defaultLogger: Logger } = require('./logger');

/**
 * ImmediateProcessor - Handles immediate data processing and disposal
 * to prevent memory accumulation and ensure efficient resource usage
 */
class ImmediateProcessor extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            maxBufferSize: options.maxBufferSize || 100,
            processingTimeout: options.processingTimeout || 5000,
            autoFlush: options.autoFlush !== false,
            flushInterval: options.flushInterval || 1000,
            enableMetrics: options.enableMetrics !== false,
            maxRetries: options.maxRetries || 3,
            retryDelay: options.retryDelay || 1000
        };
        
        this.buffer = [];
        this.processing = false;
        this.flushTimer = null;
        this.metrics = {
            processed: 0,
            failed: 0,
            disposed: 0,
            bufferOverflows: 0,
            processingTime: 0,
            lastProcessed: null
        };
        
        this.processors = new Map();
        this.disposers = new Map();
        
        if (this.config.autoFlush) {
            this.startAutoFlush();
        }
        
        Logger.info('ImmediateProcessor initialized', { config: this.config });
    }
    
    /**
     * Register a processor function for a specific data type
     */
    registerProcessor(dataType, processorFn) {
        if (typeof processorFn !== 'function') {
            throw new Error('Processor must be a function');
        }
        
        this.processors.set(dataType, processorFn);
        Logger.debug(`Processor registered for type: ${dataType}`);
    }
    
    /**
     * Register a disposer function for a specific data type
     */
    registerDisposer(dataType, disposerFn) {
        if (typeof disposerFn !== 'function') {
            throw new Error('Disposer must be a function');
        }
        
        this.disposers.set(dataType, disposerFn);
        Logger.debug(`Disposer registered for type: ${dataType}`);
    }
    
    /**
     * Process data immediately or add to buffer
     */
    async process(data, dataType = 'default', options = {}) {
        const startTime = Date.now();
        
        try {
            // Check buffer size
            if (this.buffer.length >= this.config.maxBufferSize) {
                this.metrics.bufferOverflows++;
                Logger.warn('Buffer overflow, forcing flush', { 
                    bufferSize: this.buffer.length,
                    maxSize: this.config.maxBufferSize 
                });
                await this.flush();
            }
            
            const item = {
                data,
                dataType,
                timestamp: Date.now(),
                options: { ...options },
                retries: 0
            };
            
            if (options.immediate || this.buffer.length === 0) {
                // Process immediately
                await this.processItem(item);
            } else {
                // Add to buffer
                this.buffer.push(item);
                
                // Auto-flush if buffer is getting full
                if (this.buffer.length >= this.config.maxBufferSize * 0.8) {
                    setImmediate(() => this.flush());
                }
            }
            
            this.metrics.processingTime += Date.now() - startTime;
            this.emit('processed', { dataType, processingTime: Date.now() - startTime });
            
        } catch (error) {
            this.metrics.failed++;
            Logger.error('Error processing data', { error: error.message, dataType });
            this.emit('error', error);
            throw error;
        }
    }
    
    /**
     * Process a single item
     */
    async processItem(item) {
        const { data, dataType, options } = item;
        
        try {
            // Get processor for this data type
            const processor = this.processors.get(dataType) || this.processors.get('default');
            
            if (processor) {
                // Process the data
                const result = await Promise.race([
                    processor(data, options),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Processing timeout')), 
                        this.config.processingTimeout)
                    )
                ]);
                
                // Emit result if needed
                if (result !== undefined) {
                    this.emit('result', { dataType, result });
                }
            }
            
            // Dispose of the data immediately
            await this.disposeItem(item);
            
            this.metrics.processed++;
            this.metrics.lastProcessed = Date.now();
            
        } catch (error) {
            // Retry logic
            if (item.retries < this.config.maxRetries) {
                item.retries++;
                Logger.warn(`Retrying item processing (${item.retries}/${this.config.maxRetries})`, {
                    dataType,
                    error: error.message
                });
                
                // Delay before retry
                await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
                return this.processItem(item);
            }
            
            this.metrics.failed++;
            Logger.error('Failed to process item after retries', {
                dataType,
                retries: item.retries,
                error: error.message
            });
            
            // Still try to dispose
            try {
                await this.disposeItem(item);
            } catch (disposeError) {
                Logger.error('Failed to dispose failed item', { error: disposeError.message });
            }
            
            throw error;
        }
    }
    
    /**
     * Dispose of processed data
     */
    async disposeItem(item) {
        const { data, dataType } = item;
        
        try {
            // Get disposer for this data type
            const disposer = this.disposers.get(dataType) || this.disposers.get('default');
            
            if (disposer) {
                await disposer(data);
            }
            
            // Clear references
            item.data = null;
            item.options = null;
            
            this.metrics.disposed++;
            
        } catch (error) {
            Logger.error('Error disposing data', { error: error.message, dataType });
            throw error;
        }
    }
    
    /**
     * Flush all buffered items
     */
    async flush() {
        if (this.processing || this.buffer.length === 0) {
            return;
        }
        
        this.processing = true;
        const itemsToProcess = [...this.buffer];
        this.buffer.length = 0; // Clear buffer immediately
        
        Logger.debug(`Flushing ${itemsToProcess.length} items`);
        
        try {
            // Process all items concurrently but with limited concurrency
            const batchSize = Math.min(10, itemsToProcess.length);
            
            for (let i = 0; i < itemsToProcess.length; i += batchSize) {
                const batch = itemsToProcess.slice(i, i + batchSize);
                await Promise.allSettled(
                    batch.map(item => this.processItem(item))
                );
            }
            
            this.emit('flushed', { itemCount: itemsToProcess.length });
            
        } catch (error) {
            Logger.error('Error during flush', { error: error.message });
            this.emit('error', error);
        } finally {
            this.processing = false;
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
        }
    }
    
    /**
     * Start auto-flush timer
     */
    startAutoFlush() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }
        
        this.flushTimer = setInterval(() => {
            if (this.buffer.length > 0) {
                this.flush().catch(error => {
                    Logger.error('Auto-flush error', { error: error.message });
                });
            }
        }, this.config.flushInterval);
    }
    
    /**
     * Stop auto-flush timer
     */
    stopAutoFlush() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
    }
    
    /**
     * Get processing metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            bufferSize: this.buffer.length,
            isProcessing: this.processing,
            averageProcessingTime: this.metrics.processed > 0 
                ? this.metrics.processingTime / this.metrics.processed 
                : 0
        };
    }
    
    /**
     * Reset metrics
     */
    resetMetrics() {
        this.metrics = {
            processed: 0,
            failed: 0,
            disposed: 0,
            bufferOverflows: 0,
            processingTime: 0,
            lastProcessed: null
        };
    }
    
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        if (this.config.autoFlush && !this.flushTimer) {
            this.startAutoFlush();
        } else if (!this.config.autoFlush && this.flushTimer) {
            this.stopAutoFlush();
        }
        
        Logger.info('ImmediateProcessor config updated', { config: this.config });
    }
    
    /**
     * Shutdown processor
     */
    async shutdown() {
        Logger.info('Shutting down ImmediateProcessor');
        
        this.stopAutoFlush();
        
        // Flush remaining items
        if (this.buffer.length > 0) {
            await this.flush();
        }
        
        // Clear all references
        this.processors.clear();
        this.disposers.clear();
        this.buffer.length = 0;
        
        this.emit('shutdown');
    }
}

module.exports = ImmediateProcessor;