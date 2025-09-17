/**
 * URL Generator Module
 * Generates search URLs for different platforms with proper encoding and parameters
 */

const { SEARCH_PLATFORMS } = require('../config/search-platforms');
const { GEO_LOCATIONS } = require('../config/keywords');
const { Helpers } = require('./helpers');

class URLGenerator {
    constructor() {
        this.platforms = SEARCH_PLATFORMS;
        this.geoLocations = GEO_LOCATIONS;
    }

    /**
     * Generate search URL for a specific platform and keyword
     */
    generateSearchURL(platform, keyword, options = {}) {
        const platformConfig = this.platforms.find(p => p.name.toLowerCase() === platform.toLowerCase());
        
        if (!platformConfig) {
            throw new Error(`Unsupported platform: ${platform}`);
        }

        const {
            location = null,
            language = 'en',
            country = 'US',
            safeSearch = 'moderate',
            timeRange = null,
            sortBy = 'relevance',
            customParams = {}
        } = options;

        return this._buildURL(platformConfig, keyword, {
            location,
            language,
            country,
            safeSearch,
            timeRange,
            sortBy,
            customParams
        });
    }

    /**
     * Generate multiple URLs for different platforms
     */
    generateMultiPlatformURLs(keyword, platforms = null, options = {}) {
        const targetPlatforms = platforms || this.platforms.map(p => p.name);
        const urls = {};

        targetPlatforms.forEach(platform => {
            try {
                urls[platform] = this.generateSearchURL(platform, keyword, options);
            } catch (error) {
                console.warn(`Failed to generate URL for ${platform}:`, error.message);
            }
        });

        return urls;
    }

    /**
     * Generate URLs with random geo-location
     */
    generateGeoRandomizedURLs(keyword, platform, count = 1) {
        const urls = [];
        const randomLocations = Helpers.getRandomElements(this.geoLocations, count);

        randomLocations.forEach(location => {
            const url = this.generateSearchURL(platform, keyword, {
                location: location.name,
                country: location.country,
                language: location.language
            });
            
            urls.push({
                url,
                location: location.name,
                country: location.country,
                language: location.language
            });
        });

        return urls;
    }

    /**
     * Build URL based on platform configuration
     */
    _buildURL(platformConfig, keyword, options) {
        const baseURL = platformConfig.baseURL;
        const params = new URLSearchParams();

        // Add the search query
        params.append(platformConfig.queryParam, keyword);

        // Add platform-specific parameters
        this._addPlatformSpecificParams(params, platformConfig, options);

        // Add custom parameters
        if (options.customParams) {
            Object.entries(options.customParams).forEach(([key, value]) => {
                params.append(key, value);
            });
        }

        return `${baseURL}?${params.toString()}`;
    }

    /**
     * Add platform-specific parameters
     */
    _addPlatformSpecificParams(params, platformConfig, options) {
        const { name } = platformConfig;

        switch (name.toLowerCase()) {
            case 'google':
                this._addGoogleParams(params, options);
                break;
            case 'facebook':
                this._addFacebookParams(params, options);
                break;
            case 'x':
            case 'twitter':
                this._addTwitterParams(params, options);
                break;
            case 'bing':
                this._addBingParams(params, options);
                break;
            case 'duckduckgo':
                this._addDuckDuckGoParams(params, options);
                break;
            case 'yahoo':
                this._addYahooParams(params, options);
                break;
            default:
                // Generic parameters for unknown platforms
                this._addGenericParams(params, options);
        }
    }

    /**
     * Add Google-specific parameters
     */
    _addGoogleParams(params, options) {
        const { language, country, safeSearch, timeRange, location } = options;

        if (language) params.append('hl', language);
        if (country) params.append('gl', country);
        if (location) params.append('near', location);
        
        // Safe search
        if (safeSearch) {
            const safeSearchMap = {
                'off': 'off',
                'moderate': 'moderate',
                'strict': 'strict'
            };
            params.append('safe', safeSearchMap[safeSearch] || 'moderate');
        }

        // Time range
        if (timeRange) {
            const timeRangeMap = {
                'hour': 'qdr:h',
                'day': 'qdr:d',
                'week': 'qdr:w',
                'month': 'qdr:m',
                'year': 'qdr:y'
            };
            if (timeRangeMap[timeRange]) {
                params.append('tbs', timeRangeMap[timeRange]);
            }
        }

        // Additional Google parameters
        params.append('source', 'hp');
        params.append('ei', this._generateGoogleEI());
    }

    /**
     * Add Facebook-specific parameters
     */
    _addFacebookParams(params, options) {
        const { timeRange, sortBy } = options;

        // Facebook search type
        params.append('type', 'posts');
        
        // Time range for Facebook
        if (timeRange) {
            const timeRangeMap = {
                'day': 'day',
                'week': 'week',
                'month': 'month',
                'year': 'year'
            };
            if (timeRangeMap[timeRange]) {
                params.append('filters', `time:${timeRangeMap[timeRange]}`);
            }
        }

        // Sort by
        if (sortBy) {
            const sortMap = {
                'relevance': 'top',
                'recent': 'recent'
            };
            params.append('sort', sortMap[sortBy] || 'top');
        }
    }

    /**
     * Add Twitter/X-specific parameters
     */
    _addTwitterParams(params, options) {
        const { timeRange, sortBy, language } = options;

        // Search type
        params.append('src', 'typed_query');
        
        // Language
        if (language) {
            params.append('lang', language);
        }

        // Sort by
        if (sortBy) {
            const sortMap = {
                'recent': 'live',
                'popular': 'top',
                'relevance': 'top'
            };
            params.append('f', sortMap[sortBy] || 'top');
        }
    }

    /**
     * Add Bing-specific parameters
     */
    _addBingParams(params, options) {
        const { language, country, safeSearch, timeRange } = options;

        if (language) params.append('setlang', language);
        if (country) params.append('cc', country);
        
        // Safe search
        if (safeSearch) {
            const safeSearchMap = {
                'off': 'off',
                'moderate': 'moderate',
                'strict': 'strict'
            };
            params.append('safesearch', safeSearchMap[safeSearch] || 'moderate');
        }

        // Time range
        if (timeRange) {
            const timeRangeMap = {
                'day': 'Day',
                'week': 'Week',
                'month': 'Month'
            };
            if (timeRangeMap[timeRange]) {
                params.append('filters', `ex1:"ez1_${timeRangeMap[timeRange]}"`);
            }
        }
    }

    /**
     * Add DuckDuckGo-specific parameters
     */
    _addDuckDuckGoParams(params, options) {
        const { language, country, safeSearch, timeRange } = options;

        if (language) params.append('kl', `${country}-${language}`);
        
        // Safe search
        if (safeSearch) {
            const safeSearchMap = {
                'off': '-1',
                'moderate': '1',
                'strict': '1'
            };
            params.append('kp', safeSearchMap[safeSearch] || '1');
        }

        // Time range
        if (timeRange) {
            const timeRangeMap = {
                'day': 'd',
                'week': 'w',
                'month': 'm',
                'year': 'y'
            };
            if (timeRangeMap[timeRange]) {
                params.append('df', timeRangeMap[timeRange]);
            }
        }
    }

    /**
     * Add Yahoo-specific parameters
     */
    _addYahooParams(params, options) {
        const { language, country, safeSearch } = options;

        if (country) params.append('fr', `yfp-t-${country}`);
        
        // Safe search
        if (safeSearch && safeSearch === 'strict') {
            params.append('vm', 'r');
        }
    }

    /**
     * Add generic parameters for unknown platforms
     */
    _addGenericParams(params, options) {
        const { language, country } = options;

        if (language) params.append('lang', language);
        if (country) params.append('region', country);
    }

    /**
     * Generate Google EI parameter (encoded interaction)
     */
    _generateGoogleEI() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
        let result = '';
        for (let i = 0; i < 22; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Encode keyword for URL
     */
    encodeKeyword(keyword) {
        return encodeURIComponent(keyword.trim());
    }

    /**
     * Generate search URL with random parameters
     */
    generateRandomizedURL(platform, keyword) {
        const randomLocation = Helpers.getRandomElement(this.geoLocations);
        const languages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'];
        const safeSearchOptions = ['off', 'moderate', 'strict'];
        const timeRanges = ['day', 'week', 'month', 'year'];

        const options = {
            location: randomLocation ? randomLocation.name : null,
            language: Helpers.getRandomElement(languages),
            country: randomLocation ? randomLocation.country : 'US',
            safeSearch: Helpers.getRandomElement(safeSearchOptions),
            timeRange: Math.random() > 0.7 ? Helpers.getRandomElement(timeRanges) : null
        };

        return this.generateSearchURL(platform, keyword, options);
    }

    /**
     * Validate URL format
     */
    validateURL(url) {
        try {
            new URL(url);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Extract search parameters from URL
     */
    extractSearchParams(url) {
        try {
            const urlObj = new URL(url);
            const params = {};
            
            urlObj.searchParams.forEach((value, key) => {
                params[key] = value;
            });
            
            return {
                baseURL: `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`,
                params,
                platform: this._detectPlatform(urlObj.hostname)
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Detect platform from hostname
     */
    _detectPlatform(hostname) {
        const platformMap = {
            'google.com': 'Google',
            'facebook.com': 'Facebook',
            'twitter.com': 'Twitter',
            'x.com': 'X',
            'bing.com': 'Bing',
            'duckduckgo.com': 'DuckDuckGo',
            'yahoo.com': 'Yahoo'
        };

        for (const [domain, platform] of Object.entries(platformMap)) {
            if (hostname.includes(domain)) {
                return platform;
            }
        }

        return 'Unknown';
    }

    /**
     * Generate bulk URLs for multiple keywords and platforms
     */
    generateBulkURLs(keywords, platforms = null, options = {}) {
        const targetPlatforms = platforms || this.platforms.map(p => p.name);
        const results = {};

        keywords.forEach(keyword => {
            results[keyword] = {};
            targetPlatforms.forEach(platform => {
                try {
                    results[keyword][platform] = this.generateSearchURL(platform, keyword, options);
                } catch (error) {
                    console.warn(`Failed to generate URL for ${keyword} on ${platform}:`, error.message);
                }
            });
        });

        return results;
    }

    /**
     * Get supported platforms
     */
    getSupportedPlatforms() {
        return this.platforms.map(p => ({
            name: p.name,
            baseURL: p.baseURL,
            queryParam: p.queryParam
        }));
    }

    /**
     * Get available geo-locations
     */
    getAvailableLocations() {
        return this.geoLocations.map(loc => ({
            name: loc.name,
            country: loc.country,
            language: loc.language
        }));
    }
}

module.exports = { URLGenerator };