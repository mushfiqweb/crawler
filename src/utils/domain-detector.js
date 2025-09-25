/**
 * Domain Detection Module
 * Identifies and analyzes target domain links in search results
 */

const { URL } = require('url');
const { defaultLogger: Logger } = require('./logger');

class DomainDetector {
    constructor(targetDomains = ['kmsmarketplace.com']) {
        this.targetDomains = Array.isArray(targetDomains) ? targetDomains : [targetDomains];
        this.stats = {
            totalResults: 0,
            targetDomainMatches: 0,
            validLinks: 0,
            invalidLinks: 0
        };
    }

    /**
     * Analyze search results and identify target domain links
     * @param {Array} searchResults - Array of search result objects
     * @returns {Object} Analysis results with detected links
     */
    analyzeSearchResults(searchResults) {
        if (!Array.isArray(searchResults) || searchResults.length === 0) {
            Logger.warn('🔍 No search results provided for domain analysis');
            return {
                targetLinks: [],
                analysis: {
                    totalResults: 0,
                    targetDomainMatches: 0,
                    matchRate: 0
                }
            };
        }

        this.stats.totalResults += searchResults.length;
        const targetLinks = [];

        searchResults.forEach((result, index) => {
            try {
                if (this.isTargetDomain(result.url)) {
                    const linkAnalysis = this.analyzeLinkDetails(result, index);
                    if (linkAnalysis.isValid) {
                        targetLinks.push(linkAnalysis);
                        this.stats.targetDomainMatches++;
                        this.stats.validLinks++;
                    } else {
                        this.stats.invalidLinks++;
                    }
                }
            } catch (error) {
                Logger.warn(`⚠️ Error analyzing result ${index}:`, error.message);
                this.stats.invalidLinks++;
            }
        });

        const analysis = {
            totalResults: searchResults.length,
            targetDomainMatches: targetLinks.length,
            matchRate: searchResults.length > 0 ? (targetLinks.length / searchResults.length * 100).toFixed(2) : 0
        };

        Logger.info(`🎯 Domain Analysis Complete: ${targetLinks.length} target links found out of ${searchResults.length} results (${analysis.matchRate}%)`);

        return {
            targetLinks,
            analysis
        };
    }

    /**
     * Check if URL belongs to target domain
     * @param {string} url - URL to check
     * @returns {boolean} True if URL matches target domain
     */
    isTargetDomain(url) {
        if (!url || typeof url !== 'string') {
            return false;
        }

        try {
            const parsedUrl = new URL(url);
            const hostname = parsedUrl.hostname.toLowerCase();
            
            return this.targetDomains.some(domain => {
                const targetDomain = domain.toLowerCase();
                return hostname === targetDomain || 
                       hostname.endsWith('.' + targetDomain) ||
                       hostname.includes(targetDomain);
            });
        } catch (error) {
            Logger.warn(`⚠️ Invalid URL format: ${url}`);
            return false;
        }
    }

    /**
     * Analyze detailed link information
     * @param {Object} result - Search result object
     * @param {number} index - Position in search results
     * @returns {Object} Detailed link analysis
     */
    analyzeLinkDetails(result, index) {
        const linkData = {
            originalResult: result,
            position: result.position || index + 1,
            title: result.title || '',
            url: result.url || '',
            snippet: result.snippet || '',
            visible: result.visible !== false,
            isValid: false,
            domain: '',
            path: '',
            queryParams: {},
            linkType: 'unknown',
            priority: this.calculateLinkPriority(result, index)
        };

        try {
            const parsedUrl = new URL(result.url);
            linkData.domain = parsedUrl.hostname;
            linkData.path = parsedUrl.pathname;
            linkData.queryParams = Object.fromEntries(parsedUrl.searchParams);
            linkData.linkType = this.determineLinkType(result);
            linkData.isValid = true;

            Logger.debug(`✅ Valid target link found: ${linkData.title} (Position: ${linkData.position})`);
        } catch (error) {
            Logger.warn(`❌ Invalid link format: ${result.url}`);
        }

        return linkData;
    }

    /**
     * Calculate link priority for interaction order
     * @param {Object} result - Search result object
     * @param {number} index - Position in results
     * @returns {number} Priority score (higher = more important)
     */
    calculateLinkPriority(result, index) {
        let priority = 100 - (index * 5); // Base priority decreases with position

        // Boost priority for homepage/main domain links
        if (this.isHomepageLink(result.url)) {
            priority += 50;
        }

        // Boost priority for product/service pages
        if (this.isProductServicePage(result.url, result.title)) {
            priority += 30;
        }

        // Boost priority for visible results
        if (result.visible !== false) {
            priority += 20;
        }

        // Boost priority based on title relevance
        if (result.title && result.title.toLowerCase().includes('kms')) {
            priority += 25;
        }

        return Math.max(0, priority);
    }

    /**
     * Determine the type of link
     * @param {Object} result - Search result object
     * @returns {string} Link type classification
     */
    determineLinkType(result) {
        const url = result.url.toLowerCase();
        const title = (result.title || '').toLowerCase();

        if (this.isHomepageLink(result.url)) {
            return 'homepage';
        } else if (url.includes('/product') || url.includes('/item') || title.includes('product')) {
            return 'product';
        } else if (url.includes('/service') || title.includes('service')) {
            return 'service';
        } else if (url.includes('/about') || title.includes('about')) {
            return 'about';
        } else if (url.includes('/contact') || title.includes('contact')) {
            return 'contact';
        } else if (url.includes('/blog') || url.includes('/news')) {
            return 'content';
        } else {
            return 'general';
        }
    }

    /**
     * Check if link is homepage/main domain
     * @param {string} url - URL to check
     * @returns {boolean} True if homepage link
     */
    isHomepageLink(url) {
        try {
            const parsedUrl = new URL(url);
            return parsedUrl.pathname === '/' || parsedUrl.pathname === '';
        } catch {
            return false;
        }
    }

    /**
     * Check if link is product/service page
     * @param {string} url - URL to check
     * @param {string} title - Page title
     * @returns {boolean} True if product/service page
     */
    isProductServicePage(url, title) {
        const urlLower = url.toLowerCase();
        const titleLower = (title || '').toLowerCase();
        
        const productKeywords = ['product', 'item', 'service', 'solution', 'marketplace'];
        
        return productKeywords.some(keyword => 
            urlLower.includes(keyword) || titleLower.includes(keyword)
        );
    }

    /**
     * Filter and sort target links by priority
     * @param {Array} targetLinks - Array of target link objects
     * @param {Object} options - Filtering options
     * @returns {Array} Filtered and sorted links
     */
    filterAndSortLinks(targetLinks, options = {}) {
        const {
            maxLinks = 5,
            minPriority = 0,
            linkTypes = null,
            visibleOnly = true
        } = options;

        let filteredLinks = [...targetLinks];

        // Filter by visibility
        if (visibleOnly) {
            filteredLinks = filteredLinks.filter(link => link.visible);
        }

        // Filter by minimum priority
        if (minPriority > 0) {
            filteredLinks = filteredLinks.filter(link => link.priority >= minPriority);
        }

        // Filter by link types
        if (linkTypes && Array.isArray(linkTypes)) {
            filteredLinks = filteredLinks.filter(link => linkTypes.includes(link.linkType));
        }

        // Sort by priority (highest first)
        filteredLinks.sort((a, b) => b.priority - a.priority);

        // Limit number of links
        return filteredLinks.slice(0, maxLinks);
    }

    /**
     * Get detection statistics
     * @returns {Object} Current statistics
     */
    getStats() {
        return {
            ...this.stats,
            successRate: this.stats.totalResults > 0 ? 
                (this.stats.validLinks / this.stats.totalResults * 100).toFixed(2) : 0
        };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            totalResults: 0,
            targetDomainMatches: 0,
            validLinks: 0,
            invalidLinks: 0
        };
    }

    /**
     * Add new target domain
     * @param {string} domain - Domain to add
     */
    addTargetDomain(domain) {
        if (domain && !this.targetDomains.includes(domain)) {
            this.targetDomains.push(domain);
            Logger.info(`➕ Added target domain: ${domain}`);
        }
    }

    /**
     * Remove target domain
     * @param {string} domain - Domain to remove
     */
    removeTargetDomain(domain) {
        const index = this.targetDomains.indexOf(domain);
        if (index > -1) {
            this.targetDomains.splice(index, 1);
            Logger.info(`➖ Removed target domain: ${domain}`);
        }
    }

    /**
     * Get current target domains
     * @returns {Array} List of target domains
     */
    getTargetDomains() {
        return [...this.targetDomains];
    }
}

module.exports = { DomainDetector };