/**
 * Advanced Behavior Simulator
 * Implements sophisticated human-like behavior patterns and timing to avoid detection
 */

const { ORGANIC_BEHAVIOR_CONFIG } = require('../config/organic-behavior');
const { defaultLogger: Logger } = require('../utils/logger');

class AdvancedBehaviorSimulator {
    constructor() {
        this.config = ORGANIC_BEHAVIOR_CONFIG;
        this.sessionState = {
            startTime: Date.now(),
            totalSearches: 0,
            consecutiveSearches: 0,
            lastSearchTime: null,
            lastPauseTime: null,
            currentBehaviorMode: 'normal',
            behaviorHistory: [],
            platformSwitchCount: 0,
            dailySearchCount: 0,
            hourlySearchCount: 0
        };
        
        // Advanced timing patterns
        this.timingPatterns = {
            circadian: this.initializeCircadianPattern(),
            weekly: this.initializeWeeklyPattern(),
            seasonal: this.initializeSeasonalPattern(),
            personalHabits: this.initializePersonalHabits()
        };
        
        // Behavioral states
        this.behaviorStates = {
            focused: { intensity: 1.5, duration: [5, 15], searchInterval: [2000, 5000] },
            casual: { intensity: 1.0, duration: [10, 30], searchInterval: [5000, 12000] },
            distracted: { intensity: 0.7, duration: [3, 8], searchInterval: [8000, 20000] },
            research: { intensity: 1.2, duration: [15, 45], searchInterval: [3000, 8000] }
        };
        
        this.currentBehaviorState = 'casual';
        this.stateChangeTime = Date.now();
        
        // Detection avoidance metrics
        this.detectionMetrics = {
            timingVariability: 0,
            patternComplexity: 0,
            humanLikeness: 0,
            lastCalculation: Date.now()
        };
    }

    /**
     * Calculate next search delay with advanced human-like patterns
     */
    async calculateNextDelay() {
        const baseDelay = this.calculateBaseDelay();
        const circadianModifier = this.getCircadianModifier();
        const behaviorModifier = this.getBehaviorStateModifier();
        const contextualModifier = this.getContextualModifier();
        const antiDetectionJitter = this.getAntiDetectionJitter();
        
        let finalDelay = baseDelay * circadianModifier * behaviorModifier * contextualModifier + antiDetectionJitter;
        
        // Apply special patterns
        finalDelay = await this.applySpecialPatterns(finalDelay);
        
        // Ensure minimum and maximum bounds
        finalDelay = Math.max(this.config.minDelay, Math.min(finalDelay, this.config.maxDelay * 3));
        
        // Update session state
        this.updateSessionState(finalDelay);
        
        Logger.info(`⏱️ Next search delay: ${Math.round(finalDelay)}ms (${this.currentBehaviorState} mode)`);
        return Math.round(finalDelay);
    }

    /**
     * Calculate base delay using multiple factors
     */
    calculateBaseDelay() {
        const { min, max, average } = this.config.intervalRange;
        
        // Use normal distribution around average with some randomness
        const normalizedRandom = this.generateNormalRandom(0.5, 0.15);
        const clampedRandom = Math.max(0, Math.min(1, normalizedRandom));
        
        return min + (max - min) * clampedRandom;
    }

    /**
     * Get circadian rhythm modifier based on time of day
     */
    getCircadianModifier() {
        const hour = new Date().getHours();
        const pattern = this.timingPatterns.circadian;
        
        // Peak activity hours: 9-11 AM, 2-4 PM, 7-9 PM
        if ((hour >= 9 && hour <= 11) || (hour >= 14 && hour <= 16) || (hour >= 19 && hour <= 21)) {
            return pattern.peakActivity; // Faster searches
        } else if (hour >= 22 || hour <= 6) {
            return pattern.lowActivity; // Slower searches
        } else {
            return pattern.normalActivity;
        }
    }

    /**
     * Get behavior state modifier
     */
    getBehaviorStateModifier() {
        const state = this.behaviorStates[this.currentBehaviorState];
        
        // Check if it's time to change behavior state
        const stateAge = Date.now() - this.stateChangeTime;
        const maxStateDuration = state.duration[1] * 60 * 1000; // Convert to milliseconds
        
        if (stateAge > maxStateDuration || Math.random() < 0.1) {
            this.changeBehaviorState();
        }
        
        return 1 / state.intensity; // Higher intensity = shorter delays
    }

    /**
     * Get contextual modifier based on recent activity
     */
    getContextualModifier() {
        let modifier = 1.0;
        
        // Fatigue factor - longer sessions lead to slower searches
        const sessionDuration = Date.now() - this.sessionState.startTime;
        const fatigueHours = sessionDuration / (1000 * 60 * 60);
        if (fatigueHours > 1) {
            modifier *= 1 + (fatigueHours - 1) * 0.2; // 20% slower per hour after first hour
        }
        
        // Consecutive search penalty
        if (this.sessionState.consecutiveSearches > 10) {
            modifier *= 1 + (this.sessionState.consecutiveSearches - 10) * 0.05;
        }
        
        // Recent pause recovery
        if (this.sessionState.lastPauseTime) {
            const timeSincePause = Date.now() - this.sessionState.lastPauseTime;
            if (timeSincePause < 60000) { // Within 1 minute of pause
                modifier *= 0.8; // 20% faster after pause
            }
        }
        
        return modifier;
    }

    /**
     * Get anti-detection jitter
     */
    getAntiDetectionJitter() {
        if (!this.config.antiDetection.enableJitter) return 0;
        
        const { min, max } = this.config.antiDetection.jitterRange;
        return Math.random() * (max - min) + min;
    }

    /**
     * Apply special behavioral patterns
     */
    async applySpecialPatterns(baseDelay) {
        let delay = baseDelay;
        
        // Random pauses
        if (this.shouldTakeRandomPause()) {
            delay = await this.executeRandomPause();
        }
        
        // Burst patterns
        else if (this.shouldEnterBurstMode()) {
            delay = await this.executeBurstPattern();
        }
        
        // Idle periods
        else if (this.shouldEnterIdlePeriod()) {
            delay = await this.executeIdlePeriod();
        }
        
        // Micro-breaks (new pattern)
        else if (this.shouldTakeMicroBreak()) {
            delay = await this.executeMicroBreak();
        }
        
        return delay;
    }

    /**
     * Check if should take random pause
     */
    shouldTakeRandomPause() {
        return this.config.humanPatterns.enableRandomPauses && 
               Math.random() < this.config.humanPatterns.pauseProbability;
    }

    /**
     * Execute random pause
     */
    async executeRandomPause() {
        const { min, max } = this.config.humanPatterns.longPauseRange;
        const pauseDuration = Math.random() * (max - min) + min;
        
        this.sessionState.lastPauseTime = Date.now();
        this.sessionState.currentBehaviorMode = 'paused';
        
        Logger.info(`⏸️ Taking random pause: ${Math.round(pauseDuration / 1000)}s`);
        return pauseDuration;
    }

    /**
     * Check if should enter burst mode
     */
    shouldEnterBurstMode() {
        return this.config.humanPatterns.enableBurstPatterns && 
               Math.random() < this.config.humanPatterns.burstProbability &&
               this.sessionState.currentBehaviorMode !== 'burst';
    }

    /**
     * Execute burst pattern
     */
    async executeBurstPattern() {
        const { min, max } = this.config.humanPatterns.burstInterval;
        const burstDelay = Math.random() * (max - min) + min;
        
        this.sessionState.currentBehaviorMode = 'burst';
        
        Logger.info(`🚀 Entering burst mode: ${Math.round(burstDelay)}ms intervals`);
        return burstDelay;
    }

    /**
     * Check if should enter idle period
     */
    shouldEnterIdlePeriod() {
        return this.config.humanPatterns.enableIdlePeriods && 
               Math.random() < this.config.humanPatterns.idleProbability;
    }

    /**
     * Execute idle period
     */
    async executeIdlePeriod() {
        const { min, max } = this.config.humanPatterns.idleRange;
        const idleDuration = Math.random() * (max - min) + min;
        
        this.sessionState.currentBehaviorMode = 'idle';
        
        Logger.info(`😴 Entering idle period: ${Math.round(idleDuration / 1000)}s`);
        return idleDuration;
    }

    /**
     * Check if should take micro-break (new pattern)
     */
    shouldTakeMicroBreak() {
        return this.sessionState.consecutiveSearches > 0 && 
               this.sessionState.consecutiveSearches % 25 === 0; // Every 25 searches
    }

    /**
     * Execute micro-break
     */
    async executeMicroBreak() {
        const microBreakDuration = Math.random() * 30000 + 10000; // 10-40 seconds
        
        Logger.info(`☕ Taking micro-break: ${Math.round(microBreakDuration / 1000)}s`);
        return microBreakDuration;
    }

    /**
     * Change behavior state
     */
    changeBehaviorState() {
        const states = Object.keys(this.behaviorStates);
        const currentIndex = states.indexOf(this.currentBehaviorState);
        
        // Weighted transition to similar states
        const transitions = {
            focused: ['research', 'casual', 'distracted'],
            casual: ['focused', 'distracted', 'research'],
            distracted: ['casual', 'focused'],
            research: ['focused', 'casual']
        };
        
        const possibleStates = transitions[this.currentBehaviorState] || states;
        this.currentBehaviorState = possibleStates[Math.floor(Math.random() * possibleStates.length)];
        this.stateChangeTime = Date.now();
        
        Logger.info(`🎭 Behavior state changed to: ${this.currentBehaviorState}`);
    }

    /**
     * Update session state
     */
    updateSessionState(delay) {
        this.sessionState.totalSearches++;
        this.sessionState.consecutiveSearches++;
        this.sessionState.lastSearchTime = Date.now();
        
        // Reset consecutive count after long delays
        if (delay > 60000) { // More than 1 minute
            this.sessionState.consecutiveSearches = 0;
        }
        
        // Update behavior history
        this.sessionState.behaviorHistory.push({
            timestamp: Date.now(),
            delay,
            behaviorState: this.currentBehaviorState,
            behaviorMode: this.sessionState.currentBehaviorMode
        });
        
        // Keep only last 100 entries
        if (this.sessionState.behaviorHistory.length > 100) {
            this.sessionState.behaviorHistory.shift();
        }
        
        // Update detection metrics
        this.updateDetectionMetrics();
    }

    /**
     * Update detection avoidance metrics
     */
    updateDetectionMetrics() {
        if (this.sessionState.behaviorHistory.length < 10) return;
        
        const recentDelays = this.sessionState.behaviorHistory
            .slice(-10)
            .map(entry => entry.delay);
        
        // Calculate timing variability (higher is better for avoiding detection)
        const mean = recentDelays.reduce((sum, delay) => sum + delay, 0) / recentDelays.length;
        const variance = recentDelays.reduce((sum, delay) => sum + Math.pow(delay - mean, 2), 0) / recentDelays.length;
        this.detectionMetrics.timingVariability = Math.sqrt(variance) / mean;
        
        // Calculate pattern complexity
        const uniqueStates = new Set(this.sessionState.behaviorHistory.slice(-20).map(entry => entry.behaviorState));
        this.detectionMetrics.patternComplexity = uniqueStates.size / 4; // Normalized to 0-1
        
        // Calculate human-likeness score
        this.detectionMetrics.humanLikeness = (
            this.detectionMetrics.timingVariability * 0.4 +
            this.detectionMetrics.patternComplexity * 0.3 +
            (this.sessionState.behaviorHistory.length > 50 ? 0.3 : 0)
        );
        
        this.detectionMetrics.lastCalculation = Date.now();
    }

    /**
     * Initialize circadian pattern
     */
    initializeCircadianPattern() {
        return {
            peakActivity: 0.7,    // 30% faster during peak hours
            normalActivity: 1.0,  // Normal speed
            lowActivity: 1.5      // 50% slower during low activity hours
        };
    }

    /**
     * Initialize weekly pattern
     */
    initializeWeeklyPattern() {
        const day = new Date().getDay();
        const weekendMultiplier = (day === 0 || day === 6) ? 1.2 : 1.0; // Slower on weekends
        return { weekendMultiplier };
    }

    /**
     * Initialize seasonal pattern
     */
    initializeSeasonalPattern() {
        const month = new Date().getMonth();
        // Slightly different patterns for different seasons
        const seasonalMultiplier = 1.0 + (Math.sin(month * Math.PI / 6) * 0.1);
        return { seasonalMultiplier };
    }

    /**
     * Initialize personal habits
     */
    initializePersonalHabits() {
        return {
            preferredSearchTimes: [9, 14, 19], // 9 AM, 2 PM, 7 PM
            avoidanceTimes: [1, 2, 3, 4, 5], // 1-5 AM
            lunchBreak: { start: 12, end: 13 },
            dinnerBreak: { start: 18, end: 19 }
        };
    }

    /**
     * Generate normal random number using Box-Muller transform
     */
    generateNormalRandom(mean = 0, stdDev = 1) {
        let u = 0, v = 0;
        while (u === 0) u = Math.random(); // Converting [0,1) to (0,1)
        while (v === 0) v = Math.random();
        
        const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        return z * stdDev + mean;
    }

    /**
     * Get current session statistics
     */
    getSessionStats() {
        return {
            ...this.sessionState,
            detectionMetrics: this.detectionMetrics,
            currentBehaviorState: this.currentBehaviorState,
            sessionDuration: Date.now() - this.sessionState.startTime,
            averageDelay: this.sessionState.behaviorHistory.length > 0 ?
                this.sessionState.behaviorHistory.reduce((sum, entry) => sum + entry.delay, 0) / this.sessionState.behaviorHistory.length : 0
        };
    }

    /**
     * Reset session state
     */
    resetSession() {
        this.sessionState = {
            startTime: Date.now(),
            totalSearches: 0,
            consecutiveSearches: 0,
            lastSearchTime: null,
            lastPauseTime: null,
            currentBehaviorMode: 'normal',
            behaviorHistory: [],
            platformSwitchCount: 0,
            dailySearchCount: 0,
            hourlySearchCount: 0
        };
        
        this.currentBehaviorState = 'casual';
        this.stateChangeTime = Date.now();
        
        Logger.info('🔄 Behavior simulator session reset');
    }
}

module.exports = { AdvancedBehaviorSimulator };