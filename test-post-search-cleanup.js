/**
 * Post-Search Cleanup System Test Suite
 * 
 * Comprehensive testing of the PostSearchCleanup system including:
 * - Browser process termination and verification
 * - Memory resource release and leak prevention
 * - Temporary file and session cleanup
 * - Validation mechanisms and error handling
 * - Integration with search operations
 */

const { PostSearchCleanup } = require('./src/core/post-search-cleanup');
const { defaultLogger: Logger } = require('./src/utils/logger');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class MockBrowser {
    constructor(id, shouldFailClose = false) {
        this.id = id;
        this.shouldFailClose = shouldFailClose;
        this.closed = false;
        this.process = () => ({ pid: Math.floor(Math.random() * 10000) + 1000 });
    }

    async close() {
        if (this.shouldFailClose) {
            throw new Error('Mock browser close failure');
        }
        this.closed = true;
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate close delay
    }

    async pages() {
        return this.closed ? [] : [{ url: 'about:blank' }];
    }
}

class MockMemoryReference {
    constructor(id, size, shouldFailDestroy = false) {
        this.id = id;
        this.size = size;
        this.shouldFailDestroy = shouldFailDestroy;
        this.destroyed = false;
    }

    async destroy() {
        if (this.shouldFailDestroy) {
            throw new Error('Mock memory reference destroy failure');
        }
        this.destroyed = true;
    }
}

class MockSession {
    constructor(id, data, shouldFailClose = false) {
        this.id = id;
        this.data = data;
        this.shouldFailClose = shouldFailClose;
        this.closed = false;
    }

    async close() {
        if (this.shouldFailClose) {
            throw new Error('Mock session close failure');
        }
        this.closed = true;
        this.data = null;
    }
}

async function runPostSearchCleanupTests() {
    Logger.info('🧪 Starting Post-Search Cleanup System Test Suite');
    
    const testResults = {
        startTime: new Date().toISOString(),
        tests: [],
        summary: {
            total: 0,
            passed: 0,
            failed: 0,
            errors: []
        }
    };

    try {
        // Test 1: Basic Cleanup System Initialization
        await testBasicInitialization(testResults);

        // Test 2: Browser Process Termination
        await testBrowserTermination(testResults);

        // Test 3: Memory Resource Release
        await testMemoryResourceRelease(testResults);

        // Test 4: Temporary File Cleanup
        await testTempFileCleanup(testResults);

        // Test 5: Session Data Cleanup
        await testSessionCleanup(testResults);

        // Test 6: Search Results Preservation
        await testSearchResultsPreservation(testResults);

        // Test 7: Validation Mechanisms
        await testValidationMechanisms(testResults);

        // Test 8: Error Handling and Recovery
        await testErrorHandling(testResults);

        // Test 9: Complete Integration Test
        await testCompleteIntegration(testResults);

        // Test 10: Performance and Memory Leak Detection
        await testPerformanceAndLeakDetection(testResults);

    } catch (error) {
        Logger.error('❌ Test suite execution failed:', error);
        testResults.summary.errors.push({
            type: 'suite_execution_error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }

    // Generate test summary
    testResults.endTime = new Date().toISOString();
    testResults.duration = new Date(testResults.endTime) - new Date(testResults.startTime);

    Logger.info('📊 POST-SEARCH CLEANUP TEST RESULTS', {
        duration: `${Math.round(testResults.duration / 1000)}s`,
        totalTests: testResults.summary.total,
        passed: testResults.summary.passed,
        failed: testResults.summary.failed,
        successRate: `${Math.round((testResults.summary.passed / testResults.summary.total) * 100)}%`
    });

    // Save detailed test report
    const reportPath = path.join('test-reports', `post-search-cleanup-test-${Date.now()}.json`);
    try {
        await fs.mkdir('test-reports', { recursive: true });
        await fs.writeFile(reportPath, JSON.stringify(testResults, null, 2));
        Logger.info('📄 Test report saved', { reportPath });
    } catch (error) {
        Logger.error('❌ Failed to save test report:', error);
    }

    return testResults;
}

async function testBasicInitialization(testResults) {
    const test = {
        name: 'Basic Cleanup System Initialization',
        startTime: new Date().toISOString(),
        steps: []
    };

    try {
        Logger.info('🧪 Testing basic cleanup system initialization');

        // Test default configuration
        const cleanup1 = new PostSearchCleanup();
        test.steps.push({
            name: 'Default Configuration',
            success: cleanup1.config.browserTerminationTimeout === 30000,
            details: 'Default timeout should be 30000ms'
        });

        // Test custom configuration
        const cleanup2 = new PostSearchCleanup({
            browserTerminationTimeout: 15000,
            memoryReleaseTimeout: 20000,
            preserveSearchResults: false
        });
        test.steps.push({
            name: 'Custom Configuration',
            success: cleanup2.config.browserTerminationTimeout === 15000 &&
                    cleanup2.config.memoryReleaseTimeout === 20000 &&
                    cleanup2.config.preserveSearchResults === false,
            details: 'Custom configuration should be applied correctly'
        });

        // Test initial state
        const status = cleanup1.getStatus();
        test.steps.push({
            name: 'Initial State',
            success: !status.isCleaningUp &&
                    status.activeResources.browsers === 0 &&
                    status.activeResources.memoryRefs === 0,
            details: 'Initial state should show no active resources'
        });

        test.success = test.steps.every(step => step.success);
        test.endTime = new Date().toISOString();

        Logger.info(`✅ Basic initialization test ${test.success ? 'PASSED' : 'FAILED'}`);

    } catch (error) {
        test.success = false;
        test.error = error.message;
        test.endTime = new Date().toISOString();
        Logger.error('❌ Basic initialization test failed:', error);
    }

    testResults.tests.push(test);
    testResults.summary.total++;
    if (test.success) testResults.summary.passed++;
    else testResults.summary.failed++;
}

async function testBrowserTermination(testResults) {
    const test = {
        name: 'Browser Process Termination',
        startTime: new Date().toISOString(),
        steps: []
    };

    try {
        Logger.info('🧪 Testing browser process termination');

        const cleanup = new PostSearchCleanup({
            browserTerminationTimeout: 5000,
            detailedLogging: false
        });

        // Register mock browsers
        const browser1 = new MockBrowser('browser1');
        const browser2 = new MockBrowser('browser2');
        const browser3 = new MockBrowser('browser3', true); // This one will fail to close

        cleanup.registerBrowser('browser1', browser1);
        cleanup.registerBrowser('browser2', browser2);
        cleanup.registerBrowser('browser3', browser3);

        test.steps.push({
            name: 'Browser Registration',
            success: cleanup.getStatus().activeResources.browsers === 3,
            details: 'Should register 3 browsers'
        });

        // Execute cleanup
        const result = await cleanup.executeCleanup('test-search-1');

        test.steps.push({
            name: 'Cleanup Execution',
            success: result.success,
            details: 'Cleanup should complete despite one browser failure'
        });

        test.steps.push({
            name: 'Browser Registry Cleared',
            success: cleanup.getStatus().activeResources.browsers === 0,
            details: 'Browser registry should be cleared after cleanup'
        });

        // Check if browsers were properly closed
        test.steps.push({
            name: 'Successful Browser Closures',
            success: browser1.closed && browser2.closed,
            details: 'Successfully registered browsers should be closed'
        });

        test.success = test.steps.every(step => step.success);
        test.endTime = new Date().toISOString();

        Logger.info(`✅ Browser termination test ${test.success ? 'PASSED' : 'FAILED'}`);

    } catch (error) {
        test.success = false;
        test.error = error.message;
        test.endTime = new Date().toISOString();
        Logger.error('❌ Browser termination test failed:', error);
    }

    testResults.tests.push(test);
    testResults.summary.total++;
    if (test.success) testResults.summary.passed++;
    else testResults.summary.failed++;
}

async function testMemoryResourceRelease(testResults) {
    const test = {
        name: 'Memory Resource Release',
        startTime: new Date().toISOString(),
        steps: []
    };

    try {
        Logger.info('🧪 Testing memory resource release');

        const cleanup = new PostSearchCleanup({
            gcIterations: 2,
            gcDelay: 100,
            detailedLogging: false
        });

        // Register mock memory references
        const memRef1 = new MockMemoryReference('ref1', 1024 * 1024); // 1MB
        const memRef2 = new MockMemoryReference('ref2', 2 * 1024 * 1024); // 2MB
        const memRef3 = new MockMemoryReference('ref3', 512 * 1024, true); // 512KB, will fail

        cleanup.registerMemoryReference('ref1', memRef1, 1024 * 1024);
        cleanup.registerMemoryReference('ref2', memRef2, 2 * 1024 * 1024);
        cleanup.registerMemoryReference('ref3', memRef3, 512 * 1024);

        test.steps.push({
            name: 'Memory Reference Registration',
            success: cleanup.getStatus().activeResources.memoryRefs === 3,
            details: 'Should register 3 memory references'
        });

        // Execute cleanup
        const result = await cleanup.executeCleanup('test-search-2');

        test.steps.push({
            name: 'Memory Cleanup Execution',
            success: result.success,
            details: 'Memory cleanup should complete despite one reference failure'
        });

        test.steps.push({
            name: 'Memory Registry Cleared',
            success: cleanup.getStatus().activeResources.memoryRefs === 0,
            details: 'Memory reference registry should be cleared'
        });

        // Check if memory references were properly destroyed
        test.steps.push({
            name: 'Memory References Destroyed',
            success: memRef1.destroyed && memRef2.destroyed,
            details: 'Successfully registered memory references should be destroyed'
        });

        test.success = test.steps.every(step => step.success);
        test.endTime = new Date().toISOString();

        Logger.info(`✅ Memory resource release test ${test.success ? 'PASSED' : 'FAILED'}`);

    } catch (error) {
        test.success = false;
        test.error = error.message;
        test.endTime = new Date().toISOString();
        Logger.error('❌ Memory resource release test failed:', error);
    }

    testResults.tests.push(test);
    testResults.summary.total++;
    if (test.success) testResults.summary.passed++;
    else testResults.summary.failed++;
}

async function testTempFileCleanup(testResults) {
    const test = {
        name: 'Temporary File Cleanup',
        startTime: new Date().toISOString(),
        steps: []
    };

    try {
        Logger.info('🧪 Testing temporary file cleanup');

        const cleanup = new PostSearchCleanup({
            detailedLogging: false
        });

        // Create temporary test files
        const tempDir = path.join(os.tmpdir(), 'cleanup-test');
        await fs.mkdir(tempDir, { recursive: true });

        const tempFile1 = path.join(tempDir, 'test1.tmp');
        const tempFile2 = path.join(tempDir, 'test2.tmp');
        const tempFile3 = path.join(tempDir, 'test3.tmp');

        await fs.writeFile(tempFile1, 'test data 1');
        await fs.writeFile(tempFile2, 'test data 2');
        await fs.writeFile(tempFile3, 'test data 3');

        // Register temp files
        cleanup.registerTempFile(tempFile1, { type: 'search-cache' });
        cleanup.registerTempFile(tempFile2, { type: 'session-data' });
        cleanup.registerTempFile(tempFile3, { type: 'browser-profile' });

        test.steps.push({
            name: 'Temp File Registration',
            success: cleanup.getStatus().activeResources.tempFiles === 3,
            details: 'Should register 3 temporary files'
        });

        // Verify files exist
        const filesExist = await Promise.all([
            fs.access(tempFile1).then(() => true).catch(() => false),
            fs.access(tempFile2).then(() => true).catch(() => false),
            fs.access(tempFile3).then(() => true).catch(() => false)
        ]);

        test.steps.push({
            name: 'Files Exist Before Cleanup',
            success: filesExist.every(exists => exists),
            details: 'All temporary files should exist before cleanup'
        });

        // Execute cleanup
        const result = await cleanup.executeCleanup('test-search-3');

        test.steps.push({
            name: 'File Cleanup Execution',
            success: result.success,
            details: 'File cleanup should complete successfully'
        });

        // Verify files are removed
        const filesRemoved = await Promise.all([
            fs.access(tempFile1).then(() => false).catch(() => true),
            fs.access(tempFile2).then(() => false).catch(() => true),
            fs.access(tempFile3).then(() => false).catch(() => true)
        ]);

        test.steps.push({
            name: 'Files Removed After Cleanup',
            success: filesRemoved.every(removed => removed),
            details: 'All temporary files should be removed after cleanup'
        });

        test.steps.push({
            name: 'Temp File Registry Cleared',
            success: cleanup.getStatus().activeResources.tempFiles === 0,
            details: 'Temp file registry should be cleared'
        });

        // Cleanup test directory
        try {
            await fs.rmdir(tempDir);
        } catch (error) {
            // Ignore cleanup errors
        }

        test.success = test.steps.every(step => step.success);
        test.endTime = new Date().toISOString();

        Logger.info(`✅ Temporary file cleanup test ${test.success ? 'PASSED' : 'FAILED'}`);

    } catch (error) {
        test.success = false;
        test.error = error.message;
        test.endTime = new Date().toISOString();
        Logger.error('❌ Temporary file cleanup test failed:', error);
    }

    testResults.tests.push(test);
    testResults.summary.total++;
    if (test.success) testResults.summary.passed++;
    else testResults.summary.failed++;
}

async function testSessionCleanup(testResults) {
    const test = {
        name: 'Session Data Cleanup',
        startTime: new Date().toISOString(),
        steps: []
    };

    try {
        Logger.info('🧪 Testing session data cleanup');

        const cleanup = new PostSearchCleanup({
            detailedLogging: false
        });

        // Register mock sessions
        const session1 = new MockSession('session1', { userId: 'user1', data: 'session data 1' });
        const session2 = new MockSession('session2', { userId: 'user2', data: 'session data 2' });
        const session3 = new MockSession('session3', { userId: 'user3', data: 'session data 3' }, true);

        cleanup.registerSession('session1', session1);
        cleanup.registerSession('session2', session2);
        cleanup.registerSession('session3', session3);

        test.steps.push({
            name: 'Session Registration',
            success: cleanup.getStatus().activeResources.sessions === 3,
            details: 'Should register 3 sessions'
        });

        // Execute cleanup
        const result = await cleanup.executeCleanup('test-search-4');

        test.steps.push({
            name: 'Session Cleanup Execution',
            success: result.success,
            details: 'Session cleanup should complete despite one session failure'
        });

        test.steps.push({
            name: 'Session Registry Cleared',
            success: cleanup.getStatus().activeResources.sessions === 0,
            details: 'Session registry should be cleared'
        });

        // Check if sessions were properly closed
        test.steps.push({
            name: 'Sessions Closed',
            success: session1.closed && session2.closed,
            details: 'Successfully registered sessions should be closed'
        });

        test.success = test.steps.every(step => step.success);
        test.endTime = new Date().toISOString();

        Logger.info(`✅ Session cleanup test ${test.success ? 'PASSED' : 'FAILED'}`);

    } catch (error) {
        test.success = false;
        test.error = error.message;
        test.endTime = new Date().toISOString();
        Logger.error('❌ Session cleanup test failed:', error);
    }

    testResults.tests.push(test);
    testResults.summary.total++;
    if (test.success) testResults.summary.passed++;
    else testResults.summary.failed++;
}

async function testSearchResultsPreservation(testResults) {
    const test = {
        name: 'Search Results Preservation',
        startTime: new Date().toISOString(),
        steps: []
    };

    try {
        Logger.info('🧪 Testing search results preservation');

        const cleanup = new PostSearchCleanup({
            preserveSearchResults: true,
            detailedLogging: false
        });

        // Store search results
        const searchResults = [
            { title: 'Result 1', url: 'https://example1.com' },
            { title: 'Result 2', url: 'https://example2.com' },
            { title: 'Result 3', url: 'https://example3.com' }
        ];

        cleanup.storeSearchResults('search-1', searchResults);

        test.steps.push({
            name: 'Search Results Storage',
            success: cleanup.getStatus().activeResources.searchResults === 1,
            details: 'Should store search results'
        });

        // Execute cleanup
        const result = await cleanup.executeCleanup('search-1');

        test.steps.push({
            name: 'Cleanup With Results Preservation',
            success: result.success,
            details: 'Cleanup should complete successfully'
        });

        // Verify search results are preserved
        const preservedResults = cleanup.getSearchResults('search-1');
        test.steps.push({
            name: 'Results Preserved After Cleanup',
            success: preservedResults && 
                    preservedResults.results.length === 3 &&
                    preservedResults.preserved === true,
            details: 'Search results should be preserved after cleanup'
        });

        test.steps.push({
            name: 'Results Accessibility',
            success: preservedResults.results[0].title === 'Result 1',
            details: 'Preserved results should be accessible and intact'
        });

        test.success = test.steps.every(step => step.success);
        test.endTime = new Date().toISOString();

        Logger.info(`✅ Search results preservation test ${test.success ? 'PASSED' : 'FAILED'}`);

    } catch (error) {
        test.success = false;
        test.error = error.message;
        test.endTime = new Date().toISOString();
        Logger.error('❌ Search results preservation test failed:', error);
    }

    testResults.tests.push(test);
    testResults.summary.total++;
    if (test.success) testResults.summary.passed++;
    else testResults.summary.failed++;
}

async function testValidationMechanisms(testResults) {
    const test = {
        name: 'Validation Mechanisms',
        startTime: new Date().toISOString(),
        steps: []
    };

    try {
        Logger.info('🧪 Testing validation mechanisms');

        const cleanup = new PostSearchCleanup({
            detailedLogging: false
        });

        // Register resources and then execute cleanup
        const browser = new MockBrowser('validation-browser');
        const memRef = new MockMemoryReference('validation-ref', 1024);

        cleanup.registerBrowser('validation-browser', browser);
        cleanup.registerMemoryReference('validation-ref', memRef, 1024);

        // Store search results to satisfy validation
        cleanup.storeSearchResults('validation-search', {
            query: 'validation test search',
            results: ['result1', 'result2', 'result3'],
            timestamp: Date.now()
        });

        // Execute cleanup
        const result = await cleanup.executeCleanup('validation-search');

        test.steps.push({
            name: 'Cleanup Execution',
            success: result.success,
            details: 'Cleanup should execute successfully'
        });

        // Check validation steps in cleanup log
        const validationStep = result.log.steps.find(step => step.name === 'Resource Release Validation');
        
        test.steps.push({
            name: 'Validation Step Exists',
            success: validationStep !== undefined,
            details: 'Validation step should be included in cleanup log'
        });

        test.steps.push({
            name: 'Validation Success',
            success: validationStep && validationStep.success,
            details: 'Validation should pass for successful cleanup'
        });

        test.steps.push({
            name: 'Multiple Validation Checks',
            success: validationStep && 
                    validationStep.validations &&
                    validationStep.validations.length >= 4, // Browser, Memory, File, Session
            details: 'Should perform multiple validation checks'
        });

        test.success = test.steps.every(step => step.success);
        test.endTime = new Date().toISOString();

        Logger.info(`✅ Validation mechanisms test ${test.success ? 'PASSED' : 'FAILED'}`);

    } catch (error) {
        test.success = false;
        test.error = error.message;
        test.endTime = new Date().toISOString();
        Logger.error('❌ Validation mechanisms test failed:', error);
    }

    testResults.tests.push(test);
    testResults.summary.total++;
    if (test.success) testResults.summary.passed++;
    else testResults.summary.failed++;
}

async function testErrorHandling(testResults) {
    const test = {
        name: 'Error Handling and Recovery',
        startTime: new Date().toISOString(),
        steps: []
    };

    try {
        Logger.info('🧪 Testing error handling and recovery');

        const cleanup = new PostSearchCleanup({
            continueOnError: true,
            detailedLogging: false
        });

        // Register resources that will fail
        const failingBrowser = new MockBrowser('failing-browser', true);
        const failingMemRef = new MockMemoryReference('failing-ref', 1024, true);
        const failingSession = new MockSession('failing-session', { data: 'test' }, true);

        cleanup.registerBrowser('failing-browser', failingBrowser);
        cleanup.registerMemoryReference('failing-ref', failingMemRef, 1024);
        cleanup.registerSession('failing-session', failingSession);

        // Execute cleanup
        const result = await cleanup.executeCleanup('error-test-search');

        test.steps.push({
            name: 'Cleanup Continues Despite Errors',
            success: result.success, // Should still succeed due to continueOnError
            details: 'Cleanup should continue and complete despite individual failures'
        });

        test.steps.push({
            name: 'Error Logging',
            success: result.log.errors.length === 0 && // Errors should be in step details, not main errors
                    result.log.warnings.length > 0,
            details: 'Errors should be logged as warnings when continueOnError is true'
        });

        test.steps.push({
            name: 'Registry Cleanup',
            success: cleanup.getStatus().activeResources.browsers === 0 &&
                    cleanup.getStatus().activeResources.memoryRefs === 0 &&
                    cleanup.getStatus().activeResources.sessions === 0,
            details: 'Registries should be cleared even when individual items fail'
        });

        // Test with continueOnError disabled
        const strictCleanup = new PostSearchCleanup({
            continueOnError: false,
            detailedLogging: false
        });

        const anotherFailingBrowser = new MockBrowser('strict-failing-browser', true);
        strictCleanup.registerBrowser('strict-failing-browser', anotherFailingBrowser);

        try {
            await strictCleanup.executeCleanup('strict-error-test');
            test.steps.push({
                name: 'Strict Mode Error Handling',
                success: false,
                details: 'Should throw error when continueOnError is false'
            });
        } catch (error) {
            test.steps.push({
                name: 'Strict Mode Error Handling',
                success: true,
                details: 'Should throw error when continueOnError is false'
            });
        }

        test.success = test.steps.every(step => step.success);
        test.endTime = new Date().toISOString();

        Logger.info(`✅ Error handling test ${test.success ? 'PASSED' : 'FAILED'}`);

    } catch (error) {
        test.success = false;
        test.error = error.message;
        test.endTime = new Date().toISOString();
        Logger.error('❌ Error handling test failed:', error);
    }

    testResults.tests.push(test);
    testResults.summary.total++;
    if (test.success) testResults.summary.passed++;
    else testResults.summary.failed++;
}

async function testCompleteIntegration(testResults) {
    const test = {
        name: 'Complete Integration Test',
        startTime: new Date().toISOString(),
        steps: []
    };

    try {
        Logger.info('🧪 Testing complete integration scenario');

        const cleanup = new PostSearchCleanup({
            browserTerminationTimeout: 5000,
            memoryReleaseTimeout: 5000,
            gcIterations: 2,
            preserveSearchResults: true,
            detailedLogging: true,
            logPerformanceMetrics: true
        });

        // Simulate a complete search operation with all resource types
        const browsers = [
            new MockBrowser('main-browser'),
            new MockBrowser('worker-browser-1'),
            new MockBrowser('worker-browser-2')
        ];

        const memoryRefs = [
            new MockMemoryReference('search-cache', 5 * 1024 * 1024),
            new MockMemoryReference('result-buffer', 2 * 1024 * 1024),
            new MockMemoryReference('temp-storage', 1 * 1024 * 1024)
        ];

        const sessions = [
            new MockSession('user-session', { userId: 'user123', preferences: {} }),
            new MockSession('search-session', { searchId: 'search123', query: 'test' }),
            new MockSession('analytics-session', { events: [] })
        ];

        // Register all resources
        browsers.forEach((browser, index) => {
            cleanup.registerBrowser(`browser-${index}`, browser);
        });

        memoryRefs.forEach((ref, index) => {
            cleanup.registerMemoryReference(`ref-${index}`, ref, ref.size);
        });

        sessions.forEach((session, index) => {
            cleanup.registerSession(`session-${index}`, session);
        });

        // Create and register temporary files
        const tempDir = path.join(os.tmpdir(), 'integration-test');
        await fs.mkdir(tempDir, { recursive: true });

        const tempFiles = [
            path.join(tempDir, 'search-cache.tmp'),
            path.join(tempDir, 'browser-profile.tmp'),
            path.join(tempDir, 'session-data.tmp')
        ];

        for (const filePath of tempFiles) {
            await fs.writeFile(filePath, `test data for ${path.basename(filePath)}`);
            cleanup.registerTempFile(filePath, { type: 'integration-test' });
        }

        // Store search results
        const searchResults = Array.from({ length: 10 }, (_, i) => ({
            title: `Search Result ${i + 1}`,
            url: `https://example${i + 1}.com`,
            snippet: `This is search result ${i + 1}`
        }));

        cleanup.storeSearchResults('integration-search', searchResults);

        test.steps.push({
            name: 'Resource Registration',
            success: cleanup.getStatus().activeResources.browsers === 3 &&
                    cleanup.getStatus().activeResources.memoryRefs === 3 &&
                    cleanup.getStatus().activeResources.sessions === 3 &&
                    cleanup.getStatus().activeResources.tempFiles === 3 &&
                    cleanup.getStatus().activeResources.searchResults === 1,
            details: 'All resources should be registered correctly'
        });

        // Execute complete cleanup
        const startTime = Date.now();
        const result = await cleanup.executeCleanup('integration-search');
        const duration = Date.now() - startTime;

        test.steps.push({
            name: 'Complete Cleanup Execution',
            success: result.success,
            details: 'Complete cleanup should execute successfully'
        });

        test.steps.push({
            name: 'All Resources Cleared',
            success: cleanup.getStatus().activeResources.browsers === 0 &&
                    cleanup.getStatus().activeResources.memoryRefs === 0 &&
                    cleanup.getStatus().activeResources.sessions === 0 &&
                    cleanup.getStatus().activeResources.tempFiles === 0,
            details: 'All resource registries should be cleared'
        });

        test.steps.push({
            name: 'Search Results Preserved',
            success: cleanup.getStatus().activeResources.searchResults === 1,
            details: 'Search results should be preserved'
        });

        test.steps.push({
            name: 'Performance Metrics',
            success: duration < 10000, // Should complete within 10 seconds
            details: `Cleanup should complete in reasonable time (${duration}ms)`
        });

        // Verify all cleanup steps were executed
        const expectedSteps = [
            'Browser Process Termination',
            'Memory Resource Release',
            'Temporary Files and Session Cleanup',
            'Resource Release Validation'
        ];

        const executedSteps = result.log.steps.map(step => step.name);
        test.steps.push({
            name: 'All Cleanup Steps Executed',
            success: expectedSteps.every(step => executedSteps.includes(step)),
            details: 'All required cleanup steps should be executed'
        });

        // Verify resource destruction
        test.steps.push({
            name: 'Resource Destruction Verification',
            success: browsers.every(b => b.closed) &&
                    memoryRefs.every(r => r.destroyed) &&
                    sessions.every(s => s.closed),
            details: 'All resources should be properly destroyed'
        });

        // Cleanup test directory
        try {
            await fs.rmdir(tempDir, { recursive: true });
        } catch (error) {
            // Ignore cleanup errors
        }

        test.success = test.steps.every(step => step.success);
        test.endTime = new Date().toISOString();

        Logger.info(`✅ Complete integration test ${test.success ? 'PASSED' : 'FAILED'}`);

    } catch (error) {
        test.success = false;
        test.error = error.message;
        test.endTime = new Date().toISOString();
        Logger.error('❌ Complete integration test failed:', error);
    }

    testResults.tests.push(test);
    testResults.summary.total++;
    if (test.success) testResults.summary.passed++;
    else testResults.summary.failed++;
}

async function testPerformanceAndLeakDetection(testResults) {
    const test = {
        name: 'Performance and Memory Leak Detection',
        startTime: new Date().toISOString(),
        steps: []
    };

    try {
        Logger.info('🧪 Testing performance and memory leak detection');

        const cleanup = new PostSearchCleanup({
            memoryLeakThreshold: 1024 * 1024, // 1MB threshold
            logPerformanceMetrics: true,
            detailedLogging: false
        });

        // Measure initial memory
        const initialMemory = process.memoryUsage();

        // Perform multiple cleanup cycles to test performance consistency
        const cleanupTimes = [];
        const memoryUsages = [];

        for (let i = 0; i < 5; i++) {
            // Register some resources
            const browser = new MockBrowser(`perf-browser-${i}`);
            const memRef = new MockMemoryReference(`perf-ref-${i}`, 100 * 1024);

            cleanup.registerBrowser(`perf-browser-${i}`, browser);
            cleanup.registerMemoryReference(`perf-ref-${i}`, memRef, 100 * 1024);

            const startTime = Date.now();
            const result = await cleanup.executeCleanup(`perf-search-${i}`);
            const duration = Date.now() - startTime;

            cleanupTimes.push(duration);
            memoryUsages.push(process.memoryUsage());

            test.steps.push({
                name: `Cleanup Cycle ${i + 1}`,
                success: result.success && duration < 5000, // Should complete within 5 seconds
                details: `Cycle ${i + 1} completed in ${duration}ms`
            });
        }

        // Analyze performance consistency
        const avgTime = cleanupTimes.reduce((a, b) => a + b, 0) / cleanupTimes.length;
        const maxTime = Math.max(...cleanupTimes);
        const minTime = Math.min(...cleanupTimes);

        test.steps.push({
            name: 'Performance Consistency',
            success: (maxTime - minTime) < 2000, // Variance should be less than 2 seconds
            details: `Average: ${Math.round(avgTime)}ms, Range: ${minTime}-${maxTime}ms`
        });

        // Check memory usage trend
        const finalMemory = process.memoryUsage();
        const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

        test.steps.push({
            name: 'Memory Leak Detection',
            success: memoryIncrease < cleanup.config.memoryLeakThreshold,
            details: `Memory increase: ${Math.round(memoryIncrease / 1024)}KB`
        });

        // Test cleanup metrics
        const status = cleanup.getStatus();
        test.steps.push({
            name: 'Metrics Collection',
            success: status.metrics.totalCleanups === 5 &&
                    status.metrics.successfulCleanups === 5 &&
                    status.metrics.averageCleanupTime > 0,
            details: 'Cleanup metrics should be properly collected'
        });

        test.success = test.steps.every(step => step.success);
        test.endTime = new Date().toISOString();

        Logger.info(`✅ Performance and leak detection test ${test.success ? 'PASSED' : 'FAILED'}`);

    } catch (error) {
        test.success = false;
        test.error = error.message;
        test.endTime = new Date().toISOString();
        Logger.error('❌ Performance and leak detection test failed:', error);
    }

    testResults.tests.push(test);
    testResults.summary.total++;
    if (test.success) testResults.summary.passed++;
    else testResults.summary.failed++;
}

// Run the test suite
if (require.main === module) {
    runPostSearchCleanupTests()
        .then(results => {
            const success = results.summary.failed === 0;
            Logger.info(`🎯 Test suite ${success ? 'COMPLETED SUCCESSFULLY' : 'COMPLETED WITH FAILURES'}`);
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            Logger.error('💥 Test suite execution failed:', error);
            process.exit(1);
        });
}

module.exports = { runPostSearchCleanupTests };