/**
 * Advanced Browser Fingerprint Randomization Module
 * Generates realistic and diverse browser fingerprints to avoid detection
 */

const { defaultLogger: Logger } = require('../utils/logger');

class FingerprintRandomizer {
    constructor() {
        this.deviceProfiles = this.initializeDeviceProfiles();
        this.browserProfiles = this.initializeBrowserProfiles();
        this.osProfiles = this.initializeOSProfiles();
        this.screenResolutions = this.initializeScreenResolutions();
        this.timezones = this.initializeTimezones();
        this.languages = this.initializeLanguages();
        this.fonts = this.initializeFonts();
        
        this.usedFingerprints = new Set();
        this.fingerprintHistory = [];
        this.maxHistorySize = 1000;
    }

    /**
     * Generate a complete randomized fingerprint
     */
    generateFingerprint(deviceType = 'desktop', targetCountry = null) {
        const deviceProfile = this.selectDeviceProfile(deviceType);
        const browserProfile = this.selectBrowserProfile(deviceProfile);
        const osProfile = this.selectOSProfile(deviceProfile);
        const screenProfile = this.selectScreenProfile(deviceProfile);
        const locationProfile = this.selectLocationProfile(targetCountry);
        
        const fingerprint = {
            // Device characteristics
            device: deviceProfile,
            
            // Browser configuration
            userAgent: this.generateUserAgent(browserProfile, osProfile),
            viewport: screenProfile.viewport,
            screen: screenProfile.screen,
            
            // System information
            platform: osProfile.platform,
            hardwareConcurrency: this.randomizeHardwareConcurrency(deviceProfile),
            deviceMemory: this.randomizeDeviceMemory(deviceProfile),
            
            // Graphics and rendering
            webgl: this.generateWebGLFingerprint(deviceProfile),
            canvas: this.generateCanvasFingerprint(),
            
            // Location and language
            timezone: locationProfile.timezone,
            language: locationProfile.language,
            languages: locationProfile.languages,
            
            // Network and connectivity
            connectionType: this.randomizeConnectionType(deviceProfile),
            
            // Browser features
            plugins: this.generatePlugins(browserProfile),
            fonts: this.generateFontList(osProfile),
            
            // Behavioral characteristics
            touchSupport: deviceProfile.type === 'mobile',
            cookieEnabled: true,
            doNotTrack: Math.random() > 0.7 ? '1' : null,
            
            // Advanced fingerprinting resistance
            audioContext: this.generateAudioFingerprint(),
            webRTC: this.generateWebRTCFingerprint(),
            
            // Metadata
            id: this.generateFingerprintId(),
            createdAt: Date.now(),
            country: locationProfile.country
        };

        // Ensure uniqueness
        if (this.usedFingerprints.has(fingerprint.id)) {
            return this.generateFingerprint(deviceType, targetCountry);
        }

        this.usedFingerprints.add(fingerprint.id);
        this.fingerprintHistory.push(fingerprint);
        
        // Maintain history size
        if (this.fingerprintHistory.length > this.maxHistorySize) {
            const removed = this.fingerprintHistory.shift();
            this.usedFingerprints.delete(removed.id);
        }

        Logger.info(`🎭 Generated fingerprint: ${fingerprint.device.type} ${fingerprint.userAgent.split(' ')[0]} (${fingerprint.country})`);
        return fingerprint;
    }

    /**
     * Initialize device profiles
     */
    initializeDeviceProfiles() {
        return {
            desktop: [
                { type: 'desktop', category: 'high-end', ram: [16, 32], cores: [8, 16], gpu: 'discrete' },
                { type: 'desktop', category: 'mid-range', ram: [8, 16], cores: [4, 8], gpu: 'integrated' },
                { type: 'desktop', category: 'budget', ram: [4, 8], cores: [2, 4], gpu: 'integrated' }
            ],
            mobile: [
                { type: 'mobile', category: 'flagship', ram: [8, 12], cores: [8], gpu: 'high-end' },
                { type: 'mobile', category: 'mid-range', ram: [4, 6], cores: [6, 8], gpu: 'mid-range' },
                { type: 'mobile', category: 'budget', ram: [2, 4], cores: [4], gpu: 'basic' }
            ],
            tablet: [
                { type: 'tablet', category: 'premium', ram: [6, 8], cores: [6, 8], gpu: 'high-end' },
                { type: 'tablet', category: 'standard', ram: [3, 4], cores: [4, 6], gpu: 'mid-range' }
            ]
        };
    }

    /**
     * Initialize browser profiles
     */
    initializeBrowserProfiles() {
        return {
            chrome: {
                name: 'Chrome',
                versions: ['120.0.6099.109', '119.0.6045.199', '118.0.5993.117'],
                engines: ['Blink', 'V8'],
                marketShare: 0.65
            },
            firefox: {
                name: 'Firefox',
                versions: ['121.0', '120.0.1', '119.0'],
                engines: ['Gecko', 'SpiderMonkey'],
                marketShare: 0.15
            },
            safari: {
                name: 'Safari',
                versions: ['17.2', '17.1', '16.6'],
                engines: ['WebKit', 'JavaScriptCore'],
                marketShare: 0.12
            },
            edge: {
                name: 'Edge',
                versions: ['120.0.2210.77', '119.0.2151.97', '118.0.2088.76'],
                engines: ['Blink', 'V8'],
                marketShare: 0.08
            }
        };
    }

    /**
     * Initialize OS profiles
     */
    initializeOSProfiles() {
        return {
            windows: {
                name: 'Windows',
                versions: ['10.0', '11.0'],
                platforms: ['Win32', 'Win64'],
                marketShare: 0.70
            },
            macos: {
                name: 'macOS',
                versions: ['14.2', '13.6', '12.7'],
                platforms: ['MacIntel'],
                marketShare: 0.20
            },
            linux: {
                name: 'Linux',
                versions: ['X11', 'Wayland'],
                platforms: ['Linux x86_64', 'Linux i686'],
                marketShare: 0.03
            },
            android: {
                name: 'Android',
                versions: ['14', '13', '12'],
                platforms: ['Linux armv7l', 'Linux aarch64'],
                marketShare: 0.42
            },
            ios: {
                name: 'iOS',
                versions: ['17.2', '16.7', '15.8'],
                platforms: ['iPhone', 'iPad'],
                marketShare: 0.28
            }
        };
    }

    /**
     * Initialize screen resolutions
     */
    initializeScreenResolutions() {
        return {
            desktop: [
                { width: 1920, height: 1080, ratio: 1 },
                { width: 2560, height: 1440, ratio: 1 },
                { width: 3840, height: 2160, ratio: 1 },
                { width: 1366, height: 768, ratio: 1 },
                { width: 1440, height: 900, ratio: 1 }
            ],
            mobile: [
                { width: 390, height: 844, ratio: 3 }, // iPhone 12/13/14
                { width: 393, height: 851, ratio: 2.75 }, // Pixel 7
                { width: 412, height: 915, ratio: 2.625 }, // Galaxy S21
                { width: 375, height: 812, ratio: 3 }, // iPhone X/11
                { width: 414, height: 896, ratio: 2 } // iPhone 11 Pro Max
            ],
            tablet: [
                { width: 820, height: 1180, ratio: 2 }, // iPad Air
                { width: 768, height: 1024, ratio: 2 }, // iPad
                { width: 1024, height: 1366, ratio: 2 }, // iPad Pro
                { width: 800, height: 1280, ratio: 1.5 } // Android tablet
            ]
        };
    }

    /**
     * Initialize timezone data
     */
    initializeTimezones() {
        return {
            'US': ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'],
            'UK': ['Europe/London'],
            'CA': ['America/Toronto', 'America/Vancouver'],
            'DE': ['Europe/Berlin'],
            'FR': ['Europe/Paris'],
            'AU': ['Australia/Sydney', 'Australia/Melbourne'],
            'JP': ['Asia/Tokyo'],
            'CN': ['Asia/Shanghai'],
            'IN': ['Asia/Kolkata'],
            'BR': ['America/Sao_Paulo']
        };
    }

    /**
     * Initialize language data
     */
    initializeLanguages() {
        return {
            'US': { primary: 'en-US', secondary: ['en', 'es-US'] },
            'UK': { primary: 'en-GB', secondary: ['en'] },
            'CA': { primary: 'en-CA', secondary: ['en', 'fr-CA'] },
            'DE': { primary: 'de-DE', secondary: ['de', 'en'] },
            'FR': { primary: 'fr-FR', secondary: ['fr', 'en'] },
            'AU': { primary: 'en-AU', secondary: ['en'] },
            'JP': { primary: 'ja-JP', secondary: ['ja', 'en'] },
            'CN': { primary: 'zh-CN', secondary: ['zh', 'en'] },
            'IN': { primary: 'en-IN', secondary: ['en', 'hi'] },
            'BR': { primary: 'pt-BR', secondary: ['pt', 'en'] }
        };
    }

    /**
     * Initialize font lists
     */
    initializeFonts() {
        return {
            windows: [
                'Arial', 'Times New Roman', 'Courier New', 'Verdana', 'Georgia', 'Palatino',
                'Garamond', 'Bookman', 'Comic Sans MS', 'Trebuchet MS', 'Arial Black', 'Impact'
            ],
            macos: [
                'Helvetica Neue', 'Arial', 'Times', 'Courier', 'Verdana', 'Georgia',
                'Palatino', 'Times New Roman', 'Monaco', 'Menlo', 'San Francisco', 'Avenir'
            ],
            linux: [
                'DejaVu Sans', 'Liberation Sans', 'Ubuntu', 'Droid Sans', 'Noto Sans',
                'Open Sans', 'Roboto', 'Source Sans Pro', 'Lato', 'Montserrat'
            ]
        };
    }

    /**
     * Select device profile based on type
     */
    selectDeviceProfile(deviceType) {
        const profiles = this.deviceProfiles[deviceType] || this.deviceProfiles.desktop;
        return this.weightedRandomSelect(profiles);
    }

    /**
     * Select browser profile
     */
    selectBrowserProfile(deviceProfile) {
        const browsers = Object.values(this.browserProfiles);
        return this.weightedRandomSelect(browsers, 'marketShare');
    }

    /**
     * Select OS profile based on device
     */
    selectOSProfile(deviceProfile) {
        let osOptions;
        
        if (deviceProfile.type === 'mobile') {
            osOptions = [this.osProfiles.android, this.osProfiles.ios];
        } else if (deviceProfile.type === 'tablet') {
            osOptions = [this.osProfiles.android, this.osProfiles.ios];
        } else {
            osOptions = [this.osProfiles.windows, this.osProfiles.macos, this.osProfiles.linux];
        }
        
        return this.weightedRandomSelect(osOptions, 'marketShare');
    }

    /**
     * Select screen profile
     */
    selectScreenProfile(deviceProfile) {
        const resolutions = this.screenResolutions[deviceProfile.type];
        const resolution = this.randomSelect(resolutions);
        
        return {
            screen: {
                width: resolution.width,
                height: resolution.height,
                pixelDepth: 24,
                colorDepth: 24,
                availWidth: resolution.width,
                availHeight: resolution.height - (deviceProfile.type === 'desktop' ? 40 : 0)
            },
            viewport: {
                width: resolution.width - (deviceProfile.type === 'desktop' ? this.randomInt(0, 20) : 0),
                height: resolution.height - (deviceProfile.type === 'desktop' ? this.randomInt(60, 120) : 0)
            }
        };
    }

    /**
     * Select location profile
     */
    selectLocationProfile(targetCountry) {
        const country = targetCountry || this.randomSelect(['US', 'UK', 'CA', 'DE', 'FR', 'AU']);
        const timezones = this.timezones[country] || this.timezones['US'];
        const languages = this.languages[country] || this.languages['US'];
        
        return {
            country,
            timezone: this.randomSelect(timezones),
            language: languages.primary,
            languages: [languages.primary, ...languages.secondary]
        };
    }

    /**
     * Generate realistic user agent
     */
    generateUserAgent(browserProfile, osProfile) {
        const version = this.randomSelect(browserProfile.versions);
        const osVersion = this.randomSelect(osProfile.versions);
        const platform = this.randomSelect(osProfile.platforms);
        
        if (browserProfile.name === 'Chrome') {
            return `Mozilla/5.0 (${platform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version} Safari/537.36`;
        } else if (browserProfile.name === 'Firefox') {
            return `Mozilla/5.0 (${platform}; rv:${version}) Gecko/20100101 Firefox/${version}`;
        } else if (browserProfile.name === 'Safari') {
            return `Mozilla/5.0 (${platform}) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${version} Safari/605.1.15`;
        } else if (browserProfile.name === 'Edge') {
            return `Mozilla/5.0 (${platform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version} Safari/537.36 Edg/${version}`;
        }
        
        return `Mozilla/5.0 (${platform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version} Safari/537.36`;
    }

    /**
     * Generate WebGL fingerprint
     */
    generateWebGLFingerprint(deviceProfile) {
        const vendors = ['Intel Inc.', 'NVIDIA Corporation', 'AMD', 'Apple Inc.'];
        const renderers = {
            'Intel Inc.': ['Intel(R) UHD Graphics 620', 'Intel(R) Iris(R) Xe Graphics'],
            'NVIDIA Corporation': ['NVIDIA GeForce RTX 3070', 'NVIDIA GeForce GTX 1660'],
            'AMD': ['AMD Radeon RX 6700 XT', 'AMD Radeon RX 5500 XT'],
            'Apple Inc.': ['Apple M1', 'Apple M2']
        };
        
        const vendor = this.randomSelect(vendors);
        const renderer = this.randomSelect(renderers[vendor]);
        
        return {
            vendor,
            renderer,
            version: 'WebGL 1.0',
            shadingLanguageVersion: 'WebGL GLSL ES 1.0'
        };
    }

    /**
     * Generate canvas fingerprint
     */
    generateCanvasFingerprint() {
        return {
            hash: this.generateRandomHash(32),
            textMetrics: {
                width: this.randomFloat(100, 200),
                actualBoundingBoxLeft: this.randomFloat(0, 10),
                actualBoundingBoxRight: this.randomFloat(100, 200)
            }
        };
    }

    /**
     * Generate audio context fingerprint
     */
    generateAudioFingerprint() {
        return {
            sampleRate: this.randomSelect([44100, 48000]),
            maxChannelCount: this.randomSelect([2, 6, 8]),
            numberOfInputs: this.randomInt(0, 2),
            numberOfOutputs: this.randomInt(0, 2),
            channelCount: this.randomSelect([1, 2]),
            channelCountMode: this.randomSelect(['max', 'clamped-max', 'explicit'])
        };
    }

    /**
     * Generate WebRTC fingerprint
     */
    generateWebRTCFingerprint() {
        return {
            localIP: this.generateLocalIP(),
            publicIP: this.generatePublicIP(),
            candidateTypes: ['host', 'srflx', 'relay']
        };
    }

    /**
     * Utility functions
     */
    randomSelect(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    weightedRandomSelect(array, weightProperty = null) {
        if (!weightProperty) {
            return this.randomSelect(array);
        }
        
        const totalWeight = array.reduce((sum, item) => sum + item[weightProperty], 0);
        let random = Math.random() * totalWeight;
        
        for (const item of array) {
            random -= item[weightProperty];
            if (random <= 0) return item;
        }
        
        return array[0];
    }

    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    randomFloat(min, max) {
        return Math.random() * (max - min) + min;
    }

    generateRandomHash(length) {
        const chars = '0123456789abcdef';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    generateLocalIP() {
        return `192.168.${this.randomInt(1, 255)}.${this.randomInt(1, 255)}`;
    }

    generatePublicIP() {
        return `${this.randomInt(1, 255)}.${this.randomInt(1, 255)}.${this.randomInt(1, 255)}.${this.randomInt(1, 255)}`;
    }

    randomizeHardwareConcurrency(deviceProfile) {
        const cores = Array.isArray(deviceProfile.cores) ? 
            this.randomSelect(deviceProfile.cores) : deviceProfile.cores;
        return cores || this.randomInt(2, 8);
    }

    randomizeDeviceMemory(deviceProfile) {
        const ram = Array.isArray(deviceProfile.ram) ? 
            this.randomSelect(deviceProfile.ram) : deviceProfile.ram;
        return ram || this.randomInt(4, 16);
    }

    randomizeConnectionType(deviceProfile) {
        if (deviceProfile.type === 'mobile') {
            return this.randomSelect(['4g', '5g', 'wifi']);
        }
        return this.randomSelect(['ethernet', 'wifi']);
    }

    generatePlugins(browserProfile) {
        const commonPlugins = [
            'Chrome PDF Plugin',
            'Chrome PDF Viewer',
            'Native Client'
        ];
        
        return commonPlugins.slice(0, this.randomInt(1, commonPlugins.length));
    }

    generateFontList(osProfile) {
        const fonts = this.fonts[osProfile.name.toLowerCase()] || this.fonts.windows;
        const count = this.randomInt(Math.floor(fonts.length * 0.6), fonts.length);
        return this.shuffleArray([...fonts]).slice(0, count);
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    generateFingerprintId() {
        return `fp_${Date.now()}_${this.generateRandomHash(8)}`;
    }

    /**
     * Get fingerprint statistics
     */
    getStats() {
        return {
            totalGenerated: this.fingerprintHistory.length,
            uniqueFingerprints: this.usedFingerprints.size,
            deviceTypeDistribution: this.getDeviceTypeDistribution(),
            countryDistribution: this.getCountryDistribution()
        };
    }

    getDeviceTypeDistribution() {
        const distribution = {};
        this.fingerprintHistory.forEach(fp => {
            distribution[fp.device.type] = (distribution[fp.device.type] || 0) + 1;
        });
        return distribution;
    }

    getCountryDistribution() {
        const distribution = {};
        this.fingerprintHistory.forEach(fp => {
            distribution[fp.country] = (distribution[fp.country] || 0) + 1;
        });
        return distribution;
    }
}

module.exports = { FingerprintRandomizer };