/**
 * Resource Cleanup System
 * Comprehensive resource deallocation for memory, files, network, and database cleanup
 */

const { EventEmitter } = require('events');
const { defaultLogger: Logger } = require('../utils/logger');
const { performance } = require('perf_hooks');
const fs = require('fs').promises;
const path = require('path');

class ResourceCleanup extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            // Cleanup timeouts
            memoryCleanupTimeout: options.memoryCleanupTimeout || 30000, // 30 seconds
            fileCleanupTimeout: options.fileCleanupTimeout || 20000, // 20 seconds
            networkCleanupTimeout: options.networkCleanupTimeout || 15000, // 15 seconds
            databaseCleanupTimeout: options.databaseCleanupTimeout || 25000, // 25 seconds
            
            // Garbage collection settings
            forceGarbageCollection: options.forceGarbageCollection !== false,
            gcIterations: options.gcIterations || 3,
            gcDelay: options.gcDelay || 1000, // 1 second between iterations
            
            // File cleanup settings
            tempDirectories: options.tempDirectories || ['./temp', './cache', './downloads'],
            maxFileAge: options.maxFileAge || 24 * 60 * 60 * 1000, // 24 hours
            preservePatterns: options.preservePatterns || ['.gitkeep', 'README.md'],
            
            // Network cleanup settings
            connectionPoolTimeout: options.connectionPoolTimeout || 10000,
            socketTimeout: options.socketTimeout || 5000,
            
            // Database cleanup settings
            connectionTimeout: options.connectionTimeout || 15000,
            transactionTimeout: options.transactionTimeout || 10000,
            
            // Logging
            enableDetailedLogging: options.enableDetailedLogging !== false,
            logCleanupStats: options.logCleanupStats !== false
        };

        // Resource tracking
        this.resources = {
            memory: {
                buffers: new Set(),
                streams: new Set(),
                timers: new Set(),
                intervals: new Set(),
                watchers: new Set()
            },
            files: {
                handles: new Set(),
                tempFiles: new Set(),
                lockFiles: new Set(),
                streams: new Set()
            },
            network: {
                connections: new Set(),
                sockets: new Set(),
                servers: new Set(),
                agents: new Set()
            },
            database: {
                connections: new Set(),
                transactions: new Set(),
                pools: new Set(),
                cursors: new Set()
            }
        };

        // Cleanup statistics
        this.stats = {
            totalCleanups: 0,
            lastCleanupTime: null,
            lastCleanupDuration: null,
            resourcesCleaned: {
                memory: 0,
                files: 0,
                network: 0,
                database: 0
            },
            errors: []
        };

        Logger.info('🧹 ResourceCleanup system initialized', {
            memoryTimeout: `${this.config.memoryCleanupTimeout}ms`,
            fileTimeout: `${this.config.fileCleanupTimeout}ms`,
            networkTimeout: `${this.config.networkCleanupTimeout}ms`,
            databaseTimeout: `${this.config.databaseCleanupTimeout}ms`
        });
    }

    /**
     * Perform comprehensive resource cleanup
     */
    async performCleanup(options = {}) {
        const startTime = performance.now();
        const cleanupId = `cleanup_${Date.now()}`;
        
        try {
            Logger.info('🧹 Starting comprehensive resource cleanup', {
                cleanupId,
                timestamp: new Date().toISOString(),
                forced: options.forced || false
            });

            this.stats.totalCleanups++;
            const results = {
                memory: null,
                files: null,
                network: null,
                database: null,
                errors: []
            };

            // Run cleanup operations in parallel with timeouts
            const cleanupPromises = [
                this.cleanupMemoryResources().catch(error => {
                    results.errors.push({ type: 'memory', error: error.message });
                    return { success: false, error: error.message };
                }),
                this.cleanupFileResources().catch(error => {
                    results.errors.push({ type: 'files', error: error.message });
                    return { success: false, error: error.message };
                }),
                this.cleanupNetworkResources().catch(error => {
                    results.errors.push({ type: 'network', error: error.message });
                    return { success: false, error: error.message };
                }),
                this.cleanupDatabaseResources().catch(error => {
                    results.errors.push({ type: 'database', error: error.message });
                    return { success: false, error: error.message };
                })
            ];

            // Wait for all cleanup operations
            const [memoryResult, fileResult, networkResult, databaseResult] = await Promise.allSettled(cleanupPromises);

            results.memory = memoryResult.status === 'fulfilled' ? memoryResult.value : { success: false, error: memoryResult.reason };
            results.files = fileResult.status === 'fulfilled' ? fileResult.value : { success: false, error: fileResult.reason };
            results.network = networkResult.status === 'fulfilled' ? networkResult.value : { success: false, error: networkResult.reason };
            results.database = databaseResult.status === 'fulfilled' ? databaseResult.value : { success: false, error: databaseResult.reason };

            const endTime = performance.now();
            const duration = endTime - startTime;

            this.stats.lastCleanupTime = Date.now();
            this.stats.lastCleanupDuration = duration;

            // Log cleanup results
            const successCount = [results.memory, results.files, results.network, results.database]
                .filter(result => result && result.success).length;

            Logger.info('✅ Resource cleanup completed', {
                cleanupId,
                duration: `${Math.round(duration)}ms`,
                successfulOperations: `${successCount}/4`,
                totalErrors: results.errors.length,
                memoryFreed: results.memory?.memoryFreed || 0,
                filesRemoved: results.files?.filesRemoved || 0,
                connectionsClosedNetwork: results.network?.connectionsClosed || 0,
                connectionsClosedDatabase: results.database?.connectionsClosed || 0
            });

            // Emit cleanup completed event
            this.emit('cleanupCompleted', {
                cleanupId,
                duration,
                results,
                timestamp: Date.now()
            });

            return {
                success: results.errors.length === 0,
                duration,
                results,
                errors: results.errors
            };

        } catch (error) {
            const endTime = performance.now();
            const duration = endTime - startTime;

            Logger.error('❌ Resource cleanup failed', {
                cleanupId,
                duration: `${Math.round(duration)}ms`,
                error: error.message
            });

            this.stats.errors.push({
                type: 'general_cleanup_error',
                error: error.message,
                timestamp: Date.now()
            });

            throw error;
        }
    }

    /**
     * Cleanup memory resources
     */
    async cleanupMemoryResources() {
        const startTime = performance.now();
        
        try {
            Logger.debug('🧠 Starting memory cleanup');
            
            const initialMemory = process.memoryUsage();
            let resourcesFreed = 0;

            // Clear tracked buffers
            for (const buffer of this.resources.memory.buffers) {
                try {
                    if (buffer && typeof buffer.fill === 'function') {
                        buffer.fill(0); // Zero out buffer
                    }
                    resourcesFreed++;
                } catch (error) {
                    Logger.warn('⚠️ Failed to clear buffer:', error.message);
                }
            }
            this.resources.memory.buffers.clear();

            // Close tracked streams
            for (const stream of this.resources.memory.streams) {
                try {
                    if (stream && typeof stream.destroy === 'function') {
                        stream.destroy();
                    } else if (stream && typeof stream.close === 'function') {
                        stream.close();
                    }
                    resourcesFreed++;
                } catch (error) {
                    Logger.warn('⚠️ Failed to close stream:', error.message);
                }
            }
            this.resources.memory.streams.clear();

            // Clear timers
            for (const timer of this.resources.memory.timers) {
                try {
                    clearTimeout(timer);
                    resourcesFreed++;
                } catch (error) {
                    Logger.warn('⚠️ Failed to clear timer:', error.message);
                }
            }
            this.resources.memory.timers.clear();

            // Clear intervals
            for (const interval of this.resources.memory.intervals) {
                try {
                    clearInterval(interval);
                    resourcesFreed++;
                } catch (error) {
                    Logger.warn('⚠️ Failed to clear interval:', error.message);
                }
            }
            this.resources.memory.intervals.clear();

            // Close file watchers
            for (const watcher of this.resources.memory.watchers) {
                try {
                    if (watcher && typeof watcher.close === 'function') {
                        watcher.close();
                    }
                    resourcesFreed++;
                } catch (error) {
                    Logger.warn('⚠️ Failed to close watcher:', error.message);
                }
            }
            this.resources.memory.watchers.clear();

            // Force garbage collection if enabled
            let memoryFreed = 0;
            if (this.config.forceGarbageCollection && global.gc) {
                for (let i = 0; i < this.config.gcIterations; i++) {
                    const beforeGC = process.memoryUsage().heapUsed;
                    global.gc();
                    await new Promise(resolve => setTimeout(resolve, this.config.gcDelay));
                    const afterGC = process.memoryUsage().heapUsed;
                    memoryFreed += Math.max(0, beforeGC - afterGC);
                }
            }

            const finalMemory = process.memoryUsage();
            const totalMemoryFreed = initialMemory.heapUsed - finalMemory.heapUsed;

            this.stats.resourcesCleaned.memory += resourcesFreed;

            const duration = performance.now() - startTime;
            
            Logger.debug('✅ Memory cleanup completed', {
                duration: `${Math.round(duration)}ms`,
                resourcesFreed,
                memoryFreed: `${Math.round(totalMemoryFreed / 1024 / 1024 * 100) / 100}MB`,
                heapUsed: `${Math.round(finalMemory.heapUsed / 1024 / 1024 * 100) / 100}MB`
            });

            return {
                success: true,
                duration,
                resourcesFreed,
                memoryFreed: totalMemoryFreed,
                finalMemoryUsage: finalMemory
            };

        } catch (error) {
            Logger.error('❌ Memory cleanup failed:', error);
            throw error;
        }
    }

    /**
     * Cleanup file resources
     */
    async cleanupFileResources() {
        const startTime = performance.now();
        
        try {
            Logger.debug('📁 Starting file cleanup');
            
            let filesRemoved = 0;
            let handlesClosedCount = 0;

            // Close tracked file handles
            for (const handle of this.resources.files.handles) {
                try {
                    if (handle && typeof handle.close === 'function') {
                        await handle.close();
                    }
                    handlesClosedCount++;
                } catch (error) {
                    Logger.warn('⚠️ Failed to close file handle:', error.message);
                }
            }
            this.resources.files.handles.clear();

            // Close tracked file streams
            for (const stream of this.resources.files.streams) {
                try {
                    if (stream && typeof stream.destroy === 'function') {
                        stream.destroy();
                    } else if (stream && typeof stream.close === 'function') {
                        stream.close();
                    }
                    handlesClosedCount++;
                } catch (error) {
                    Logger.warn('⚠️ Failed to close file stream:', error.message);
                }
            }
            this.resources.files.streams.clear();

            // Remove temporary files
            for (const tempFile of this.resources.files.tempFiles) {
                try {
                    await fs.unlink(tempFile);
                    filesRemoved++;
                } catch (error) {
                    if (error.code !== 'ENOENT') {
                        Logger.warn('⚠️ Failed to remove temp file:', { file: tempFile, error: error.message });
                    }
                }
            }
            this.resources.files.tempFiles.clear();

            // Remove lock files
            for (const lockFile of this.resources.files.lockFiles) {
                try {
                    await fs.unlink(lockFile);
                    filesRemoved++;
                } catch (error) {
                    if (error.code !== 'ENOENT') {
                        Logger.warn('⚠️ Failed to remove lock file:', { file: lockFile, error: error.message });
                    }
                }
            }
            this.resources.files.lockFiles.clear();

            // Clean temporary directories
            for (const tempDir of this.config.tempDirectories) {
                try {
                    const cleanedFiles = await this.cleanTempDirectory(tempDir);
                    filesRemoved += cleanedFiles;
                } catch (error) {
                    Logger.warn('⚠️ Failed to clean temp directory:', { directory: tempDir, error: error.message });
                }
            }

            this.stats.resourcesCleaned.files += handlesClosedCount + filesRemoved;

            const duration = performance.now() - startTime;
            
            Logger.debug('✅ File cleanup completed', {
                duration: `${Math.round(duration)}ms`,
                handlesClosedCount,
                filesRemoved,
                totalResourcesFreed: handlesClosedCount + filesRemoved
            });

            return {
                success: true,
                duration,
                handlesClosedCount,
                filesRemoved,
                totalResourcesFreed: handlesClosedCount + filesRemoved
            };

        } catch (error) {
            Logger.error('❌ File cleanup failed:', error);
            throw error;
        }
    }

    /**
     * Clean temporary directory
     */
    async cleanTempDirectory(dirPath) {
        let filesRemoved = 0;
        
        try {
            const stats = await fs.stat(dirPath);
            if (!stats.isDirectory()) {
                return 0;
            }

            const files = await fs.readdir(dirPath, { withFileTypes: true });
            const currentTime = Date.now();

            for (const file of files) {
                const filePath = path.join(dirPath, file.name);
                
                // Skip preserved files
                if (this.config.preservePatterns.some(pattern => file.name.includes(pattern))) {
                    continue;
                }

                try {
                    const fileStats = await fs.stat(filePath);
                    const fileAge = currentTime - fileStats.mtime.getTime();

                    if (fileAge > this.config.maxFileAge) {
                        if (file.isDirectory()) {
                            const subFilesRemoved = await this.cleanTempDirectory(filePath);
                            filesRemoved += subFilesRemoved;
                            
                            // Try to remove directory if empty
                            try {
                                await fs.rmdir(filePath);
                                filesRemoved++;
                            } catch (error) {
                                // Directory not empty, that's okay
                            }
                        } else {
                            await fs.unlink(filePath);
                            filesRemoved++;
                        }
                    }
                } catch (error) {
                    Logger.warn('⚠️ Failed to process file in temp cleanup:', { file: filePath, error: error.message });
                }
            }

        } catch (error) {
            if (error.code !== 'ENOENT') {
                Logger.warn('⚠️ Failed to access temp directory:', { directory: dirPath, error: error.message });
            }
        }

        return filesRemoved;
    }

    /**
     * Cleanup network resources
     */
    async cleanupNetworkResources() {
        const startTime = performance.now();
        
        try {
            Logger.debug('🌐 Starting network cleanup');
            
            let connectionsClosed = 0;

            // Close tracked connections
            for (const connection of this.resources.network.connections) {
                try {
                    if (connection && typeof connection.destroy === 'function') {
                        connection.destroy();
                    } else if (connection && typeof connection.close === 'function') {
                        connection.close();
                    }
                    connectionsClosed++;
                } catch (error) {
                    Logger.warn('⚠️ Failed to close network connection:', error.message);
                }
            }
            this.resources.network.connections.clear();

            // Close tracked sockets
            for (const socket of this.resources.network.sockets) {
                try {
                    if (socket && typeof socket.destroy === 'function') {
                        socket.destroy();
                    }
                    connectionsClosed++;
                } catch (error) {
                    Logger.warn('⚠️ Failed to close socket:', error.message);
                }
            }
            this.resources.network.sockets.clear();

            // Close tracked servers
            for (const server of this.resources.network.servers) {
                try {
                    if (server && typeof server.close === 'function') {
                        await new Promise((resolve, reject) => {
                            server.close((error) => {
                                if (error) reject(error);
                                else resolve();
                            });
                        });
                    }
                    connectionsClosed++;
                } catch (error) {
                    Logger.warn('⚠️ Failed to close server:', error.message);
                }
            }
            this.resources.network.servers.clear();

            // Destroy tracked agents
            for (const agent of this.resources.network.agents) {
                try {
                    if (agent && typeof agent.destroy === 'function') {
                        agent.destroy();
                    }
                    connectionsClosed++;
                } catch (error) {
                    Logger.warn('⚠️ Failed to destroy agent:', error.message);
                }
            }
            this.resources.network.agents.clear();

            this.stats.resourcesCleaned.network += connectionsClosed;

            const duration = performance.now() - startTime;
            
            Logger.debug('✅ Network cleanup completed', {
                duration: `${Math.round(duration)}ms`,
                connectionsClosed
            });

            return {
                success: true,
                duration,
                connectionsClosed
            };

        } catch (error) {
            Logger.error('❌ Network cleanup failed:', error);
            throw error;
        }
    }

    /**
     * Cleanup database resources
     */
    async cleanupDatabaseResources() {
        const startTime = performance.now();
        
        try {
            Logger.debug('🗄️ Starting database cleanup');
            
            let connectionsClosed = 0;

            // Close tracked database connections
            for (const connection of this.resources.database.connections) {
                try {
                    if (connection && typeof connection.close === 'function') {
                        await connection.close();
                    } else if (connection && typeof connection.end === 'function') {
                        await connection.end();
                    }
                    connectionsClosed++;
                } catch (error) {
                    Logger.warn('⚠️ Failed to close database connection:', error.message);
                }
            }
            this.resources.database.connections.clear();

            // Rollback tracked transactions
            for (const transaction of this.resources.database.transactions) {
                try {
                    if (transaction && typeof transaction.rollback === 'function') {
                        await transaction.rollback();
                    }
                    connectionsClosed++;
                } catch (error) {
                    Logger.warn('⚠️ Failed to rollback transaction:', error.message);
                }
            }
            this.resources.database.transactions.clear();

            // Close tracked connection pools
            for (const pool of this.resources.database.pools) {
                try {
                    if (pool && typeof pool.end === 'function') {
                        await pool.end();
                    } else if (pool && typeof pool.close === 'function') {
                        await pool.close();
                    }
                    connectionsClosed++;
                } catch (error) {
                    Logger.warn('⚠️ Failed to close connection pool:', error.message);
                }
            }
            this.resources.database.pools.clear();

            // Close tracked cursors
            for (const cursor of this.resources.database.cursors) {
                try {
                    if (cursor && typeof cursor.close === 'function') {
                        await cursor.close();
                    }
                    connectionsClosed++;
                } catch (error) {
                    Logger.warn('⚠️ Failed to close cursor:', error.message);
                }
            }
            this.resources.database.cursors.clear();

            this.stats.resourcesCleaned.database += connectionsClosed;

            const duration = performance.now() - startTime;
            
            Logger.debug('✅ Database cleanup completed', {
                duration: `${Math.round(duration)}ms`,
                connectionsClosed
            });

            return {
                success: true,
                duration,
                connectionsClosed
            };

        } catch (error) {
            Logger.error('❌ Database cleanup failed:', error);
            throw error;
        }
    }

    /**
     * Register resources for tracking
     */
    registerResource(type, category, resource) {
        if (this.resources[type] && this.resources[type][category]) {
            this.resources[type][category].add(resource);
            
            if (this.config.enableDetailedLogging) {
                Logger.debug(`📝 Registered ${type} resource`, {
                    category,
                    totalTracked: this.resources[type][category].size
                });
            }
        }
    }

    /**
     * Unregister resources from tracking
     */
    unregisterResource(type, category, resource) {
        if (this.resources[type] && this.resources[type][category]) {
            this.resources[type][category].delete(resource);
            
            if (this.config.enableDetailedLogging) {
                Logger.debug(`📝 Unregistered ${type} resource`, {
                    category,
                    totalTracked: this.resources[type][category].size
                });
            }
        }
    }

    /**
     * Get cleanup statistics
     */
    getStats() {
        return {
            ...this.stats,
            trackedResources: {
                memory: {
                    buffers: this.resources.memory.buffers.size,
                    streams: this.resources.memory.streams.size,
                    timers: this.resources.memory.timers.size,
                    intervals: this.resources.memory.intervals.size,
                    watchers: this.resources.memory.watchers.size
                },
                files: {
                    handles: this.resources.files.handles.size,
                    tempFiles: this.resources.files.tempFiles.size,
                    lockFiles: this.resources.files.lockFiles.size,
                    streams: this.resources.files.streams.size
                },
                network: {
                    connections: this.resources.network.connections.size,
                    sockets: this.resources.network.sockets.size,
                    servers: this.resources.network.servers.size,
                    agents: this.resources.network.agents.size
                },
                database: {
                    connections: this.resources.database.connections.size,
                    transactions: this.resources.database.transactions.size,
                    pools: this.resources.database.pools.size,
                    cursors: this.resources.database.cursors.size
                }
            }
        };
    }
}

module.exports = { ResourceCleanup };