/**
 * Human Behavior Simulator
 * Implements realistic human interaction patterns for web automation
 */

const { defaultLogger: Logger } = require('./logger');

class HumanBehaviorSimulator {
    constructor(options = {}) {
        this.config = {
            // Timing configurations
            minReadTime: options.minReadTime || 2000,
            maxReadTime: options.maxReadTime || 8000,
            minHoverTime: options.minHoverTime || 500,
            maxHoverTime: options.maxHoverTime || 2000,
            minScrollPause: options.minScrollPause || 300,
            maxScrollPause: options.maxScrollPause || 1500,
            
            // Mouse movement configurations
            mouseSpeed: options.mouseSpeed || 'medium', // slow, medium, fast
            naturalMovement: options.naturalMovement !== false,
            
            // Interaction patterns
            hoverBeforeClick: options.hoverBeforeClick !== false,
            randomScrolling: options.randomScrolling !== false,
            readingSimulation: options.readingSimulation !== false,
            
            // Behavioral variations
            impatienceLevel: options.impatienceLevel || 0.3, // 0-1 scale
            focusLevel: options.focusLevel || 0.7, // 0-1 scale
            
            // Advanced patterns
            enableMicroPauses: options.enableMicroPauses !== false,
            enableTypingPatterns: options.enableTypingPatterns !== false
        };

        this.sessionState = {
            totalInteractions: 0,
            currentFocus: 1.0,
            fatigue: 0.0,
            lastInteractionTime: Date.now()
        };
    }

    /**
     * Simulate human-like delay with natural variation
     * @param {number} baseDelay - Base delay in milliseconds
     * @param {number} variation - Variation factor (0-1)
     * @returns {Promise} Resolves after delay
     */
    async humanDelay(baseDelay, variation = 0.3) {
        const variationAmount = baseDelay * variation;
        const randomVariation = (Math.random() - 0.5) * 2 * variationAmount;
        const finalDelay = Math.max(100, baseDelay + randomVariation);
        
        // Apply fatigue factor
        const fatigueMultiplier = 1 + (this.sessionState.fatigue * 0.5);
        const adjustedDelay = finalDelay * fatigueMultiplier;
        
        Logger.debug(`⏱️ Human delay: ${Math.round(adjustedDelay)}ms`);
        return new Promise(resolve => setTimeout(resolve, adjustedDelay));
    }

    /**
     * Simulate natural mouse movement to element
     * @param {Object} page - Puppeteer page object
     * @param {string} selector - CSS selector for target element
     * @param {Object} options - Movement options
     * @returns {Promise} Resolves when movement complete
     */
    async moveMouseToElement(page, selector, options = {}) {
        try {
            const element = await page.$(selector);
            if (!element) {
                throw new Error(`Element not found: ${selector}`);
            }

            const boundingBox = await element.boundingBox();
            if (!boundingBox) {
                throw new Error(`Element not visible: ${selector}`);
            }

            // Calculate target position with some randomness
            const targetX = boundingBox.x + boundingBox.width * (0.3 + Math.random() * 0.4);
            const targetY = boundingBox.y + boundingBox.height * (0.3 + Math.random() * 0.4);

            if (this.config.naturalMovement) {
                await this.naturalMouseMovement(page, targetX, targetY, options);
            } else {
                await page.mouse.move(targetX, targetY);
            }

            return { x: targetX, y: targetY };
        } catch (error) {
            Logger.warn(`⚠️ Mouse movement failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Simulate natural mouse movement with curves and pauses
     * @param {Object} page - Puppeteer page object
     * @param {number} targetX - Target X coordinate
     * @param {number} targetY - Target Y coordinate
     * @param {Object} options - Movement options
     */
    async naturalMouseMovement(page, targetX, targetY, options = {}) {
        const steps = options.steps || this.calculateMovementSteps(targetX, targetY);
        const currentPosition = await page.evaluate(() => ({ x: 0, y: 0 })); // Get current mouse position if available
        
        const startX = currentPosition.x || Math.random() * 100;
        const startY = currentPosition.y || Math.random() * 100;
        
        for (let i = 0; i <= steps; i++) {
            const progress = i / steps;
            
            // Use easing function for natural acceleration/deceleration
            const easedProgress = this.easeInOutCubic(progress);
            
            // Add some randomness to the path
            const randomOffsetX = (Math.random() - 0.5) * 10 * (1 - progress);
            const randomOffsetY = (Math.random() - 0.5) * 10 * (1 - progress);
            
            const currentX = startX + (targetX - startX) * easedProgress + randomOffsetX;
            const currentY = startY + (targetY - startY) * easedProgress + randomOffsetY;
            
            await page.mouse.move(currentX, currentY);
            
            // Add micro-pauses during movement
            if (this.config.enableMicroPauses && i < steps) {
                await this.humanDelay(10, 0.5);
            }
        }
    }

    /**
     * Calculate number of movement steps based on distance
     * @param {number} targetX - Target X coordinate
     * @param {number} targetY - Target Y coordinate
     * @returns {number} Number of movement steps
     */
    calculateMovementSteps(targetX, targetY) {
        const distance = Math.sqrt(targetX * targetX + targetY * targetY);
        const baseSteps = Math.max(5, Math.min(20, Math.floor(distance / 50)));
        
        // Adjust based on mouse speed setting
        const speedMultiplier = {
            slow: 1.5,
            medium: 1.0,
            fast: 0.7
        }[this.config.mouseSpeed] || 1.0;
        
        return Math.floor(baseSteps * speedMultiplier);
    }

    /**
     * Easing function for natural movement
     * @param {number} t - Progress (0-1)
     * @returns {number} Eased progress
     */
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    /**
     * Simulate hover behavior before clicking
     * @param {Object} page - Puppeteer page object
     * @param {string} selector - CSS selector for target element
     * @param {Object} options - Hover options
     */
    async simulateHover(page, selector, options = {}) {
        try {
            Logger.debug(`🖱️ Simulating hover on: ${selector}`);
            
            // Move mouse to element
            await this.moveMouseToElement(page, selector, options);
            
            // Hover for a natural duration
            const hoverDuration = this.randomBetween(
                this.config.minHoverTime,
                this.config.maxHoverTime
            );
            
            await this.humanDelay(hoverDuration, 0.2);
            
            // Simulate reading/scanning behavior
            if (this.config.readingSimulation) {
                await this.simulateReading(page, selector);
            }
            
        } catch (error) {
            Logger.warn(`⚠️ Hover simulation failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Simulate reading behavior on an element
     * @param {Object} page - Puppeteer page object
     * @param {string} selector - CSS selector for target element
     */
    async simulateReading(page, selector) {
        try {
            const textLength = await page.evaluate((sel) => {
                const element = document.querySelector(sel);
                return element ? element.textContent.length : 0;
            }, selector);
            
            // Calculate reading time based on text length (average 200 WPM)
            const wordsEstimate = textLength / 5; // Rough estimate
            const readingTime = Math.max(500, (wordsEstimate / 200) * 60 * 1000);
            
            // Apply focus level and fatigue
            const adjustedReadingTime = readingTime * this.sessionState.currentFocus;
            
            Logger.debug(`📖 Simulating reading: ${Math.round(adjustedReadingTime)}ms`);
            await this.humanDelay(adjustedReadingTime, 0.4);
            
        } catch (error) {
            Logger.debug(`Reading simulation skipped: ${error.message}`);
        }
    }

    /**
     * Simulate human-like clicking with natural patterns
     * @param {Object} page - Puppeteer page object
     * @param {string} selector - CSS selector for target element
     * @param {Object} options - Click options
     */
    async simulateClick(page, selector, options = {}) {
        try {
            Logger.debug(`🖱️ Simulating click on: ${selector}`);
            
            // Pre-click hover if enabled
            if (this.config.hoverBeforeClick) {
                await this.simulateHover(page, selector, options);
            } else {
                await this.moveMouseToElement(page, selector, options);
            }
            
            // Pre-click pause
            await this.humanDelay(this.randomBetween(100, 300), 0.3);
            
            // Perform the click
            const element = await page.$(selector);
            if (!element) {
                throw new Error(`Element not found for clicking: ${selector}`);
            }
            
            // Simulate mouse down/up with realistic timing
            await page.mouse.down();
            await this.humanDelay(this.randomBetween(50, 150), 0.2);
            await page.mouse.up();
            
            // Post-click pause
            await this.humanDelay(this.randomBetween(200, 500), 0.3);
            
            // Update session state
            this.updateSessionState();
            
            Logger.debug(`✅ Click completed on: ${selector}`);
            
        } catch (error) {
            Logger.warn(`⚠️ Click simulation failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Simulate scrolling behavior
     * @param {Object} page - Puppeteer page object
     * @param {Object} options - Scroll options
     */
    async simulateScrolling(page, options = {}) {
        if (!this.config.randomScrolling) return;
        
        try {
            const {
                direction = 'down',
                distance = this.randomBetween(200, 800),
                steps = this.randomBetween(3, 8)
            } = options;
            
            Logger.debug(`📜 Simulating scroll: ${direction}, ${distance}px`);
            
            const stepDistance = distance / steps;
            
            for (let i = 0; i < steps; i++) {
                await page.mouse.wheel({ deltaY: direction === 'down' ? stepDistance : -stepDistance });
                await this.humanDelay(this.randomBetween(
                    this.config.minScrollPause,
                    this.config.maxScrollPause
                ), 0.3);
            }
            
        } catch (error) {
            Logger.warn(`⚠️ Scroll simulation failed: ${error.message}`);
        }
    }

    /**
     * Simulate page scanning behavior
     * @param {Object} page - Puppeteer page object
     * @param {Array} elements - Array of element selectors to scan
     */
    async simulatePageScanning(page, elements = []) {
        try {
            Logger.debug(`👀 Simulating page scanning behavior`);
            
            // Initial page load pause
            await this.humanDelay(this.randomBetween(1000, 2500), 0.3);
            
            // Random scrolling to get page overview
            if (Math.random() < 0.7) {
                await this.simulateScrolling(page, { distance: this.randomBetween(300, 600) });
            }
            
            // Scan through provided elements
            for (const selector of elements.slice(0, 3)) { // Limit scanning
                try {
                    await this.moveMouseToElement(page, selector);
                    await this.humanDelay(this.randomBetween(300, 800), 0.4);
                } catch (error) {
                    // Skip if element not found
                    continue;
                }
            }
            
            // Final pause before interaction
            await this.humanDelay(this.randomBetween(500, 1500), 0.3);
            
        } catch (error) {
            Logger.warn(`⚠️ Page scanning failed: ${error.message}`);
        }
    }

    /**
     * Update session state based on interactions
     */
    updateSessionState() {
        this.sessionState.totalInteractions++;
        this.sessionState.lastInteractionTime = Date.now();
        
        // Gradually increase fatigue
        this.sessionState.fatigue = Math.min(1.0, this.sessionState.fatigue + 0.02);
        
        // Decrease focus slightly with each interaction
        this.sessionState.currentFocus = Math.max(0.3, this.sessionState.currentFocus - 0.01);
        
        // Random focus recovery
        if (Math.random() < 0.1) {
            this.sessionState.currentFocus = Math.min(1.0, this.sessionState.currentFocus + 0.1);
        }
    }

    /**
     * Generate random number between min and max
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random number
     */
    randomBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Get current session statistics
     * @returns {Object} Session statistics
     */
    getSessionStats() {
        return {
            ...this.sessionState,
            sessionDuration: Date.now() - this.sessionState.lastInteractionTime,
            averageInteractionTime: this.sessionState.totalInteractions > 0 ? 
                (Date.now() - this.sessionState.lastInteractionTime) / this.sessionState.totalInteractions : 0
        };
    }

    /**
     * Reset session state
     */
    resetSession() {
        this.sessionState = {
            totalInteractions: 0,
            currentFocus: 1.0,
            fatigue: 0.0,
            lastInteractionTime: Date.now()
        };
        Logger.debug('🔄 Session state reset');
    }

    /**
     * Configure behavior parameters
     * @param {Object} newConfig - New configuration options
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        Logger.debug('⚙️ Behavior configuration updated');
    }
}

module.exports = { HumanBehaviorSimulator };