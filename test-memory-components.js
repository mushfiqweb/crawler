/**
 * Simple Memory Components Test
 * Tests individual memory optimization components
 */

const { MemoryMonitor } = require('./src/utils/memory-monitor');
const { ConcurrentOptimizer } = require('./src/utils/concurrent-optimizer');
const ImmediateProcessor = require('./src/utils/immediate-processor');

async function testMemoryComponents() {
    console.log('🧪 Testing Memory Optimization Components...\n');
    
    try {
        // Test 1: Memory Monitor
        console.log('1️⃣ Testing Memory Monitor...');
        const memoryMonitor = new MemoryMonitor({
            interval: 1000,
            threshold: 80,
            enableGC: true
        });
        
        memoryMonitor.startMonitoring();
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const memoryReport = memoryMonitor.getMemoryReport();
        console.log('✅ Memory Monitor Report:', {
            currentMemory: Math.round(memoryReport.current.memory.heapUsed / 1024 / 1024 * 100) / 100 + ' MB',
            uptime: Math.round(memoryReport.current.uptime / 1000) + 's',
            hasTrends: memoryReport.trends !== null,
            hasRecommendations: memoryReport.recommendations.length > 0
        });
        
        memoryMonitor.stopMonitoring();
        
        // Test 2: Concurrent Optimizer
        console.log('\n2️⃣ Testing Concurrent Optimizer...');
        const concurrentOptimizer = new ConcurrentOptimizer({
            maxConcurrency: 3,
            memoryThreshold: 80,
            batchSize: 5
        });
        
        const testOperations = Array.from({ length: 10 }, (_, i) => ({
            id: `test-${i}`,
            execute: async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
                return { result: `Operation ${i} completed` };
            }
        }));
        
        const executionResult = await concurrentOptimizer.executeConcurrent(testOperations, {
            maxConcurrency: 3,
            batchSize: 5
        });
        
        console.log('✅ Concurrent Optimizer Results:', {
            totalOperations: testOperations.length,
            successfulResults: executionResult.results.length,
            failedResults: executionResult.errors.length,
            avgExecutionTime: executionResult.stats.averageExecutionTime + 'ms'
        });
        
        // Test 3: Immediate Processor
        console.log('\n3️⃣ Testing Immediate Processor...');
        const immediateProcessor = new ImmediateProcessor({
            maxBufferSize: 5,
            processingTimeout: 1000,
            autoFlush: true,
            flushInterval: 2000
        });
        
        // Register a test processor
        immediateProcessor.registerProcessor('testData', async (data) => {
            console.log(`Processing: ${data.id}`);
            return { processed: true, id: data.id };
        });
        
        // Register a test disposer
        immediateProcessor.registerDisposer('testData', async (data) => {
            console.log(`Disposing: ${data.id}`);
        });
        
        // Process some test data
        for (let i = 0; i < 8; i++) {
            await immediateProcessor.process('testData', { id: `item-${i}`, data: `test data ${i}` });
        }
        
        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const processorStats = immediateProcessor.getMetrics();
        console.log('✅ Immediate Processor Stats:', {
            totalProcessed: processorStats.totalProcessed,
            totalDisposed: processorStats.totalDisposed,
            currentBufferSize: processorStats.bufferSize,
            totalErrors: processorStats.totalErrors
        });
        
        await immediateProcessor.shutdown();
        
        console.log('\n🎉 All memory optimization components tested successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

// Run the test
testMemoryComponents().catch(console.error);