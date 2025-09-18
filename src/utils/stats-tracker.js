/**
 * Statistics Tracking Module
 * Handles keyword search statistics and performance metrics
 */

const fs = require('fs').promises;
const path = require('path');

class StatsTracker {
    constructor(statsFilePath = path.join(__dirname, '..', 'stats.txt')) {
        this.statsFilePath = statsFilePath;
        this.stats = {
            keywords: new Map(),
            platforms: new Map(),
            performance: {
                totalSearches: 0,
                successfulSearches: 0,
                failedSearches: 0,
                averageSearchTime: 0,
                totalSearchTime: 0,
                lastUpdated: null,
                sessionStart: new Date().toISOString()
            },
            daily: new Map(),
            hourly: new Map()
        };
        this.isLoaded = false;
    }

    /**
     * Initialize the stats tracker
     */
    async initialize() {
        try {
            await this.loadStats();
            console.log('📊 Stats tracker initialized');
        } catch (error) {
            console.warn('⚠️ Could not load existing stats, starting fresh:', error.message);
            await this.saveStats();
        }
    }

    /**
     * Load existing statistics from file
     */
    async loadStats() {
        try {
            const content = await fs.readFile(this.statsFilePath, 'utf8');
            
            // Parse the existing stats file to extract data
            const lines = content.split('\n');
            let currentSection = null;
            
            for (const line of lines) {
                const trimmed = line.trim();
                
                // Skip empty lines and decorative lines
                if (!trimmed || trimmed.startsWith('═') || trimmed.startsWith('─') || trimmed.startsWith('│')) {
                    continue;
                }
                
                // Detect sections
                if (trimmed.includes('KEYWORD STATISTICS')) {
                    currentSection = 'keywords';
                    continue;
                } else if (trimmed.includes('SEARCH PLATFORMS')) {
                    currentSection = 'platforms';
                    continue;
                } else if (trimmed.includes('PERFORMANCE METRICS')) {
                    currentSection = 'performance';
                    continue;
                }
                
                // Parse data based on current section
                if (currentSection === 'keywords' && trimmed.includes('│')) {
                    const match = trimmed.match(/│\s*(.+?)\s*│\s*(\d+)\s*│/);
                    if (match && match[1] !== 'Keyword' && match[2] !== 'Count') {
                        this.stats.keywords.set(match[1].trim(), parseInt(match[2]));
                    }
                } else if (currentSection === 'platforms' && trimmed.includes('│')) {
                    const match = trimmed.match(/│\s*(.+?)\s*│\s*(\d+)\s*│/);
                    if (match && match[1] !== 'Platform' && match[2] !== 'Searches') {
                        this.stats.platforms.set(match[1].trim(), parseInt(match[2]));
                    }
                } else if (currentSection === 'performance') {
                    // Parse performance metrics
                    if (trimmed.includes('Total Searches:')) {
                        const match = trimmed.match(/Total Searches:\s*(\d+)/);
                        if (match) this.stats.performance.totalSearches = parseInt(match[1]);
                    } else if (trimmed.includes('Successful:')) {
                        const match = trimmed.match(/Successful:\s*(\d+)/);
                        if (match) this.stats.performance.successfulSearches = parseInt(match[1]);
                    } else if (trimmed.includes('Failed:')) {
                        const match = trimmed.match(/Failed:\s*(\d+)/);
                        if (match) this.stats.performance.failedSearches = parseInt(match[1]);
                    } else if (trimmed.includes('Average Search Time:')) {
                        const match = trimmed.match(/Average Search Time:\s*([\d.]+)/);
                        if (match) this.stats.performance.averageSearchTime = parseFloat(match[1]);
                    }
                }
            }
            
            this.isLoaded = true;
            console.log(`📈 Loaded stats: ${this.stats.keywords.size} keywords, ${this.stats.platforms.size} platforms`);
            
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
            // File doesn't exist, will create new one
        }
    }

    /**
     * Record a keyword search
     */
    async recordKeywordSearch(keyword, platform, success = true, searchTime = 0) {
        try {
            // Update keyword count
            const currentCount = this.stats.keywords.get(keyword) || 0;
            this.stats.keywords.set(keyword, currentCount + 1);
            
            // Update platform count
            const platformCount = this.stats.platforms.get(platform) || 0;
            this.stats.platforms.set(platform, platformCount + 1);
            
            // Update performance metrics
            this.stats.performance.totalSearches++;
            if (success) {
                this.stats.performance.successfulSearches++;
            } else {
                this.stats.performance.failedSearches++;
            }
            
            // Update search time metrics
            this.stats.performance.totalSearchTime += searchTime;
            this.stats.performance.averageSearchTime = 
                this.stats.performance.totalSearchTime / this.stats.performance.totalSearches;
            
            this.stats.performance.lastUpdated = new Date().toISOString();
            
            // Record daily stats
            const today = new Date().toDateString();
            const dailyCount = this.stats.daily.get(today) || 0;
            this.stats.daily.set(today, dailyCount + 1);
            
            // Record hourly stats
            const currentHour = new Date().getHours();
            const hourlyCount = this.stats.hourly.get(currentHour) || 0;
            this.stats.hourly.set(currentHour, hourlyCount + 1);
            
            // Save to file
            await this.saveStats();
            
            console.log(`📊 Recorded search: "${keyword}" on ${platform} (${success ? 'success' : 'failed'})`);
            
        } catch (error) {
            console.error('❌ Error recording keyword search:', error.message);
        }
    }

    /**
     * Get top keywords by search count
     */
    getTopKeywords(limit = 10) {
        return Array.from(this.stats.keywords.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit);
    }

    /**
     * Get platform statistics
     */
    getPlatformStats() {
        return Array.from(this.stats.platforms.entries())
            .sort((a, b) => b[1] - a[1]);
    }

    /**
     * Get performance summary
     */
    getPerformanceSummary() {
        const successRate = this.stats.performance.totalSearches > 0 
            ? (this.stats.performance.successfulSearches / this.stats.performance.totalSearches * 100).toFixed(1)
            : '0.0';
            
        return {
            ...this.stats.performance,
            successRate: `${successRate}%`,
            averageSearchTimeFormatted: `${this.stats.performance.averageSearchTime.toFixed(2)}s`
        };
    }

    /**
     * Save statistics to file with visual formatting
     */
    async saveStats() {
        try {
            const content = this.generateStatsContent();
            await fs.writeFile(this.statsFilePath, content, 'utf8');
        } catch (error) {
            console.error('❌ Error saving stats:', error.message);
        }
    }

    /**
     * Generate formatted statistics content
     */
    generateStatsContent() {
        const topKeywords = this.getTopKeywords(15);
        const platformStats = this.getPlatformStats();
        const performance = this.getPerformanceSummary();
        const now = new Date();
        
        let content = '';
        
        // Header
        content += '╔══════════════════════════════════════════════════════════════════════════════╗\n';
        content += '║                           CRAWLER SEARCH STATISTICS                         ║\n';
        content += '╠══════════════════════════════════════════════════════════════════════════════╣\n';
        content += `║ Generated: ${now.toLocaleString().padEnd(63)} ║\n`;
        content += `║ Session Start: ${this.stats.performance.sessionStart.slice(0, 19).replace('T', ' ').padEnd(55)} ║\n`;
        content += '╚══════════════════════════════════════════════════════════════════════════════╝\n\n';
        
        // Keyword Statistics
        content += '┌──────────────────────────────────────────────────────────────────────────────┐\n';
        content += '│                              KEYWORD STATISTICS                             │\n';
        content += '├──────────────────────────────────────────────────────────────────────────────┤\n';
        content += '│ Keyword                                                          │ Count     │\n';
        content += '├──────────────────────────────────────────────────────────────────┼───────────┤\n';
        
        if (topKeywords.length === 0) {
            content += '│ No keywords searched yet                                         │     0     │\n';
        } else {
            topKeywords.forEach(([keyword, count]) => {
                const truncatedKeyword = keyword.length > 60 ? keyword.substring(0, 57) + '...' : keyword;
                const paddedKeyword = truncatedKeyword.padEnd(60);
                const paddedCount = count.toString().padStart(9);
                content += `│ ${paddedKeyword} │ ${paddedCount} │\n`;
            });
        }
        
        content += '└──────────────────────────────────────────────────────────────────┴───────────┘\n\n';
        
        // Search Platforms
        content += '┌──────────────────────────────────────────────────────────────────────────────┐\n';
        content += '│                              SEARCH PLATFORMS                               │\n';
        content += '├──────────────────────────────────────────────────────────────────────────────┤\n';
        content += '│ Platform                                                         │ Searches  │\n';
        content += '├──────────────────────────────────────────────────────────────────┼───────────┤\n';
        
        if (platformStats.length === 0) {
            content += '│ No platforms used yet                                            │     0     │\n';
        } else {
            platformStats.forEach(([platform, count]) => {
                const paddedPlatform = platform.padEnd(60);
                const paddedCount = count.toString().padStart(9);
                content += `│ ${paddedPlatform} │ ${paddedCount} │\n`;
            });
        }
        
        content += '└──────────────────────────────────────────────────────────────────┴───────────┘\n\n';
        
        // Performance Metrics
        content += '┌──────────────────────────────────────────────────────────────────────────────┐\n';
        content += '│                             PERFORMANCE METRICS                             │\n';
        content += '├──────────────────────────────────────────────────────────────────────────────┤\n';
        content += `│ Total Searches: ${performance.totalSearches.toString().padStart(61)} │\n`;
        content += `│ Successful: ${performance.successfulSearches.toString().padStart(65)} │\n`;
        content += `│ Failed: ${performance.failedSearches.toString().padStart(69)} │\n`;
        content += `│ Success Rate: ${performance.successRate.padStart(63)} │\n`;
        content += `│ Average Search Time: ${performance.averageSearchTimeFormatted.padStart(54)} │\n`;
        content += `│ Last Updated: ${(performance.lastUpdated || 'Never').slice(0, 19).replace('T', ' ').padStart(61)} │\n`;
        content += '└──────────────────────────────────────────────────────────────────────────────┘\n\n';
        
        // Daily Summary (last 7 days)
        content += '┌──────────────────────────────────────────────────────────────────────────────┐\n';
        content += '│                               DAILY SUMMARY                                 │\n';
        content += '├──────────────────────────────────────────────────────────────────────────────┤\n';
        
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - i);
            return date.toDateString();
        }).reverse();
        
        last7Days.forEach(date => {
            const count = this.stats.daily.get(date) || 0;
            const shortDate = new Date(date).toLocaleDateString();
            content += `│ ${shortDate.padEnd(60)} │ ${count.toString().padStart(9)} │\n`;
        });
        
        content += '└──────────────────────────────────────────────────────────────────────────────┘\n\n';
        
        // Footer
        content += '╔══════════════════════════════════════════════════════════════════════════════╗\n';
        content += '║                    🤖 KMS Marketplace Crawler Statistics                    ║\n';
        content += '║                         Tracking search performance                         ║\n';
        content += '╚══════════════════════════════════════════════════════════════════════════════╝\n';
        
        return content;
    }

    /**
     * Record a search (alias for recordKeywordSearch with type safety)
     */
    async recordSearch(keyword, platform, success = true, searchTime = 0, errorMessage = null) {
        // Ensure keyword is a string
        const keywordStr = typeof keyword === 'string' ? keyword : String(keyword);
        return await this.recordKeywordSearch(keywordStr, platform, success, searchTime);
    }

    /**
     * Get current statistics summary
     */
    getStatsSummary() {
        return {
            totalKeywords: this.stats.keywords.size,
            totalSearches: this.stats.performance.totalSearches,
            successRate: this.getPerformanceSummary().successRate,
            topKeyword: this.getTopKeywords(1)[0] || ['None', 0],
            lastUpdated: this.stats.performance.lastUpdated
        };
    }

    /**
     * Reset statistics
     */
    async resetStats() {
        this.stats = {
            keywords: new Map(),
            platforms: new Map(),
            performance: {
                totalSearches: 0,
                successfulSearches: 0,
                failedSearches: 0,
                averageSearchTime: 0,
                totalSearchTime: 0,
                lastUpdated: null,
                sessionStart: new Date().toISOString()
            },
            daily: new Map(),
            hourly: new Map()
        };
        
        await this.saveStats();
        console.log('📊 Statistics reset');
    }

    /**
     * Export statistics to JSON
     */
    exportToJSON() {
        return {
            keywords: Object.fromEntries(this.stats.keywords),
            platforms: Object.fromEntries(this.stats.platforms),
            performance: this.stats.performance,
            daily: Object.fromEntries(this.stats.daily),
            hourly: Object.fromEntries(this.stats.hourly),
            exportedAt: new Date().toISOString()
        };
    }
}

module.exports = { StatsTracker };