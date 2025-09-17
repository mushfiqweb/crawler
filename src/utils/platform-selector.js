/**
 * Platform Selector Module
 * Intelligent platform selection based on keyword types, performance metrics, and availability
 */

const { SEARCH_PLATFORMS } = require('../config/search-platforms');
const { KEYWORD_CATEGORIES } = require('../config/keywords');
const { Helpers } = require('./helpers');

class PlatformSelector {
    constructor() {
        this.platforms = SEARCH_PLATFORMS;
        this.performanceMetrics = new Map();
        this.platformAvailability = new Map();
        this.lastSelectionTime = new Map();
        
        // Initialize platform availability
        this.platforms.forEach(platform => {
            this.platformAvailability.set(platform.name, true);
            this.performanceMetrics.set(platform.name, {
                successRate: 100,
                averageResponseTime: 0,
                errorCount: 0,
                totalRequests: 0,
                lastError: null,
                consecutiveErrors: 0
            });
        });
    }

    /**
     * Select best platform for a given keyword
     */
    selectBestPlatform(keyword, options = {}) {
        const {
            excludePlatforms = [],
            preferredPlatforms = [],
            keywordType = this._detectKeywordType(keyword),
            requireAvailable = true,
            balanceLoad = true
        } = options;

        // Get available platforms
        let availablePlatforms = this.platforms.filter(platform => {
            if (excludePlatforms.includes(platform.name)) return false;
            if (requireAvailable && !this.platformAvailability.get(platform.name)) return false;
            return true;
        });

        if (availablePlatforms.length === 0) {
            throw new Error('No available platforms found');
        }

        // Apply preferred platforms filter
        if (preferredPlatforms.length > 0) {
            const preferred = availablePlatforms.filter(p => 
                preferredPlatforms.includes(p.name)
            );
            if (preferred.length > 0) {
                availablePlatforms = preferred;
            }
        }

        // Score platforms based on multiple factors
        const scoredPlatforms = availablePlatforms.map(platform => ({
            platform,
            score: this._calculatePlatformScore(platform, keyword, keywordType, balanceLoad)
        }));

        // Sort by score (highest first)
        scoredPlatforms.sort((a, b) => b.score - a.score);

        // Select platform with some randomization to avoid predictability
        const topPlatforms = scoredPlatforms.slice(0, Math.min(3, scoredPlatforms.length));
        const weights = topPlatforms.map((_, index) => Math.pow(2, topPlatforms.length - index - 1));
        const selectedPlatform = this._weightedRandomSelect(topPlatforms, weights);

        // Update last selection time
        this.lastSelectionTime.set(selectedPlatform.platform.name, Date.now());

        return selectedPlatform.platform;
    }

    /**
     * Select multiple platforms for parallel searching
     */
    selectMultiplePlatforms(keyword, count = 2, options = {}) {
        const {
            diversify = true,
            excludePlatforms = [],
            keywordType = this._detectKeywordType(keyword)
        } = options;

        const selectedPlatforms = [];
        const usedPlatforms = [...excludePlatforms];

        for (let i = 0; i < count && usedPlatforms.length < this.platforms.length; i++) {
            try {
                const platform = this.selectBestPlatform(keyword, {
                    ...options,
                    excludePlatforms: usedPlatforms
                });
                
                selectedPlatforms.push(platform);
                
                if (diversify) {
                    usedPlatforms.push(platform.name);
                }
            } catch (error) {
                console.warn(`Failed to select platform ${i + 1}:`, error.message);
                break;
            }
        }

        return selectedPlatforms;
    }

    /**
     * Calculate platform score based on multiple factors
     */
    _calculatePlatformScore(platform, keyword, keywordType, balanceLoad) {
        let score = 0;
        const metrics = this.performanceMetrics.get(platform.name);

        // Base priority score (from configuration)
        score += platform.priority * 10;

        // Performance metrics score
        if (metrics.totalRequests > 0) {
            score += metrics.successRate * 0.5; // 0-50 points
            
            // Response time score (lower is better)
            const responseTimeScore = Math.max(0, 50 - (metrics.averageResponseTime / 100));
            score += responseTimeScore * 0.3; // 0-15 points
            
            // Error penalty
            score -= metrics.consecutiveErrors * 5;
        }

        // Keyword type compatibility
        score += this._getKeywordTypeScore(platform, keywordType);

        // Load balancing
        if (balanceLoad) {
            const lastUsed = this.lastSelectionTime.get(platform.name) || 0;
            const timeSinceLastUse = Date.now() - lastUsed;
            const loadBalanceScore = Math.min(20, timeSinceLastUse / (60 * 1000)); // Up to 20 points for 1+ minutes
            score += loadBalanceScore;
        }

        // Platform-specific bonuses
        score += this._getPlatformSpecificBonus(platform, keyword);

        return Math.max(0, score);
    }

    /**
     * Get keyword type compatibility score
     */
    _getKeywordTypeScore(platform, keywordType) {
        const compatibility = {
            'brand': {
                'Google': 15,
                'Bing': 12,
                'Facebook': 8,
                'X': 6,
                'DuckDuckGo': 10,
                'Yahoo': 8
            },
            'product': {
                'Google': 15,
                'Bing': 12,
                'Facebook': 10,
                'X': 5,
                'DuckDuckGo': 8,
                'Yahoo': 7
            },
            'service': {
                'Google': 15,
                'Bing': 12,
                'Facebook': 12,
                'X': 8,
                'DuckDuckGo': 10,
                'Yahoo': 8
            },
            'informational': {
                'Google': 15,
                'Bing': 13,
                'Facebook': 6,
                'X': 10,
                'DuckDuckGo': 12,
                'Yahoo': 9
            },
            'local': {
                'Google': 15,
                'Bing': 10,
                'Facebook': 12,
                'X': 8,
                'DuckDuckGo': 6,
                'Yahoo': 7
            }
        };

        return compatibility[keywordType]?.[platform.name] || 5;
    }

    /**
     * Get platform-specific bonus points
     */
    _getPlatformSpecificBonus(platform, keyword) {
        let bonus = 0;

        // Length-based bonuses
        if (keyword.length > 20 && platform.name === 'Google') {
            bonus += 5; // Google handles long queries well
        }

        // Special character bonuses
        if (/[^\w\s]/.test(keyword) && platform.name === 'DuckDuckGo') {
            bonus += 3; // DuckDuckGo handles special characters well
        }

        // Social media keywords
        if (this._isSocialKeyword(keyword) && ['Facebook', 'X'].includes(platform.name)) {
            bonus += 8;
        }

        // Technical keywords
        if (this._isTechnicalKeyword(keyword) && ['Google', 'DuckDuckGo'].includes(platform.name)) {
            bonus += 5;
        }

        return bonus;
    }

    /**
     * Detect keyword type
     */
    _detectKeywordType(keyword) {
        const lowerKeyword = keyword.toLowerCase();

        // Check against configured categories
        for (const [category, keywords] of Object.entries(KEYWORD_CATEGORIES)) {
            if (keywords.some(k => lowerKeyword.includes(k.toLowerCase()))) {
                return category;
            }
        }

        // Pattern-based detection
        if (this._isBrandKeyword(lowerKeyword)) return 'brand';
        if (this._isProductKeyword(lowerKeyword)) return 'product';
        if (this._isServiceKeyword(lowerKeyword)) return 'service';
        if (this._isLocalKeyword(lowerKeyword)) return 'local';
        if (this._isInformationalKeyword(lowerKeyword)) return 'informational';

        return 'general';
    }

    /**
     * Check if keyword is brand-related
     */
    _isBrandKeyword(keyword) {
        const brandIndicators = ['brand', 'company', 'corp', 'inc', 'ltd', 'llc', 'official'];
        return brandIndicators.some(indicator => keyword.includes(indicator));
    }

    /**
     * Check if keyword is product-related
     */
    _isProductKeyword(keyword) {
        const productIndicators = ['buy', 'purchase', 'product', 'item', 'model', 'version', 'price', 'cost', 'sale'];
        return productIndicators.some(indicator => keyword.includes(indicator));
    }

    /**
     * Check if keyword is service-related
     */
    _isServiceKeyword(keyword) {
        const serviceIndicators = ['service', 'support', 'help', 'assistance', 'consultation', 'repair', 'maintenance'];
        return serviceIndicators.some(indicator => keyword.includes(indicator));
    }

    /**
     * Check if keyword is local-related
     */
    _isLocalKeyword(keyword) {
        const localIndicators = ['near me', 'nearby', 'local', 'in', 'at', 'location', 'address', 'directions'];
        return localIndicators.some(indicator => keyword.includes(indicator));
    }

    /**
     * Check if keyword is informational
     */
    _isInformationalKeyword(keyword) {
        const infoIndicators = ['how', 'what', 'why', 'when', 'where', 'who', 'guide', 'tutorial', 'tips', 'learn'];
        return infoIndicators.some(indicator => keyword.includes(indicator));
    }

    /**
     * Check if keyword is social media related
     */
    _isSocialKeyword(keyword) {
        const socialIndicators = ['social', 'facebook', 'twitter', 'instagram', 'linkedin', 'tiktok', 'youtube'];
        return socialIndicators.some(indicator => keyword.includes(indicator));
    }

    /**
     * Check if keyword is technical
     */
    _isTechnicalKeyword(keyword) {
        const techIndicators = ['api', 'sdk', 'code', 'programming', 'development', 'software', 'technical', 'documentation'];
        return techIndicators.some(indicator => keyword.includes(indicator));
    }

    /**
     * Weighted random selection
     */
    _weightedRandomSelect(items, weights) {
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * totalWeight;

        for (let i = 0; i < items.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return items[i];
            }
        }

        return items[items.length - 1];
    }

    /**
     * Update platform performance metrics
     */
    updatePerformanceMetrics(platformName, success, responseTime, error = null) {
        const metrics = this.performanceMetrics.get(platformName);
        if (!metrics) return;

        metrics.totalRequests++;
        
        if (success) {
            metrics.consecutiveErrors = 0;
            metrics.lastError = null;
            
            // Update success rate
            const successCount = Math.round((metrics.successRate / 100) * (metrics.totalRequests - 1)) + 1;
            metrics.successRate = (successCount / metrics.totalRequests) * 100;
            
            // Update average response time
            if (metrics.averageResponseTime === 0) {
                metrics.averageResponseTime = responseTime;
            } else {
                metrics.averageResponseTime = (metrics.averageResponseTime + responseTime) / 2;
            }
        } else {
            metrics.errorCount++;
            metrics.consecutiveErrors++;
            metrics.lastError = error;
            
            // Update success rate
            const successCount = Math.round((metrics.successRate / 100) * (metrics.totalRequests - 1));
            metrics.successRate = (successCount / metrics.totalRequests) * 100;
            
            // Mark platform as unavailable if too many consecutive errors
            if (metrics.consecutiveErrors >= 3) {
                this.platformAvailability.set(platformName, false);
                console.warn(`Platform ${platformName} marked as unavailable due to consecutive errors`);
            }
        }

        this.performanceMetrics.set(platformName, metrics);
    }

    /**
     * Mark platform as available/unavailable
     */
    setPlatformAvailability(platformName, available) {
        this.platformAvailability.set(platformName, available);
        
        if (available) {
            // Reset consecutive errors when marking as available
            const metrics = this.performanceMetrics.get(platformName);
            if (metrics) {
                metrics.consecutiveErrors = 0;
                this.performanceMetrics.set(platformName, metrics);
            }
        }
    }

    /**
     * Get platform performance metrics
     */
    getPerformanceMetrics(platformName = null) {
        if (platformName) {
            return this.performanceMetrics.get(platformName);
        }
        
        const allMetrics = {};
        this.performanceMetrics.forEach((metrics, name) => {
            allMetrics[name] = { ...metrics };
        });
        
        return allMetrics;
    }

    /**
     * Get platform availability status
     */
    getPlatformAvailability(platformName = null) {
        if (platformName) {
            return this.platformAvailability.get(platformName);
        }
        
        const availability = {};
        this.platformAvailability.forEach((status, name) => {
            availability[name] = status;
        });
        
        return availability;
    }

    /**
     * Reset platform metrics
     */
    resetMetrics(platformName = null) {
        if (platformName) {
            this.performanceMetrics.set(platformName, {
                successRate: 100,
                averageResponseTime: 0,
                errorCount: 0,
                totalRequests: 0,
                lastError: null,
                consecutiveErrors: 0
            });
            this.platformAvailability.set(platformName, true);
        } else {
            this.platforms.forEach(platform => {
                this.resetMetrics(platform.name);
            });
        }
    }

    /**
     * Get platform recommendations for keyword
     */
    getPlatformRecommendations(keyword, count = 3) {
        const keywordType = this._detectKeywordType(keyword);
        const recommendations = [];

        const availablePlatforms = this.platforms.filter(platform => 
            this.platformAvailability.get(platform.name)
        );

        const scoredPlatforms = availablePlatforms.map(platform => ({
            platform,
            score: this._calculatePlatformScore(platform, keyword, keywordType, false),
            keywordType,
            reasoning: this._getRecommendationReasoning(platform, keyword, keywordType)
        }));

        scoredPlatforms.sort((a, b) => b.score - a.score);

        return scoredPlatforms.slice(0, count);
    }

    /**
     * Get recommendation reasoning
     */
    _getRecommendationReasoning(platform, keyword, keywordType) {
        const reasons = [];
        const metrics = this.performanceMetrics.get(platform.name);

        // Performance reasons
        if (metrics.successRate > 90) {
            reasons.push('High success rate');
        }
        if (metrics.averageResponseTime < 2000) {
            reasons.push('Fast response time');
        }

        // Keyword type compatibility
        const typeScore = this._getKeywordTypeScore(platform, keywordType);
        if (typeScore >= 12) {
            reasons.push(`Excellent for ${keywordType} keywords`);
        } else if (typeScore >= 8) {
            reasons.push(`Good for ${keywordType} keywords`);
        }

        // Platform-specific reasons
        if (platform.name === 'Google' && keyword.length > 15) {
            reasons.push('Handles complex queries well');
        }
        if (platform.name === 'Facebook' && this._isSocialKeyword(keyword)) {
            reasons.push('Social media expertise');
        }
        if (platform.name === 'DuckDuckGo' && /[^\w\s]/.test(keyword)) {
            reasons.push('Good with special characters');
        }

        return reasons.length > 0 ? reasons : ['General compatibility'];
    }

    /**
     * Get platform statistics summary
     */
    getStatsSummary() {
        const summary = {
            totalPlatforms: this.platforms.length,
            availablePlatforms: 0,
            totalRequests: 0,
            overallSuccessRate: 0,
            averageResponseTime: 0,
            platformStats: {}
        };

        let totalSuccessfulRequests = 0;
        let totalResponseTime = 0;
        let platformsWithRequests = 0;

        this.platforms.forEach(platform => {
            const metrics = this.performanceMetrics.get(platform.name);
            const available = this.platformAvailability.get(platform.name);

            if (available) summary.availablePlatforms++;
            summary.totalRequests += metrics.totalRequests;

            if (metrics.totalRequests > 0) {
                platformsWithRequests++;
                totalSuccessfulRequests += (metrics.successRate / 100) * metrics.totalRequests;
                totalResponseTime += metrics.averageResponseTime;
            }

            summary.platformStats[platform.name] = {
                available,
                requests: metrics.totalRequests,
                successRate: metrics.successRate,
                responseTime: metrics.averageResponseTime,
                errors: metrics.errorCount
            };
        });

        if (summary.totalRequests > 0) {
            summary.overallSuccessRate = (totalSuccessfulRequests / summary.totalRequests) * 100;
        }

        if (platformsWithRequests > 0) {
            summary.averageResponseTime = totalResponseTime / platformsWithRequests;
        }

        return summary;
    }
}

module.exports = { PlatformSelector };