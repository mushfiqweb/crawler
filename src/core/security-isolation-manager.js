const { EventEmitter } = require('events');
const crypto = require('crypto');
const Logger = require('../utils/logger');

/**
 * Security Isolation Manager for browser instances
 * Handles security policies, sandboxing, and isolation
 */
class SecurityIsolationManager extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            enableSandboxing: config.enableSandboxing !== false,
            enableIsolation: config.enableIsolation !== false,
            enableSecurityHeaders: config.enableSecurityHeaders !== false,
            enableContentFiltering: config.enableContentFiltering !== false,
            maxSessionDuration: config.maxSessionDuration || 30 * 60 * 1000, // 30 minutes
            allowedDomains: config.allowedDomains || [],
            blockedDomains: config.blockedDomains || [],
            securityLevel: config.securityLevel || 'medium', // low, medium, high
            ...config
        };

        this.sessions = new Map();
        this.securityPolicies = new Map();
        this.isolationContexts = new Map();
        
        this.stats = {
            sessionsCreated: 0,
            securityViolations: 0,
            blockedRequests: 0,
            isolationBreaches: 0
        };

        this.setupSecurityPolicies();
    }

    /**
     * Setup default security policies based on security level
     */
    setupSecurityPolicies() {
        const policies = {
            low: {
                sandbox: ['--no-sandbox'],
                permissions: ['geolocation', 'notifications', 'camera', 'microphone'],
                contentSecurityPolicy: "default-src 'self' 'unsafe-inline' 'unsafe-eval' *",
                allowJavaScript: true,
                allowPlugins: true
            },
            medium: {
                sandbox: ['--sandbox'],
                permissions: ['geolocation'],
                contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
                allowJavaScript: true,
                allowPlugins: false
            },
            high: {
                sandbox: ['--sandbox', '--disable-plugins', '--disable-extensions'],
                permissions: [],
                contentSecurityPolicy: "default-src 'self'; script-src 'self'; style-src 'self'",
                allowJavaScript: false,
                allowPlugins: false
            }
        };

        this.securityPolicies.set(this.config.securityLevel, policies[this.config.securityLevel]);
    }

    /**
     * Create a secure isolated session for a browser
     */
    async createSecureSession(browserId, options = {}) {
        try {
            const sessionId = this.generateSessionId();
            const isolationContext = await this.createIsolationContext(sessionId, options);
            
            const session = {
                id: sessionId,
                browserId,
                createdAt: Date.now(),
                lastActivity: Date.now(),
                isolationContext,
                securityLevel: options.securityLevel || this.config.securityLevel,
                permissions: new Set(options.permissions || []),
                blockedDomains: new Set([...this.config.blockedDomains, ...(options.blockedDomains || [])]),
                allowedDomains: new Set([...this.config.allowedDomains, ...(options.allowedDomains || [])]),
                violations: [],
                isActive: true
            };

            this.sessions.set(sessionId, session);
            this.stats.sessionsCreated++;

            Logger.info(`🔒 Created secure session ${sessionId} for browser ${browserId}`);
            this.emit('sessionCreated', { sessionId, browserId });

            return sessionId;
        } catch (error) {
            Logger.error('❌ Failed to create secure session:', error);
            throw error;
        }
    }

    /**
     * Create isolation context for the session
     */
    async createIsolationContext(sessionId, options = {}) {
        const context = {
            id: sessionId,
            userDataDir: options.userDataDir || null,
            incognito: options.incognito !== false,
            permissions: options.permissions || [],
            securityHeaders: this.generateSecurityHeaders(),
            contentFilters: this.setupContentFilters(),
            networkInterceptors: this.setupNetworkInterceptors(sessionId)
        };

        this.isolationContexts.set(sessionId, context);
        return context;
    }

    /**
     * Generate security headers for the session
     */
    generateSecurityHeaders() {
        return {
            'X-Frame-Options': 'DENY',
            'X-Content-Type-Options': 'nosniff',
            'X-XSS-Protection': '1; mode=block',
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
            'Content-Security-Policy': this.securityPolicies.get(this.config.securityLevel)?.contentSecurityPolicy,
            'Referrer-Policy': 'strict-origin-when-cross-origin'
        };
    }

    /**
     * Setup content filters for the session
     */
    setupContentFilters() {
        return {
            blockMaliciousContent: true,
            blockTrackers: true,
            blockAds: this.config.securityLevel === 'high',
            blockScripts: this.config.securityLevel === 'high',
            allowedMimeTypes: [
                'text/html',
                'text/css',
                'application/javascript',
                'application/json',
                'image/png',
                'image/jpeg',
                'image/gif',
                'image/svg+xml'
            ]
        };
    }

    /**
     * Setup network interceptors for the session
     */
    setupNetworkInterceptors(sessionId) {
        return {
            requestInterceptor: (request) => this.interceptRequest(sessionId, request),
            responseInterceptor: (response) => this.interceptResponse(sessionId, response),
            errorHandler: (error) => this.handleNetworkError(sessionId, error)
        };
    }

    /**
     * Intercept and validate network requests
     */
    async interceptRequest(sessionId, request) {
        const session = this.sessions.get(sessionId);
        if (!session) return { allow: false, reason: 'Invalid session' };

        try {
            const url = new URL(request.url);
            
            // Check blocked domains
            if (this.isDomainBlocked(url.hostname, session)) {
                this.recordSecurityViolation(sessionId, 'blocked_domain', { domain: url.hostname });
                return { allow: false, reason: 'Domain blocked' };
            }

            // Check allowed domains (if whitelist is configured)
            if (session.allowedDomains.size > 0 && !this.isDomainAllowed(url.hostname, session)) {
                this.recordSecurityViolation(sessionId, 'domain_not_allowed', { domain: url.hostname });
                return { allow: false, reason: 'Domain not in whitelist' };
            }

            // Check for malicious patterns
            if (this.containsMaliciousPatterns(request.url)) {
                this.recordSecurityViolation(sessionId, 'malicious_pattern', { url: request.url });
                return { allow: false, reason: 'Malicious pattern detected' };
            }

            // Update session activity
            session.lastActivity = Date.now();

            return { allow: true };
        } catch (error) {
            Logger.error('❌ Error intercepting request:', error);
            return { allow: false, reason: 'Interception error' };
        }
    }

    /**
     * Intercept and validate network responses
     */
    async interceptResponse(sessionId, response) {
        const session = this.sessions.get(sessionId);
        if (!session) return { allow: false };

        try {
            // Check content type
            const contentType = response.headers['content-type'] || '';
            const context = this.isolationContexts.get(sessionId);
            
            if (context?.contentFilters.allowedMimeTypes) {
                const isAllowed = context.contentFilters.allowedMimeTypes.some(type => 
                    contentType.includes(type)
                );
                
                if (!isAllowed) {
                    this.recordSecurityViolation(sessionId, 'blocked_content_type', { contentType });
                    return { allow: false, reason: 'Content type not allowed' };
                }
            }

            // Check response size (prevent memory exhaustion)
            const contentLength = parseInt(response.headers['content-length'] || '0');
            if (contentLength > 50 * 1024 * 1024) { // 50MB limit
                this.recordSecurityViolation(sessionId, 'response_too_large', { size: contentLength });
                return { allow: false, reason: 'Response too large' };
            }

            return { allow: true };
        } catch (error) {
            Logger.error('❌ Error intercepting response:', error);
            return { allow: false };
        }
    }

    /**
     * Handle network errors
     */
    handleNetworkError(sessionId, error) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.violations.push({
                type: 'network_error',
                timestamp: Date.now(),
                error: error.message
            });
        }
        
        Logger.warn(`⚠️ Network error in session ${sessionId}:`, error.message);
    }

    /**
     * Check if domain is blocked
     */
    isDomainBlocked(domain, session) {
        return session.blockedDomains.has(domain) || 
               Array.from(session.blockedDomains).some(blocked => 
                   domain.includes(blocked) || blocked.includes(domain)
               );
    }

    /**
     * Check if domain is allowed
     */
    isDomainAllowed(domain, session) {
        if (session.allowedDomains.size === 0) return true;
        
        return session.allowedDomains.has(domain) || 
               Array.from(session.allowedDomains).some(allowed => 
                   domain.includes(allowed) || allowed.includes(domain)
               );
    }

    /**
     * Check for malicious patterns in URLs
     */
    containsMaliciousPatterns(url) {
        const maliciousPatterns = [
            /javascript:/i,
            /data:text\/html/i,
            /vbscript:/i,
            /<script/i,
            /eval\(/i,
            /document\.write/i
        ];

        return maliciousPatterns.some(pattern => pattern.test(url));
    }

    /**
     * Record security violation
     */
    recordSecurityViolation(sessionId, type, details = {}) {
        const session = this.sessions.get(sessionId);
        if (session) {
            const violation = {
                type,
                timestamp: Date.now(),
                details,
                sessionId
            };

            session.violations.push(violation);
            this.stats.securityViolations++;
            this.stats.blockedRequests++;

            Logger.warn(`🚨 Security violation in session ${sessionId}:`, violation);
            this.emit('securityViolation', violation);
        }
    }

    /**
     * Validate session and check for expiration
     */
    validateSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return { valid: false, reason: 'Session not found' };

        // Check if session is expired
        const now = Date.now();
        if (now - session.createdAt > this.config.maxSessionDuration) {
            this.destroySession(sessionId);
            return { valid: false, reason: 'Session expired' };
        }

        // Check if session is active
        if (!session.isActive) {
            return { valid: false, reason: 'Session inactive' };
        }

        return { valid: true, session };
    }

    /**
     * Update session activity
     */
    updateSessionActivity(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.lastActivity = Date.now();
        }
    }

    /**
     * Destroy a session and cleanup resources
     */
    async destroySession(sessionId) {
        try {
            const session = this.sessions.get(sessionId);
            if (session) {
                session.isActive = false;
                
                // Cleanup isolation context
                this.isolationContexts.delete(sessionId);
                
                // Remove session
                this.sessions.delete(sessionId);
                
                Logger.info(`🔒 Destroyed session ${sessionId}`);
                this.emit('sessionDestroyed', { sessionId });
            }
        } catch (error) {
            Logger.error('❌ Error destroying session:', error);
        }
    }

    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return crypto.randomBytes(16).toString('hex');
    }

    /**
     * Get session information
     */
    getSessionInfo(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return null;

        return {
            id: session.id,
            browserId: session.browserId,
            createdAt: session.createdAt,
            lastActivity: session.lastActivity,
            securityLevel: session.securityLevel,
            violationsCount: session.violations.length,
            isActive: session.isActive
        };
    }

    /**
     * Get security statistics
     */
    getSecurityStats() {
        return {
            ...this.stats,
            activeSessions: this.sessions.size,
            activeContexts: this.isolationContexts.size
        };
    }

    /**
     * Cleanup expired sessions
     */
    cleanupExpiredSessions() {
        const now = Date.now();
        const expiredSessions = [];

        for (const [sessionId, session] of this.sessions) {
            if (now - session.createdAt > this.config.maxSessionDuration) {
                expiredSessions.push(sessionId);
            }
        }

        expiredSessions.forEach(sessionId => this.destroySession(sessionId));
        
        if (expiredSessions.length > 0) {
            Logger.info(`🧹 Cleaned up ${expiredSessions.length} expired sessions`);
        }
    }

    /**
     * Shutdown security manager
     */
    async shutdown() {
        try {
            Logger.info('🔒 Shutting down Security Isolation Manager...');
            
            // Destroy all active sessions
            const sessionIds = Array.from(this.sessions.keys());
            for (const sessionId of sessionIds) {
                await this.destroySession(sessionId);
            }

            this.emit('shutdown');
            Logger.info('🔒 Security Isolation Manager shutdown complete');
        } catch (error) {
            Logger.error('❌ Error during security manager shutdown:', error);
        }
    }
}

module.exports = { SecurityIsolationManager };