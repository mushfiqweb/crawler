/**
 * Brand Colors Utility
 * Provides consistent brand-specific colors for different platforms
 */

const BRAND_COLORS = {
    'google': {
        primary: '#4285F4',
        emoji: '🌈',
        name: 'Google'
    },
    'facebook': {
        primary: '#1877F2', 
        emoji: '👥',
        name: 'Facebook'
    },
    'x/twitter': {
        primary: '#000000',
        emoji: '❌',
        name: 'X/Twitter'
    },
    'twitter': {
        primary: '#1DA1F2',
        emoji: '🐦', 
        name: 'Twitter'
    },
    'default': {
        primary: '#6B7280',
        emoji: '🔍',
        name: 'Platform'
    }
};

/**
 * Get brand color information for a platform
 * @param {string} platform - Platform name
 * @returns {object} Brand color information
 */
function getBrandColor(platform) {
    const normalizedPlatform = platform.toLowerCase().trim();
    return BRAND_COLORS[normalizedPlatform] || BRAND_COLORS.default;
}

/**
 * Get colored emoji for a platform
 * @param {string} platform - Platform name
 * @returns {string} Platform-specific emoji
 */
function getPlatformEmoji(platform) {
    return getBrandColor(platform).emoji;
}

/**
 * Get platform display name with emoji
 * @param {string} platform - Platform name
 * @returns {string} Formatted platform name with emoji
 */
function getFormattedPlatformName(platform) {
    const brandInfo = getBrandColor(platform);
    return `${brandInfo.emoji} ${brandInfo.name}`;
}

/**
 * Create a colored log message for a platform
 * @param {string} platform - Platform name
 * @param {string} message - Log message
 * @param {string} type - Message type (info, success, error, warn)
 * @returns {string} Formatted log message
 */
function createPlatformLog(platform, message, type = 'info') {
    const brandInfo = getBrandColor(platform);
    const emoji = brandInfo.emoji;
    
    const typeEmojis = {
        info: 'ℹ️',
        success: '✅',
        error: '❌',
        warn: '⚠️',
        search: '🔍'
    };
    
    const typeEmoji = typeEmojis[type] || typeEmojis.info;
    
    return `${emoji}${typeEmoji} ${message}`;
}

module.exports = {
    BRAND_COLORS,
    getBrandColor,
    getPlatformEmoji,
    getFormattedPlatformName,
    createPlatformLog
};