const KMSSearchProtocol = require('./src/core/kms-search-protocol');
const { defaultLogger: Logger } = require('./src/utils/logger');

async function testNavigationFix() {
    Logger.info('🧪 Testing Enhanced KMS Search Protocol Navigation Fix');
    
    const protocol = new KMSSearchProtocol({
        headless: false, // Show browser for debugging
        useRedirection: true,
        fallbackUrl: 'https://kmsmarketplace.com/collections/all',
        engagementDuration: { min: 5000, max: 10000 } // Shorter for testing
    });

    try {
        Logger.info('🔍 Testing search for "kmsmarketplace Gaming Headset"');
        
        const result = await protocol.executeSearchProtocol('kmsmarketplace Gaming Headset', {
            platform: 'Google',
            device: 'desktop',
            maxRetries: 2
        });

        Logger.info('📊 Search Protocol Results:', {
            success: result.success,
            keyword: result.keyword,
            platform: result.platform,
            duration: result.duration,
            sessionId: result.sessionId
        });

        if (result.browsingResults) {
            Logger.info('🌐 Browsing Results:', {
                targetUrl: result.browsingResults.targetUrl,
                strategy: result.browsingResults.strategy,
                success: result.browsingResults.success
            });

            if (result.browsingResults.redirectionResults) {
                Logger.info('🔄 Redirection Results:', {
                    finalUrl: result.browsingResults.redirectionResults.finalUrl,
                    navigationSuccess: result.browsingResults.redirectionResults.navigationSuccess,
                    engagementCompleted: result.browsingResults.redirectionResults.engagementCompleted
                });
            }
        }

        // Get analytics
        const analytics = protocol.getAnalytics();
        Logger.info('📈 Protocol Analytics:', analytics);

        Logger.info('✅ Navigation test completed successfully');

    } catch (error) {
        Logger.error('❌ Navigation test failed:', error);
        throw error;
    } finally {
        // Clean up
        try {
            await protocol.resetProtocol();
            Logger.info('🧹 Protocol cleanup completed');
        } catch (cleanupError) {
            Logger.error('⚠️ Cleanup error:', cleanupError);
        }
    }
}

// Run the test
testNavigationFix()
    .then(() => {
        Logger.info('🎉 Test completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        Logger.error('💥 Test failed:', error);
        process.exit(1);
    });