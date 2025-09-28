/**
 * Memory Optimization Performance Test
 * Tests the effectiveness of memory optimizations including:
 * - Stream-based processing
 * - Concurrent optimization
 * - Immediate data processing and disposal
 * - Memory monitoring and reporting
 */

const { performance } = require('perf_hooks');
const { Crawler } = require('./src/crawler');
const { SearchEngine } = require('./src/core/search-engine');
const { BrowserPool } = require('./src/core/browser-pool');
const { MemoryManager } = require('./src/core/memory-manager');
const { MemoryMonitor } = require('./src/utils/memory-monitor');
const { ConcurrentOptimizer } = require('./src/utils/concurrent-optimizer');
const ImmediateProcessor = require('./src/utils/immediate-processor');

class MemoryOptimizationTester {
    constructor() {
        this.testResults = {
            startTime: Date.now(),
            tests: [],
            memorySnapshots: [],
            performance: {},
            summary: {}
        };
        
        this.memoryMonitor = new MemoryMonitor({
            alertThreshold: 200 * 1024 * 1024, // 200MB
            criticalThreshold: 500 * 1024 * 1024, // 500MB
            monitorInterval: 1000,
            historySize: 100
        });
        
        this.testKeywords = [
            'test keyword 1', 'test keyword 2', 'test keyword 3',
            'memory optimization', 'performance testing', 'concurrent processing',
            'stream processing', 'immediate disposal', 'garbage collection'
        ];
        
        this.testPlatforms = ['google', 'bing', 'duckduckgo'];
    }
    
    /**
     * Run all memory optimization tests
     */
    async runAllTests() {
        console.log('🧪 Starting Memory Optimization Performance Tests');
        console.log('=' .repeat(60));
        
        try {
            // Start memory monitoring
            await this.memoryMonitor.startMonitoring();
            this.takeMemorySnapshot('test_start');
            
            // Test 1: Baseline memory usage
            await this.testBaselineMemoryUsage();
            
            // Test 2: Stream processing efficiency
            await this.testStreamProcessing();
            
            // Test 3: Concurrent optimization
            await this.testConcurrentOptimization();
            
            // Test 4: Immediate processing and disposal
            await this.testImmediateProcessing();
            
            // Test 5: Memory monitor effectiveness
            await this.testMemoryMonitoring();
            
            // Test 6: Integrated crawler performance
            await this.testIntegratedCrawlerPerformance();
            
            // Generate final report
            await this.generateFinalReport();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
            this.testResults.error = error.message;
        } finally {
            await this.cleanup();
        }
    }
    
    /**
     * Test baseline memory usage
     */
    async testBaselineMemoryUsage() {
        console.log('\n📊 Test 1: Baseline Memory Usage');
        const startTime = performance.now();
        this.takeMemorySnapshot('baseline_start');
        
        try {
            // Create large data structures to simulate memory usage
            const largeData = [];
            for (let i = 0; i < 1000; i++) {
                largeData.push({
                    id: i,
                    data: 'x'.repeat(1000), // 1KB per item
                    timestamp: Date.now(),
                    metadata: {
                        processed: false,
                        size: 1000,
                        index: i
                    }
                });
            }
            
            this.takeMemorySnapshot('baseline_peak');
            
            // Clear data
            largeData.length = 0;
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
            
            await this.sleep(2000); // Wait for GC
            this.takeMemorySnapshot('baseline_end');
            
            const endTime = performance.now();
            this.recordTestResult('baseline_memory', {
                duration: endTime - startTime,
                success: true,
                dataSize: '1MB',
                description: 'Baseline memory allocation and cleanup'
            });
            
            console.log('✅ Baseline test completed');
            
        } catch (error) {
            this.recordTestResult('baseline_memory', {
                duration: performance.now() - startTime,
                success: false,
                error: error.message
            });
            console.error('❌ Baseline test failed:', error.message);
        }
    }
    
    /**
     * Test stream processing efficiency
     */
    async testStreamProcessing() {
        console.log('\n🌊 Test 2: Stream Processing Efficiency');
        const startTime = performance.now();
        this.takeMemorySnapshot('stream_start');
        
        try {
            const immediateProcessor = new ImmediateProcessor({
                maxBufferSize: 10,
                processingTimeout: 5000,
                autoFlush: true,
                flushInterval: 1000
            });
            
            // Register processors
            immediateProcessor.registerProcessor('testData', async (data) => {
                // Simulate processing
                return { processed: true, size: data.length };
            });
            
            immediateProcessor.registerDisposer('testData', async (data) => {
                // Clear data
                if (Array.isArray(data)) {
                    data.length = 0;
                }
            });
            
            // Process data in batches
            const batchSize = 100;
            const totalItems = 1000;
            
            for (let i = 0; i < totalItems; i += batchSize) {
                const batch = [];
                for (let j = 0; j < batchSize && (i + j) < totalItems; j++) {
                    batch.push({
                        id: i + j,
                        data: 'x'.repeat(500), // 500 bytes per item
                        timestamp: Date.now()
                    });
                }
                
                await immediateProcessor.process(batch, 'testData');
                
                if (i % 300 === 0) {
                    this.takeMemorySnapshot(`stream_batch_${i}`);
                }
            }
            
            // Wait for processing to complete
            await immediateProcessor.flush();
            await this.sleep(1000);
            
            this.takeMemorySnapshot('stream_end');
            
            const metrics = immediateProcessor.getMetrics();
            await immediateProcessor.shutdown();
            
            const endTime = performance.now();
            this.recordTestResult('stream_processing', {
                duration: endTime - startTime,
                success: true,
                itemsProcessed: metrics.processed,
                itemsDisposed: metrics.disposed,
                bufferOverflows: metrics.bufferOverflows,
                description: 'Stream processing with immediate disposal'
            });
            
            console.log('✅ Stream processing test completed');
            console.log(`   Processed: ${metrics.processed} items`);
            console.log(`   Disposed: ${metrics.disposed} items`);
            
        } catch (error) {
            this.recordTestResult('stream_processing', {
                duration: performance.now() - startTime,
                success: false,
                error: error.message
            });
            console.error('❌ Stream processing test failed:', error.message);
        }
    }
    
    /**
     * Test concurrent optimization
     */
    async testConcurrentOptimization() {
        console.log('\n⚡ Test 3: Concurrent Optimization');
        const startTime = performance.now();
        this.takeMemorySnapshot('concurrent_start');
        
        try {
            const concurrentOptimizer = new ConcurrentOptimizer({
                maxConcurrency: 5,
                memoryThreshold: 100 * 1024 * 1024, // 100MB
                batchSize: 10,
                enableMemoryMonitoring: true,
                enableGarbageCollection: true
            });
            
            // Create concurrent operations
            const operations = [];
            for (let i = 0; i < 50; i++) {
                operations.push({
                    id: `op_${i}`,
                    execute: async () => {
                        // Simulate memory-intensive operation
                        const data = new Array(1000).fill('x'.repeat(100));
                        await this.sleep(Math.random() * 100);
                        return { processed: data.length, id: `op_${i}` };
                    }
                });
            }
            
            this.takeMemorySnapshot('concurrent_operations_created');
            
            // Execute operations with optimization
            const results = await concurrentOptimizer.executeConcurrent(operations, {
                maxConcurrency: 5,
                batchSize: 10,
                promiseTimeout: 5000
            });
            
            this.takeMemorySnapshot('concurrent_operations_completed');
            
            const stats = concurrentOptimizer.getStats();
            await concurrentOptimizer.shutdown();
            
            const endTime = performance.now();
            this.recordTestResult('concurrent_optimization', {
                duration: endTime - startTime,
                success: true,
                operationsExecuted: results.length,
                memoryCleanups: stats.memoryCleanups,
                garbageCollections: stats.garbageCollections,
                description: 'Concurrent operations with memory optimization'
            });
            
            console.log('✅ Concurrent optimization test completed');
            console.log(`   Operations: ${results.length}`);
            console.log(`   Memory cleanups: ${stats.memoryCleanups}`);
            
        } catch (error) {
            this.recordTestResult('concurrent_optimization', {
                duration: performance.now() - startTime,
                success: false,
                error: error.message
            });
            console.error('❌ Concurrent optimization test failed:', error.message);
        }
    }
    
    /**
     * Test immediate processing and disposal
     */
    async testImmediateProcessing() {
        console.log('\n⚡ Test 4: Immediate Processing and Disposal');
        const startTime = performance.now();
        this.takeMemorySnapshot('immediate_start');
        
        try {
            const processor = new ImmediateProcessor({
                maxBufferSize: 5,
                processingTimeout: 3000,
                autoFlush: true,
                flushInterval: 500
            });
            
            let processedCount = 0;
            let disposedCount = 0;
            
            // Register immediate processor
            processor.registerProcessor('largeData', async (data) => {
                processedCount++;
                // Simulate processing
                return { size: data.content ? data.content.length : 0 };
            });
            
            processor.registerDisposer('largeData', async (data) => {
                disposedCount++;
                // Immediate disposal
                if (data.content) {
                    data.content = null;
                }
                if (data.metadata) {
                    data.metadata = null;
                }
            });
            
            // Process large data items immediately
            for (let i = 0; i < 100; i++) {
                const largeItem = {
                    id: i,
                    content: 'x'.repeat(10000), // 10KB per item
                    metadata: {
                        timestamp: Date.now(),
                        size: 10000,
                        processed: false
                    }
                };
                
                // Process immediately
                await processor.process(largeItem, 'largeData', { immediate: true });
                
                if (i % 20 === 0) {
                    this.takeMemorySnapshot(`immediate_item_${i}`);
                }
            }
            
            await processor.flush();
            this.takeMemorySnapshot('immediate_end');
            
            const metrics = processor.getMetrics();
            await processor.shutdown();
            
            const endTime = performance.now();
            this.recordTestResult('immediate_processing', {
                duration: endTime - startTime,
                success: true,
                itemsProcessed: processedCount,
                itemsDisposed: disposedCount,
                averageProcessingTime: metrics.averageProcessingTime,
                description: 'Immediate processing and disposal of large data'
            });
            
            console.log('✅ Immediate processing test completed');
            console.log(`   Processed: ${processedCount} items`);
            console.log(`   Disposed: ${disposedCount} items`);
            
        } catch (error) {
            this.recordTestResult('immediate_processing', {
                duration: performance.now() - startTime,
                success: false,
                error: error.message
            });
            console.error('❌ Immediate processing test failed:', error.message);
        }
    }
    
    /**
     * Test memory monitoring effectiveness
     */
    async testMemoryMonitoring() {
        console.log('\n📈 Test 5: Memory Monitoring Effectiveness');
        const startTime = performance.now();
        this.takeMemorySnapshot('monitoring_start');
        
        try {
            let alertsTriggered = 0;
            let criticalAlertsTriggered = 0;
            
            this.memoryMonitor.on('memoryAlert', () => {
                alertsTriggered++;
            });
            
            this.memoryMonitor.on('memoryCritical', () => {
                criticalAlertsTriggered++;
            });
            
            // Simulate memory pressure
            const memoryHogs = [];
            for (let i = 0; i < 10; i++) {
                // Create 10MB chunks
                memoryHogs.push(new Array(10 * 1024 * 1024).fill('x'));
                await this.sleep(500);
                this.takeMemorySnapshot(`memory_pressure_${i}`);
            }
            
            // Wait for monitoring
            await this.sleep(2000);
            
            // Clean up
            memoryHogs.length = 0;
            if (global.gc) {
                global.gc();
            }
            
            await this.sleep(2000);
            this.takeMemorySnapshot('monitoring_end');
            
            const report = this.memoryMonitor.generateReport();
            
            const endTime = performance.now();
            this.recordTestResult('memory_monitoring', {
                duration: endTime - startTime,
                success: true,
                alertsTriggered,
                criticalAlertsTriggered,
                peakMemory: report.peakMemory,
                averageMemory: report.averageMemory,
                description: 'Memory monitoring and alerting system'
            });
            
            console.log('✅ Memory monitoring test completed');
            console.log(`   Alerts triggered: ${alertsTriggered}`);
            console.log(`   Critical alerts: ${criticalAlertsTriggered}`);
            
        } catch (error) {
            this.recordTestResult('memory_monitoring', {
                duration: performance.now() - startTime,
                success: false,
                error: error.message
            });
            console.error('❌ Memory monitoring test failed:', error.message);
        }
    }
    
    /**
     * Test integrated crawler performance
     */
    async testIntegratedCrawlerPerformance() {
        console.log('\n🕷️ Test 6: Integrated Crawler Performance');
        const startTime = performance.now();
        this.takeMemorySnapshot('crawler_start');
        
        try {
            // Note: This is a mock test since we can't run actual browser operations
            // In a real scenario, this would test the full crawler with optimizations
            
            const mockSearchResults = [];
            for (let i = 0; i < 50; i++) {
                mockSearchResults.push({
                    keyword: this.testKeywords[i % this.testKeywords.length],
                    platform: this.testPlatforms[i % this.testPlatforms.length],
                    results: Math.floor(Math.random() * 20) + 5,
                    timestamp: new Date().toISOString(),
                    success: Math.random() > 0.1 // 90% success rate
                });
            }
            
            this.takeMemorySnapshot('crawler_mock_data');
            
            // Simulate processing with immediate disposal
            const processor = new ImmediateProcessor();
            
            processor.registerProcessor('crawlerResults', async (results) => {
                // Simulate result processing
                return { processed: results.length };
            });
            
            processor.registerDisposer('crawlerResults', async (results) => {
                // Clear results
                if (Array.isArray(results)) {
                    results.length = 0;
                }
            });
            
            await processor.process(mockSearchResults, 'crawlerResults');
            await processor.flush();
            
            this.takeMemorySnapshot('crawler_end');
            
            const endTime = performance.now();
            this.recordTestResult('integrated_crawler', {
                duration: endTime - startTime,
                success: true,
                mockSearches: mockSearchResults.length,
                description: 'Integrated crawler performance simulation'
            });
            
            await processor.shutdown();
            
            console.log('✅ Integrated crawler test completed');
            console.log(`   Mock searches: ${mockSearchResults.length}`);
            
        } catch (error) {
            this.recordTestResult('integrated_crawler', {
                duration: performance.now() - startTime,
                success: false,
                error: error.message
            });
            console.error('❌ Integrated crawler test failed:', error.message);
        }
    }
    
    /**
     * Take memory snapshot
     */
    takeMemorySnapshot(label) {
        const memUsage = process.memoryUsage();
        this.testResults.memorySnapshots.push({
            label,
            timestamp: Date.now(),
            rss: memUsage.rss,
            heapTotal: memUsage.heapTotal,
            heapUsed: memUsage.heapUsed,
            external: memUsage.external,
            arrayBuffers: memUsage.arrayBuffers
        });
    }
    
    /**
     * Record test result
     */
    recordTestResult(testName, result) {
        this.testResults.tests.push({
            name: testName,
            timestamp: Date.now(),
            ...result
        });
    }
    
    /**
     * Generate final report
     */
    async generateFinalReport() {
        console.log('\n📋 Generating Final Report');
        
        const endTime = Date.now();
        const totalDuration = endTime - this.testResults.startTime;
        
        // Calculate memory statistics
        const memoryStats = this.calculateMemoryStats();
        
        // Calculate performance metrics
        const performanceMetrics = this.calculatePerformanceMetrics();
        
        // Generate summary
        const summary = {
            totalDuration,
            totalTests: this.testResults.tests.length,
            successfulTests: this.testResults.tests.filter(t => t.success).length,
            failedTests: this.testResults.tests.filter(t => !t.success).length,
            memoryStats,
            performanceMetrics
        };
        
        this.testResults.summary = summary;
        
        // Save report
        const reportPath = `test-reports/memory-optimization-test-${Date.now()}.json`;
        const fs = require('fs').promises;
        
        try {
            await fs.mkdir('test-reports', { recursive: true });
            await fs.writeFile(reportPath, JSON.stringify(this.testResults, null, 2));
            console.log(`📄 Report saved to: ${reportPath}`);
        } catch (error) {
            console.error('❌ Failed to save report:', error.message);
        }
        
        // Print summary
        this.printSummary(summary);
    }
    
    /**
     * Calculate memory statistics
     */
    calculateMemoryStats() {
        const snapshots = this.testResults.memorySnapshots;
        if (snapshots.length === 0) return {};
        
        const heapUsedValues = snapshots.map(s => s.heapUsed);
        const rssValues = snapshots.map(s => s.rss);
        
        return {
            peakHeapUsed: Math.max(...heapUsedValues),
            minHeapUsed: Math.min(...heapUsedValues),
            avgHeapUsed: heapUsedValues.reduce((a, b) => a + b, 0) / heapUsedValues.length,
            peakRSS: Math.max(...rssValues),
            minRSS: Math.min(...rssValues),
            avgRSS: rssValues.reduce((a, b) => a + b, 0) / rssValues.length,
            memoryGrowth: heapUsedValues[heapUsedValues.length - 1] - heapUsedValues[0]
        };
    }
    
    /**
     * Calculate performance metrics
     */
    calculatePerformanceMetrics() {
        const tests = this.testResults.tests;
        const durations = tests.map(t => t.duration);
        
        return {
            totalTestTime: durations.reduce((a, b) => a + b, 0),
            avgTestTime: durations.reduce((a, b) => a + b, 0) / durations.length,
            maxTestTime: Math.max(...durations),
            minTestTime: Math.min(...durations)
        };
    }
    
    /**
     * Print summary
     */
    printSummary(summary) {
        console.log('\n' + '='.repeat(60));
        console.log('📊 MEMORY OPTIMIZATION TEST SUMMARY');
        console.log('='.repeat(60));
        
        console.log(`\n⏱️  Total Duration: ${(summary.totalDuration / 1000).toFixed(2)}s`);
        console.log(`✅ Successful Tests: ${summary.successfulTests}/${summary.totalTests}`);
        console.log(`❌ Failed Tests: ${summary.failedTests}/${summary.totalTests}`);
        
        if (summary.memoryStats) {
            console.log('\n💾 Memory Statistics:');
            console.log(`   Peak Heap: ${(summary.memoryStats.peakHeapUsed / 1024 / 1024).toFixed(2)} MB`);
            console.log(`   Avg Heap: ${(summary.memoryStats.avgHeapUsed / 1024 / 1024).toFixed(2)} MB`);
            console.log(`   Memory Growth: ${(summary.memoryStats.memoryGrowth / 1024 / 1024).toFixed(2)} MB`);
        }
        
        if (summary.performanceMetrics) {
            console.log('\n⚡ Performance Metrics:');
            console.log(`   Avg Test Time: ${summary.performanceMetrics.avgTestTime.toFixed(2)}ms`);
            console.log(`   Max Test Time: ${summary.performanceMetrics.maxTestTime.toFixed(2)}ms`);
        }
        
        console.log('\n🎯 Test Results:');
        this.testResults.tests.forEach(test => {
            const status = test.success ? '✅' : '❌';
            console.log(`   ${status} ${test.name}: ${test.duration.toFixed(2)}ms`);
            if (test.description) {
                console.log(`      ${test.description}`);
            }
        });
        
        console.log('\n' + '='.repeat(60));
    }
    
    /**
     * Cleanup resources
     */
    async cleanup() {
        try {
            await this.memoryMonitor.stopMonitoring();
            
            // Force garbage collection
            if (global.gc) {
                global.gc();
            }
            
            console.log('🧹 Cleanup completed');
        } catch (error) {
            console.error('❌ Cleanup failed:', error.message);
        }
    }
    
    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const tester = new MemoryOptimizationTester();
    tester.runAllTests().catch(error => {
        console.error('❌ Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = MemoryOptimizationTester;