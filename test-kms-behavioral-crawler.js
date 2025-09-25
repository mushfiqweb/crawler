/**
 * Test Script for KMS Marketplace Advanced Behavioral Crawler
 * Validates human-like behavior patterns and detection avoidance
 */

const KMSMarketplaceCrawler = require('./src/core/kms-marketplace-crawler');
const { AdvancedBehavioralEngine } = require('./src/core/advanced-behavioral-engine');
const { LinkInteractionSystem } = require('./src/utils/link-interaction-system');
const { defaultLogger: Logger } = require('./src/utils/logger');
const fs = require('fs').promises;
const path = require('path');

class BehavioralCrawlerTester {
    constructor() {
        this.testResults = {
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            testDetails: [],
            behavioralMetrics: {
                dwellTimes: [],
                clickPatterns: [],
                scrollBehaviors: [],
                interactionLogs: []
            }
        };
    }

    /**
     * Run comprehensive behavioral validation tests
     */
    async runAllTests() {
        Logger.info('🧪 Starting KMS Marketplace Behavioral Crawler Tests');
        
        try {
            // Test 1: Validate dwell time randomization (40-60 seconds)
            await this.testDwellTimeRandomization();
            
            // Test 2: Validate click coordinate distribution
            await this.testClickCoordinateDistribution();
            
            // Test 3: Validate scrolling behavior patterns
            await this.testScrollingBehaviorPatterns();
            
            // Test 4: Validate interaction logging system
            await this.testInteractionLogging();
            
            // Test 5: Validate human-like timing patterns
            await this.testHumanLikeTimingPatterns();
            
            // Test 6: Validate detection avoidance mechanisms
            await this.testDetectionAvoidance();
            
            // Test 7: Integration test with link interaction system
            await this.testLinkInteractionIntegration();
            
            // Generate comprehensive test report
            await this.generateTestReport();
            
        } catch (error) {
            Logger.error(`💥 Test execution failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Test dwell time randomization (40-60 seconds with session variations)
     */
    async testDwellTimeRandomization() {
        this.testResults.totalTests++;
        Logger.info('🕐 Testing dwell time randomization...');
        
        try {
            const behavioralEngine = new AdvancedBehavioralEngine();
            const dwellTimes = [];
            
            // Generate 10 dwell times to test randomization
            for (let i = 0; i < 10; i++) {
                const dwellTime = behavioralEngine.calculateDwellTime();
                dwellTimes.push(dwellTime);
                this.testResults.behavioralMetrics.dwellTimes.push(dwellTime);
            }
            
            // Validate range (40-60 seconds = 40000-60000ms)
            const allInRange = dwellTimes.every(time => time >= 40000 && time <= 60000);
            const hasVariation = new Set(dwellTimes).size > 1; // Should have variation
            
            if (allInRange && hasVariation) {
                this.testResults.passedTests++;
                this.testResults.testDetails.push({
                    test: 'Dwell Time Randomization',
                    status: 'PASSED',
                    details: `All times in range 40-60s, variation detected`,
                    metrics: { min: Math.min(...dwellTimes), max: Math.max(...dwellTimes), count: dwellTimes.length }
                });
                Logger.info('✅ Dwell time randomization test PASSED');
            } else {
                throw new Error(`Range check: ${allInRange}, Variation: ${hasVariation}`);
            }
            
        } catch (error) {
            this.testResults.failedTests++;
            this.testResults.testDetails.push({
                test: 'Dwell Time Randomization',
                status: 'FAILED',
                error: error.message
            });
            Logger.error(`❌ Dwell time randomization test FAILED: ${error.message}`);
        }
    }

    /**
     * Test click coordinate distribution across viewport
     */
    async testClickCoordinateDistribution() {
        this.testResults.totalTests++;
        Logger.info('🖱️ Testing click coordinate distribution...');
        
        try {
            const behavioralEngine = new AdvancedBehavioralEngine();
            const clickCoordinates = [];
            
            // Generate 20 click coordinates
            for (let i = 0; i < 20; i++) {
                const coords = behavioralEngine.generateRandomClickCoordinates();
                clickCoordinates.push(coords);
                this.testResults.behavioralMetrics.clickPatterns.push(coords);
            }
            
            // Validate distribution across viewport quadrants
            const quadrants = { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 };
            clickCoordinates.forEach(coord => {
                if (coord.x < 640 && coord.y < 360) quadrants.topLeft++;
                else if (coord.x >= 640 && coord.y < 360) quadrants.topRight++;
                else if (coord.x < 640 && coord.y >= 360) quadrants.bottomLeft++;
                else quadrants.bottomRight++;
            });
            
            // Should have clicks in multiple quadrants (good distribution)
            const activeQuadrants = Object.values(quadrants).filter(count => count > 0).length;
            
            if (activeQuadrants >= 3) {
                this.testResults.passedTests++;
                this.testResults.testDetails.push({
                    test: 'Click Coordinate Distribution',
                    status: 'PASSED',
                    details: `Clicks distributed across ${activeQuadrants}/4 quadrants`,
                    metrics: quadrants
                });
                Logger.info('✅ Click coordinate distribution test PASSED');
            } else {
                throw new Error(`Poor distribution: only ${activeQuadrants}/4 quadrants used`);
            }
            
        } catch (error) {
            this.testResults.failedTests++;
            this.testResults.testDetails.push({
                test: 'Click Coordinate Distribution',
                status: 'FAILED',
                error: error.message
            });
            Logger.error(`❌ Click coordinate distribution test FAILED: ${error.message}`);
        }
    }

    /**
     * Test scrolling behavior patterns
     */
    async testScrollingBehaviorPatterns() {
        this.testResults.totalTests++;
        Logger.info('📜 Testing scrolling behavior patterns...');
        
        try {
            const behavioralEngine = new AdvancedBehavioralEngine();
            const scrollBehaviors = [];
            
            // Generate 5 scroll behavior patterns
            for (let i = 0; i < 5; i++) {
                const scrollPattern = behavioralEngine.generateScrollPattern();
                scrollBehaviors.push(scrollPattern);
                this.testResults.behavioralMetrics.scrollBehaviors.push(scrollPattern);
            }
            
            // Validate scroll pattern diversity
            const hasVariableSpeed = scrollBehaviors.some(pattern => 
                pattern.actions.some(action => action.speed !== pattern.actions[0].speed)
            );
            const hasPauses = scrollBehaviors.some(pattern => 
                pattern.actions.some(action => action.type === 'pause')
            );
            const hasDirectionChanges = scrollBehaviors.some(pattern => 
                pattern.actions.some((action, index) => 
                    index > 0 && action.direction !== pattern.actions[index - 1].direction
                )
            );
            
            if (hasVariableSpeed && hasPauses && hasDirectionChanges) {
                this.testResults.passedTests++;
                this.testResults.testDetails.push({
                    test: 'Scrolling Behavior Patterns',
                    status: 'PASSED',
                    details: 'Variable speed, pauses, and direction changes detected',
                    metrics: { patterns: scrollBehaviors.length, variableSpeed: hasVariableSpeed, pauses: hasPauses, directionChanges: hasDirectionChanges }
                });
                Logger.info('✅ Scrolling behavior patterns test PASSED');
            } else {
                throw new Error(`Missing patterns - Speed: ${hasVariableSpeed}, Pauses: ${hasPauses}, Direction: ${hasDirectionChanges}`);
            }
            
        } catch (error) {
            this.testResults.failedTests++;
            this.testResults.testDetails.push({
                test: 'Scrolling Behavior Patterns',
                status: 'FAILED',
                error: error.message
            });
            Logger.error(`❌ Scrolling behavior patterns test FAILED: ${error.message}`);
        }
    }

    /**
     * Test interaction logging system
     */
    async testInteractionLogging() {
        this.testResults.totalTests++;
        Logger.info('📝 Testing interaction logging system...');
        
        try {
            const behavioralEngine = new AdvancedBehavioralEngine();
            
            // Simulate a page interaction session
            const sessionLog = await behavioralEngine.simulatePageBehavior(null, {
                url: 'https://kmsmarketplace.com/test-page',
                pageType: 'product',
                sessionId: 'test-session-001'
            });
            
            // Validate log structure
            const hasRequiredFields = sessionLog.sessionId && 
                                    sessionLog.url && 
                                    sessionLog.startTime && 
                                    sessionLog.endTime && 
                                    Array.isArray(sessionLog.interactions);
            
            const hasDetailedInteractions = sessionLog.interactions.length > 0 &&
                                          sessionLog.interactions.every(interaction => 
                                              interaction.timestamp && 
                                              interaction.type && 
                                              interaction.details
                                          );
            
            if (hasRequiredFields && hasDetailedInteractions) {
                this.testResults.passedTests++;
                this.testResults.testDetails.push({
                    test: 'Interaction Logging System',
                    status: 'PASSED',
                    details: `Complete log with ${sessionLog.interactions.length} interactions`,
                    metrics: { 
                        sessionDuration: sessionLog.endTime - sessionLog.startTime,
                        interactionCount: sessionLog.interactions.length,
                        logSize: JSON.stringify(sessionLog).length
                    }
                });
                this.testResults.behavioralMetrics.interactionLogs.push(sessionLog);
                Logger.info('✅ Interaction logging system test PASSED');
            } else {
                throw new Error(`Incomplete log structure - Fields: ${hasRequiredFields}, Interactions: ${hasDetailedInteractions}`);
            }
            
        } catch (error) {
            this.testResults.failedTests++;
            this.testResults.testDetails.push({
                test: 'Interaction Logging System',
                status: 'FAILED',
                error: error.message
            });
            Logger.error(`❌ Interaction logging system test FAILED: ${error.message}`);
        }
    }

    /**
     * Test human-like timing patterns
     */
    async testHumanLikeTimingPatterns() {
        this.testResults.totalTests++;
        Logger.info('⏱️ Testing human-like timing patterns...');
        
        try {
            const behavioralEngine = new AdvancedBehavioralEngine();
            const timingIntervals = [];
            
            // Generate 10 timing intervals
            for (let i = 0; i < 10; i++) {
                const interval = behavioralEngine.generateHumanLikeDelay();
                timingIntervals.push(interval);
            }
            
            // Validate timing characteristics
            const hasVariation = new Set(timingIntervals).size > 1;
            const hasReasonableRange = timingIntervals.every(interval => interval >= 500 && interval <= 5000);
            const averageInterval = timingIntervals.reduce((a, b) => a + b, 0) / timingIntervals.length;
            
            if (hasVariation && hasReasonableRange && averageInterval > 1000) {
                this.testResults.passedTests++;
                this.testResults.testDetails.push({
                    test: 'Human-like Timing Patterns',
                    status: 'PASSED',
                    details: `Realistic timing with ${averageInterval.toFixed(0)}ms average`,
                    metrics: { 
                        min: Math.min(...timingIntervals),
                        max: Math.max(...timingIntervals),
                        average: averageInterval,
                        variation: hasVariation
                    }
                });
                Logger.info('✅ Human-like timing patterns test PASSED');
            } else {
                throw new Error(`Timing issues - Variation: ${hasVariation}, Range: ${hasReasonableRange}, Average: ${averageInterval}`);
            }
            
        } catch (error) {
            this.testResults.failedTests++;
            this.testResults.testDetails.push({
                test: 'Human-like Timing Patterns',
                status: 'FAILED',
                error: error.message
            });
            Logger.error(`❌ Human-like timing patterns test FAILED: ${error.message}`);
        }
    }

    /**
     * Test detection avoidance mechanisms
     */
    async testDetectionAvoidance() {
        this.testResults.totalTests++;
        Logger.info('🕵️ Testing detection avoidance mechanisms...');
        
        try {
            const kmsMarketplaceCrawler = new KMSMarketplaceCrawler();
            
            // Test browser configuration for stealth
            const browserConfig = kmsMarketplaceCrawler.getBrowserConfiguration();
            
            // Validate stealth features
            const hasStealthFeatures = browserConfig.args.includes('--disable-blink-features=AutomationControlled') &&
                                     browserConfig.args.includes('--disable-web-security') &&
                                     browserConfig.args.includes('--no-first-run');
            
            const hasRealisticViewport = browserConfig.defaultViewport && 
                                       browserConfig.defaultViewport.width >= 1024 &&
                                       browserConfig.defaultViewport.height >= 768;
            
            if (hasStealthFeatures && hasRealisticViewport) {
                this.testResults.passedTests++;
                this.testResults.testDetails.push({
                    test: 'Detection Avoidance Mechanisms',
                    status: 'PASSED',
                    details: 'Stealth features and realistic viewport configured',
                    metrics: { 
                        stealthArgs: browserConfig.args.length,
                        viewport: browserConfig.defaultViewport,
                        headless: browserConfig.headless
                    }
                });
                Logger.info('✅ Detection avoidance mechanisms test PASSED');
            } else {
                throw new Error(`Missing stealth features - Stealth: ${hasStealthFeatures}, Viewport: ${hasRealisticViewport}`);
            }
            
        } catch (error) {
            this.testResults.failedTests++;
            this.testResults.testDetails.push({
                test: 'Detection Avoidance Mechanisms',
                status: 'FAILED',
                error: error.message
            });
            Logger.error(`❌ Detection avoidance mechanisms test FAILED: ${error.message}`);
        }
    }

    /**
     * Test integration with link interaction system
     */
    async testLinkInteractionIntegration() {
        this.testResults.totalTests++;
        Logger.info('🔗 Testing link interaction system integration...');
        
        try {
            const linkInteractionSystem = new LinkInteractionSystem({
                targetDomain: 'kmsmarketplace.com',
                enablePageInteraction: true,
                maxInteractionsPerSession: 5
            });
            
            // Validate KMS Marketplace crawler initialization
            const hasKMSCrawler = linkInteractionSystem.kmsMarketplaceCrawler !== undefined;
            const hasProcessMethod = typeof linkInteractionSystem.processKMSMarketplaceLinks === 'function';
            
            if (hasKMSCrawler && hasProcessMethod) {
                this.testResults.passedTests++;
                this.testResults.testDetails.push({
                    test: 'Link Interaction System Integration',
                    status: 'PASSED',
                    details: 'KMS Marketplace crawler properly integrated',
                    metrics: { 
                        crawlerInitialized: hasKMSCrawler,
                        processMethodAvailable: hasProcessMethod,
                        targetDomain: 'kmsmarketplace.com'
                    }
                });
                Logger.info('✅ Link interaction system integration test PASSED');
            } else {
                throw new Error(`Integration issues - Crawler: ${hasKMSCrawler}, Method: ${hasProcessMethod}`);
            }
            
        } catch (error) {
            this.testResults.failedTests++;
            this.testResults.testDetails.push({
                test: 'Link Interaction System Integration',
                status: 'FAILED',
                error: error.message
            });
            Logger.error(`❌ Link interaction system integration test FAILED: ${error.message}`);
        }
    }

    /**
     * Generate comprehensive test report
     */
    async generateTestReport() {
        Logger.info('📊 Generating comprehensive test report...');
        
        const report = {
            testSummary: {
                totalTests: this.testResults.totalTests,
                passedTests: this.testResults.passedTests,
                failedTests: this.testResults.failedTests,
                successRate: ((this.testResults.passedTests / this.testResults.totalTests) * 100).toFixed(2) + '%',
                timestamp: new Date().toISOString()
            },
            testDetails: this.testResults.testDetails,
            behavioralMetrics: this.testResults.behavioralMetrics,
            recommendations: this.generateRecommendations()
        };
        
        // Save report to file
        const reportPath = path.join(__dirname, 'test-reports', `kms-behavioral-crawler-test-${Date.now()}.json`);
        await fs.mkdir(path.dirname(reportPath), { recursive: true });
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        
        // Log summary
        Logger.info(`📋 Test Report Summary:`);
        Logger.info(`   Total Tests: ${report.testSummary.totalTests}`);
        Logger.info(`   Passed: ${report.testSummary.passedTests}`);
        Logger.info(`   Failed: ${report.testSummary.failedTests}`);
        Logger.info(`   Success Rate: ${report.testSummary.successRate}`);
        Logger.info(`   Report saved to: ${reportPath}`);
        
        return report;
    }

    /**
     * Generate recommendations based on test results
     */
    generateRecommendations() {
        const recommendations = [];
        
        if (this.testResults.failedTests > 0) {
            recommendations.push('Review failed tests and address underlying issues');
        }
        
        if (this.testResults.behavioralMetrics.dwellTimes.length > 0) {
            const avgDwellTime = this.testResults.behavioralMetrics.dwellTimes.reduce((a, b) => a + b, 0) / this.testResults.behavioralMetrics.dwellTimes.length;
            if (avgDwellTime < 45000) {
                recommendations.push('Consider increasing average dwell time for more realistic behavior');
            }
        }
        
        if (this.testResults.behavioralMetrics.clickPatterns.length < 10) {
            recommendations.push('Increase click pattern diversity for better human simulation');
        }
        
        recommendations.push('Monitor real-world performance and adjust parameters based on detection rates');
        recommendations.push('Regularly update user agents and browser configurations');
        
        return recommendations;
    }
}

// Run tests if script is executed directly
if (require.main === module) {
    const tester = new BehavioralCrawlerTester();
    tester.runAllTests()
        .then(() => {
            Logger.info('🎉 All tests completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            Logger.error(`💥 Test execution failed: ${error.message}`);
            process.exit(1);
        });
}

module.exports = { BehavioralCrawlerTester };