/**
 * Device Configuration Module
 * Defines user agents, viewports, and device simulation settings
 */

const DEVICE_CONFIGURATIONS = {
    desktop: {
        windows: [
            {
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                viewport: { width: 1920, height: 1080 },
                deviceType: 'desktop',
                os: 'Windows 10',
                browser: 'Chrome 119'
            },
            {
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
                viewport: { width: 1366, height: 768 },
                deviceType: 'desktop',
                os: 'Windows 10',
                browser: 'Chrome 118'
            },
            {
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:119.0) Gecko/20100101 Firefox/119.0',
                viewport: { width: 1920, height: 1080 },
                deviceType: 'desktop',
                os: 'Windows 10',
                browser: 'Firefox 119'
            },
            {
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:118.0) Gecko/20100101 Firefox/118.0',
                viewport: { width: 1440, height: 900 },
                deviceType: 'desktop',
                os: 'Windows 10',
                browser: 'Firefox 118'
            },
            {
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0',
                viewport: { width: 1536, height: 864 },
                deviceType: 'desktop',
                os: 'Windows 10',
                browser: 'Edge 119'
            },
            {
                userAgent: 'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                viewport: { width: 2560, height: 1440 },
                deviceType: 'desktop',
                os: 'Windows 11',
                browser: 'Chrome 119'
            },
            {
                userAgent: 'Mozilla/5.0 (Windows NT 11.0; Win64; x64; rv:119.0) Gecko/20100101 Firefox/119.0',
                viewport: { width: 1920, height: 1200 },
                deviceType: 'desktop',
                os: 'Windows 11',
                browser: 'Firefox 119'
            }
        ],
        macos: [
            {
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                viewport: { width: 1440, height: 900 },
                deviceType: 'desktop',
                os: 'macOS Catalina',
                browser: 'Chrome 119'
            },
            {
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
                viewport: { width: 1680, height: 1050 },
                deviceType: 'desktop',
                os: 'macOS Catalina',
                browser: 'Safari 17.1'
            },
            {
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:119.0) Gecko/20100101 Firefox/119.0',
                viewport: { width: 1920, height: 1080 },
                deviceType: 'desktop',
                os: 'macOS Catalina',
                browser: 'Firefox 119'
            },
            {
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                viewport: { width: 2560, height: 1600 },
                deviceType: 'desktop',
                os: 'macOS Ventura',
                browser: 'Chrome 119'
            },
            {
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
                viewport: { width: 1728, height: 1117 },
                deviceType: 'desktop',
                os: 'macOS Ventura',
                browser: 'Safari 17.1'
            }
        ],
        linux: [
            {
                userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                viewport: { width: 1920, height: 1080 },
                deviceType: 'desktop',
                os: 'Ubuntu 22.04',
                browser: 'Chrome 119'
            },
            {
                userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:119.0) Gecko/20100101 Firefox/119.0',
                viewport: { width: 1366, height: 768 },
                deviceType: 'desktop',
                os: 'Ubuntu 22.04',
                browser: 'Firefox 119'
            },
            {
                userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
                viewport: { width: 1440, height: 900 },
                deviceType: 'desktop',
                os: 'Fedora 38',
                browser: 'Chrome 118'
            }
        ]
    },
    mobile: {
        android: [
            {
                userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
                viewport: { width: 412, height: 915 },
                deviceType: 'mobile',
                os: 'Android 14',
                browser: 'Chrome Mobile 119',
                device: 'Pixel 8 Pro'
            },
            {
                userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
                viewport: { width: 384, height: 854 },
                deviceType: 'mobile',
                os: 'Android 13',
                browser: 'Chrome Mobile 119',
                device: 'Samsung Galaxy S23 Ultra'
            },
            {
                userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36',
                viewport: { width: 393, height: 851 },
                deviceType: 'mobile',
                os: 'Android 13',
                browser: 'Chrome Mobile 118',
                device: 'Pixel 7'
            },
            {
                userAgent: 'Mozilla/5.0 (Linux; Android 12; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
                viewport: { width: 360, height: 800 },
                deviceType: 'mobile',
                os: 'Android 12',
                browser: 'Chrome Mobile 119',
                device: 'Samsung Galaxy S21 Ultra'
            },
            {
                userAgent: 'Mozilla/5.0 (Linux; Android 13; OnePlus 11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
                viewport: { width: 412, height: 919 },
                deviceType: 'mobile',
                os: 'Android 13',
                browser: 'Chrome Mobile 119',
                device: 'OnePlus 11'
            }
        ],
        ios: [
            {
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
                viewport: { width: 393, height: 852 },
                deviceType: 'mobile',
                os: 'iOS 17.1',
                browser: 'Safari Mobile 17.1',
                device: 'iPhone 15 Pro'
            },
            {
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
                viewport: { width: 375, height: 812 },
                deviceType: 'mobile',
                os: 'iOS 16.7',
                browser: 'Safari Mobile 16.6',
                device: 'iPhone 14'
            },
            {
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/119.0.6045.109 Mobile/15E148 Safari/604.1',
                viewport: { width: 414, height: 896 },
                deviceType: 'mobile',
                os: 'iOS 17.0',
                browser: 'Chrome Mobile 119',
                device: 'iPhone 15 Plus'
            },
        ]
    },
    tablet: {
        ipad: [
            {
                userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
                viewport: { width: 820, height: 1180 },
                deviceType: 'tablet',
                os: 'iPadOS 17.1',
                browser: 'Safari Mobile 17.1',
                device: 'iPad Pro'
            },
            {
                userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
                viewport: { width: 768, height: 1024 },
                deviceType: 'tablet',
                os: 'iPadOS 16.7',
                browser: 'Safari Mobile 16.6',
                device: 'iPad Air'
            }
        ]
    }
};

// Create flattened array for validator compatibility
const DEVICE_CONFIGURATIONS_ARRAY = [
    ...DEVICE_CONFIGURATIONS.desktop.windows,
    ...DEVICE_CONFIGURATIONS.desktop.macos,
    ...DEVICE_CONFIGURATIONS.desktop.linux,
    ...DEVICE_CONFIGURATIONS.mobile.android,
    ...DEVICE_CONFIGURATIONS.tablet.ipad
];

module.exports = {
    DEVICE_CONFIGURATIONS: DEVICE_CONFIGURATIONS_ARRAY, // For validator compatibility (flattened array)
    DEVICE_CONFIGURATIONS_STRUCTURED: DEVICE_CONFIGURATIONS // Original structured format
};