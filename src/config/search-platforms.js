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
        enabled: false,
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
        enabled: false,
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

    // Global platform control
    globalPlatformControl: {
        enableAll: false,
        disableAll: false,
        enabledPlatforms: ['Google'], // Platforms to enable when enableAll is false
        disabledPlatforms: ['Facebook', 'X/Twitter'], // Platforms to disable when disableAll is false
        respectIndividualSettings: true // Whether to respect individual platform enabled flags
    },

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

/**
 * Platform Management Utilities
 */
const PlatformManager = {
    /**
     * Get all enabled platforms based on configuration
     * @returns {Array} Array of enabled platform configurations
     */
    getEnabledPlatforms() {
        const { globalPlatformControl } = PLATFORM_CONFIG;
        
        // If disableAll is true, return empty array
        if (globalPlatformControl.disableAll) {
            return [];
        }
        
        // If enableAll is false, use specific enabled platforms list
        if (!globalPlatformControl.enableAll) {
            return SEARCH_PLATFORMS.filter(platform => 
                globalPlatformControl.enabledPlatforms.includes(platform.name) &&
                (globalPlatformControl.respectIndividualSettings ? platform.enabled : true)
            );
        }
        
        // Default: return platforms based on individual enabled flags and disabled list
        return SEARCH_PLATFORMS.filter(platform => {
            const isIndividuallyDisabled = globalPlatformControl.disabledPlatforms.includes(platform.name);
            const isIndividuallyEnabled = globalPlatformControl.respectIndividualSettings ? platform.enabled : true;
            
            return !isIndividuallyDisabled && isIndividuallyEnabled;
        });
    },

    /**
     * Check if a specific platform is enabled
     * @param {string} platformName - Name of the platform to check
     * @returns {boolean} True if platform is enabled
     */
    isPlatformEnabled(platformName) {
        const enabledPlatforms = this.getEnabledPlatforms();
        return enabledPlatforms.some(platform => platform.name.toLowerCase() === platformName.toLowerCase());
    },

    /**
     * Enable a specific platform
     * @param {string} platformName - Name of the platform to enable
     */
    enablePlatform(platformName) {
        const { globalPlatformControl } = PLATFORM_CONFIG;
        
        // Remove from disabled list if present
        const disabledIndex = globalPlatformControl.disabledPlatforms.indexOf(platformName);
        if (disabledIndex > -1) {
            globalPlatformControl.disabledPlatforms.splice(disabledIndex, 1);
        }
        
        // Add to enabled list if not using enableAll
        if (!globalPlatformControl.enableAll && !globalPlatformControl.enabledPlatforms.includes(platformName)) {
            globalPlatformControl.enabledPlatforms.push(platformName);
        }
        
        // Update individual platform setting if respecting individual settings
        if (globalPlatformControl.respectIndividualSettings) {
            const platform = SEARCH_PLATFORMS.find(p => p.name === platformName);
            if (platform) {
                platform.enabled = true;
            }
        }
    },

    /**
     * Disable a specific platform
     * @param {string} platformName - Name of the platform to disable
     */
    disablePlatform(platformName) {
        const { globalPlatformControl } = PLATFORM_CONFIG;
        
        // Add to disabled list if not present
        if (!globalPlatformControl.disabledPlatforms.includes(platformName)) {
            globalPlatformControl.disabledPlatforms.push(platformName);
        }
        
        // Remove from enabled list
        const enabledIndex = globalPlatformControl.enabledPlatforms.indexOf(platformName);
        if (enabledIndex > -1) {
            globalPlatformControl.enabledPlatforms.splice(enabledIndex, 1);
        }
        
        // Update individual platform setting if respecting individual settings
        if (globalPlatformControl.respectIndividualSettings) {
            const platform = SEARCH_PLATFORMS.find(p => p.name === platformName);
            if (platform) {
                platform.enabled = false;
            }
        }
    },

    /**
     * Enable all platforms
     */
    enableAllPlatforms() {
        PLATFORM_CONFIG.globalPlatformControl.enableAll = true;
        PLATFORM_CONFIG.globalPlatformControl.disableAll = false;
        PLATFORM_CONFIG.globalPlatformControl.disabledPlatforms = [];
        
        // Enable all individual platforms if respecting individual settings
        if (PLATFORM_CONFIG.globalPlatformControl.respectIndividualSettings) {
            SEARCH_PLATFORMS.forEach(platform => {
                platform.enabled = true;
            });
        }
    },

    /**
     * Disable all platforms
     */
    disableAllPlatforms() {
        PLATFORM_CONFIG.globalPlatformControl.disableAll = true;
        PLATFORM_CONFIG.globalPlatformControl.enableAll = false;
        
        // Disable all individual platforms if respecting individual settings
        if (PLATFORM_CONFIG.globalPlatformControl.respectIndividualSettings) {
            SEARCH_PLATFORMS.forEach(platform => {
                platform.enabled = false;
            });
        }
    },

    /**
     * Get platform status summary
     * @returns {Object} Summary of platform statuses
     */
    getPlatformStatus() {
        const enabledPlatforms = this.getEnabledPlatforms();
        const allPlatforms = SEARCH_PLATFORMS;
        
        return {
            totalPlatforms: allPlatforms.length,
            enabledCount: enabledPlatforms.length,
            disabledCount: allPlatforms.length - enabledPlatforms.length,
            enabledPlatforms: enabledPlatforms.map(p => p.name),
            disabledPlatforms: allPlatforms.filter(p => !enabledPlatforms.includes(p)).map(p => p.name),
            globalSettings: PLATFORM_CONFIG.globalPlatformControl
        };
    }
};

module.exports = {
    SEARCH_PLATFORMS,
    PLATFORM_CONFIG,
    PlatformManager
};