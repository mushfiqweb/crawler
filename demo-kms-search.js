const KMSSearchProtocol = require('./src/core/kms-search-protocol');

/**
 * Simple demonstration of KMS Search Protocol
 * Shows the protocol in action with a single keyword search
 */
async function demonstrateKMSSearchProtocol() {
    console.log('🚀 KMS Search Protocol Demonstration');
    console.log('=' .repeat(50));

    // Initialize the protocol
    const protocol = new KMSSearchProtocol({
        enableAdvancedEvasion: true,
        respectRateLimit: true
    });

    try {
        // Test with KMS Marketplace specific keywords
        const keywords = 'kmsmarketplace digital products';
        
        console.log(`🔍 Searching for: "${keywords}"`);
        console.log('📋 Protocol will:');
        console.log('   1. Perform Google search');
        console.log('   2. Analyze results for kmsmarketplace.com');
        console.log('   3. Navigate to appropriate URL');
        console.log('   4. Simulate realistic user engagement');
        console.log('   5. Generate session analytics');
        console.log('\n⏳ Starting search protocol...\n');

        // Execute the search protocol
        const result = await protocol.executeSearchProtocol(keywords);

        if (result.success) {
            console.log('✅ Search Protocol Completed Successfully!');
            console.log('\n📊 Results Summary:');
            console.log(`   Session ID: ${result.sessionId}`);
            console.log(`   Search Results Found: ${result.searchResults?.length || 0}`);
            console.log(`   KMS Result Found: ${result.kmsResult?.found ? 'Yes' : 'No'}`);
            
            if (result.kmsResult?.found) {
                console.log(`   KMS Position: #${result.kmsResult.position}`);
                console.log(`   KMS URL: ${result.kmsResult.url}`);
            }
            
            console.log(`   Navigation Strategy: ${result.browsingResults?.strategy}`);
            console.log(`   Target URL: ${result.browsingResults?.targetUrl}`);
            
            if (result.browsingResults?.engagementResults) {
                const engagement = result.browsingResults.engagementResults;
                console.log(`   Engagement Time: ${(engagement.totalTime/1000).toFixed(1)}s`);
                console.log(`   User Actions: ${engagement.scrollActions} scrolls, ${engagement.clickActions} clicks, ${engagement.mouseMovements} mouse moves`);
            }

            // Show protocol analytics
            const analytics = protocol.getAnalytics();
            console.log('\n📈 Protocol Analytics:');
            console.log(`   Total Searches: ${analytics.protocolStats.totalSearches}`);
            console.log(`   Direct Hits: ${analytics.protocolStats.directHits}`);
            console.log(`   Fallback Navigations: ${analytics.protocolStats.fallbackNavigations}`);
            console.log(`   Average Engagement: ${(analytics.averageEngagementTime/1000).toFixed(1)}s`);

        } else {
            console.log('❌ Search Protocol Failed');
            console.log(`   Error: ${result.error}`);
        }

    } catch (error) {
        console.error('💥 Demonstration failed:', error.message);
    }

    console.log('\n🏁 Demonstration completed');
}

// Run demonstration
demonstrateKMSSearchProtocol().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});