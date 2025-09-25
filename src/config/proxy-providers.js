/**
 * Proxy Provider Configuration Templates
 * 
 * This file contains configuration templates for popular proxy providers
 * that offer Bangladesh IP addresses for Google search routing.
 * 
 * To use a provider:
 * 1. Uncomment the desired provider configuration
 * 2. Replace placeholder credentials with your actual account details
 * 3. Update the proxy-manager.js to use these configurations
 */

const PROXY_PROVIDERS = {
    // Bright Data (formerly Luminati) - Premium residential proxies
    BRIGHT_DATA: {
        name: 'Bright Data',
        type: 'residential',
        country: 'BD',
        enabled: false, // Set to true when configured
        config: {
            // Replace with your Bright Data credentials
            username: 'YOUR_BRIGHT_DATA_USERNAME',
            password: 'YOUR_BRIGHT_DATA_PASSWORD',
            endpoint: 'zproxy.lum-superproxy.io',
            port: 22225,
            sessionId: 'session-{random}', // Will be replaced with random session ID
            // Bangladesh-specific parameters
            country: 'BD',
            city: 'dhaka', // Options: dhaka, chittagong, sylhet, rajshahi, khulna
            asn: '', // Optional: specific ASN for Bangladesh ISPs
            carrier: '', // Optional: grameenphone, robi, banglalink, teletalk
        },
        endpoints: [
            { city: 'dhaka', host: 'zproxy.lum-superproxy.io', port: 22225 },
            { city: 'chittagong', host: 'zproxy.lum-superproxy.io', port: 22225 },
            { city: 'sylhet', host: 'zproxy.lum-superproxy.io', port: 22225 }
        ]
    },

    // Oxylabs - High-quality datacenter and residential proxies
    OXYLABS: {
        name: 'Oxylabs',
        type: 'residential',
        country: 'BD',
        enabled: false,
        config: {
            username: 'YOUR_OXYLABS_USERNAME',
            password: 'YOUR_OXYLABS_PASSWORD',
            endpoint: 'pr.oxylabs.io',
            port: 7777,
            // Bangladesh-specific parameters
            country: 'BD',
            city: '', // Optional: specific city
            session: 'session_{random}',
        },
        endpoints: [
            { type: 'residential', host: 'pr.oxylabs.io', port: 7777 },
            { type: 'datacenter', host: 'dc.oxylabs.io', port: 8001 }
        ]
    },

    // Smartproxy - Affordable residential proxies
    SMARTPROXY: {
        name: 'Smartproxy',
        type: 'residential',
        country: 'BD',
        enabled: false,
        config: {
            username: 'YOUR_SMARTPROXY_USERNAME',
            password: 'YOUR_SMARTPROXY_PASSWORD',
            endpoint: 'gate.smartproxy.com',
            port: 10000,
            // Bangladesh targeting
            country: 'BD',
            session: 'session-{random}',
        },
        endpoints: [
            { host: 'gate.smartproxy.com', port: 10000 },
            { host: 'gate.smartproxy.com', port: 10001 },
            { host: 'gate.smartproxy.com', port: 10002 }
        ]
    },

    // ProxyMesh - Rotating datacenter proxies
    PROXYMESH: {
        name: 'ProxyMesh',
        type: 'datacenter',
        country: 'BD',
        enabled: false,
        config: {
            username: 'YOUR_PROXYMESH_USERNAME',
            password: 'YOUR_PROXYMESH_PASSWORD',
            // ProxyMesh doesn't have Bangladesh-specific endpoints
            // You would need to check their available locations
        },
        endpoints: [
            { host: 'rotating-residential.proxymesh.com', port: 31280 },
            { host: 'us-wa.proxymesh.com', port: 31280 }
        ]
    },

    // IPRoyal - Budget-friendly option
    IPROYAL: {
        name: 'IPRoyal',
        type: 'residential',
        country: 'BD',
        enabled: false,
        config: {
            username: 'YOUR_IPROYAL_USERNAME',
            password: 'YOUR_IPROYAL_PASSWORD',
            endpoint: 'residential.iproyal.com',
            port: 12321,
            country: 'BD',
            session: 'session_{random}',
        },
        endpoints: [
            { host: 'residential.iproyal.com', port: 12321 },
            { host: 'datacenter.iproyal.com', port: 12323 }
        ]
    },

    // NetNut - High-speed residential proxies
    NETNUT: {
        name: 'NetNut',
        type: 'residential',
        country: 'BD',
        enabled: false,
        config: {
            username: 'YOUR_NETNUT_USERNAME',
            password: 'YOUR_NETNUT_PASSWORD',
            endpoint: 'gw.ntnt.io',
            port: 5959,
            country: 'BD',
            session: 'session-{random}',
        },
        endpoints: [
            { host: 'gw.ntnt.io', port: 5959 }
        ]
    }
};

/**
 * Bangladesh ISP and Carrier Information
 * Use this data to target specific networks for more authentic traffic
 */
const BANGLADESH_NETWORKS = {
    ISPs: {
        BTCL: {
            name: 'Bangladesh Telecommunications Company Limited',
            asn: 'AS17494',
            ipRanges: ['103.0.0.0/8', '118.67.0.0/16', '202.4.0.0/16']
        },
        BRACNET: {
            name: 'BRAC Net Limited',
            asn: 'AS38742',
            ipRanges: ['123.49.0.0/16', '180.211.0.0/16']
        },
        AMBERIT: {
            name: 'Amber IT Limited',
            asn: 'AS45912',
            ipRanges: ['103.197.0.0/16', '103.205.0.0/16']
        }
    },
    MOBILE_CARRIERS: {
        GRAMEENPHONE: {
            name: 'Grameenphone Ltd',
            asn: 'AS45245',
            ipRanges: ['114.130.0.0/16', '103.106.0.0/16']
        },
        ROBI: {
            name: 'Robi Axiata Limited',
            asn: 'AS38726',
            ipRanges: ['103.102.0.0/16', '103.108.0.0/16']
        },
        BANGLALINK: {
            name: 'Banglalink Digital Communications Ltd',
            asn: 'AS45724',
            ipRanges: ['103.109.0.0/16', '103.110.0.0/16']
        },
        TELETALK: {
            name: 'Teletalk Bangladesh Limited',
            asn: 'AS38726',
            ipRanges: ['103.111.0.0/16', '103.112.0.0/16']
        }
    },
    CITIES: {
        DHAKA: {
            name: 'Dhaka',
            coordinates: { lat: 23.8103, lng: 90.4125 },
            population: 9000000
        },
        CHITTAGONG: {
            name: 'Chittagong',
            coordinates: { lat: 22.3569, lng: 91.7832 },
            population: 2500000
        },
        SYLHET: {
            name: 'Sylhet',
            coordinates: { lat: 24.8949, lng: 91.8687 },
            population: 500000
        },
        RAJSHAHI: {
            name: 'Rajshahi',
            coordinates: { lat: 24.3745, lng: 88.6042 },
            population: 450000
        },
        KHULNA: {
            name: 'Khulna',
            coordinates: { lat: 22.8456, lng: 89.5403 },
            population: 660000
        }
    }
};

/**
 * Configuration validation rules
 */
const VALIDATION_RULES = {
    required_fields: ['username', 'password', 'endpoint', 'port'],
    optional_fields: ['country', 'city', 'session', 'asn', 'carrier'],
    supported_countries: ['BD'],
    supported_types: ['residential', 'datacenter', 'mobile', 'isp']
};

/**
 * Helper function to generate session IDs
 */
function generateSessionId() {
    return Math.random().toString(36).substring(2, 15);
}

/**
 * Helper function to validate provider configuration
 */
function validateProviderConfig(provider, config) {
    const errors = [];
    
    // Check required fields
    VALIDATION_RULES.required_fields.forEach(field => {
        if (!config[field]) {
            errors.push(`Missing required field: ${field}`);
        }
    });
    
    // Check country support
    if (config.country && !VALIDATION_RULES.supported_countries.includes(config.country)) {
        errors.push(`Unsupported country: ${config.country}`);
    }
    
    return errors;
}

module.exports = {
    PROXY_PROVIDERS,
    BANGLADESH_NETWORKS,
    VALIDATION_RULES,
    generateSessionId,
    validateProviderConfig
};