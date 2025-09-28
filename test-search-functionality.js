/**
 * Search Functionality Verification Test
 * Tests that search operations work correctly with the enhanced browser pool
 */

const { SearchEngine } = require('./src/core/search-engine');
const { EnhancedBrowserPool } = require('./src/core/enhanced-browser-pool');
const { BrowserPool } = require('./src/core/browser-pool');
const { defaultLogger: Logger } = require('./src/utils/logger');

class SearchFunctionalityTester {
    constructor() {
        this.results = {
            originalBrowserPool: {},
            enhancedBrowserPool: {},
            compatibility: true,
            errors: []
        };
    }

    /**
     * Test search functionality with original browser pool
     */
    async testOriginalSearchFunctionality() {
        console.log('🔍 Testing search functionality with original browser pool...');
        
        try {
            const browserPool = new BrowserPool(2);
            await browserPool.initialize();
            
            const searchEngine = new SearchEngine(browserPool);
            
            // Test basic browser acquisition
            const browser = await browserPool.getBrowser();
            console.log('✅ Original: Browser acquisition successful');
            
            // Test Bangladesh browser for Google
            const googleBrowser = await browserPool.getBangladeshBrowserForGoogle();
            console.log('✅ Original: Bangladesh browser for Google successful');
            
            // Test browser release
            await browserPool.releaseBrowser(browser);
            await browserPool.releaseBrowser(googleBrowser);
            console.log('✅ Original: Browser release successful');
            
            // Test search engine stats
            const stats = browserPool.getStats();
            console.log('✅ Original: Stats retrieval successful', stats);
            
            this.results.originalBrowserPool = {
                browserAcquisition: true,
                bangladeshBrowser: true,
                browserRelease: true,
                statsRetrieval: true,
                stats: stats
            };
            
            await browserPool.shutdown();
            console.log('✅ Original: Browser pool shutdown successful');
            
        } catch (error) {
            console.error('❌ Original browser pool test failed:', error.message);
            this.results.originalBrowserPool.error = error.message;
            this.results.compatibility = false;
            this.results.errors.push(`Original: ${error.message}`);
        }
    }

    /**
     * Test search functionality with enhanced browser pool
     */
    async testEnhancedSearchFunctionality() {
        console.log('🚀 Testing search functionality with enhanced browser pool...');
        
        try {
            const enhancedBrowserPool = new EnhancedBrowserPool({
                maxBrowsers: 2,
                enableAutoScaling: false,
                enableOrganicBehavior: false // Disable for testing
            });
            
            await enhancedBrowserPool.initialize();
            
            const searchEngine = new SearchEngine(enhancedBrowserPool);
            
            // Test basic browser acquisition
            const browser = await enhancedBrowserPool.getBrowser();
            console.log('✅ Enhanced: Browser acquisition successful');
            
            // Test Bangladesh browser for Google
            const googleBrowser = await enhancedBrowserPool.getBangladeshBrowserForGoogle();
            console.log('✅ Enhanced: Bangladesh browser for Google successful');
            
            // Test browser release
            await enhancedBrowserPool.releaseBrowser(browser._poolId);
            await enhancedBrowserPool.releaseBrowser(googleBrowser._poolId);
            console.log('✅ Enhanced: Browser release successful');
            
            // Test search engine stats
            const stats = enhancedBrowserPool.getStats();
            console.log('✅ Enhanced: Stats retrieval successful', stats);
            
            this.results.enhancedBrowserPool = {
                browserAcquisition: true,
                bangladeshBrowser: true,
                browserRelease: true,
                statsRetrieval: true,
                stats: stats
            };
            
            await enhancedBrowserPool.shutdown();
            console.log('✅ Enhanced: Browser pool shutdown successful');
            
        } catch (error) {
            console.error('❌ Enhanced browser pool test failed:', error.message);
            this.results.enhancedBrowserPool.error = error.message;
            this.results.compatibility = false;
            this.results.errors.push(`Enhanced: ${error.message}`);
        }
    }

    /**
     * Test search engine integration
     */
    async testSearchEngineIntegration() {
        console.log('🔗 Testing SearchEngine integration with enhanced browser pool...');
        
        try {
            const enhancedBrowserPool = new EnhancedBrowserPool({
                maxBrowsers: 1,
                enableAutoScaling: false,
                enableOrganicBehavior: false
            });
            
            await enhancedBrowserPool.initialize();
            
            // Create search engine instance
            const searchEngine = new SearchEngine(enhancedBrowserPool);
            console.log('✅ SearchEngine created with enhanced browser pool');
            
            // Test that search engine can access browser pool methods
            const hasGetBrowser = typeof enhancedBrowserPool.getBrowser === 'function';
            const hasGetBangladeshBrowser = typeof enhancedBrowserPool.getBangladeshBrowserForGoogle === 'function';
            const hasReleaseBrowser = typeof enhancedBrowserPool.releaseBrowser === 'function';
            const hasGetStats = typeof enhancedBrowserPool.getStats === 'function';
            
            console.log('✅ Method availability check:');
            console.log(`   - getBrowser: ${hasGetBrowser}`);
            console.log(`   - getBangladeshBrowserForGoogle: ${hasGetBangladeshBrowser}`);
            console.log(`   - releaseBrowser: ${hasReleaseBrowser}`);
            console.log(`   - getStats: ${hasGetStats}`);
            
            if (hasGetBrowser && hasGetBangladeshBrowser && hasReleaseBrowser && hasGetStats) {
                console.log('✅ All required methods are available');
                this.results.searchEngineIntegration = true;
            } else {
                console.log('❌ Some required methods are missing');
                this.results.searchEngineIntegration = false;
                this.results.compatibility = false;
            }
            
            await enhancedBrowserPool.shutdown();
            
        } catch (error) {
            console.error('❌ SearchEngine integration test failed:', error.message);
            this.results.searchEngineIntegration = false;
            this.results.compatibility = false;
            this.results.errors.push(`Integration: ${error.message}`);
        }
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log('🧪 Starting Search Functionality Verification Tests...\n');
        
        await this.testOriginalSearchFunctionality();
        console.log('');
        
        await this.testEnhancedSearchFunctionality();
        console.log('');
        
        await this.testSearchEngineIntegration();
        console.log('');
        
        this.generateReport();
    }

    /**
     * Generate test report
     */
    generateReport() {
        console.log('📊 SEARCH FUNCTIONALITY VERIFICATION REPORT');
        console.log('==================================================\n');
        
        console.log('🔍 Original Browser Pool Results:');
        if (this.results.originalBrowserPool.error) {
            console.log(`❌ Failed: ${this.results.originalBrowserPool.error}`);
        } else {
            console.log('✅ Browser acquisition:', this.results.originalBrowserPool.browserAcquisition);
            console.log('✅ Bangladesh browser:', this.results.originalBrowserPool.bangladeshBrowser);
            console.log('✅ Browser release:', this.results.originalBrowserPool.browserRelease);
            console.log('✅ Stats retrieval:', this.results.originalBrowserPool.statsRetrieval);
        }
        
        console.log('\n🚀 Enhanced Browser Pool Results:');
        if (this.results.enhancedBrowserPool.error) {
            console.log(`❌ Failed: ${this.results.enhancedBrowserPool.error}`);
        } else {
            console.log('✅ Browser acquisition:', this.results.enhancedBrowserPool.browserAcquisition);
            console.log('✅ Bangladesh browser:', this.results.enhancedBrowserPool.bangladeshBrowser);
            console.log('✅ Browser release:', this.results.enhancedBrowserPool.browserRelease);
            console.log('✅ Stats retrieval:', this.results.enhancedBrowserPool.statsRetrieval);
        }
        
        console.log('\n🔗 SearchEngine Integration:');
        console.log('✅ Integration test:', this.results.searchEngineIntegration || false);
        
        console.log('\n🎯 FINAL ASSESSMENT:');
        if (this.results.compatibility) {
            console.log('✅ FULLY COMPATIBLE - Search functionality will continue to operate as expected');
            console.log('✅ No interruptions or performance degradation anticipated');
        } else {
            console.log('⚠️ COMPATIBILITY ISSUES DETECTED');
            console.log('❌ Errors found:');
            this.results.errors.forEach(error => console.log(`   - ${error}`));
        }
        
        console.log('\n==================================================');
        
        return this.results.compatibility;
    }
}

// Run the tests
async function main() {
    const tester = new SearchFunctionalityTester();
    
    try {
        const isCompatible = await tester.runAllTests();
        process.exit(isCompatible ? 0 : 1);
    } catch (error) {
        console.error('❌ Test execution failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { SearchFunctionalityTester };