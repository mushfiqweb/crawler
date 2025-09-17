/**
 * System Validator Module
 * Validates system requirements, dependencies, and configurations
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const { defaultLogger: Logger } = require('../utils/logger');

class SystemValidator {
    constructor() {
        this.logger = Logger;
        this.validationResults = {
            passed: [],
            failed: [],
            warnings: []
        };
    }

    /**
     * Run comprehensive system validation
     */
    async validateSystem() {
        this.logger.info('Starting comprehensive system validation...');
        
        try {
            await this.validateNodeVersion();
            await this.validateDependencies();
            await this.validateDirectoryStructure();
            await this.validateConfigurationFiles();
            await this.validatePermissions();
            await this.validateSystemResources();
            await this.validateNetworkConnectivity();
            
            return this.getValidationSummary();
        } catch (error) {
            this.logger.error('System validation failed:', error);
            throw error;
        }
    }

    /**
     * Validate Node.js version
     */
    async validateNodeVersion() {
        try {
            const nodeVersion = process.version;
            const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
            
            if (majorVersion >= 16) {
                this.addResult('passed', 'Node.js version', `${nodeVersion} (supported)`);
            } else if (majorVersion >= 14) {
                this.addResult('warnings', 'Node.js version', `${nodeVersion} (minimum supported, upgrade recommended)`);
            } else {
                this.addResult('failed', 'Node.js version', `${nodeVersion} (unsupported, requires Node.js 14+)`);
            }
        } catch (error) {
            this.addResult('failed', 'Node.js version check', error.message);
        }
    }

    /**
     * Validate package dependencies
     */
    async validateDependencies() {
        try {
            const packageJsonPath = path.join(process.cwd(), 'package.json');
            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
            
            // Check if package.json exists
            this.addResult('passed', 'package.json', 'Found and readable');
            
            // Validate required dependencies
            const requiredDeps = [
                'puppeteer',
                'puppeteer-extra',
                'puppeteer-extra-plugin-stealth'
            ];
            
            const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
            
            for (const dep of requiredDeps) {
                if (dependencies[dep]) {
                    this.addResult('passed', `Dependency: ${dep}`, `Version ${dependencies[dep]}`);
                } else {
                    this.addResult('failed', `Dependency: ${dep}`, 'Missing required dependency');
                }
            }
            
            // Check for node_modules
            try {
                await fs.access(path.join(process.cwd(), 'node_modules'));
                this.addResult('passed', 'node_modules', 'Dependencies installed');
            } catch {
                this.addResult('failed', 'node_modules', 'Dependencies not installed (run npm install)');
            }
            
        } catch (error) {
            this.addResult('failed', 'Dependencies validation', error.message);
        }
    }

    /**
     * Validate directory structure
     */
    async validateDirectoryStructure() {
        try {
            const requiredDirs = [
                'src',
                'src/config',
                'src/core',
                'src/utils',
                'src/validation'
            ];
            
            for (const dir of requiredDirs) {
                try {
                    const stats = await fs.stat(dir);
                    if (stats.isDirectory()) {
                        this.addResult('passed', `Directory: ${dir}`, 'Exists and accessible');
                    } else {
                        this.addResult('failed', `Directory: ${dir}`, 'Path exists but is not a directory');
                    }
                } catch {
                    this.addResult('failed', `Directory: ${dir}`, 'Missing required directory');
                }
            }
            
            // Check for required files
            const requiredFiles = [
                'src/crawler.js',
                'src/stats.txt',
                'src/config/organic-behavior.js',
                'src/config/performance.js',
                'src/config/device-configurations.js',
                'src/config/search-platforms.js',
                'src/config/keywords.js'
            ];
            
            for (const file of requiredFiles) {
                try {
                    await fs.access(file);
                    this.addResult('passed', `File: ${file}`, 'Exists and accessible');
                } catch {
                    this.addResult('failed', `File: ${file}`, 'Missing required file');
                }
            }
            
        } catch (error) {
            this.addResult('failed', 'Directory structure validation', error.message);
        }
    }

    /**
     * Validate configuration files
     */
    async validateConfigurationFiles() {
        try {
            const configFiles = [
                'src/config/organic-behavior.js',
                'src/config/performance.js',
                'src/config/device-configurations.js',
                'src/config/search-platforms.js',
                'src/config/keywords.js'
            ];
            
            for (const configFile of configFiles) {
                try {
                    // Try to require the module
                    const config = require(path.resolve(configFile));
                    
                    if (typeof config === 'object' && config !== null) {
                        this.addResult('passed', `Config: ${configFile}`, 'Valid module export');
                        
                        // Validate specific configurations
                        await this.validateSpecificConfig(configFile, config);
                    } else {
                        this.addResult('failed', `Config: ${configFile}`, 'Invalid module export');
                    }
                } catch (error) {
                    this.addResult('failed', `Config: ${configFile}`, `Module error: ${error.message}`);
                }
            }
            
        } catch (error) {
            this.addResult('failed', 'Configuration files validation', error.message);
        }
    }

    /**
     * Validate specific configuration content
     */
    async validateSpecificConfig(configFile, config) {
        const fileName = path.basename(configFile, '.js');
        
        switch (fileName) {
            case 'organic-behavior':
                this.validateOrganicBehaviorConfig(config);
                break;
            case 'performance':
                this.validatePerformanceConfig(config);
                break;
            case 'device-configurations':
                this.validateDeviceConfig(config);
                break;
            case 'search-platforms':
                this.validatePlatformsConfig(config);
                break;
            case 'keywords':
                this.validateKeywordsConfig(config);
                break;
        }
    }

    /**
     * Validate organic behavior configuration
     */
    validateOrganicBehaviorConfig(config) {
        const required = ['ORGANIC_BEHAVIOR'];
        const organicBehavior = config.ORGANIC_BEHAVIOR;
        
        if (!organicBehavior) {
            this.addResult('failed', 'Organic behavior config', 'Missing ORGANIC_BEHAVIOR export');
            return;
        }
        
        const requiredProps = ['minDelay', 'maxDelay', 'humanPatterns', 'antiDetection'];
        for (const prop of requiredProps) {
            if (organicBehavior[prop] !== undefined) {
                this.addResult('passed', `Organic behavior: ${prop}`, 'Property exists');
            } else {
                this.addResult('warnings', `Organic behavior: ${prop}`, 'Property missing');
            }
        }
    }

    /**
     * Validate performance configuration
     */
    validatePerformanceConfig(config) {
        const required = ['PERFORMANCE_CONFIG'];
        const perfConfig = config.PERFORMANCE_CONFIG;
        
        if (!perfConfig) {
            this.addResult('failed', 'Performance config', 'Missing PERFORMANCE_CONFIG export');
            return;
        }
        
        const requiredProps = ['maxConcurrentBrowsers', 'requestTimeout', 'retryAttempts'];
        for (const prop of requiredProps) {
            if (perfConfig[prop] !== undefined) {
                this.addResult('passed', `Performance: ${prop}`, 'Property exists');
            } else {
                this.addResult('warnings', `Performance: ${prop}`, 'Property missing');
            }
        }
    }

    /**
     * Validate device configuration
     */
    validateDeviceConfig(config) {
        const deviceConfigs = config.DEVICE_CONFIGURATIONS;
        
        if (!deviceConfigs) {
            this.addResult('failed', 'Device config', 'Missing DEVICE_CONFIGURATIONS export');
            return;
        }
        
        if (Array.isArray(deviceConfigs) && deviceConfigs.length > 0) {
            this.addResult('passed', 'Device configurations', `${deviceConfigs.length} configurations found`);
            
            // Validate first device config structure
            const firstDevice = deviceConfigs[0];
            const requiredProps = ['name', 'userAgent', 'viewport'];
            for (const prop of requiredProps) {
                if (firstDevice[prop]) {
                    this.addResult('passed', `Device config: ${prop}`, 'Property exists');
                } else {
                    this.addResult('warnings', `Device config: ${prop}`, 'Property missing in first device');
                }
            }
        } else {
            this.addResult('failed', 'Device configurations', 'No device configurations found');
        }
    }

    /**
     * Validate platforms configuration
     */
    validatePlatformsConfig(config) {
        const platforms = config.SEARCH_PLATFORMS;
        
        if (!platforms) {
            this.addResult('failed', 'Platforms config', 'Missing SEARCH_PLATFORMS export');
            return;
        }
        
        if (Array.isArray(platforms) && platforms.length > 0) {
            this.addResult('passed', 'Search platforms', `${platforms.length} platforms configured`);
            
            // Validate platform structure
            for (const platform of platforms) {
                const requiredProps = ['name', 'baseURL', 'queryParam'];
                const missingProps = requiredProps.filter(prop => !platform[prop]);
                
                if (missingProps.length === 0) {
                    this.addResult('passed', `Platform: ${platform.name}`, 'Complete configuration');
                } else {
                    this.addResult('warnings', `Platform: ${platform.name}`, `Missing: ${missingProps.join(', ')}`);
                }
            }
        } else {
            this.addResult('failed', 'Search platforms', 'No platforms configured');
        }
    }

    /**
     * Validate keywords configuration
     */
    validateKeywordsConfig(config) {
        const keywords = config.KEYWORDS;
        const categories = config.KEYWORD_CATEGORIES;
        
        if (!keywords) {
            this.addResult('failed', 'Keywords config', 'Missing KEYWORDS export');
        } else if (Array.isArray(keywords) && keywords.length > 0) {
            this.addResult('passed', 'Keywords', `${keywords.length} keywords configured`);
        } else {
            this.addResult('warnings', 'Keywords', 'No keywords configured');
        }
        
        if (!categories) {
            this.addResult('warnings', 'Keyword categories', 'Missing KEYWORD_CATEGORIES export');
        } else {
            const categoryCount = Object.keys(categories).length;
            this.addResult('passed', 'Keyword categories', `${categoryCount} categories configured`);
        }
    }

    /**
     * Validate file permissions
     */
    async validatePermissions() {
        try {
            const testFile = path.join(process.cwd(), 'src', '.permission-test');
            
            // Test write permissions
            await fs.writeFile(testFile, 'test');
            this.addResult('passed', 'Write permissions', 'Can write to src directory');
            
            // Test read permissions
            await fs.readFile(testFile);
            this.addResult('passed', 'Read permissions', 'Can read from src directory');
            
            // Clean up test file
            await fs.unlink(testFile);
            
        } catch (error) {
            this.addResult('failed', 'File permissions', `Permission error: ${error.message}`);
        }
    }

    /**
     * Validate system resources
     */
    async validateSystemResources() {
        try {
            // Check available memory
            const totalMemory = require('os').totalmem();
            const freeMemory = require('os').freemem();
            const usedMemory = totalMemory - freeMemory;
            const memoryUsagePercent = (usedMemory / totalMemory) * 100;
            
            if (memoryUsagePercent < 80) {
                this.addResult('passed', 'Memory usage', `${memoryUsagePercent.toFixed(1)}% used`);
            } else if (memoryUsagePercent < 90) {
                this.addResult('warnings', 'Memory usage', `${memoryUsagePercent.toFixed(1)}% used (high)`);
            } else {
                this.addResult('failed', 'Memory usage', `${memoryUsagePercent.toFixed(1)}% used (critical)`);
            }
            
            // Check CPU load (simplified)
            const cpuCount = require('os').cpus().length;
            this.addResult('passed', 'CPU cores', `${cpuCount} cores available`);
            
            // Check disk space for current directory
            try {
                const stats = await fs.stat(process.cwd());
                this.addResult('passed', 'Disk access', 'Current directory accessible');
            } catch (error) {
                this.addResult('failed', 'Disk access', error.message);
            }
            
        } catch (error) {
            this.addResult('failed', 'System resources check', error.message);
        }
    }

    /**
     * Validate network connectivity
     */
    async validateNetworkConnectivity() {
        try {
            const testUrls = [
                'https://www.google.com',
                'https://www.facebook.com',
                'https://httpbin.org/get'
            ];
            
            for (const url of testUrls) {
                try {
                    const response = await fetch(url, { 
                        method: 'HEAD',
                        timeout: 5000 
                    });
                    
                    if (response.ok) {
                        this.addResult('passed', `Network: ${new URL(url).hostname}`, 'Accessible');
                    } else {
                        this.addResult('warnings', `Network: ${new URL(url).hostname}`, `HTTP ${response.status}`);
                    }
                } catch (error) {
                    this.addResult('failed', `Network: ${new URL(url).hostname}`, error.message);
                }
            }
            
        } catch (error) {
            this.addResult('failed', 'Network connectivity check', error.message);
        }
    }

    /**
     * Add validation result
     */
    addResult(type, component, message) {
        const result = {
            component,
            message,
            timestamp: new Date().toISOString()
        };
        
        this.validationResults[type].push(result);
        
        // Log the result
        switch (type) {
            case 'passed':
                this.logger.info(`✓ ${component}: ${message}`);
                break;
            case 'warnings':
                this.logger.warn(`⚠ ${component}: ${message}`);
                break;
            case 'failed':
                this.logger.error(`✗ ${component}: ${message}`);
                break;
        }
    }

    /**
     * Get validation summary
     */
    getValidationSummary() {
        const summary = {
            totalChecks: this.validationResults.passed.length + 
                        this.validationResults.warnings.length + 
                        this.validationResults.failed.length,
            passed: this.validationResults.passed.length,
            warnings: this.validationResults.warnings.length,
            failed: this.validationResults.failed.length,
            success: this.validationResults.failed.length === 0,
            results: this.validationResults
        };
        
        this.logger.info(`Validation Summary: ${summary.passed} passed, ${summary.warnings} warnings, ${summary.failed} failed`);
        
        return summary;
    }

    /**
     * Generate validation report
     */
    generateReport() {
        const summary = this.getValidationSummary();
        let report = '\n';
        report += '╔══════════════════════════════════════════════════════════════════════════════╗\n';
        report += '║                           SYSTEM VALIDATION REPORT                          ║\n';
        report += '╠══════════════════════════════════════════════════════════════════════════════╣\n';
        report += `║ Total Checks: ${summary.totalChecks.toString().padEnd(10)} │ Passed: ${summary.passed.toString().padEnd(10)} │ Warnings: ${summary.warnings.toString().padEnd(10)} │ Failed: ${summary.failed.toString().padEnd(8)} ║\n`;
        report += '╠══════════════════════════════════════════════════════════════════════════════╣\n';
        
        if (summary.success) {
            report += '║ STATUS: ✓ SYSTEM VALIDATION PASSED                                          ║\n';
        } else {
            report += '║ STATUS: ✗ SYSTEM VALIDATION FAILED                                          ║\n';
        }
        
        report += '╚══════════════════════════════════════════════════════════════════════════════╝\n';
        
        // Add detailed results
        if (this.validationResults.failed.length > 0) {
            report += '\n❌ FAILED CHECKS:\n';
            this.validationResults.failed.forEach(result => {
                report += `   • ${result.component}: ${result.message}\n`;
            });
        }
        
        if (this.validationResults.warnings.length > 0) {
            report += '\n⚠️  WARNINGS:\n';
            this.validationResults.warnings.forEach(result => {
                report += `   • ${result.component}: ${result.message}\n`;
            });
        }
        
        if (this.validationResults.passed.length > 0) {
            report += '\n✅ PASSED CHECKS:\n';
            this.validationResults.passed.forEach(result => {
                report += `   • ${result.component}: ${result.message}\n`;
            });
        }
        
        return report;
    }

    /**
     * Reset validation results
     */
    reset() {
        this.validationResults = {
            passed: [],
            failed: [],
            warnings: []
        };
    }

    /**
     * Quick health check
     */
    async quickHealthCheck() {
        this.reset();
        
        try {
            await this.validateNodeVersion();
            await this.validateDirectoryStructure();
            await this.validatePermissions();
            
            return this.getValidationSummary();
        } catch (error) {
            this.logger.error('Quick health check failed:', error);
            throw error;
        }
    }
}

module.exports = { SystemValidator };