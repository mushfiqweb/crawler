/**
 * Advanced Behavioral Engine for KMS Marketplace
 * Implements sophisticated human-like browsing behavior with detailed logging
 */

const { HumanBehaviorSimulator } = require('../utils/human-behavior-simulator');
const { defaultLogger: Logger } = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');

class AdvancedBehavioralEngine {
    constructor(options = {}) {
        this.config = {
            // Page dwell time configuration (40-60 seconds as required)
            minDwellTime: options.minDwellTime || 40000, // 40 seconds
            maxDwellTime: options.maxDwellTime || 60000, // 60 seconds
            dwellVariation: options.dwellVariation || 0.15, // 15% variation
            
            // Click interaction configuration
            clicksPerPage: options.clicksPerPage || { min: 3, max: 8 },
            clickDistribution: options.clickDistribution || 'organic', // organic, uniform, focused
            avoidHeaderFooter: options.avoidHeaderFooter !== false,
            
            // Scrolling behavior configuration
            scrollPatterns: options.scrollPatterns || ['exploratory', 'reading', 'scanning'],
            scrollSpeed: options.scrollSpeed || { min: 100, max: 800 }, // pixels per second
            scrollPauses: options.scrollPauses || { min: 500, max: 3000 },
            
            // Behavioral realism
            attentionSpan: options.attentionSpan || { focused: 0.7, distracted: 0.3 },
            fatigueRate: options.fatigueRate || 0.02, // per minute
            curiosityLevel: options.curiosityLevel || 0.6,
            
            // Logging configuration
            logFormat: options.logFormat || 'json', // json, csv
            logPath: options.logPath || './src/logs',
            detailedLogging: options.detailedLogging !== false,
            
            // Target domain specific
            targetDomain: options.targetDomain || 'kmsmarketplace.com',
            domainFamiliarity: options.domainFamiliarity || 0.3 // 0-1 scale
        };

        this.behaviorSimulator = new HumanBehaviorSimulator({
            naturalMovement: true,
            readingSimulation: true,
            enableMicroPauses: true
        });

        this.sessionState = {
            sessionId: this.generateSessionId(),
            startTime: Date.now(),
            currentPage: null,
            totalInteractions: 0,
            currentFatigue: 0,
            attentionLevel: 1.0,
            behaviorPattern: this.selectBehaviorPattern(),
            interactionLog: []
        };

        this.analytics = {
            totalDwellTime: 0,
            totalClicks: 0,
            totalScrolls: 0,
            pagesVisited: 0,
            averageDwellTime: 0,
            clickHeatmap: new Map(),
            scrollPatterns: []
        };
    }

    /**
     * Execute comprehensive behavioral simulation on a page
     * @param {Object} page - Puppeteer page object
     * @param {string} url - Current page URL
     * @param {Object} context - Additional context about the page
     * @returns {Promise<Object>} Detailed interaction results
     */
    async simulatePageBehavior(page, url, context = {}) {
        try {
            const pageStartTime = Date.now();
            Logger.info(`🎭 Starting behavioral simulation on: ${url}`);
            
            // Initialize page session
            this.sessionState.currentPage = url;
            this.sessionState.totalInteractions = 0;
            
            // Calculate realistic dwell time for this session
            const dwellTime = this.calculateDwellTime();
            Logger.info(`⏱️ Planned dwell time: ${Math.round(dwellTime / 1000)}s`);
            
            // Log page entry
            await this.logInteraction('page_load', {
                url,
                timestamp: pageStartTime,
                plannedDwellTime: dwellTime,
                sessionId: this.sessionState.sessionId
            });

            // Phase 1: Initial page assessment (5-10% of dwell time)
            const assessmentTime = dwellTime * (0.05 + Math.random() * 0.05);
            await this.simulateInitialAssessment(page, assessmentTime);

            // Phase 2: Main interaction period (70-80% of dwell time)
            const mainInteractionTime = dwellTime * (0.7 + Math.random() * 0.1);
            await this.simulateMainInteractions(page, mainInteractionTime);

            // Phase 3: Final browsing/decision phase (10-20% of dwell time)
            const finalPhaseTime = dwellTime - assessmentTime - mainInteractionTime;
            await this.simulateFinalPhase(page, finalPhaseTime);

            // Calculate actual dwell time and log completion
            const actualDwellTime = Date.now() - pageStartTime;
            await this.logInteraction('page_exit', {
                url,
                timestamp: Date.now(),
                actualDwellTime,
                plannedDwellTime: dwellTime,
                totalInteractions: this.sessionState.totalInteractions
            });

            // Update analytics
            this.updateAnalytics(actualDwellTime);

            Logger.info(`✅ Behavioral simulation completed. Actual time: ${Math.round(actualDwellTime / 1000)}s`);
            
            return {
                success: true,
                dwellTime: actualDwellTime,
                interactions: this.sessionState.totalInteractions,
                behaviorPattern: this.sessionState.behaviorPattern,
                sessionId: this.sessionState.sessionId
            };

        } catch (error) {
            Logger.error(`❌ Behavioral simulation failed: ${error.message}`);
            await this.logInteraction('error', {
                url,
                error: error.message,
                timestamp: Date.now()
            });
            throw error;
        }
    }

    /**
     * Calculate realistic dwell time with natural variation
     * @returns {number} Dwell time in milliseconds
     */
    calculateDwellTime() {
        const baseTime = this.config.minDwellTime + 
            Math.random() * (this.config.maxDwellTime - this.config.minDwellTime);
        
        // Apply behavioral factors
        const fatigueMultiplier = 1 - (this.sessionState.currentFatigue * 0.3);
        const attentionMultiplier = 0.7 + (this.sessionState.attentionLevel * 0.3);
        const familiarityMultiplier = 1 - (this.config.domainFamiliarity * 0.2);
        
        const adjustedTime = baseTime * fatigueMultiplier * attentionMultiplier * familiarityMultiplier;
        
        // Add natural variation
        const variation = adjustedTime * this.config.dwellVariation * (Math.random() - 0.5) * 2;
        
        return Math.max(this.config.minDwellTime, Math.round(adjustedTime + variation));
    }

    /**
     * Simulate initial page assessment phase
     * @param {Object} page - Puppeteer page object
     * @param {number} duration - Duration for this phase
     */
    async simulateInitialAssessment(page, duration) {
        Logger.debug(`🔍 Initial assessment phase: ${Math.round(duration / 1000)}s`);
        
        const startTime = Date.now();
        
        // Quick scroll to get page overview
        await this.performQuickPageScan(page);
        
        // Brief pause to "read" page title and main content
        await this.behaviorSimulator.humanDelay(1500, 0.4);
        
        // Log assessment
        await this.logInteraction('initial_assessment', {
            duration: Date.now() - startTime,
            timestamp: Date.now()
        });
        
        // Wait for remaining assessment time
        const remainingTime = duration - (Date.now() - startTime);
        if (remainingTime > 0) {
            await this.behaviorSimulator.humanDelay(remainingTime, 0.2);
        }
    }

    /**
     * Simulate main interaction period with clicks and scrolling
     * @param {Object} page - Puppeteer page object
     * @param {number} duration - Duration for this phase
     */
    async simulateMainInteractions(page, duration) {
        Logger.debug(`🎯 Main interaction phase: ${Math.round(duration / 1000)}s`);
        
        const startTime = Date.now();
        const endTime = startTime + duration;
        
        // Calculate number of interactions for this phase
        const clickCount = this.calculateClickCount();
        const scrollCount = Math.floor(clickCount * 1.5); // More scrolls than clicks
        
        Logger.debug(`Planning ${clickCount} clicks and ${scrollCount} scroll actions`);
        
        let interactionIndex = 0;
        const totalInteractions = clickCount + scrollCount;
        
        while (Date.now() < endTime && interactionIndex < totalInteractions) {
            const remainingTime = endTime - Date.now();
            const remainingInteractions = totalInteractions - interactionIndex;
            
            if (remainingTime <= 0) break;
            
            // Decide on interaction type based on natural patterns
            const shouldClick = Math.random() < 0.4 && interactionIndex < clickCount;
            
            if (shouldClick) {
                await this.performRandomClick(page);
            } else {
                await this.performNaturalScroll(page);
            }
            
            interactionIndex++;
            
            // Natural pause between interactions
            const pauseTime = this.calculateInteractionPause(remainingTime, remainingInteractions);
            await this.behaviorSimulator.humanDelay(pauseTime, 0.3);
        }
        
        await this.logInteraction('main_interactions_complete', {
            duration: Date.now() - startTime,
            interactions: interactionIndex,
            timestamp: Date.now()
        });
    }

    /**
     * Simulate final browsing phase
     * @param {Object} page - Puppeteer page object
     * @param {number} duration - Duration for this phase
     */
    async simulateFinalPhase(page, duration) {
        Logger.debug(`🏁 Final phase: ${Math.round(duration / 1000)}s`);
        
        const startTime = Date.now();
        
        // Slower, more deliberate interactions
        await this.performDeliberateScrolling(page, duration * 0.6);
        
        // Final pause (reading/deciding)
        const finalPause = duration * 0.4;
        await this.behaviorSimulator.humanDelay(finalPause, 0.2);
        
        await this.logInteraction('final_phase_complete', {
            duration: Date.now() - startTime,
            timestamp: Date.now()
        });
    }

    /**
     * Perform quick page scan with natural scrolling
     * @param {Object} page - Puppeteer page object
     */
    async performQuickPageScan(page) {
        try {
            const viewportHeight = await page.evaluate(() => window.innerHeight);
            const pageHeight = await page.evaluate(() => document.body.scrollHeight);
            
            // Quick scroll to bottom and back up
            const scrollSteps = Math.min(5, Math.floor(pageHeight / viewportHeight));
            
            for (let i = 0; i < scrollSteps; i++) {
                const scrollY = (pageHeight / scrollSteps) * i;
                await page.evaluate((y) => window.scrollTo(0, y), scrollY);
                await this.behaviorSimulator.humanDelay(200, 0.5);
            }
            
            // Return to top
            await page.evaluate(() => window.scrollTo(0, 0));
            
            await this.logInteraction('page_scan', {
                scrollSteps,
                pageHeight,
                timestamp: Date.now()
            });
            
        } catch (error) {
            Logger.warn(`⚠️ Page scan failed: ${error.message}`);
        }
    }

    /**
     * Perform random click at natural viewport coordinates
     * @param {Object} page - Puppeteer page object
     */
    async performRandomClick(page) {
        try {
            const viewport = await page.viewport();
            const clickableElements = await this.findClickableElements(page);
            
            let clickX, clickY, targetElement = null;
            
            if (clickableElements.length > 0 && Math.random() < 0.7) {
                // Click on actual clickable element (70% chance)
                targetElement = clickableElements[Math.floor(Math.random() * clickableElements.length)];
                const boundingBox = await targetElement.boundingBox();
                
                if (boundingBox) {
                    clickX = boundingBox.x + boundingBox.width * (0.2 + Math.random() * 0.6);
                    clickY = boundingBox.y + boundingBox.height * (0.2 + Math.random() * 0.6);
                }
            }
            
            if (!clickX || !clickY) {
                // Random viewport click (30% chance or fallback)
                clickX = this.generateRandomX(viewport.width);
                clickY = this.generateRandomY(viewport.height);
            }
            
            // Ensure click is within viewport
            clickX = Math.max(10, Math.min(viewport.width - 10, clickX));
            clickY = Math.max(10, Math.min(viewport.height - 10, clickY));
            
            // Perform natural mouse movement and click
            await page.mouse.move(clickX, clickY);
            await this.behaviorSimulator.humanDelay(100, 0.5);
            await page.mouse.click(clickX, clickY);
            
            this.sessionState.totalInteractions++;
            
            await this.logInteraction('click', {
                x: Math.round(clickX),
                y: Math.round(clickY),
                hasTarget: !!targetElement,
                timestamp: Date.now()
            });
            
            // Update click heatmap
            const heatmapKey = `${Math.floor(clickX / 50)},${Math.floor(clickY / 50)}`;
            this.analytics.clickHeatmap.set(heatmapKey, 
                (this.analytics.clickHeatmap.get(heatmapKey) || 0) + 1);
            
            Logger.debug(`🖱️ Click at (${Math.round(clickX)}, ${Math.round(clickY)})`);
            
        } catch (error) {
            Logger.warn(`⚠️ Random click failed: ${error.message}`);
        }
    }

    /**
     * Find clickable elements on the page
     * @param {Object} page - Puppeteer page object
     * @returns {Array} Array of clickable elements
     */
    async findClickableElements(page) {
        try {
            return await page.$$('a, button, input[type="button"], input[type="submit"], [onclick], [role="button"]');
        } catch (error) {
            Logger.warn(`⚠️ Failed to find clickable elements: ${error.message}`);
            return [];
        }
    }

    /**
     * Generate random X coordinate with natural distribution
     * @param {number} width - Viewport width
     * @returns {number} X coordinate
     */
    generateRandomX(width) {
        if (this.config.clickDistribution === 'organic') {
            // Favor center-left area (reading pattern)
            const centerBias = 0.3 + Math.random() * 0.4; // 30-70% from left
            return width * centerBias;
        } else if (this.config.clickDistribution === 'focused') {
            // Focus on center area
            const centerBias = 0.4 + Math.random() * 0.2; // 40-60% from left
            return width * centerBias;
        } else {
            // Uniform distribution
            return Math.random() * width;
        }
    }

    /**
     * Generate random Y coordinate avoiding header/footer
     * @param {number} height - Viewport height
     * @returns {number} Y coordinate
     */
    generateRandomY(height) {
        if (this.config.avoidHeaderFooter) {
            // Avoid top 15% and bottom 10%
            const availableHeight = height * 0.75;
            const startY = height * 0.15;
            return startY + Math.random() * availableHeight;
        } else {
            return Math.random() * height;
        }
    }

    /**
     * Perform natural scrolling with variable patterns
     * @param {Object} page - Puppeteer page object
     */
    async performNaturalScroll(page) {
        try {
            const pattern = this.selectScrollPattern();
            const currentScrollY = await page.evaluate(() => window.pageYOffset);
            const pageHeight = await page.evaluate(() => document.body.scrollHeight);
            const viewportHeight = await page.evaluate(() => window.innerHeight);
            
            let targetScrollY;
            let scrollDistance;
            
            switch (pattern) {
                case 'exploratory':
                    // Large jumps to explore content
                    scrollDistance = viewportHeight * (0.5 + Math.random() * 1.0);
                    targetScrollY = Math.min(pageHeight - viewportHeight, 
                        currentScrollY + scrollDistance * (Math.random() < 0.3 ? -1 : 1));
                    break;
                    
                case 'reading':
                    // Small, consistent scrolls
                    scrollDistance = viewportHeight * (0.1 + Math.random() * 0.3);
                    targetScrollY = Math.min(pageHeight - viewportHeight, currentScrollY + scrollDistance);
                    break;
                    
                case 'scanning':
                    // Quick, varied scrolls
                    scrollDistance = viewportHeight * (0.2 + Math.random() * 0.8);
                    targetScrollY = Math.random() * (pageHeight - viewportHeight);
                    break;
                    
                default:
                    scrollDistance = viewportHeight * 0.5;
                    targetScrollY = currentScrollY + scrollDistance;
            }
            
            targetScrollY = Math.max(0, Math.min(pageHeight - viewportHeight, targetScrollY));
            
            // Perform smooth scroll
            await this.performSmoothScroll(page, currentScrollY, targetScrollY);
            
            this.sessionState.totalInteractions++;
            
            await this.logInteraction('scroll', {
                pattern,
                fromY: Math.round(currentScrollY),
                toY: Math.round(targetScrollY),
                distance: Math.round(Math.abs(targetScrollY - currentScrollY)),
                timestamp: Date.now()
            });
            
            this.analytics.scrollPatterns.push({
                pattern,
                distance: Math.abs(targetScrollY - currentScrollY),
                timestamp: Date.now()
            });
            
            Logger.debug(`📜 Scroll ${pattern}: ${Math.round(currentScrollY)} → ${Math.round(targetScrollY)}`);
            
        } catch (error) {
            Logger.warn(`⚠️ Natural scroll failed: ${error.message}`);
        }
    }

    /**
     * Perform smooth scrolling animation
     * @param {Object} page - Puppeteer page object
     * @param {number} fromY - Starting Y position
     * @param {number} toY - Target Y position
     */
    async performSmoothScroll(page, fromY, toY) {
        const distance = Math.abs(toY - fromY);
        const duration = Math.min(2000, Math.max(300, distance / 2)); // Adaptive duration
        const steps = Math.max(5, Math.floor(duration / 50));
        
        for (let i = 0; i <= steps; i++) {
            const progress = i / steps;
            const easeProgress = this.easeInOutQuad(progress);
            const currentY = fromY + (toY - fromY) * easeProgress;
            
            await page.evaluate((y) => window.scrollTo(0, y), currentY);
            await this.behaviorSimulator.humanDelay(duration / steps, 0.3);
        }
    }

    /**
     * Perform deliberate scrolling for final phase
     * @param {Object} page - Puppeteer page object
     * @param {number} duration - Duration for scrolling
     */
    async performDeliberateScrolling(page, duration) {
        const startTime = Date.now();
        const endTime = startTime + duration;
        
        while (Date.now() < endTime) {
            await this.performNaturalScroll(page);
            
            // Longer pauses between scrolls in final phase
            const pauseTime = 1000 + Math.random() * 2000;
            await this.behaviorSimulator.humanDelay(Math.min(pauseTime, endTime - Date.now()), 0.2);
        }
    }

    /**
     * Calculate number of clicks for current session
     * @returns {number} Number of clicks to perform
     */
    calculateClickCount() {
        const baseClicks = this.config.clicksPerPage.min + 
            Math.random() * (this.config.clicksPerPage.max - this.config.clicksPerPage.min);
        
        // Adjust based on attention level and fatigue
        const attentionMultiplier = 0.5 + this.sessionState.attentionLevel * 0.5;
        const fatigueMultiplier = 1 - this.sessionState.currentFatigue * 0.3;
        
        return Math.max(1, Math.round(baseClicks * attentionMultiplier * fatigueMultiplier));
    }

    /**
     * Calculate pause time between interactions
     * @param {number} remainingTime - Remaining time in phase
     * @param {number} remainingInteractions - Remaining interactions
     * @returns {number} Pause time in milliseconds
     */
    calculateInteractionPause(remainingTime, remainingInteractions) {
        if (remainingInteractions <= 0) return remainingTime;
        
        const averagePause = remainingTime / remainingInteractions;
        const variation = averagePause * 0.5;
        
        return Math.max(200, averagePause + (Math.random() - 0.5) * variation);
    }

    /**
     * Select scroll pattern based on current behavior
     * @returns {string} Scroll pattern name
     */
    selectScrollPattern() {
        const patterns = this.config.scrollPatterns;
        const weights = {
            exploratory: 0.4,
            reading: 0.4,
            scanning: 0.2
        };
        
        // Adjust weights based on session state
        if (this.sessionState.currentFatigue > 0.5) {
            weights.reading += 0.2;
            weights.exploratory -= 0.1;
            weights.scanning -= 0.1;
        }
        
        const random = Math.random();
        let cumulative = 0;
        
        for (const [pattern, weight] of Object.entries(weights)) {
            cumulative += weight;
            if (random <= cumulative && patterns.includes(pattern)) {
                return pattern;
            }
        }
        
        return patterns[0];
    }

    /**
     * Select behavior pattern for session
     * @returns {string} Behavior pattern name
     */
    selectBehaviorPattern() {
        const patterns = ['focused', 'exploratory', 'casual', 'task-oriented'];
        return patterns[Math.floor(Math.random() * patterns.length)];
    }

    /**
     * Easing function for smooth animations
     * @param {number} t - Progress (0-1)
     * @returns {number} Eased progress
     */
    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    /**
     * Log interaction with detailed metadata
     * @param {string} type - Interaction type
     * @param {Object} data - Interaction data
     */
    async logInteraction(type, data) {
        const logEntry = {
            sessionId: this.sessionState.sessionId,
            type,
            timestamp: data.timestamp || Date.now(),
            sessionTime: Date.now() - this.sessionState.startTime,
            behaviorPattern: this.sessionState.behaviorPattern,
            attentionLevel: this.sessionState.attentionLevel,
            fatigue: this.sessionState.currentFatigue,
            ...data
        };
        
        this.sessionState.interactionLog.push(logEntry);
        
        if (this.config.detailedLogging) {
            Logger.debug(`📝 ${type}: ${JSON.stringify(data, null, 2)}`);
        }
        
        // Write to file periodically
        if (this.sessionState.interactionLog.length % 10 === 0) {
            await this.flushLogs();
        }
    }

    /**
     * Flush interaction logs to file
     */
    async flushLogs() {
        try {
            const logDir = path.resolve(this.config.logPath);
            await fs.mkdir(logDir, { recursive: true });
            
            const filename = `behavioral_log_${this.sessionState.sessionId}.${this.config.logFormat}`;
            const filepath = path.join(logDir, filename);
            
            let content;
            if (this.config.logFormat === 'json') {
                content = JSON.stringify(this.sessionState.interactionLog, null, 2);
            } else {
                // CSV format
                const headers = Object.keys(this.sessionState.interactionLog[0] || {});
                const csvRows = [headers.join(',')];
                
                for (const entry of this.sessionState.interactionLog) {
                    const row = headers.map(header => 
                        JSON.stringify(entry[header] || '')).join(',');
                    csvRows.push(row);
                }
                
                content = csvRows.join('\n');
            }
            
            await fs.writeFile(filepath, content, 'utf8');
            Logger.debug(`💾 Logs flushed to: ${filename}`);
            
        } catch (error) {
            Logger.warn(`⚠️ Failed to flush logs: ${error.message}`);
        }
    }

    /**
     * Update analytics with session data
     * @param {number} dwellTime - Actual dwell time
     */
    updateAnalytics(dwellTime) {
        this.analytics.totalDwellTime += dwellTime;
        this.analytics.totalClicks += this.sessionState.totalInteractions;
        this.analytics.pagesVisited++;
        this.analytics.averageDwellTime = this.analytics.totalDwellTime / this.analytics.pagesVisited;
        
        // Update session state
        this.sessionState.currentFatigue = Math.min(1, 
            this.sessionState.currentFatigue + this.config.fatigueRate);
        this.sessionState.attentionLevel = Math.max(0.3, 
            this.sessionState.attentionLevel - (this.config.fatigueRate * 0.5));
    }

    /**
     * Generate random click coordinates for testing
     * @returns {Object} Coordinates object with x and y
     */
    generateRandomClickCoordinates() {
        const width = 1280; // Standard viewport width
        const height = 720; // Standard viewport height
        
        return {
            x: this.generateRandomX(width),
            y: this.generateRandomY(height)
        };
    }

    /**
     * Generate scroll pattern for testing
     * @returns {Object} Scroll pattern object
     */
    generateScrollPattern() {
        const patterns = ['smooth', 'burst', 'deliberate'];
        const selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];
        
        const actions = [];
        const actionCount = Math.floor(Math.random() * 5) + 3; // 3-7 actions
        
        for (let i = 0; i < actionCount; i++) {
            const actionTypes = ['scroll', 'pause'];
            const actionType = actionTypes[Math.floor(Math.random() * actionTypes.length)];
            
            if (actionType === 'scroll') {
                actions.push({
                    type: 'scroll',
                    direction: Math.random() > 0.5 ? 'down' : 'up',
                    distance: Math.floor(Math.random() * 500) + 100,
                    speed: Math.floor(Math.random() * 1000) + 500,
                    duration: Math.floor(Math.random() * 2000) + 500
                });
            } else {
                actions.push({
                    type: 'pause',
                    duration: Math.floor(Math.random() * 2000) + 500
                });
            }
        }
        
        return {
            pattern: selectedPattern,
            actions: actions,
            totalDuration: actions.reduce((sum, action) => sum + (action.duration || 0), 0)
        };
    }

    /**
     * Generate human-like delay for timing patterns
     * @returns {number} Delay in milliseconds
     */
    generateHumanLikeDelay() {
        // Generate delays between 500ms to 5000ms with human-like distribution
        const baseDelay = 1000; // 1 second base
        const variation = Math.random() * 4000; // Up to 4 seconds variation
        const humanFactor = Math.random() * 0.5 + 0.75; // 0.75 to 1.25 multiplier
        
        return Math.floor((baseDelay + variation) * humanFactor);
    }

    /**
     * Generate unique session ID
     * @returns {string} Session ID
     */
    generateSessionId() {
        return `behavioral_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get comprehensive analytics summary
     * @returns {Object} Analytics data
     */
    getAnalytics() {
        return {
            session: {
                sessionId: this.sessionState.sessionId,
                startTime: this.sessionState.startTime,
                duration: Date.now() - this.sessionState.startTime,
                behaviorPattern: this.sessionState.behaviorPattern,
                totalInteractions: this.sessionState.totalInteractions
            },
            performance: {
                ...this.analytics,
                clickHeatmap: Object.fromEntries(this.analytics.clickHeatmap),
                scrollPatterns: this.analytics.scrollPatterns.slice(-10) // Last 10 patterns
            },
            config: this.config
        };
    }

    /**
     * Reset session for new page/domain
     */
    resetSession() {
        this.sessionState = {
            sessionId: this.generateSessionId(),
            startTime: Date.now(),
            currentPage: null,
            totalInteractions: 0,
            currentFatigue: 0,
            attentionLevel: 1.0,
            behaviorPattern: this.selectBehaviorPattern(),
            interactionLog: []
        };
    }

    /**
     * Save final session logs
     */
    async finalizeLogs() {
        await this.flushLogs();
        
        // Save analytics summary
        try {
            const analyticsPath = path.join(this.config.logPath, 
                `analytics_${this.sessionState.sessionId}.json`);
            await fs.writeFile(analyticsPath, 
                JSON.stringify(this.getAnalytics(), null, 2), 'utf8');
            Logger.info(`📊 Analytics saved to: analytics_${this.sessionState.sessionId}.json`);
        } catch (error) {
            Logger.warn(`⚠️ Failed to save analytics: ${error.message}`);
        }
    }
}

module.exports = { AdvancedBehavioralEngine };