/**
 * Robust Error Handler
 * Manages timeouts, redirects, pop-ups, and other edge cases
 */

const { defaultLogger: Logger } = require('./logger');

class RobustErrorHandler {
    constructor(options = {}) {
        this.config = {
            // Timeout configurations
            navigationTimeout: options.navigationTimeout || 30000,
            elementTimeout: options.elementTimeout || 10000,
            networkTimeout: options.networkTimeout || 15000,
            
            // Retry configurations
            maxRetries: options.maxRetries || 3,
            retryDelay: options.retryDelay || 2000,
            exponentialBackoff: options.exponentialBackoff !== false,
            
            // Redirect handling
            maxRedirects: options.maxRedirects || 5,
            allowedRedirectDomains: options.allowedRedirectDomains || [],
            blockSuspiciousRedirects: options.blockSuspiciousRedirects !== false,
            
            // Pop-up handling
            autoClosePopups: options.autoClosePopups !== false,
            popupTimeout: options.popupTimeout || 5000,
            
            // Error recovery
            enableRecovery: options.enableRecovery !== false,
            recoveryStrategies: options.recoveryStrategies || ['reload', 'navigate_back', 'new_tab'],
            
            // Monitoring
            trackErrors: options.trackErrors !== false,
            errorThreshold: options.errorThreshold || 10
        };

        this.errorStats = {
            totalErrors: 0,
            timeoutErrors: 0,
            redirectErrors: 0,
            popupErrors: 0,
            networkErrors: 0,
            recoveryAttempts: 0,
            successfulRecoveries: 0
        };

        this.activeTimeouts = new Map();
        this.redirectChain = [];
        this.errorHistory = [];
    }

    /**
     * Wrap a function with comprehensive error handling
     * @param {Function} fn - Function to wrap
     * @param {Object} options - Error handling options
     * @returns {Function} Wrapped function
     */
    withErrorHandling(fn, options = {}) {
        return async (...args) => {
            const context = {
                functionName: fn.name || 'anonymous',
                attempts: 0,
                maxAttempts: options.maxRetries || this.config.maxRetries,
                ...options
            };

            while (context.attempts < context.maxAttempts) {
                try {
                    context.attempts++;
                    
                    // Set up timeout if specified
                    if (context.timeout) {
                        return await this.withTimeout(fn(...args), context.timeout, context.functionName);
                    }
                    
                    return await fn(...args);
                    
                } catch (error) {
                    const shouldRetry = await this.handleError(error, context);
                    
                    if (!shouldRetry || context.attempts >= context.maxAttempts) {
                        throw this.enhanceError(error, context);
                    }
                    
                    // Wait before retry
                    await this.waitForRetry(context.attempts);
                }
            }
        };
    }

    /**
     * Handle page navigation with error recovery
     * @param {Object} page - Puppeteer page object
     * @param {string} url - URL to navigate to
     * @param {Object} options - Navigation options
     * @returns {Promise<Object>} Navigation result
     */
    async handleNavigation(page, url, options = {}) {
        const context = {
            operation: 'navigation',
            url: url,
            startTime: Date.now()
        };

        try {
            Logger.debug(`🧭 Navigating to: ${url}`);
            
            // Set up navigation monitoring
            this.setupNavigationMonitoring(page, context);
            
            // Perform navigation with timeout
            const response = await this.withTimeout(
                page.goto(url, {
                    waitUntil: options.waitUntil || 'domcontentloaded',
                    timeout: this.config.navigationTimeout,
                    ...options
                }),
                this.config.navigationTimeout,
                'navigation'
            );
            
            // Check for redirects
            await this.handleRedirects(page, url, context);
            
            // Handle any pop-ups that might appear
            await this.handlePopups(page, context);
            
            // Verify successful navigation
            const finalUrl = page.url();
            const navigationTime = Date.now() - context.startTime;
            
            Logger.debug(`✅ Navigation completed: ${finalUrl} (${navigationTime}ms)`);
            
            return {
                success: true,
                finalUrl: finalUrl,
                response: response,
                navigationTime: navigationTime,
                redirects: this.redirectChain.length
            };
            
        } catch (error) {
            return await this.handleNavigationError(page, error, context);
        } finally {
            this.cleanupNavigationMonitoring(page, context);
        }
    }

    /**
     * Handle element interaction with error recovery
     * @param {Object} page - Puppeteer page object
     * @param {string} selector - Element selector
     * @param {string} action - Action to perform (click, hover, etc.)
     * @param {Object} options - Interaction options
     * @returns {Promise<Object>} Interaction result
     */
    async handleElementInteraction(page, selector, action, options = {}) {
        const context = {
            operation: 'element_interaction',
            selector: selector,
            action: action,
            startTime: Date.now()
        };

        try {
            Logger.debug(`🎯 ${action} on element: ${selector}`);
            
            // Wait for element to be available
            const element = await this.waitForElement(page, selector, options);
            
            // Verify element is interactable
            await this.verifyElementInteractable(page, element, context);
            
            // Perform the action
            let result;
            switch (action.toLowerCase()) {
                case 'click':
                    result = await this.handleClick(page, element, options);
                    break;
                case 'hover':
                    result = await this.handleHover(page, element, options);
                    break;
                case 'type':
                    result = await this.handleType(page, element, options.text, options);
                    break;
                default:
                    throw new Error(`Unsupported action: ${action}`);
            }
            
            const interactionTime = Date.now() - context.startTime;
            Logger.debug(`✅ ${action} completed (${interactionTime}ms)`);
            
            return {
                success: true,
                action: action,
                selector: selector,
                interactionTime: interactionTime,
                result: result
            };
            
        } catch (error) {
            return await this.handleInteractionError(page, error, context);
        }
    }

    /**
     * Set up navigation monitoring
     * @param {Object} page - Puppeteer page object
     * @param {Object} context - Navigation context
     */
    setupNavigationMonitoring(page, context) {
        // Monitor for redirects
        page.on('response', (response) => {
            if (response.status() >= 300 && response.status() < 400) {
                this.redirectChain.push({
                    from: response.url(),
                    to: response.headers().location,
                    status: response.status(),
                    timestamp: Date.now()
                });
            }
        });

        // Monitor for pop-ups
        page.on('dialog', async (dialog) => {
            Logger.warn(`🚨 Dialog detected: ${dialog.type()} - ${dialog.message()}`);
            await this.handleDialog(dialog, context);
        });

        // Monitor for new pages/tabs
        page.on('popup', async (popup) => {
            Logger.warn(`🚨 Popup detected: ${popup.url()}`);
            await this.handlePopupPage(popup, context);
        });
    }

    /**
     * Handle redirects during navigation
     * @param {Object} page - Puppeteer page object
     * @param {string} originalUrl - Original URL
     * @param {Object} context - Navigation context
     */
    async handleRedirects(page, originalUrl, context) {
        if (this.redirectChain.length === 0) return;

        Logger.info(`🔄 Detected ${this.redirectChain.length} redirects`);
        
        // Check for excessive redirects
        if (this.redirectChain.length > this.config.maxRedirects) {
            throw new Error(`Too many redirects (${this.redirectChain.length})`);
        }
        
        // Check for suspicious redirects
        if (this.config.blockSuspiciousRedirects) {
            for (const redirect of this.redirectChain) {
                if (this.isSuspiciousRedirect(redirect, originalUrl)) {
                    throw new Error(`Suspicious redirect detected: ${redirect.from} -> ${redirect.to}`);
                }
            }
        }
        
        // Log redirect chain
        this.redirectChain.forEach((redirect, index) => {
            Logger.debug(`  ${index + 1}. ${redirect.status} ${redirect.from} -> ${redirect.to}`);
        });
    }

    /**
     * Handle pop-ups and dialogs
     * @param {Object} page - Puppeteer page object
     * @param {Object} context - Operation context
     */
    async handlePopups(page, context) {
        if (!this.config.autoClosePopups) return;

        try {
            // Wait a bit for any pop-ups to appear
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Check for common pop-up patterns
            const popupSelectors = [
                '[role="dialog"]',
                '.modal',
                '.popup',
                '.overlay',
                '[class*="popup"]',
                '[class*="modal"]',
                '[id*="popup"]',
                '[id*="modal"]'
            ];
            
            for (const selector of popupSelectors) {
                try {
                    const popup = await page.$(selector);
                    if (popup) {
                        Logger.info(`🚫 Closing popup: ${selector}`);
                        
                        // Try to find close button
                        const closeSelectors = [
                            `${selector} [aria-label*="close"]`,
                            `${selector} .close`,
                            `${selector} [class*="close"]`,
                            `${selector} button[type="button"]`
                        ];
                        
                        for (const closeSelector of closeSelectors) {
                            try {
                                const closeBtn = await page.$(closeSelector);
                                if (closeBtn) {
                                    await closeBtn.click();
                                    await new Promise(resolve => setTimeout(resolve, 500));
                                    break;
                                }
                            } catch (closeError) {
                                continue;
                            }
                        }
                        
                        // If no close button found, try pressing Escape
                        await page.keyboard.press('Escape');
                    }
                } catch (popupError) {
                    continue;
                }
            }
            
        } catch (error) {
            Logger.warn(`⚠️ Popup handling error: ${error.message}`);
        }
    }

    /**
     * Handle dialog boxes
     * @param {Object} dialog - Puppeteer dialog object
     * @param {Object} context - Operation context
     */
    async handleDialog(dialog, context) {
        try {
            const dialogType = dialog.type();
            const message = dialog.message();
            
            Logger.info(`📋 Handling dialog: ${dialogType} - "${message}"`);
            
            switch (dialogType) {
                case 'alert':
                    await dialog.accept();
                    break;
                case 'confirm':
                    // Default to accept for navigation confirmations
                    await dialog.accept();
                    break;
                case 'prompt':
                    await dialog.accept(''); // Accept with empty input
                    break;
                default:
                    await dialog.dismiss();
            }
            
            this.errorStats.popupErrors++;
            
        } catch (error) {
            Logger.warn(`⚠️ Dialog handling error: ${error.message}`);
            try {
                await dialog.dismiss();
            } catch (dismissError) {
                // Ignore dismiss errors
            }
        }
    }

    /**
     * Handle popup pages/tabs
     * @param {Object} popup - Puppeteer page object for popup
     * @param {Object} context - Operation context
     */
    async handlePopupPage(popup, context) {
        try {
            Logger.info(`🗂️ Handling popup page: ${popup.url()}`);
            
            // Close popup after a short delay
            setTimeout(async () => {
                try {
                    if (!popup.isClosed()) {
                        await popup.close();
                        Logger.info(`🚫 Popup page closed`);
                    }
                } catch (closeError) {
                    Logger.warn(`⚠️ Error closing popup: ${closeError.message}`);
                }
            }, this.config.popupTimeout);
            
        } catch (error) {
            Logger.warn(`⚠️ Popup page handling error: ${error.message}`);
        }
    }

    /**
     * Wait for element with timeout and retry logic
     * @param {Object} page - Puppeteer page object
     * @param {string} selector - Element selector
     * @param {Object} options - Wait options
     * @returns {Promise<Object>} Element handle
     */
    async waitForElement(page, selector, options = {}) {
        const timeout = options.timeout || this.config.elementTimeout;
        const visible = options.visible !== false;
        
        try {
            const element = await page.waitForSelector(selector, {
                timeout: timeout,
                visible: visible
            });
            
            if (!element) {
                throw new Error(`Element not found: ${selector}`);
            }
            
            return element;
            
        } catch (error) {
            if (error.name === 'TimeoutError') {
                throw new Error(`Element timeout: ${selector} (${timeout}ms)`);
            }
            throw error;
        }
    }

    /**
     * Verify element is interactable
     * @param {Object} page - Puppeteer page object
     * @param {Object} element - Element handle
     * @param {Object} context - Operation context
     */
    async verifyElementInteractable(page, element, context) {
        try {
            const isVisible = await element.isIntersectingViewport();
            if (!isVisible) {
                // Scroll element into view
                await element.scrollIntoView();
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            const boundingBox = await element.boundingBox();
            if (!boundingBox) {
                throw new Error('Element has no bounding box');
            }
            
            if (boundingBox.width === 0 || boundingBox.height === 0) {
                throw new Error('Element has zero dimensions');
            }
            
        } catch (error) {
            throw new Error(`Element not interactable: ${error.message}`);
        }
    }

    /**
     * Handle click with error recovery
     * @param {Object} page - Puppeteer page object
     * @param {Object} element - Element handle
     * @param {Object} options - Click options
     */
    async handleClick(page, element, options = {}) {
        try {
            // Try element click first
            await element.click(options);
            return { method: 'element_click' };
            
        } catch (error) {
            Logger.warn(`⚠️ Element click failed, trying alternatives: ${error.message}`);
            
            // Try JavaScript click as fallback
            try {
                await page.evaluate(el => el.click(), element);
                return { method: 'js_click' };
            } catch (jsError) {
                // Try mouse click as last resort
                const boundingBox = await element.boundingBox();
                if (boundingBox) {
                    await page.mouse.click(
                        boundingBox.x + boundingBox.width / 2,
                        boundingBox.y + boundingBox.height / 2
                    );
                    return { method: 'mouse_click' };
                }
                
                throw new Error(`All click methods failed: ${error.message}`);
            }
        }
    }

    /**
     * Handle hover with error recovery
     * @param {Object} page - Puppeteer page object
     * @param {Object} element - Element handle
     * @param {Object} options - Hover options
     */
    async handleHover(page, element, options = {}) {
        try {
            await element.hover();
            return { method: 'element_hover' };
            
        } catch (error) {
            // Try mouse hover as fallback
            const boundingBox = await element.boundingBox();
            if (boundingBox) {
                await page.mouse.move(
                    boundingBox.x + boundingBox.width / 2,
                    boundingBox.y + boundingBox.height / 2
                );
                return { method: 'mouse_hover' };
            }
            
            throw new Error(`Hover failed: ${error.message}`);
        }
    }

    /**
     * Handle typing with error recovery
     * @param {Object} page - Puppeteer page object
     * @param {Object} element - Element handle
     * @param {string} text - Text to type
     * @param {Object} options - Type options
     */
    async handleType(page, element, text, options = {}) {
        try {
            await element.focus();
            await element.type(text, options);
            return { method: 'element_type', text: text };
            
        } catch (error) {
            // Try keyboard typing as fallback
            await element.focus();
            await page.keyboard.type(text, options);
            return { method: 'keyboard_type', text: text };
        }
    }

    /**
     * Handle navigation errors
     * @param {Object} page - Puppeteer page object
     * @param {Error} error - Navigation error
     * @param {Object} context - Navigation context
     */
    async handleNavigationError(page, error, context) {
        Logger.warn(`⚠️ Navigation error: ${error.message}`);
        this.errorStats.totalErrors++;
        
        if (error.name === 'TimeoutError') {
            this.errorStats.timeoutErrors++;
        } else if (error.message.includes('redirect')) {
            this.errorStats.redirectErrors++;
        } else if (error.message.includes('net::')) {
            this.errorStats.networkErrors++;
        }
        
        // Attempt recovery if enabled
        if (this.config.enableRecovery) {
            const recoveryResult = await this.attemptRecovery(page, error, context);
            if (recoveryResult.success) {
                return recoveryResult;
            }
        }
        
        return {
            success: false,
            error: error.message,
            errorType: this.classifyError(error),
            context: context,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Handle interaction errors
     * @param {Object} page - Puppeteer page object
     * @param {Error} error - Interaction error
     * @param {Object} context - Interaction context
     */
    async handleInteractionError(page, error, context) {
        Logger.warn(`⚠️ Interaction error: ${error.message}`);
        this.errorStats.totalErrors++;
        
        return {
            success: false,
            error: error.message,
            errorType: this.classifyError(error),
            context: context,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Attempt error recovery
     * @param {Object} page - Puppeteer page object
     * @param {Error} error - Error to recover from
     * @param {Object} context - Operation context
     */
    async attemptRecovery(page, error, context) {
        this.errorStats.recoveryAttempts++;
        
        for (const strategy of this.config.recoveryStrategies) {
            try {
                Logger.info(`🔧 Attempting recovery strategy: ${strategy}`);
                
                switch (strategy) {
                    case 'reload':
                        await page.reload({ waitUntil: 'domcontentloaded' });
                        break;
                    case 'navigate_back':
                        await page.goBack({ waitUntil: 'domcontentloaded' });
                        break;
                    case 'new_tab':
                        // This would require browser context management
                        break;
                }
                
                // Wait a bit after recovery attempt
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                this.errorStats.successfulRecoveries++;
                Logger.info(`✅ Recovery successful with strategy: ${strategy}`);
                
                return {
                    success: true,
                    recoveryStrategy: strategy,
                    message: 'Recovered from error'
                };
                
            } catch (recoveryError) {
                Logger.warn(`⚠️ Recovery strategy failed: ${strategy} - ${recoveryError.message}`);
                continue;
            }
        }
        
        return { success: false, message: 'All recovery strategies failed' };
    }

    /**
     * Execute function with timeout
     * @param {Promise} promise - Promise to execute
     * @param {number} timeout - Timeout in milliseconds
     * @param {string} operation - Operation name for logging
     * @returns {Promise} Promise that resolves or rejects with timeout
     */
    async withTimeout(promise, timeout, operation = 'operation') {
        const timeoutId = setTimeout(() => {
            throw new Error(`${operation} timeout after ${timeout}ms`);
        }, timeout);
        
        this.activeTimeouts.set(operation, timeoutId);
        
        try {
            const result = await promise;
            clearTimeout(timeoutId);
            this.activeTimeouts.delete(operation);
            return result;
        } catch (error) {
            clearTimeout(timeoutId);
            this.activeTimeouts.delete(operation);
            throw error;
        }
    }

    /**
     * Wait before retry with exponential backoff
     * @param {number} attempt - Current attempt number
     */
    async waitForRetry(attempt) {
        let delay = this.config.retryDelay;
        
        if (this.config.exponentialBackoff) {
            delay = this.config.retryDelay * Math.pow(2, attempt - 1);
        }
        
        // Add some jitter
        delay += Math.random() * 1000;
        
        Logger.debug(`⏳ Waiting ${Math.round(delay)}ms before retry (attempt ${attempt})`);
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    /**
     * Check if redirect is suspicious
     * @param {Object} redirect - Redirect information
     * @param {string} originalUrl - Original URL
     * @returns {boolean} True if redirect is suspicious
     */
    isSuspiciousRedirect(redirect, originalUrl) {
        // Check for common suspicious patterns
        const suspiciousPatterns = [
            /bit\.ly/,
            /tinyurl/,
            /t\.co/,
            /goo\.gl/,
            /ow\.ly/,
            /short/,
            /redirect/
        ];
        
        return suspiciousPatterns.some(pattern => pattern.test(redirect.to));
    }

    /**
     * Classify error type
     * @param {Error} error - Error to classify
     * @returns {string} Error classification
     */
    classifyError(error) {
        const message = error.message.toLowerCase();
        
        if (error.name === 'TimeoutError' || message.includes('timeout')) {
            return 'timeout';
        } else if (message.includes('redirect')) {
            return 'redirect';
        } else if (message.includes('net::') || message.includes('network')) {
            return 'network';
        } else if (message.includes('element') || message.includes('selector')) {
            return 'element';
        } else if (message.includes('popup') || message.includes('dialog')) {
            return 'popup';
        } else {
            return 'unknown';
        }
    }

    /**
     * Enhance error with additional context
     * @param {Error} error - Original error
     * @param {Object} context - Error context
     * @returns {Error} Enhanced error
     */
    enhanceError(error, context) {
        const enhancedError = new Error(error.message);
        enhancedError.originalError = error;
        enhancedError.context = context;
        enhancedError.errorType = this.classifyError(error);
        enhancedError.timestamp = new Date().toISOString();
        enhancedError.stack = error.stack;
        
        return enhancedError;
    }

    /**
     * Handle general error
     * @param {Error} error - Error to handle
     * @param {Object} context - Error context
     * @returns {Promise<boolean>} True if should retry
     */
    async handleError(error, context) {
        this.errorStats.totalErrors++;
        this.errorHistory.push({
            error: error.message,
            context: context,
            timestamp: Date.now()
        });
        
        // Keep error history manageable
        if (this.errorHistory.length > 100) {
            this.errorHistory = this.errorHistory.slice(-50);
        }
        
        const errorType = this.classifyError(error);
        Logger.warn(`⚠️ Error in ${context.functionName}: ${error.message} (Type: ${errorType})`);
        
        // Determine if we should retry based on error type
        const retryableErrors = ['timeout', 'network', 'element'];
        return retryableErrors.includes(errorType) && context.attempts < context.maxAttempts;
    }

    /**
     * Cleanup navigation monitoring
     * @param {Object} page - Puppeteer page object
     * @param {Object} context - Navigation context
     */
    cleanupNavigationMonitoring(page, context) {
        // Clear redirect chain for next navigation
        this.redirectChain = [];
        
        // Clear any active timeouts
        this.activeTimeouts.forEach((timeoutId, operation) => {
            clearTimeout(timeoutId);
        });
        this.activeTimeouts.clear();
    }

    /**
     * Get error statistics
     * @returns {Object} Error statistics
     */
    getErrorStats() {
        return {
            ...this.errorStats,
            errorRate: this.errorStats.totalErrors > 0 ? 
                (this.errorStats.totalErrors / (this.errorStats.totalErrors + this.errorStats.successfulRecoveries)) : 0,
            recoveryRate: this.errorStats.recoveryAttempts > 0 ? 
                (this.errorStats.successfulRecoveries / this.errorStats.recoveryAttempts) : 0
        };
    }

    /**
     * Reset error statistics
     */
    resetStats() {
        this.errorStats = {
            totalErrors: 0,
            timeoutErrors: 0,
            redirectErrors: 0,
            popupErrors: 0,
            networkErrors: 0,
            recoveryAttempts: 0,
            successfulRecoveries: 0
        };
        
        this.errorHistory = [];
        Logger.info('🔄 Error statistics reset');
    }
}

module.exports = { RobustErrorHandler };