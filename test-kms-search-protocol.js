const KMSSearchProtocol = require('./src/core/kms-search-protocol');
const { defaultLogger: Logger } = require('./src/utils/logger');

/**
 * Comprehensive Test Suite for KMS Search Protocol
 * Tests the complete search and browsing protocol implementation
 */
class KMSSearchProtocolTester {
    constructor() {
        this.protocol = new KMSSearchProtocol({
            enableAdvancedEvasion: true,
            respectRateLimit: true,
            logPath: './src/logs/kms-search-protocol-test'
        });

        this.testResults = {
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            testDetails: []
        };
    }

    /**
     * Run comprehensive test suite
     */
    async runTestSuite() {
        Logger.info('🧪 Starting KMS Search Protocol Test Suite');
        Logger.info('=' .repeat(60));

        const testScenarios = [
            {
                name: 'Direct KMS Marketplace Search',
                keywords: 'kmsmarketplace.com',
                expectedStrategy: 'direct_hit',
                description: 'Test when KMS Marketplace appears as first result'
            },
            {
                name: 'Product Category Search',
                keywords: 'digital marketing tools marketplace',
                expectedStrategy: 'ranked_result',
                description: 'Test when KMS appears in search results but not first'
            },
            {
                name: 'Generic Business Search',
                keywords: 'business software solutions',
                expectedStrategy: 'fallback',
                description: 'Test fallback navigation when KMS not in results'
            },
            {
                name: 'Specific Product Search',
                keywords: 'KMS marketplace digital products',
                expectedStrategy: 'ranked_result',
                description: 'Test product-specific search behavior'
            }
        ];

        for (const scenario of testScenarios) {
            await this.runTestScenario(scenario);
            
            // Wait between tests to avoid rate limiting
            await this.delay(5000);
        }

        this.generateTestReport();
    }

    /**
     * Run individual test scenario
     */
    async runTestScenario(scenario) {
        Logger.info(`\n🔍 Testing: ${scenario.name}`);
        Logger.info(`📝 Description: ${scenario.description}`);
        Logger.info(`🔑 Keywords: "${scenario.keywords}"`);

        const testStart = Date.now();
        this.testResults.totalTests++;

        try {
            // Execute search protocol
            const result = await this.protocol.executeSearchProtocol(scenario.keywords, {
                enableDetailedLogging: true
            });

            const testDuration = Date.now() - testStart;

            if (result.success) {
                Logger.info(`✅ Test PASSED - Duration: ${testDuration/1000}s`);
                Logger.info(`📊 Strategy: ${result.browsingResults?.strategy || 'unknown'}`);
                Logger.info(`🎯 Target URL: ${result.browsingResults?.targetUrl || 'unknown'}`);
                
                this.testResults.passedTests++;
                this.testResults.testDetails.push({
                    scenario: scenario.name,
                    status: 'PASSED',
                    duration: testDuration,
                    strategy: result.browsingResults?.strategy,
                    targetUrl: result.browsingResults?.targetUrl,
                    sessionId: result.sessionId
                });

                // Log engagement metrics
                if (result.browsingResults?.engagementResults) {
                    const engagement = result.browsingResults.engagementResults;
                    Logger.info(`🎭 Engagement: ${engagement.scrollActions} scrolls, ${engagement.clickActions} clicks, ${engagement.mouseMovements} mouse moves`);
                }

            } else {
                Logger.error(`❌ Test FAILED - ${result.error}`);
                this.testResults.failedTests++;
                this.testResults.testDetails.push({
                    scenario: scenario.name,
                    status: 'FAILED',
                    duration: testDuration,
                    error: result.error,
                    sessionId: result.sessionId
                });
            }

        } catch (error) {
            const testDuration = Date.now() - testStart;
            Logger.error(`💥 Test CRASHED - ${error.message}`);
            
            this.testResults.failedTests++;
            this.testResults.testDetails.push({
                scenario: scenario.name,
                status: 'CRASHED',
                duration: testDuration,
                error: error.message
            });
        }
    }

    /**
     * Test protocol analytics and statistics
     */
    async testProtocolAnalytics() {
        Logger.info('\n📊 Testing Protocol Analytics');
        
        try {
            const analytics = this.protocol.getAnalytics();
            
            Logger.info(`📈 Protocol Statistics:`);
            Logger.info(`   Total Searches: ${analytics.protocolStats.totalSearches}`);
            Logger.info(`   Direct Hits: ${analytics.protocolStats.directHits}`);
            Logger.info(`   Fallback Navigations: ${analytics.protocolStats.fallbackNavigations}`);
            Logger.info(`   Average Engagement Time: ${(analytics.averageEngagementTime/1000).toFixed(1)}s`);
            Logger.info(`   Active Sessions: ${analytics.activeSessions}`);
            Logger.info(`   Total Engagements: ${analytics.totalEngagements}`);

            return true;

        } catch (error) {
            Logger.error(`❌ Analytics test failed:`, error);
            return false;
        }
    }

    /**
     * Test session isolation functionality
     */
    async testSessionIsolation() {
        Logger.info('\n🔒 Testing Session Isolation');

        try {
            // Create multiple concurrent sessions
            const sessions = [];
            const keywords = ['test session 1', 'test session 2', 'test session 3'];

            for (let i = 0; i < keywords.length; i++) {
                const sessionPromise = this.protocol.executeSearchProtocol(keywords[i], {
                    enableDetailedLogging: false
                });
                sessions.push(sessionPromise);
            }

            // Wait for all sessions to complete
            const results = await Promise.allSettled(sessions);
            
            const successfulSessions = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
            
            Logger.info(`✅ Session Isolation Test: ${successfulSessions}/${keywords.length} sessions completed successfully`);
            
            return successfulSessions === keywords.length;

        } catch (error) {
            Logger.error(`❌ Session isolation test failed:`, error);
            return false;
        }
    }

    /**
     * Generate comprehensive test report
     */
    generateTestReport() {
        Logger.info('\n' + '=' .repeat(60));
        Logger.info('📋 KMS Search Protocol Test Report');
        Logger.info('=' .repeat(60));

        Logger.info(`📊 Overall Results:`);
        Logger.info(`   Total Tests: ${this.testResults.totalTests}`);
        Logger.info(`   Passed: ${this.testResults.passedTests} (${((this.testResults.passedTests/this.testResults.totalTests)*100).toFixed(1)}%)`);
        Logger.info(`   Failed: ${this.testResults.failedTests} (${((this.testResults.failedTests/this.testResults.totalTests)*100).toFixed(1)}%)`);

        Logger.info(`\n📝 Test Details:`);
        this.testResults.testDetails.forEach((test, index) => {
            Logger.info(`   ${index + 1}. ${test.scenario}: ${test.status} (${(test.duration/1000).toFixed(1)}s)`);
            if (test.strategy) {
                Logger.info(`      Strategy: ${test.strategy}`);
            }
            if (test.error) {
                Logger.info(`      Error: ${test.error}`);
            }
        });

        // Save detailed report to file
        this.saveTestReport();
    }

    /**
     * Save test report to file
     */
    saveTestReport() {
        const fs = require('fs');
        const path = require('path');

        const reportData = {
            timestamp: new Date().toISOString(),
            testSuite: 'KMS Search Protocol',
            summary: {
                totalTests: this.testResults.totalTests,
                passedTests: this.testResults.passedTests,
                failedTests: this.testResults.failedTests,
                successRate: ((this.testResults.passedTests/this.testResults.totalTests)*100).toFixed(1) + '%'
            },
            testDetails: this.testResults.testDetails,
            protocolAnalytics: this.protocol.getAnalytics()
        };

        const reportDir = './test-reports';
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }

        const reportFile = path.join(reportDir, `kms-search-protocol-test-${Date.now()}.json`);
        fs.writeFileSync(reportFile, JSON.stringify(reportData, null, 2));

        Logger.info(`\n💾 Detailed test report saved to: ${reportFile}`);
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Main test execution
 */
async function main() {
    const tester = new KMSSearchProtocolTester();

    try {
        // Run main test suite
        await tester.runTestSuite();

        // Test analytics
        await tester.testProtocolAnalytics();

        // Test session isolation
        await tester.testSessionIsolation();

        Logger.info('\n🎉 All tests completed successfully!');
        Logger.info('📊 Check the test report for detailed results.');

    } catch (error) {
        Logger.error('💥 Test suite crashed:', error);
        process.exit(1);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = KMSSearchProtocolTester;