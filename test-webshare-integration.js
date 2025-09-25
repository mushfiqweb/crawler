/**
 * Webshare Proxy Integration Test
 * Comprehensive testing of Webshare proxy functionality
 */

const ProxyManager = require('./src/core/proxy-manager');
const WebshareProxyManager = require('./src/core/webshare-proxy-manager');
const ConnectionManager = require('./src/core/connection-manager');
const { defaultLogger: Logger } = require('./src/utils/logger');

class WebshareIntegrationTest {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            total: 0,
            details: []
        };
    }

    /**
     * Run all integration tests
     */
    async runAllTests() {
        console.log('🧪 Starting Webshare Proxy Integration Tests...\n');
        
        try {
            await this.testWebshareProxyManager();
            await this.testProxyManagerIntegration();
            await this.testConnectionManager();
            await this.testErrorHandling();
            await this.testRotationMechanisms();
            await this.testPuppeteerIntegration();
            
            this.printTestSummary();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
            process.exit(1);
        }
    }

    /**
     * Test Webshare Proxy Manager functionality
     */
    async testWebshareProxyManager() {
        console.log('📋 Testing Webshare Proxy Manager...');
        
        const webshareManager = new WebshareProxyManager();
        
        // Test initialization
        await this.runTest('Webshare Manager Initialization', async () => {
            await webshareManager.initialize();
            const stats = webshareManager.getStats();
            return stats.totalProxies === 10;
        });
        
        // Test proxy rotation
        await this.runTest('Proxy Rotation', async () => {
            const proxy1 = await webshareManager.getNextProxy();
            const proxy2 = await webshareManager.getNextProxy();
            return proxy1.id !== proxy2.id;
        });
        
        // Test health checks
        await this.runTest('Health Check System', async () => {
            const healthResults = await webshareManager.performHealthCheck();
            return Array.isArray(healthResults) && healthResults.length > 0;
        });
        
        // Test Puppeteer configuration
        await this.runTest('Puppeteer Configuration', async () => {
            const config = await webshareManager.getPuppeteerConfig();
            return config && config.server && config.username && config.password;
        });
        
        await webshareManager.shutdown();
        console.log('✅ Webshare Proxy Manager tests completed\n');
    }

    /**
     * Test ProxyManager integration with Webshare
     */
    async testProxyManagerIntegration() {
        console.log('📋 Testing ProxyManager Integration...');
        
        const proxyManager = new ProxyManager({
            useWebshareProxies: true,
            webshareFirst: true,
            enableDirectFallback: true
        });
        
        // Test initialization
        await this.runTest('ProxyManager with Webshare Initialization', async () => {
            await proxyManager.initialize();
            const stats = proxyManager.getStats();
            return stats.webshare && stats.webshare.activeProxies > 0;
        });
        
        // Test proxy selection
        await this.runTest('Integrated Proxy Selection', async () => {
            const proxy = await proxyManager.getNextProxy();
            return proxy && proxy.host && proxy.port;
        });
        
        // Test Puppeteer config with integration
        await this.runTest('Integrated Puppeteer Configuration', async () => {
            const config = await proxyManager.getBangladeshProxyConfigForPuppeteer();
            return config && config.server;
        });
        
        // Test statistics
        await this.runTest('Combined Statistics', async () => {
            const stats = proxyManager.getStats();
            return stats.combined && typeof stats.combined.totalProxies === 'number';
        });
        
        await proxyManager.shutdown();
        console.log('✅ ProxyManager Integration tests completed\n');
    }

    /**
     * Test Connection Manager functionality
     */
    async testConnectionManager() {
        console.log('📋 Testing Connection Manager...');
        
        const proxyManager = new ProxyManager({
            useWebshareProxies: true,
            enableDirectFallback: true
        });
        
        await proxyManager.initialize();
        
        const connectionManager = new ConnectionManager(proxyManager, {
            enableDirectFallback: true,
            enableProxyFirst: true
        });
        
        // Test connection modes
        await this.runTest('Connection Mode Setting', async () => {
            connectionManager.setConnectionMode('proxy-only');
            return connectionManager.getConnectionMode() === 'proxy-only';
        });
        
        // Test health check
        await this.runTest('Connection Health Check', async () => {
            const healthResults = await connectionManager.performHealthCheck();
            return healthResults && typeof healthResults.timestamp !== 'undefined';
        });
        
        // Test statistics
        await this.runTest('Connection Statistics', async () => {
            const stats = connectionManager.getStats();
            return stats && typeof stats.totalRequests === 'number';
        });
        
        await connectionManager.shutdown();
        console.log('✅ Connection Manager tests completed\n');
    }

    /**
     * Test error handling and timeout scenarios
     */
    async testErrorHandling() {
        console.log('📋 Testing Error Handling...');
        
        const webshareManager = new WebshareProxyManager();
        await webshareManager.initialize();
        
        // Test invalid URL handling
        await this.runTest('Invalid URL Handling', async () => {
            try {
                await webshareManager.makeRequest('http://invalid-url-that-does-not-exist.com');
                return false; // Should have thrown an error
            } catch (error) {
                return error.message.includes('failed') || error.message.includes('timeout');
            }
        });
        
        // Test timeout handling
        await this.runTest('Timeout Handling', async () => {
            try {
                await webshareManager.makeRequest('https://httpbin.org/delay/10', {
                    timeout: 2000,
                    connectTimeout: 1000
                });
                return false; // Should have timed out
            } catch (error) {
                return error.message.toLowerCase().includes('timeout');
            }
        });
        
        await webshareManager.shutdown();
        console.log('✅ Error Handling tests completed\n');
    }

    /**
     * Test rotation mechanisms
     */
    async testRotationMechanisms() {
        console.log('📋 Testing Rotation Mechanisms...');
        
        const webshareManager = new WebshareProxyManager();
        await webshareManager.initialize();
        
        // Test round-robin rotation
        await this.runTest('Round-Robin Rotation', async () => {
            webshareManager.setRotationStrategy('round-robin');
            const proxies = [];
            for (let i = 0; i < 5; i++) {
                proxies.push(await webshareManager.getNextProxy());
            }
            // Check if we got different proxies
            const uniqueProxies = new Set(proxies.map(p => p.id));
            return uniqueProxies.size > 1;
        });
        
        // Test least-used rotation
        await this.runTest('Least-Used Rotation', async () => {
            webshareManager.setRotationStrategy('least-used');
            const proxy = await webshareManager.getNextProxy();
            return proxy && proxy.id;
        });
        
        // Test best-performance rotation
        await this.runTest('Best-Performance Rotation', async () => {
            webshareManager.setRotationStrategy('best-performance');
            const proxy = await webshareManager.getNextProxy();
            return proxy && proxy.id;
        });
        
        await webshareManager.shutdown();
        console.log('✅ Rotation Mechanisms tests completed\n');
    }

    /**
     * Test Puppeteer integration
     */
    async testPuppeteerIntegration() {
        console.log('📋 Testing Puppeteer Integration...');
        
        const proxyManager = new ProxyManager({
            useWebshareProxies: true,
            webshareFirst: true
        });
        
        await proxyManager.initialize();
        
        // Test Puppeteer config format
        await this.runTest('Puppeteer Config Format', async () => {
            const config = await proxyManager.getBangladeshProxyConfigForPuppeteer();
            return config.server && 
                   config.username && 
                   config.password && 
                   config.proxyId;
        });
        
        // Test multiple Puppeteer configs (different proxies)
        await this.runTest('Multiple Puppeteer Configs', async () => {
            const config1 = await proxyManager.getBangladeshProxyConfigForPuppeteer();
            const config2 = await proxyManager.getBangladeshProxyConfigForPuppeteer();
            return config1.proxyId !== config2.proxyId;
        });
        
        await proxyManager.shutdown();
        console.log('✅ Puppeteer Integration tests completed\n');
    }

    /**
     * Run a single test
     */
    async runTest(testName, testFunction) {
        this.testResults.total++;
        
        try {
            const result = await testFunction();
            if (result) {
                console.log(`  ✅ ${testName}`);
                this.testResults.passed++;
                this.testResults.details.push({ name: testName, status: 'PASSED' });
            } else {
                console.log(`  ❌ ${testName} - Test returned false`);
                this.testResults.failed++;
                this.testResults.details.push({ name: testName, status: 'FAILED', reason: 'Test returned false' });
            }
        } catch (error) {
            console.log(`  ❌ ${testName} - ${error.message}`);
            this.testResults.failed++;
            this.testResults.details.push({ name: testName, status: 'FAILED', reason: error.message });
        }
    }

    /**
     * Print test summary
     */
    printTestSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 TEST SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total Tests: ${this.testResults.total}`);
        console.log(`Passed: ${this.testResults.passed} ✅`);
        console.log(`Failed: ${this.testResults.failed} ❌`);
        console.log(`Success Rate: ${((this.testResults.passed / this.testResults.total) * 100).toFixed(1)}%`);
        
        if (this.testResults.failed > 0) {
            console.log('\n❌ FAILED TESTS:');
            this.testResults.details
                .filter(test => test.status === 'FAILED')
                .forEach(test => {
                    console.log(`  - ${test.name}: ${test.reason}`);
                });
        }
        
        console.log('\n' + '='.repeat(60));
        
        if (this.testResults.failed === 0) {
            console.log('🎉 All tests passed! Webshare integration is working correctly.');
        } else {
            console.log('⚠️ Some tests failed. Please review the implementation.');
        }
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const tester = new WebshareIntegrationTest();
    tester.runAllTests().catch(error => {
        console.error('❌ Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = WebshareIntegrationTest;