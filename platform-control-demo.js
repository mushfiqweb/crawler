/**
 * Platform Control Demo Script
 * Demonstrates the platform enable/disable functionality
 */

const { platformControl } = require('./src/utils/platform-control');
const { PlatformManager } = require('./src/config/search-platforms');

async function demonstratePlatformControl() {
    console.log('🚀 Platform Control Demo\n');

    // Show initial status
    console.log('📊 Initial Platform Status:');
    platformControl.printStatus();

    // Add event listeners to monitor changes
    platformControl.addEventListener('platformEnabled', (data) => {
        console.log(`🔔 Event: Platform "${data.platformName}" was enabled at ${data.timestamp}`);
    });

    platformControl.addEventListener('platformDisabled', (data) => {
        console.log(`🔔 Event: Platform "${data.platformName}" was disabled at ${data.timestamp}`);
    });

    // Demonstrate individual platform control
    console.log('🎯 Testing Individual Platform Control:');
    
    // Disable Google
    console.log('\n1. Disabling Google platform...');
    platformControl.disablePlatform('Google');
    
    // Try to disable it again (should show already disabled message)
    console.log('\n2. Trying to disable Google again...');
    platformControl.disablePlatform('Google');
    
    // Enable Google back
    console.log('\n3. Enabling Google platform...');
    platformControl.enablePlatform('Google');
    
    // Toggle Facebook
    console.log('\n4. Toggling Facebook platform...');
    const newFacebookStatus = platformControl.togglePlatform('Facebook');
    console.log(`Facebook is now: ${newFacebookStatus ? 'enabled' : 'disabled'}`);
    
    // Toggle Facebook back
    console.log('\n5. Toggling Facebook platform again...');
    platformControl.togglePlatform('Facebook');

    // Demonstrate bulk operations
    console.log('\n🔄 Testing Bulk Operations:');
    
    // Bulk disable some platforms
    console.log('\n6. Bulk disabling Google and X/Twitter...');
    const bulkDisableResult = platformControl.bulkTogglePlatforms(['Google', 'X/Twitter'], false);
    console.log('Bulk disable results:', bulkDisableResult);
    
    // Show status after bulk disable
    console.log('\n📊 Status after bulk disable:');
    platformControl.printStatus();
    
    // Bulk enable them back
    console.log('7. Bulk enabling Google and X/Twitter...');
    const bulkEnableResult = platformControl.bulkTogglePlatforms(['Google', 'X/Twitter'], true);
    console.log('Bulk enable results:', bulkEnableResult);

    // Demonstrate global controls
    console.log('\n🌐 Testing Global Controls:');
    
    // Disable all platforms
    console.log('\n8. Disabling all platforms...');
    platformControl.disableAllPlatforms();
    platformControl.printStatus();
    
    // Enable all platforms
    console.log('9. Enabling all platforms...');
    platformControl.enableAllPlatforms();
    platformControl.printStatus();

    // Show final detailed status
    console.log('📋 Final Detailed Status:');
    const detailedStatus = platformControl.getDetailedStatus();
    console.log(JSON.stringify(detailedStatus, null, 2));

    // Test platform manager directly
    console.log('\n🔍 Testing PlatformManager directly:');
    console.log('Enabled platforms:', PlatformManager.getEnabledPlatforms().map(p => p.name));
    console.log('Is Google enabled?', PlatformManager.isPlatformEnabled('Google'));
    console.log('Is Facebook enabled?', PlatformManager.isPlatformEnabled('Facebook'));

    console.log('\n✅ Platform Control Demo completed!');
}

// Run the demo
if (require.main === module) {
    demonstratePlatformControl().catch(error => {
        console.error('❌ Demo failed:', error);
    });
}

module.exports = { demonstratePlatformControl };