/**
 * Debug script to test system validation
 */

const { SystemValidator } = require('./src/validation/system-validator');

async function debugValidation() {
    console.log('🔍 Starting validation debug...');
    
    try {
        const validator = new SystemValidator();
        const result = await validator.validateSystem();
        
        console.log('\n✅ Validation Results:');
        console.log('Passed:', result.passed);
        console.log('Failed:', result.failed);
        console.log('Warnings:', result.warnings);
        console.log('Success:', result.success);
        
        if (result.results.failed.length > 0) {
            console.log('\n❌ Failed Checks:');
            result.results.failed.forEach(failure => {
                console.log(`  - ${failure.check}: ${failure.message}`);
            });
        }
        
        if (result.results.warnings.length > 0) {
            console.log('\n⚠️ Warnings:');
            result.results.warnings.forEach(warning => {
                console.log(`  - ${warning.check}: ${warning.message}`);
            });
        }
        
        console.log('\n✅ Passed Checks:');
        result.results.passed.forEach(pass => {
            console.log(`  - ${pass.check}: ${pass.message}`);
        });
        
    } catch (error) {
        console.error('❌ Validation error:', error.message);
        console.error(error.stack);
    }
}

debugValidation();