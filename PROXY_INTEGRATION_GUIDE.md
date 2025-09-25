# Bangladesh Proxy Integration Guide

This guide explains how to integrate real proxy services with the Bangladesh IP routing system for Google searches.

## Table of Contents

1. [Overview](#overview)
2. [Supported Proxy Providers](#supported-proxy-providers)
3. [Quick Setup](#quick-setup)
4. [Provider-Specific Configuration](#provider-specific-configuration)
5. [Advanced Configuration](#advanced-configuration)
6. [Testing and Validation](#testing-and-validation)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

## Overview

The Bangladesh IP routing system is designed to route Google searches through Bangladesh-based proxy servers to ensure geographically accurate search results. This system supports multiple proxy providers and can automatically rotate between different Bangladesh IPs.

### Key Features

- ✅ **Automatic IP Rotation**: Each Google search uses a unique Bangladesh IP
- ✅ **Provider Flexibility**: Support for multiple proxy providers
- ✅ **Geographic Targeting**: City-level targeting within Bangladesh
- ✅ **Carrier Simulation**: Mobile carrier and ISP-specific routing
- ✅ **Session Management**: Proper session isolation and cleanup
- ✅ **Reliability Tracking**: Automatic proxy health monitoring

## Supported Proxy Providers

### Tier 1 Providers (Recommended)

| Provider | Type | Bangladesh Support | Pricing | Setup Difficulty |
|----------|------|-------------------|---------|------------------|
| **Bright Data** | Residential/Mobile | ✅ Excellent | $$$ | Medium |
| **Oxylabs** | Residential/Datacenter | ✅ Good | $$$ | Easy |
| **Smartproxy** | Residential | ✅ Good | $$ | Easy |

### Tier 2 Providers (Budget Options)

| Provider | Type | Bangladesh Support | Pricing | Setup Difficulty |
|----------|------|-------------------|---------|------------------|
| **IPRoyal** | Residential/Datacenter | ⚠️ Limited | $ | Easy |
| **NetNut** | Residential | ⚠️ Limited | $$ | Medium |
| **ProxyMesh** | Datacenter | ❌ No BD-specific | $ | Easy |

## Quick Setup

### Step 1: Choose a Provider

For Bangladesh-specific routing, we recommend **Bright Data** or **Oxylabs** as they have the best Bangladesh IP coverage.

### Step 2: Get Credentials

Sign up with your chosen provider and obtain:
- Username
- Password
- Endpoint URL
- Port number
- Any additional authentication tokens

### Step 3: Configure the System

1. Open `src/config/proxy-providers.js`
2. Find your provider's configuration section
3. Replace placeholder credentials with your actual credentials
4. Set `enabled: true` for your provider

Example for Bright Data:
```javascript
BRIGHT_DATA: {
    name: 'Bright Data',
    type: 'residential',
    country: 'BD',
    enabled: true, // ← Change this to true
    config: {
        username: 'your-actual-username', // ← Your credentials
        password: 'your-actual-password', // ← Your credentials
        endpoint: 'zproxy.lum-superproxy.io',
        port: 22225,
        // ... rest of config
    }
}
```

### Step 4: Update Proxy Manager

Modify `src/core/proxy-manager.js` to load from your provider configuration:

```javascript
// Replace the dummy configurations with real provider configs
async loadProxyConfigurations() {
    const { PROXY_PROVIDERS } = require('../config/proxy-providers');
    
    // Load enabled providers
    const enabledProviders = Object.values(PROXY_PROVIDERS)
        .filter(provider => provider.enabled && provider.country === 'BD');
    
    // Convert to internal proxy format
    this.proxies = this.convertProviderConfigs(enabledProviders);
}
```

## Provider-Specific Configuration

### Bright Data (Luminati)

**Best for**: High-volume, enterprise applications

```javascript
// Configuration example
{
    username: 'brd-customer-hl_12345678-zone-residential',
    password: 'your_password_here',
    endpoint: 'zproxy.lum-superproxy.io',
    port: 22225,
    country: 'BD',
    city: 'dhaka', // Options: dhaka, chittagong, sylhet
    session: 'session-{random}' // Automatic session rotation
}
```

**Special Features**:
- City-level targeting
- Mobile carrier targeting
- ASN-specific routing
- Session stickiness control

**Setup Steps**:
1. Create a residential proxy zone in Bright Data dashboard
2. Enable Bangladesh country targeting
3. Configure session management (recommended: 10-minute sessions)
4. Set up IP rotation (recommended: every request)

### Oxylabs

**Best for**: Reliable, consistent performance

```javascript
// Configuration example
{
    username: 'customer-your_username',
    password: 'your_password_here',
    endpoint: 'pr.oxylabs.io',
    port: 7777,
    country: 'BD',
    session: 'session_{random}'
}
```

**Special Features**:
- High success rates
- Good Bangladesh coverage
- Both residential and datacenter options

**Setup Steps**:
1. Purchase residential proxy package
2. Enable Bangladesh in your dashboard
3. Configure endpoint authentication
4. Test connection with provided credentials

### Smartproxy

**Best for**: Budget-conscious projects

```javascript
// Configuration example
{
    username: 'sp12345678',
    password: 'your_password_here',
    endpoint: 'gate.smartproxy.com',
    port: 10000,
    country: 'BD',
    session: 'session-{random}'
}
```

**Setup Steps**:
1. Purchase residential proxy plan
2. Whitelist your server IP
3. Configure sticky sessions if needed
4. Test with Bangladesh targeting

## Advanced Configuration

### Multiple Provider Setup

You can configure multiple providers for redundancy:

```javascript
// Enable multiple providers
BRIGHT_DATA: { enabled: true, priority: 1 },
OXYLABS: { enabled: true, priority: 2 },
SMARTPROXY: { enabled: true, priority: 3 }
```

### City-Specific Targeting

Target specific Bangladesh cities for more precise geolocation:

```javascript
const cityConfigs = {
    dhaka: { population: 9000000, priority: 'high' },
    chittagong: { population: 2500000, priority: 'medium' },
    sylhet: { population: 500000, priority: 'low' }
};
```

### Mobile Carrier Simulation

Simulate specific mobile carriers for mobile search behavior:

```javascript
const carrierConfigs = {
    grameenphone: { market_share: 0.45, asn: 'AS45245' },
    robi: { market_share: 0.30, asn: 'AS38726' },
    banglalink: { market_share: 0.20, asn: 'AS45724' },
    teletalk: { market_share: 0.05, asn: 'AS38726' }
};
```

## Testing and Validation

### Basic Connection Test

```bash
# Test proxy connectivity
node test-bangladesh-proxy.js
```

### IP Verification

Verify that you're getting Bangladesh IPs:

```javascript
// Add to your test script
const response = await fetch('https://ipapi.co/json/', {
    agent: proxyAgent
});
const ipInfo = await response.json();
console.log('Country:', ipInfo.country_name); // Should be "Bangladesh"
console.log('City:', ipInfo.city);
console.log('ISP:', ipInfo.org);
```

### Google Search Test

Test actual Google searches:

```javascript
// Test Google search with Bangladesh IP
const searchUrl = 'https://www.google.com/search?q=weather+dhaka';
const response = await page.goto(searchUrl);
// Verify results are Bangladesh-specific
```

## Troubleshooting

### Common Issues

#### 1. Authentication Failures
```
Error: 407 Proxy Authentication Required
```
**Solution**: Verify username/password and check IP whitelist

#### 2. No Bangladesh IPs Available
```
Error: No available Bangladesh proxies
```
**Solution**: Check provider dashboard for Bangladesh availability

#### 3. Rate Limiting
```
Error: 429 Too Many Requests
```
**Solution**: Implement request delays and session rotation

#### 4. IP Blocked by Google
```
Error: Unusual traffic detected
```
**Solution**: Rotate IPs more frequently, add human-like delays

### Debug Mode

Enable debug logging:

```javascript
// In proxy-manager.js
const DEBUG_MODE = true;

if (DEBUG_MODE) {
    console.log('Proxy request:', proxyConfig);
    console.log('Response headers:', response.headers);
}
```

### Health Monitoring

Monitor proxy health:

```javascript
// Check proxy success rates
const stats = proxyManager.getBangladeshProxyStats();
console.log('Success rate:', stats.successRate);
console.log('Active proxies:', stats.activeBangladeshProxies);
```

## Best Practices

### 1. IP Rotation Strategy

- **Frequency**: Rotate IP for every Google search
- **Diversity**: Use different cities and ISPs
- **Timing**: Add random delays between requests

### 2. Session Management

- **Duration**: Keep sessions under 10 minutes
- **Isolation**: Use separate sessions for different searches
- **Cleanup**: Always close sessions properly

### 3. Error Handling

- **Retry Logic**: Implement exponential backoff
- **Fallback**: Have backup providers configured
- **Monitoring**: Track success rates and response times

### 4. Compliance

- **Rate Limits**: Respect Google's rate limits
- **Terms of Service**: Follow both proxy provider and Google ToS
- **Data Privacy**: Handle search data responsibly

### 5. Performance Optimization

- **Connection Pooling**: Reuse connections when possible
- **Caching**: Cache proxy configurations
- **Monitoring**: Track performance metrics

## Cost Optimization

### Provider Comparison

| Provider | Cost per GB | Bangladesh Coverage | Recommended Use |
|----------|-------------|-------------------|-----------------|
| Bright Data | $15-25 | Excellent | Enterprise |
| Oxylabs | $10-20 | Good | Production |
| Smartproxy | $5-15 | Good | Development |

### Usage Tips

1. **Monitor Usage**: Track data consumption
2. **Optimize Requests**: Minimize unnecessary requests
3. **Session Reuse**: Reuse sessions when possible
4. **Bulk Operations**: Batch requests when appropriate

## Support and Resources

### Provider Documentation

- [Bright Data Documentation](https://docs.brightdata.com/)
- [Oxylabs Documentation](https://developers.oxylabs.io/)
- [Smartproxy Documentation](https://help.smartproxy.com/)

### Community Resources

- [Proxy Provider Comparison](https://proxyway.com/)
- [Bangladesh IP Ranges](https://www.countryipblocks.net/country/BD)
- [Google Search API Guidelines](https://developers.google.com/custom-search)

### Getting Help

1. **Provider Support**: Contact your proxy provider's support team
2. **Documentation**: Check provider-specific documentation
3. **Community Forums**: Join proxy and web scraping communities
4. **Testing Tools**: Use online proxy testing tools

---

**Note**: This system is designed for legitimate research and development purposes. Always comply with applicable laws, terms of service, and ethical guidelines when using proxy services and accessing web content.