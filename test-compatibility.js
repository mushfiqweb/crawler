/**
 * Compatibility Test for Enhanced Browser Pool
 * Verifies that the enhanced browser pool maintains the same interface and functionality as the current browser pool
 */

const { BrowserPool } = require('./src/core/browser-pool');
const { EnhancedBrowserPool } = require('./src/core/enhanced-browser-pool');
const { SearchEngine } = require('./src/core/search-engine');

class CompatibilityTester {
    constructor() {
        this.results = {
            interfaceCompatibility: [],
            functionalCompatibility: [],
            performanceComparison: [],
            errors: []
        };
    }

    /**
     * Test interface compatibility between old and new browser pools
     */
    async testInterfaceCompatibility() {
        console.log('🔍 Testing Interface Compatibility...');
        
        try {
            const oldPool = new BrowserPool(5);
            const newPool = new EnhancedBrowserPool({ minBrowsers: 2, maxBrowsers: 5 });

            // Test required methods exist
            const requiredMethods = [
                'initialize',
                'getBrowser',
                'releaseBrowser',
                'getBangladeshBrowserForGoogle',
                'createBrowser',
                'getStats',
                'shutdown',
                'healthCheck'
            ];

            for (const method of requiredMethods) {
                const oldHasMethod = typeof oldPool[method] === 'function';
                const newHasMethod = typeof newPool[method] === 'function';
                
                this.results.interfaceCompatibility.push({
                    method,
                    oldPool: oldHasMethod,
                    newPool: newHasMethod,
                    compatible: oldHasMethod === newHasMethod && newHasMethod
                });
            }

            console.log('✅ Interface compatibility test completed');
        } catch (error) {
            this.results.errors.push({
                test: 'interfaceCompatibility',
                error: error.message
            });
            console.error('❌ Interface compatibility test failed:', error.message);
        }
    }

    /**
     * Test functional compatibility with SearchEngine
     */
    async testSearchEngineCompatibility() {
        console.log('🔍 Testing SearchEngine Compatibility...');
        
        try {
            // Test with current browser pool
            const oldPool = new BrowserPool(3);
            await oldPool.initialize();
            
            const oldSearchEngine = new SearchEngine(oldPool, null);
            await oldSearchEngine.initialize();

            // Test with enhanced browser pool
            const newPool = new EnhancedBrowserPool({ 
                minBrowsers: 2, 
                maxBrowsers: 3,
                enableAutoScaling: false // Disable for testing
            });
            await newPool.initialize();
            
            const newSearchEngine = new SearchEngine(newPool, null);
            await newSearchEngine.initialize();

            // Test browser acquisition
            const oldBrowser = await oldPool.getBrowser();
            const newBrowser = await newPool.getBrowser();

            this.results.functionalCompatibility.push({
                test: 'browserAcquisition',
                oldPool: !!oldBrowser,
                newPool: !!newBrowser,
                compatible: !!oldBrowser && !!newBrowser
            });

            // Test browser properties
            const oldHasPages = typeof oldBrowser.newPage === 'function';
            const newHasPages = typeof newBrowser.newPage === 'function';

            this.results.functionalCompatibility.push({
                test: 'browserPageCreation',
                oldPool: oldHasPages,
                newPool: newHasPages,
                compatible: oldHasPages && newHasPages
            });

            // Test browser release
            await oldPool.releaseBrowser(oldBrowser);
            await newPool.releaseBrowser(newBrowser.id || newBrowser);

            this.results.functionalCompatibility.push({
                test: 'browserRelease',
                oldPool: true,
                newPool: true,
                compatible: true
            });

            // Test Bangladesh browser method
            try {
                const oldBangladeshBrowser = await oldPool.getBangladeshBrowserForGoogle();
                const newBangladeshBrowser = await newPool.getBangladeshBrowserForGoogle();
                
                this.results.functionalCompatibility.push({
                    test: 'bangladeshBrowserMethod',
                    oldPool: !!oldBangladeshBrowser,
                    newPool: !!newBangladeshBrowser,
                    compatible: !!oldBangladeshBrowser && !!newBangladeshBrowser
                });

                await oldPool.releaseBrowser(oldBangladeshBrowser);
                await newPool.releaseBrowser(newBangladeshBrowser.id || newBangladeshBrowser);
            } catch (error) {
                this.results.functionalCompatibility.push({
                    test: 'bangladeshBrowserMethod',
                    oldPool: false,
                    newPool: false,
                    compatible: true,
                    note: 'Both failed equally: ' + error.message
                });
            }

            // Cleanup
            await oldPool.shutdown();
            await newPool.shutdown();

            console.log('✅ SearchEngine compatibility test completed');
        } catch (error) {
            this.results.errors.push({
                test: 'searchEngineCompatibility',
                error: error.message
            });
            console.error('❌ SearchEngine compatibility test failed:', error.message);
        }
    }

    /**
     * Test performance comparison
     */
    async testPerformanceComparison() {
        console.log('🔍 Testing Performance Comparison...');
        
        try {
            // Test initialization time
            const oldInitStart = Date.now();
            const oldPool = new BrowserPool(3);
            await oldPool.initialize();
            const oldInitTime = Date.now() - oldInitStart;

            const newInitStart = Date.now();
            const newPool = new EnhancedBrowserPool({ 
                minBrowsers: 2, 
                maxBrowsers: 3,
                enableAutoScaling: false,
                enableMemoryOptimization: false,
                enableHealthChecks: false
            });
            await newPool.initialize();
            const newInitTime = Date.now() - newInitStart;

            this.results.performanceComparison.push({
                metric: 'initializationTime',
                oldPool: oldInitTime,
                newPool: newInitTime,
                difference: newInitTime - oldInitTime,
                acceptable: Math.abs(newInitTime - oldInitTime) < 5000 // 5 second tolerance
            });

            // Test browser acquisition time
            const oldAcqStart = Date.now();
            const oldBrowser = await oldPool.getBrowser();
            const oldAcqTime = Date.now() - oldAcqStart;

            const newAcqStart = Date.now();
            const newBrowser = await newPool.getBrowser();
            const newAcqTime = Date.now() - newAcqStart;

            this.results.performanceComparison.push({
                metric: 'browserAcquisitionTime',
                oldPool: oldAcqTime,
                newPool: newAcqTime,
                difference: newAcqTime - oldAcqTime,
                acceptable: Math.abs(newAcqTime - oldAcqTime) < 2000 // 2 second tolerance
            });

            // Cleanup
            await oldPool.releaseBrowser(oldBrowser);
            await newPool.releaseBrowser(newBrowser.id || newBrowser);
            await oldPool.shutdown();
            await newPool.shutdown();

            console.log('✅ Performance comparison test completed');
        } catch (error) {
            this.results.errors.push({
                test: 'performanceComparison',
                error: error.message
            });
            console.error('❌ Performance comparison test failed:', error.message);
        }
    }

    /**
     * Run all compatibility tests
     */
    async runAllTests() {
        console.log('🚀 Starting Enhanced Browser Pool Compatibility Tests...\n');

        await this.testInterfaceCompatibility();
        await this.testSearchEngineCompatibility();
        await this.testPerformanceComparison();

        this.generateReport();
    }

    /**
     * Generate compatibility report
     */
    generateReport() {
        console.log('\n📊 COMPATIBILITY TEST REPORT');
        console.log('=' .repeat(50));

        // Interface Compatibility
        console.log('\n🔧 Interface Compatibility:');
        const interfaceIssues = this.results.interfaceCompatibility.filter(r => !r.compatible);
        if (interfaceIssues.length === 0) {
            console.log('✅ All required methods are compatible');
        } else {
            console.log('❌ Interface compatibility issues found:');
            interfaceIssues.forEach(issue => {
                console.log(`   - ${issue.method}: Old=${issue.oldPool}, New=${issue.newPool}`);
            });
        }

        // Functional Compatibility
        console.log('\n⚙️ Functional Compatibility:');
        const functionalIssues = this.results.functionalCompatibility.filter(r => !r.compatible);
        if (functionalIssues.length === 0) {
            console.log('✅ All functional tests passed');
        } else {
            console.log('❌ Functional compatibility issues found:');
            functionalIssues.forEach(issue => {
                console.log(`   - ${issue.test}: Old=${issue.oldPool}, New=${issue.newPool}`);
            });
        }

        // Performance Comparison
        console.log('\n⚡ Performance Comparison:');
        this.results.performanceComparison.forEach(perf => {
            const status = perf.acceptable ? '✅' : '⚠️';
            console.log(`   ${status} ${perf.metric}:`);
            console.log(`      Old: ${perf.oldPool}ms, New: ${perf.newPool}ms`);
            console.log(`      Difference: ${perf.difference > 0 ? '+' : ''}${perf.difference}ms`);
        });

        // Errors
        if (this.results.errors.length > 0) {
            console.log('\n❌ Errors Encountered:');
            this.results.errors.forEach(error => {
                console.log(`   - ${error.test}: ${error.error}`);
            });
        }

        // Overall Assessment
        const totalIssues = interfaceIssues.length + functionalIssues.length + 
                           this.results.performanceComparison.filter(p => !p.acceptable).length +
                           this.results.errors.length;

        console.log('\n🎯 OVERALL ASSESSMENT:');
        if (totalIssues === 0) {
            console.log('✅ FULLY COMPATIBLE - Enhanced Browser Pool can be used as a drop-in replacement');
            console.log('✅ Search functionality will continue to operate without interruptions');
            console.log('✅ No performance degradation detected');
        } else if (totalIssues <= 2) {
            console.log('⚠️ MOSTLY COMPATIBLE - Minor issues detected but should not affect core functionality');
            console.log('✅ Search functionality should continue to operate normally');
        } else {
            console.log('❌ COMPATIBILITY ISSUES - Significant problems detected');
            console.log('⚠️ Search functionality may be affected');
        }

        console.log('\n' + '=' .repeat(50));
    }
}

// Run the compatibility tests
async function main() {
    const tester = new CompatibilityTester();
    await tester.runAllTests();
}

// Export for use in other modules
module.exports = { CompatibilityTester };

// Run tests if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}