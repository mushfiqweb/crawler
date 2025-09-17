/**
 * Logger Utility Module
 * Provides structured logging with different levels and formatting
 */

const fs = require('fs').promises;
const path = require('path');

class Logger {
    constructor(options = {}) {
        this.logLevel = options.logLevel || 'info';
        this.logToFile = options.logToFile || false;
        this.logFilePath = options.logFilePath || path.join(__dirname, '..', 'logs', 'crawler.log');
        this.maxLogSize = options.maxLogSize || 10 * 1024 * 1024; // 10MB
        this.maxLogFiles = options.maxLogFiles || 5;
        
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3,
            trace: 4
        };
        
        this.colors = {
            error: '\x1b[31m', // Red
            warn: '\x1b[33m',  // Yellow
            info: '\x1b[36m',  // Cyan
            debug: '\x1b[35m', // Magenta
            trace: '\x1b[37m', // White
            reset: '\x1b[0m'
        };
        
        this.emojis = {
            error: '❌',
            warn: '⚠️',
            info: 'ℹ️',
            debug: '🐛',
            trace: '🔍'
        };
        
        // Ensure log directory exists
        if (this.logToFile) {
            this.ensureLogDirectory();
        }
    }

    /**
     * Ensure log directory exists
     */
    async ensureLogDirectory() {
        try {
            const logDir = path.dirname(this.logFilePath);
            await fs.mkdir(logDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create log directory:', error.message);
        }
    }

    /**
     * Check if log level should be logged
     */
    shouldLog(level) {
        return this.levels[level] <= this.levels[this.logLevel];
    }

    /**
     * Format log message
     */
    formatMessage(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const emoji = this.emojis[level] || '';
        const color = this.colors[level] || '';
        const reset = this.colors.reset;
        
        // Console format (with colors and emojis)
        const consoleMessage = `${color}${emoji} [${timestamp}] [${level.toUpperCase()}]${reset} ${message}`;
        
        // File format (plain text)
        const fileMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        
        // Add metadata if present
        if (Object.keys(meta).length > 0) {
            const metaString = JSON.stringify(meta, null, 2);
            return {
                console: `${consoleMessage}\n${metaString}`,
                file: `${fileMessage} ${JSON.stringify(meta)}`
            };
        }
        
        return {
            console: consoleMessage,
            file: fileMessage
        };
    }

    /**
     * Write log to file
     */
    async writeToFile(message) {
        if (!this.logToFile) return;
        
        try {
            // Check file size and rotate if necessary
            await this.rotateLogIfNeeded();
            
            // Append to log file
            await fs.appendFile(this.logFilePath, message + '\n');
        } catch (error) {
            console.error('Failed to write to log file:', error.message);
        }
    }

    /**
     * Rotate log file if it exceeds max size
     */
    async rotateLogIfNeeded() {
        try {
            const stats = await fs.stat(this.logFilePath);
            
            if (stats.size >= this.maxLogSize) {
                await this.rotateLogFiles();
            }
        } catch (error) {
            // File doesn't exist yet, no need to rotate
        }
    }

    /**
     * Rotate log files
     */
    async rotateLogFiles() {
        try {
            const logDir = path.dirname(this.logFilePath);
            const logName = path.basename(this.logFilePath, '.log');
            const logExt = '.log';
            
            // Remove oldest log file
            const oldestLog = path.join(logDir, `${logName}.${this.maxLogFiles}${logExt}`);
            try {
                await fs.unlink(oldestLog);
            } catch (error) {
                // File doesn't exist, ignore
            }
            
            // Rotate existing log files
            for (let i = this.maxLogFiles - 1; i >= 1; i--) {
                const currentLog = path.join(logDir, `${logName}.${i}${logExt}`);
                const nextLog = path.join(logDir, `${logName}.${i + 1}${logExt}`);
                
                try {
                    await fs.rename(currentLog, nextLog);
                } catch (error) {
                    // File doesn't exist, ignore
                }
            }
            
            // Move current log to .1
            const firstRotatedLog = path.join(logDir, `${logName}.1${logExt}`);
            await fs.rename(this.logFilePath, firstRotatedLog);
            
        } catch (error) {
            console.error('Failed to rotate log files:', error.message);
        }
    }

    /**
     * Log message with specified level
     */
    async log(level, message, meta = {}) {
        if (!this.shouldLog(level)) return;
        
        const formatted = this.formatMessage(level, message, meta);
        
        // Output to console
        console.log(formatted.console);
        
        // Write to file if enabled
        await this.writeToFile(formatted.file);
    }

    /**
     * Error level logging
     */
    async error(message, meta = {}) {
        await this.log('error', message, meta);
    }

    /**
     * Warning level logging
     */
    async warn(message, meta = {}) {
        await this.log('warn', message, meta);
    }

    /**
     * Info level logging
     */
    async info(message, meta = {}) {
        await this.log('info', message, meta);
    }

    /**
     * Debug level logging
     */
    async debug(message, meta = {}) {
        await this.log('debug', message, meta);
    }

    /**
     * Trace level logging
     */
    async trace(message, meta = {}) {
        await this.log('trace', message, meta);
    }

    /**
     * Log search operation
     */
    async logSearch(keyword, platform, success, duration, meta = {}) {
        const message = `Search: "${keyword}" on ${platform} - ${success ? 'SUCCESS' : 'FAILED'} (${duration}ms)`;
        const logMeta = {
            keyword,
            platform,
            success,
            duration,
            ...meta
        };
        
        if (success) {
            await this.info(message, logMeta);
        } else {
            await this.warn(message, logMeta);
        }
    }

    /**
     * Log performance metrics
     */
    async logPerformance(operation, metrics) {
        const message = `Performance: ${operation}`;
        await this.info(message, metrics);
    }

    /**
     * Log memory usage
     */
    async logMemory(usage) {
        const message = `Memory Usage: ${usage.heapUsed} / ${usage.heapTotal}`;
        await this.debug(message, usage);
    }

    /**
     * Log browser pool status
     */
    async logBrowserPool(stats) {
        const message = `Browser Pool: ${stats.available} available, ${stats.busy} busy, ${stats.total} total`;
        await this.debug(message, stats);
    }

    /**
     * Create a child logger with additional context
     */
    child(context = {}) {
        const childLogger = Object.create(this);
        childLogger.context = { ...this.context, ...context };
        
        // Override log method to include context
        const originalLog = this.log.bind(this);
        childLogger.log = async function(level, message, meta = {}) {
            const mergedMeta = { ...this.context, ...meta };
            return originalLog(level, message, mergedMeta);
        };
        
        return childLogger;
    }

    /**
     * Set log level
     */
    setLevel(level) {
        if (this.levels.hasOwnProperty(level)) {
            this.logLevel = level;
        } else {
            throw new Error(`Invalid log level: ${level}`);
        }
    }

    /**
     * Get current log level
     */
    getLevel() {
        return this.logLevel;
    }

    /**
     * Enable file logging
     */
    enableFileLogging(filePath) {
        this.logToFile = true;
        if (filePath) {
            this.logFilePath = filePath;
        }
        this.ensureLogDirectory();
    }

    /**
     * Disable file logging
     */
    disableFileLogging() {
        this.logToFile = false;
    }

    /**
     * Get log statistics
     */
    async getLogStats() {
        if (!this.logToFile) {
            return { fileLogging: false };
        }
        
        try {
            const stats = await fs.stat(this.logFilePath);
            const logDir = path.dirname(this.logFilePath);
            const files = await fs.readdir(logDir);
            const logFiles = files.filter(file => file.includes(path.basename(this.logFilePath, '.log')));
            
            return {
                fileLogging: true,
                currentLogSize: stats.size,
                currentLogSizeFormatted: this.formatBytes(stats.size),
                maxLogSize: this.maxLogSize,
                maxLogSizeFormatted: this.formatBytes(this.maxLogSize),
                logFiles: logFiles.length,
                maxLogFiles: this.maxLogFiles,
                logDirectory: logDir
            };
        } catch (error) {
            return {
                fileLogging: true,
                error: error.message
            };
        }
    }

    /**
     * Format bytes to human readable format
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Clear all log files
     */
    async clearLogs() {
        if (!this.logToFile) return;
        
        try {
            const logDir = path.dirname(this.logFilePath);
            const files = await fs.readdir(logDir);
            const logFiles = files.filter(file => file.includes(path.basename(this.logFilePath, '.log')));
            
            for (const file of logFiles) {
                await fs.unlink(path.join(logDir, file));
            }
            
            await this.info('Log files cleared');
        } catch (error) {
            console.error('Failed to clear log files:', error.message);
        }
    }
}

// Create default logger instance
const defaultLogger = new Logger({
    logLevel: 'info',
    logToFile: true
});

module.exports = { Logger, defaultLogger };