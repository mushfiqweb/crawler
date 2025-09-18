/**
 * User Engagement Simulator
 * Simulates realistic user interactions to avoid detection of automated behavior
 */

const { defaultLogger: Logger } = require('../utils/logger');

class UserEngagementSimulator {
    constructor() {
        this.engagementPatterns = {
            reading: { duration: [2000, 8000], scrollProbability: 0.8, clickProbability: 0.3 },
            scanning: { duration: [1000, 3000], scrollProbability: 0.9, clickProbability: 0.6 },
            focused: { duration: [5000, 15000], scrollProbability: 0.7, clickProbability: 0.4 },
            casual: { duration: [1500, 4000], scrollProbability: 0.6, clickProbability: 0.5 }
        };
        
        this.mousePatterns = {
            natural: { speed: [100, 300], curvature: [0.1, 0.3], pauses: [50, 200] },
            hesitant: { speed: [50, 150], curvature: [0.2, 0.5], pauses: [100, 500] },
            confident: { speed: [200, 500], curvature: [0.05, 0.2], pauses: [20, 100] }
        };
        
        this.scrollPatterns = {
            reader: { speed: [100, 300], direction: 'down', pauseProbability: 0.3 },
            scanner: { speed: [300, 600], direction: 'mixed', pauseProbability: 0.1 },
            researcher: { speed: [150, 400], direction: 'mixed', pauseProbability: 0.4 }
        };
        
        this.currentEngagementMode = 'casual';
        this.interactionHistory = [];
        this.pageMetrics = {
            timeOnPage: 0,
            scrollDepth: 0,
            clickCount: 0,
            mouseMovements: 0,
            focusEvents: 0
        };
    }

    /**
     * Simulate realistic page engagement
     */
    async simulatePageEngagement(page, searchResults = []) {
        Logger.info('🎯 Starting user engagement simulation...');
        
        try {
            // Initialize page metrics
            await this.initializePageMetrics(page);
            
            // Simulate initial page load behavior
            await this.simulatePageLoadBehavior(page);
            
            // Simulate reading/scanning behavior
            await this.simulateReadingBehavior(page);
            
            // Simulate search result interactions
            if (searchResults.length > 0) {
                await this.simulateSearchResultInteractions(page, searchResults);
            }
            
            // Simulate scrolling behavior
            await this.simulateScrollingBehavior(page);
            
            // Simulate mouse movements
            await this.simulateMouseMovements(page);
            
            // Simulate focus/blur events
            await this.simulateFocusEvents(page);
            
            // Record final metrics
            await this.recordFinalMetrics(page);
            
            Logger.info(`✅ Engagement simulation completed: ${this.pageMetrics.timeOnPage}ms on page`);
            
        } catch (error) {
            Logger.error(`❌ Engagement simulation error: ${error.message}`);
        }
    }

    /**
     * Initialize page metrics and tracking
     */
    async initializePageMetrics(page) {
        this.pageMetrics = {
            timeOnPage: 0,
            scrollDepth: 0,
            clickCount: 0,
            mouseMovements: 0,
            focusEvents: 0,
            startTime: Date.now()
        };

        // Inject tracking scripts
        await page.evaluate(() => {
            window.engagementTracker = {
                scrollDepth: 0,
                maxScrollDepth: 0,
                clickCount: 0,
                mouseMovements: 0,
                focusEvents: 0
            };

            // Track scroll depth
            window.addEventListener('scroll', () => {
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const windowHeight = window.innerHeight;
                const documentHeight = document.documentElement.scrollHeight;
                const scrollDepth = (scrollTop + windowHeight) / documentHeight;
                
                window.engagementTracker.scrollDepth = scrollDepth;
                window.engagementTracker.maxScrollDepth = Math.max(
                    window.engagementTracker.maxScrollDepth, 
                    scrollDepth
                );
            });

            // Track mouse movements
            let mouseMoveCount = 0;
            window.addEventListener('mousemove', () => {
                mouseMoveCount++;
                if (mouseMoveCount % 10 === 0) { // Sample every 10th movement
                    window.engagementTracker.mouseMovements++;
                }
            });

            // Track clicks
            window.addEventListener('click', () => {
                window.engagementTracker.clickCount++;
            });

            // Track focus events
            window.addEventListener('focus', () => {
                window.engagementTracker.focusEvents++;
            });
        });
    }

    /**
     * Simulate initial page load behavior
     */
    async simulatePageLoadBehavior(page) {
        // Wait for page to stabilize
        await this.randomDelay(500, 1500);
        
        // Simulate initial viewport assessment
        await this.simulateViewportScan(page);
        
        // Simulate reading page title and meta information
        await this.simulateInitialReading(page);
    }

    /**
     * Simulate viewport scanning behavior
     */
    async simulateViewportScan(page) {
        const viewport = await page.viewport();
        const scanPoints = this.generateScanPoints(viewport);
        
        for (const point of scanPoints) {
            await this.moveMouseNaturally(page, point.x, point.y);
            await this.randomDelay(100, 300);
        }
    }

    /**
     * Generate natural scan points for viewport
     */
    generateScanPoints(viewport) {
        const points = [];
        const { width, height } = viewport;
        
        // F-pattern scanning (common reading pattern)
        points.push(
            { x: width * 0.1, y: height * 0.2 },  // Top left
            { x: width * 0.8, y: height * 0.2 },  // Top right
            { x: width * 0.1, y: height * 0.4 },  // Mid left
            { x: width * 0.6, y: height * 0.4 },  // Mid center
            { x: width * 0.1, y: height * 0.7 },  // Bottom left
            { x: width * 0.4, y: height * 0.7 }   // Bottom center
        );
        
        return points;
    }

    /**
     * Simulate initial reading behavior
     */
    async simulateInitialReading(page) {
        try {
            // Look for and read page title
            const titleElement = await page.$('h1, .title, [role="heading"]');
            if (titleElement) {
                await this.simulateElementReading(page, titleElement, 1000, 3000);
            }
            
            // Look for and scan meta description or summary
            const metaElements = await page.$$('meta[name="description"], .summary, .description');
            for (const element of metaElements.slice(0, 2)) {
                await this.simulateElementReading(page, element, 500, 1500);
            }
            
        } catch (error) {
            Logger.warn(`⚠️ Initial reading simulation error: ${error.message}`);
        }
    }

    /**
     * Simulate reading behavior on page
     */
    async simulateReadingBehavior(page) {
        const pattern = this.engagementPatterns[this.currentEngagementMode];
        const readingDuration = this.randomBetween(pattern.duration[0], pattern.duration[1]);
        
        Logger.info(`📖 Simulating reading behavior for ${readingDuration}ms`);
        
        try {
            // Find readable content
            const contentElements = await page.$$('p, .content, article, .description, .summary');
            
            if (contentElements.length > 0) {
                const elementsToRead = contentElements.slice(0, Math.min(5, contentElements.length));
                const timePerElement = readingDuration / elementsToRead.length;
                
                for (const element of elementsToRead) {
                    await this.simulateElementReading(page, element, timePerElement * 0.5, timePerElement * 1.5);
                }
            } else {
                // Fallback: simulate general page reading
                await this.randomDelay(readingDuration * 0.8, readingDuration * 1.2);
            }
            
        } catch (error) {
            Logger.warn(`⚠️ Reading behavior simulation error: ${error.message}`);
            await this.randomDelay(readingDuration * 0.8, readingDuration * 1.2);
        }
    }

    /**
     * Simulate reading a specific element
     */
    async simulateElementReading(page, element, minTime, maxTime) {
        try {
            // Scroll element into view if needed
            await element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await this.randomDelay(200, 500);
            
            // Move mouse near the element
            const boundingBox = await element.boundingBox();
            if (boundingBox) {
                const targetX = boundingBox.x + boundingBox.width * 0.3;
                const targetY = boundingBox.y + boundingBox.height * 0.5;
                await this.moveMouseNaturally(page, targetX, targetY);
            }
            
            // Simulate reading time
            const readingTime = this.randomBetween(minTime, maxTime);
            await this.randomDelay(readingTime * 0.9, readingTime * 1.1);
            
        } catch (error) {
            Logger.warn(`⚠️ Element reading error: ${error.message}`);
        }
    }

    /**
     * Simulate search result interactions
     */
    async simulateSearchResultInteractions(page, searchResults) {
        Logger.info('🔍 Simulating search result interactions...');
        
        try {
            // Find search result elements
            const resultSelectors = [
                '.search-result', '.result', '[data-result]', '.listing',
                'a[href*="http"]', '.link', '.item'
            ];
            
            let resultElements = [];
            for (const selector of resultSelectors) {
                const elements = await page.$$(selector);
                if (elements.length > 0) {
                    resultElements = elements;
                    break;
                }
            }
            
            if (resultElements.length === 0) {
                Logger.warn('⚠️ No search result elements found');
                return;
            }
            
            // Interact with a subset of results
            const interactionCount = Math.min(
                resultElements.length,
                this.randomBetween(2, Math.min(6, resultElements.length))
            );
            
            const selectedResults = this.shuffleArray([...resultElements]).slice(0, interactionCount);
            
            for (let i = 0; i < selectedResults.length; i++) {
                await this.simulateResultInteraction(page, selectedResults[i], i);
                
                // Add delay between interactions
                if (i < selectedResults.length - 1) {
                    await this.randomDelay(800, 2000);
                }
            }
            
        } catch (error) {
            Logger.warn(`⚠️ Search result interaction error: ${error.message}`);
        }
    }

    /**
     * Simulate interaction with a single search result
     */
    async simulateResultInteraction(page, resultElement, index) {
        try {
            // Scroll result into view
            await resultElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await this.randomDelay(300, 700);
            
            // Move mouse to result
            const boundingBox = await resultElement.boundingBox();
            if (boundingBox) {
                const targetX = boundingBox.x + this.randomBetween(10, boundingBox.width - 10);
                const targetY = boundingBox.y + this.randomBetween(5, boundingBox.height - 5);
                await this.moveMouseNaturally(page, targetX, targetY);
            }
            
            // Simulate hover and reading
            await resultElement.hover();
            await this.randomDelay(500, 1500);
            
            // Decide whether to click (based on position and randomness)
            const clickProbability = this.engagementPatterns[this.currentEngagementMode].clickProbability;
            const positionBonus = index < 3 ? 0.2 : 0; // Higher chance for top results
            
            if (Math.random() < clickProbability + positionBonus) {
                await this.simulateResultClick(page, resultElement);
            }
            
        } catch (error) {
            Logger.warn(`⚠️ Result interaction error: ${error.message}`);
        }
    }

    /**
     * Simulate clicking on a search result
     */
    async simulateResultClick(page, resultElement) {
        try {
            Logger.info('👆 Simulating result click...');
            
            // Add slight delay before click (human hesitation)
            await this.randomDelay(200, 600);
            
            // Perform the click
            await resultElement.click();
            this.pageMetrics.clickCount++;
            
            // Wait for potential page navigation or popup
            await this.randomDelay(1000, 2000);
            
            // If new tab/window opened, close it after brief interaction
            const pages = await page.browser().pages();
            if (pages.length > 1) {
                const newPage = pages[pages.length - 1];
                await this.randomDelay(2000, 5000); // Brief interaction with new page
                await newPage.close();
            }
            
        } catch (error) {
            Logger.warn(`⚠️ Result click error: ${error.message}`);
        }
    }

    /**
     * Simulate scrolling behavior
     */
    async simulateScrollingBehavior(page) {
        const pattern = this.scrollPatterns[this.getScrollPattern()];
        const shouldScroll = Math.random() < this.engagementPatterns[this.currentEngagementMode].scrollProbability;
        
        if (!shouldScroll) return;
        
        Logger.info('📜 Simulating scrolling behavior...');
        
        try {
            const scrollCount = this.randomBetween(3, 8);
            
            for (let i = 0; i < scrollCount; i++) {
                const scrollDirection = this.getScrollDirection(pattern.direction);
                const scrollAmount = this.randomBetween(100, 400);
                
                await page.evaluate((direction, amount) => {
                    const scrollY = direction === 'up' ? -amount : amount;
                    window.scrollBy(0, scrollY);
                }, scrollDirection, scrollAmount);
                
                // Pause during scrolling (reading behavior)
                if (Math.random() < pattern.pauseProbability) {
                    await this.randomDelay(1000, 3000);
                }
                
                await this.randomDelay(300, 800);
            }
            
        } catch (error) {
            Logger.warn(`⚠️ Scrolling simulation error: ${error.message}`);
        }
    }

    /**
     * Get scroll pattern based on engagement mode
     */
    getScrollPattern() {
        const patterns = {
            reading: 'reader',
            scanning: 'scanner',
            focused: 'researcher',
            casual: 'scanner'
        };
        
        return patterns[this.currentEngagementMode] || 'reader';
    }

    /**
     * Get scroll direction
     */
    getScrollDirection(directionType) {
        if (directionType === 'down') return 'down';
        if (directionType === 'up') return 'up';
        
        // Mixed direction
        return Math.random() > 0.7 ? 'up' : 'down';
    }

    /**
     * Simulate natural mouse movements
     */
    async simulateMouseMovements(page) {
        Logger.info('🖱️ Simulating mouse movements...');
        
        try {
            const movementCount = this.randomBetween(5, 15);
            const viewport = await page.viewport();
            
            for (let i = 0; i < movementCount; i++) {
                const targetX = this.randomBetween(50, viewport.width - 50);
                const targetY = this.randomBetween(50, viewport.height - 50);
                
                await this.moveMouseNaturally(page, targetX, targetY);
                await this.randomDelay(200, 800);
                
                this.pageMetrics.mouseMovements++;
            }
            
        } catch (error) {
            Logger.warn(`⚠️ Mouse movement simulation error: ${error.message}`);
        }
    }

    /**
     * Move mouse in a natural, human-like way
     */
    async moveMouseNaturally(page, targetX, targetY) {
        try {
            const currentPosition = await page.evaluate(() => ({
                x: window.mouseX || window.innerWidth / 2,
                y: window.mouseY || window.innerHeight / 2
            }));
            
            const steps = this.calculateMouseSteps(currentPosition, { x: targetX, y: targetY });
            
            for (const step of steps) {
                await page.mouse.move(step.x, step.y);
                await this.randomDelay(10, 30);
            }
            
            // Update mouse position tracking
            await page.evaluate((x, y) => {
                window.mouseX = x;
                window.mouseY = y;
            }, targetX, targetY);
            
        } catch (error) {
            Logger.warn(`⚠️ Natural mouse movement error: ${error.message}`);
        }
    }

    /**
     * Calculate natural mouse movement steps
     */
    calculateMouseSteps(start, end) {
        const distance = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
        const steps = Math.max(5, Math.min(20, Math.floor(distance / 10)));
        
        const stepPoints = [];
        
        for (let i = 0; i <= steps; i++) {
            const progress = i / steps;
            
            // Add some curvature for natural movement
            const curvature = Math.sin(progress * Math.PI) * this.randomBetween(-20, 20);
            
            const x = start.x + (end.x - start.x) * progress + curvature;
            const y = start.y + (end.y - start.y) * progress;
            
            stepPoints.push({ x, y });
        }
        
        return stepPoints;
    }

    /**
     * Simulate focus events
     */
    async simulateFocusEvents(page) {
        try {
            // Simulate occasional focus/blur events (user switching tabs/windows)
            if (Math.random() < 0.3) {
                Logger.info('👁️ Simulating focus events...');
                
                await page.evaluate(() => {
                    window.dispatchEvent(new Event('blur'));
                });
                
                await this.randomDelay(1000, 5000);
                
                await page.evaluate(() => {
                    window.dispatchEvent(new Event('focus'));
                });
                
                this.pageMetrics.focusEvents++;
            }
            
        } catch (error) {
            Logger.warn(`⚠️ Focus event simulation error: ${error.message}`);
        }
    }

    /**
     * Record final metrics
     */
    async recordFinalMetrics(page) {
        try {
            const metrics = await page.evaluate(() => window.engagementTracker);
            
            this.pageMetrics = {
                ...this.pageMetrics,
                ...metrics,
                timeOnPage: Date.now() - this.pageMetrics.startTime
            };
            
            this.interactionHistory.push({
                timestamp: Date.now(),
                metrics: { ...this.pageMetrics },
                engagementMode: this.currentEngagementMode
            });
            
            // Keep only last 50 interactions
            if (this.interactionHistory.length > 50) {
                this.interactionHistory.shift();
            }
            
        } catch (error) {
            Logger.warn(`⚠️ Metrics recording error: ${error.message}`);
        }
    }

    /**
     * Utility functions
     */
    randomBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    async randomDelay(min, max) {
        const delay = this.randomBetween(min, max);
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * Set engagement mode
     */
    setEngagementMode(mode) {
        if (this.engagementPatterns[mode]) {
            this.currentEngagementMode = mode;
            Logger.info(`🎭 Engagement mode set to: ${mode}`);
        }
    }

    /**
     * Get engagement statistics
     */
    getEngagementStats() {
        return {
            currentMode: this.currentEngagementMode,
            totalInteractions: this.interactionHistory.length,
            averageTimeOnPage: this.interactionHistory.length > 0 ?
                this.interactionHistory.reduce((sum, interaction) => sum + interaction.metrics.timeOnPage, 0) / this.interactionHistory.length : 0,
            averageScrollDepth: this.interactionHistory.length > 0 ?
                this.interactionHistory.reduce((sum, interaction) => sum + interaction.metrics.maxScrollDepth, 0) / this.interactionHistory.length : 0,
            totalClicks: this.interactionHistory.reduce((sum, interaction) => sum + interaction.metrics.clickCount, 0),
            totalMouseMovements: this.interactionHistory.reduce((sum, interaction) => sum + interaction.metrics.mouseMovements, 0)
        };
    }
}

module.exports = { UserEngagementSimulator };