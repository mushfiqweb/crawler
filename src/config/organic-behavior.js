/**
 * Organic Search Behavior Configuration
 * Defines human-like patterns and anti-detection measures
 */

const ORGANIC_BEHAVIOR_CONFIG = {
    // System validator expected properties
    minDelay: 2000,
    maxDelay: 8000,
    humanPatterns: true,
    antiDetection: true,
    
    // Variable interval ranges (in milliseconds)
    intervalRange: {
        min: 3000,    // 3 seconds minimum
        max: 12000,   // 12 seconds maximum
        average: 6000 // 6 seconds average (10 times per minute)
    },
    
    // Human-like patterns
    humanPatterns: {
        enableRandomPauses: true,
        pauseProbability: 0.15,        // 15% chance of longer pause
        longPauseRange: { min: 15000, max: 45000 }, // 15-45 second pauses
        
        enableBurstPatterns: true,
        burstProbability: 0.1,         // 10% chance of burst activity
        burstCount: { min: 3, max: 7 }, // 3-7 searches in burst
        burstInterval: { min: 1000, max: 3000 }, // 1-3 seconds between burst searches
        
        enableIdlePeriods: true,
        idleProbability: 0.05,         // 5% chance of idle period
        idleRange: { min: 60000, max: 180000 } // 1-3 minute idle periods
    },
    
    // Anti-detection measures
    antiDetection: {
        enableJitter: true,
        jitterRange: { min: -1000, max: 1000 }, // ±1 second jitter
        
        enableSequenceBreaking: true,
        sequenceBreakProbability: 0.2, // 20% chance to break sequence
        
        enablePlatformRotation: true,
        platformSwitchProbability: 0.3 // 30% chance to switch platform order
    }
};

// Legacy constant for backward compatibility
const VISIT_INTERVAL_MS = ORGANIC_BEHAVIOR_CONFIG.intervalRange.average;

module.exports = {
    ORGANIC_BEHAVIOR_CONFIG,
    ORGANIC_BEHAVIOR: ORGANIC_BEHAVIOR_CONFIG, // For validator compatibility
    VISIT_INTERVAL_MS
};