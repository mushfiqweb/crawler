/**
 * Helper Utilities Module
 * Common utility functions used across the crawler application
 */

const crypto = require('crypto');
const { ORGANIC_BEHAVIOR } = require('../config/organic-behavior');

class Helpers {
    /**
     * Generate random delay within specified range
     */
    static async randomDelay(min = 1000, max = 3000) {
        const delay = Math.floor(Math.random() * (max - min + 1)) + min;
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    /**
     * Generate organic delay based on configuration
     */
    static async organicDelay() {
        const min = ORGANIC_BEHAVIOR.minDelay;
        const max = ORGANIC_BEHAVIOR.maxDelay;
        return this.randomDelay(min, max);
    }

    /**
     * Shuffle array using Fisher-Yates algorithm
     */
    static shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * Get random element from array
     */
    static getRandomElement(array) {
        if (!array || array.length === 0) return null;
        return array[Math.floor(Math.random() * array.length)];
    }

    /**
     * Get multiple random elements from array
     */
    static getRandomElements(array, count) {
        if (!array || array.length === 0) return [];
        const shuffled = this.shuffleArray(array);
        return shuffled.slice(0, Math.min(count, array.length));
    }

    /**
     * Generate random string
     */
    static generateRandomString(length = 10, charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') {
        let result = '';
        for (let i = 0; i < length; i++) {
            result += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return result;
    }

    /**
     * Generate unique identifier
     */
    static generateUniqueId() {
        return crypto.randomBytes(16).toString('hex');
    }

    /**
     * Format timestamp to readable string
     */
    static formatTimestamp(timestamp = Date.now()) {
        return new Date(timestamp).toLocaleString();
    }

    /**
     * Format duration in milliseconds to readable string
     */
    static formatDuration(ms) {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
        return `${(ms / 3600000).toFixed(1)}h`;
    }

    /**
     * Format bytes to human readable format
     */
    static formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Validate URL format
     */
    static isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    /**
     * Sanitize string for filename
     */
    static sanitizeFilename(filename) {
        return filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    }

    /**
     * Deep clone object
     */
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const cloned = {};
            Object.keys(obj).forEach(key => {
                cloned[key] = this.deepClone(obj[key]);
            });
            return cloned;
        }
    }

    /**
     * Merge objects deeply
     */
    static deepMerge(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    result[key] = this.deepMerge(result[key] || {}, source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }
        
        return result;
    }

    /**
     * Retry function with exponential backoff
     */
    static async retry(fn, options = {}) {
        const {
            maxAttempts = 3,
            baseDelay = 1000,
            maxDelay = 10000,
            backoffFactor = 2,
            jitter = true
        } = options;

        let lastError;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                
                if (attempt === maxAttempts) {
                    throw error;
                }
                
                // Calculate delay with exponential backoff
                let delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt - 1), maxDelay);
                
                // Add jitter to prevent thundering herd
                if (jitter) {
                    delay = delay * (0.5 + Math.random() * 0.5);
                }
                
                console.warn(`Attempt ${attempt} failed, retrying in ${Math.round(delay)}ms:`, error.message);
                await this.randomDelay(delay, delay);
            }
        }
        
        throw lastError;
    }

    /**
     * Throttle function execution
     */
    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Debounce function execution
     */
    static debounce(func, delay) {
        let timeoutId;
        return function() {
            const args = arguments;
            const context = this;
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(context, args), delay);
        };
    }

    /**
     * Create rate limiter
     */
    static createRateLimiter(maxRequests, timeWindow) {
        const requests = [];
        
        return async function() {
            const now = Date.now();
            
            // Remove old requests outside the time window
            while (requests.length > 0 && requests[0] <= now - timeWindow) {
                requests.shift();
            }
            
            // Check if we can make a new request
            if (requests.length >= maxRequests) {
                const oldestRequest = requests[0];
                const waitTime = timeWindow - (now - oldestRequest);
                await Helpers.randomDelay(waitTime, waitTime);
                return this();
            }
            
            // Record this request
            requests.push(now);
        };
    }

    /**
     * Chunk array into smaller arrays
     */
    static chunkArray(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }

    /**
     * Get random user agent
     */
    static getRandomUserAgent() {
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ];
        
        return this.getRandomElement(userAgents);
    }

    /**
     * Get random viewport size
     */
    static getRandomViewport() {
        const viewports = [
            { width: 1920, height: 1080 },
            { width: 1366, height: 768 },
            { width: 1440, height: 900 },
            { width: 1536, height: 864 },
            { width: 1280, height: 720 },
            { width: 1600, height: 900 }
        ];
        
        return this.getRandomElement(viewports);
    }

    /**
     * Simulate human typing with random delays
     */
    static async humanType(page, selector, text, options = {}) {
        const { minDelay = 50, maxDelay = 150, typoChance = 0.02 } = options;
        
        await page.focus(selector);
        await page.evaluate(selector => {
            document.querySelector(selector).value = '';
        }, selector);
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            
            // Simulate occasional typos
            if (Math.random() < typoChance && i > 0) {
                const wrongChar = String.fromCharCode(char.charCodeAt(0) + 1);
                await page.type(selector, wrongChar, { delay: this.randomBetween(minDelay, maxDelay) });
                await this.randomDelay(100, 300);
                await page.keyboard.press('Backspace');
                await this.randomDelay(50, 150);
            }
            
            await page.type(selector, char, { delay: this.randomBetween(minDelay, maxDelay) });
        }
    }

    /**
     * Get random number between min and max
     */
    static randomBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Simulate human mouse movement
     */
    static async humanMouseMove(page, targetX, targetY, options = {}) {
        const { steps = 10, minDelay = 10, maxDelay = 50 } = options;
        
        const currentPosition = await page.evaluate(() => ({
            x: window.mouseX || 0,
            y: window.mouseY || 0
        }));
        
        const startX = currentPosition.x;
        const startY = currentPosition.y;
        
        for (let i = 0; i <= steps; i++) {
            const progress = i / steps;
            const x = startX + (targetX - startX) * progress;
            const y = startY + (targetY - startY) * progress;
            
            // Add some randomness to make it more human-like
            const jitterX = (Math.random() - 0.5) * 5;
            const jitterY = (Math.random() - 0.5) * 5;
            
            await page.mouse.move(x + jitterX, y + jitterY);
            await this.randomDelay(minDelay, maxDelay);
        }
        
        // Update stored mouse position
        await page.evaluate((x, y) => {
            window.mouseX = x;
            window.mouseY = y;
        }, targetX, targetY);
    }

    /**
     * Check if string contains any of the specified keywords
     */
    static containsKeywords(text, keywords) {
        if (!text || !keywords || keywords.length === 0) return false;
        
        const lowerText = text.toLowerCase();
        return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
    }

    /**
     * Extract domain from URL
     */
    static extractDomain(url) {
        try {
            return new URL(url).hostname;
        } catch (error) {
            return null;
        }
    }

    /**
     * Calculate percentage
     */
    static calculatePercentage(value, total) {
        if (total === 0) return 0;
        return Math.round((value / total) * 100 * 100) / 100; // Round to 2 decimal places
    }

    /**
     * Format number with commas
     */
    static formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    /**
     * Get current memory usage
     */
    static getMemoryUsage() {
        const usage = process.memoryUsage();
        return {
            rss: this.formatBytes(usage.rss),
            heapTotal: this.formatBytes(usage.heapTotal),
            heapUsed: this.formatBytes(usage.heapUsed),
            external: this.formatBytes(usage.external),
            raw: usage
        };
    }

    /**
     * Create progress bar string
     */
    static createProgressBar(current, total, width = 20) {
        const percentage = Math.min(current / total, 1);
        const filled = Math.round(width * percentage);
        const empty = width - filled;
        
        const bar = '█'.repeat(filled) + '░'.repeat(empty);
        const percent = Math.round(percentage * 100);
        
        return `[${bar}] ${percent}% (${current}/${total})`;
    }

    /**
     * Validate email format
     */
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Generate hash of string
     */
    static generateHash(input, algorithm = 'sha256') {
        return crypto.createHash(algorithm).update(input).digest('hex');
    }

    /**
     * Safe JSON parse with fallback
     */
    static safeJsonParse(jsonString, fallback = null) {
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            return fallback;
        }
    }

    /**
     * Check if object is empty
     */
    static isEmpty(obj) {
        if (obj == null) return true;
        if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
        return Object.keys(obj).length === 0;
    }

    /**
     * Capitalize first letter of string
     */
    static capitalize(str) {
        if (!str) return str;
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    /**
     * Convert camelCase to snake_case
     */
    static camelToSnake(str) {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }

    /**
     * Convert snake_case to camelCase
     */
    static snakeToCamel(str) {
        return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
    }
}

module.exports = { Helpers };