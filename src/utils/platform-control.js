/**
 * Platform Control Utility
 * Provides runtime control and management of search platforms
 */

const { PlatformManager } = require('../config/search-platforms');
const { defaultLogger: Logger } = require('./logger');

class PlatformControl {
    constructor() {
        this.eventListeners = new Map();
    }

    /**
     * Enable a specific platform
     * @param {string} platformName - Name of the platform to enable
     * @returns {boolean} Success status
     */
    enablePlatform(platformName) {
        try {
            const wasEnabled = PlatformManager.isPlatformEnabled(platformName);
            PlatformManager.enablePlatform(platformName);
            
            if (!wasEnabled) {
                Logger.info(`✅ Platform "${platformName}" has been enabled`);
                this._emitEvent('platformEnabled', { platformName, timestamp: new Date().toISOString() });
            } else {
                Logger.info(`ℹ️ Platform "${platformName}" was already enabled`);
            }
            
            return true;
        } catch (error) {
            Logger.error(`❌ Failed to enable platform "${platformName}":`, error.message);
            return false;
        }
    }

    /**
     * Disable a specific platform
     * @param {string} platformName - Name of the platform to disable
     * @returns {boolean} Success status
     */
    disablePlatform(platformName) {
        try {
            const wasEnabled = PlatformManager.isPlatformEnabled(platformName);
            PlatformManager.disablePlatform(platformName);
            
            if (wasEnabled) {
                Logger.info(`🚫 Platform "${platformName}" has been disabled`);
                this._emitEvent('platformDisabled', { platformName, timestamp: new Date().toISOString() });
            } else {
                Logger.info(`ℹ️ Platform "${platformName}" was already disabled`);
            }
            
            return true;
        } catch (error) {
            Logger.error(`❌ Failed to disable platform "${platformName}":`, error.message);
            return false;
        }
    }

    /**
     * Toggle platform status (enable if disabled, disable if enabled)
     * @param {string} platformName - Name of the platform to toggle
     * @returns {boolean} New enabled status
     */
    togglePlatform(platformName) {
        const isCurrentlyEnabled = PlatformManager.isPlatformEnabled(platformName);
        
        if (isCurrentlyEnabled) {
            this.disablePlatform(platformName);
            return false;
        } else {
            this.enablePlatform(platformName);
            return true;
        }
    }

    /**
     * Enable all platforms
     * @returns {boolean} Success status
     */
    enableAllPlatforms() {
        try {
            const statusBefore = PlatformManager.getPlatformStatus();
            PlatformManager.enableAllPlatforms();
            
            Logger.info(`✅ All platforms have been enabled (${statusBefore.totalPlatforms} platforms)`);
            this._emitEvent('allPlatformsEnabled', { 
                totalPlatforms: statusBefore.totalPlatforms,
                timestamp: new Date().toISOString() 
            });
            
            return true;
        } catch (error) {
            Logger.error('❌ Failed to enable all platforms:', error.message);
            return false;
        }
    }

    /**
     * Disable all platforms
     * @returns {boolean} Success status
     */
    disableAllPlatforms() {
        try {
            const statusBefore = PlatformManager.getPlatformStatus();
            PlatformManager.disableAllPlatforms();
            
            Logger.info(`🚫 All platforms have been disabled (${statusBefore.totalPlatforms} platforms)`);
            this._emitEvent('allPlatformsDisabled', { 
                totalPlatforms: statusBefore.totalPlatforms,
                timestamp: new Date().toISOString() 
            });
            
            return true;
        } catch (error) {
            Logger.error('❌ Failed to disable all platforms:', error.message);
            return false;
        }
    }

    /**
     * Get current platform status
     * @returns {Object} Platform status information
     */
    getStatus() {
        return PlatformManager.getPlatformStatus();
    }

    /**
     * Get detailed platform information
     * @returns {Object} Detailed platform information
     */
    getDetailedStatus() {
        const status = this.getStatus();
        const enabledPlatforms = status.enabledPlatforms.map(name => ({
            name,
            enabled: true,
            lastToggled: this._getLastToggleTime(name)
        }));
        
        const disabledPlatforms = status.disabledPlatforms.map(name => ({
            name,
            enabled: false,
            lastToggled: this._getLastToggleTime(name)
        }));

        return {
            ...status,
            platforms: [...enabledPlatforms, ...disabledPlatforms],
            lastUpdate: new Date().toISOString()
        };
    }

    /**
     * Bulk enable/disable platforms
     * @param {Array} platformNames - Array of platform names
     * @param {boolean} enable - Whether to enable (true) or disable (false)
     * @returns {Object} Results of bulk operation
     */
    bulkTogglePlatforms(platformNames, enable = true) {
        const results = {
            successful: [],
            failed: [],
            skipped: []
        };

        platformNames.forEach(platformName => {
            try {
                const currentStatus = PlatformManager.isPlatformEnabled(platformName);
                
                if (currentStatus === enable) {
                    results.skipped.push({
                        platform: platformName,
                        reason: `Already ${enable ? 'enabled' : 'disabled'}`
                    });
                    return;
                }

                const success = enable ? 
                    this.enablePlatform(platformName) : 
                    this.disablePlatform(platformName);

                if (success) {
                    results.successful.push(platformName);
                } else {
                    results.failed.push({
                        platform: platformName,
                        reason: 'Operation failed'
                    });
                }
            } catch (error) {
                results.failed.push({
                    platform: platformName,
                    reason: error.message
                });
            }
        });

        Logger.info(`📊 Bulk platform ${enable ? 'enable' : 'disable'} completed: ${results.successful.length} successful, ${results.failed.length} failed, ${results.skipped.length} skipped`);
        
        return results;
    }

    /**
     * Add event listener for platform changes
     * @param {string} event - Event name (platformEnabled, platformDisabled, allPlatformsEnabled, allPlatformsDisabled)
     * @param {Function} callback - Callback function
     */
    addEventListener(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function to remove
     */
    removeEventListener(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * Emit event to listeners
     * @private
     */
    _emitEvent(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    Logger.error(`Error in event listener for ${event}:`, error.message);
                }
            });
        }
    }

    /**
     * Get last toggle time for a platform (placeholder for future implementation)
     * @private
     */
    _getLastToggleTime(platformName) {
        // This could be enhanced to track actual toggle times
        return null;
    }

    /**
     * Print current platform status to console
     */
    printStatus() {
        const status = this.getDetailedStatus();
        
        console.log('\n📊 Platform Status Summary:');
        console.log(`Total Platforms: ${status.totalPlatforms}`);
        console.log(`Enabled: ${status.enabledCount}`);
        console.log(`Disabled: ${status.disabledCount}`);
        
        if (status.enabledPlatforms.length > 0) {
            console.log('\n✅ Enabled Platforms:');
            status.enabledPlatforms.forEach(name => console.log(`  - ${name}`));
        }
        
        if (status.disabledPlatforms.length > 0) {
            console.log('\n🚫 Disabled Platforms:');
            status.disabledPlatforms.forEach(name => console.log(`  - ${name}`));
        }
        
        console.log('\n🔧 Global Settings:');
        console.log(`  Enable All: ${status.globalSettings.enableAll}`);
        console.log(`  Disable All: ${status.globalSettings.disableAll}`);
        console.log(`  Respect Individual Settings: ${status.globalSettings.respectIndividualSettings}`);
        console.log('');
    }
}

// Create singleton instance
const platformControl = new PlatformControl();

module.exports = { PlatformControl, platformControl };