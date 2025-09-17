/**
 * Search Platforms Configuration
 * Defines search engines, their selectors, and platform-specific settings
 */

const SEARCH_PLATFORMS = [
    {
        name: 'Google',
        baseURL: 'https://www.google.com/search',
        queryParam: 'q',
        searchSelector: 'input[name="q"], textarea[name="q"]',
        submitSelector: 'input[type="submit"], button[type="submit"], input[value="Google Search"]',
        resultSelector: 'div[data-ved], .g, .MjjYud',
        waitForSelector: 'div#search, div#main',
        priority: 1.0,
        enabled: true,
        supportsMobile: true,
        supportsGeolocation: true,
        additionalParams: {
            'hl': 'en', // Language
            'gl': 'us'  // Country
        }
    },
    {
        name: 'Facebook',
        baseURL: 'https://www.facebook.com/search/top',
        queryParam: 'q',
        searchSelector: 'input[placeholder*="Search"], input[aria-label*="Search"], input[data-testid="search_input"]',
        submitSelector: 'button[type="submit"], button[aria-label*="Search"], div[role="button"]',
        resultSelector: '[data-testid="search_result"], .x1yztbdb',
        waitForSelector: '[data-pagelet="SearchResults"], .search',
        priority: 0.7,
        enabled: true,
        supportsMobile: true,
        supportsGeolocation: false,
        additionalParams: {
            'type': 'top'
        }
    },
    {
        name: 'X/Twitter',
        baseURL: 'https://twitter.com/search',
        queryParam: 'q',
        searchSelector: 'input[placeholder*="Search"], input[data-testid="SearchBox_Search_Input"]',
        submitSelector: 'button[data-testid="SearchBox_Search_Button"], button[aria-label="Search"]',
        resultSelector: '[data-testid="tweet"], .tweet',
        waitForSelector: '[data-testid="primaryColumn"], .timeline',
        priority: 0.6,
        enabled: true,
        supportsMobile: true,
        supportsGeolocation: false,
        additionalParams: {
            'src': 'typed_query',
            'f': 'live'
        }
    }
];

const PLATFORM_CONFIG = {
    // Platform selection settings
    maxPlatformsPerSearch: 5, // Limit concurrent platform searches
    platformRotationEnabled: true,
    priorityWeightingEnabled: true,
    mobileCompatibilityRequired: false,
    geolocationSupportRequired: false,

    // Platform-specific timeouts (in milliseconds)
    timeouts: {
        'Google': 15000,
        'Facebook': 25000,
        'X/Twitter': 20000
    },

    // Platform-specific retry configuration
    retryConfig: {
        'Google': { maxRetries: 3, backoffMs: 2000 },
        'Facebook': { maxRetries: 1, backoffMs: 5000 },
        'X/Twitter': { maxRetries: 1, backoffMs: 4000 }
    }
};

module.exports = {
    SEARCH_PLATFORMS,
    PLATFORM_CONFIG
};