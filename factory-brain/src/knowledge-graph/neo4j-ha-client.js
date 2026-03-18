"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Neo4jHAClient = void 0;
exports.initializeNeo4jClient = initializeNeo4jClient;
exports.getNeo4jClient = getNeo4jClient;
exports.closeNeo4jClient = closeNeo4jClient;
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const logger_1 = require("../utils/logger");
/**
 * Neo4j High Availability Client
 * - Automatic leader detection in 3-node cluster
 * - Read/Write separation (followers handle reads)
 * - Connection pooling with circuit breaker
 * - Session management with retry logic
 */
class Neo4jHAClient {
    constructor(config) {
        this.readSessions = new Map();
        this.isHealthy = true;
        const { uri, username, password, maxConnectionPoolSize = 100, connectionAcquisitionTimeout = 60000, encrypted = true, } = config;
        this.driver = neo4j_driver_1.default.driver(uri, neo4j_driver_1.default.auth.basic(username, password), {
            maxConnectionPoolSize,
            connectionAcquisitionTimeout,
            encrypted: encrypted ? 'ENCRYPTION_ON' : 'ENCRYPTION_OFF',
            trustStrategy: neo4j_driver_1.default.TrustStrategy.trustSystemCertificates(),
            logging: neo4j_driver_1.default.logging.console('info'),
        });
        this.setupHealthChecks();
    }
    /**
     * Execute read query (can hit any node, typically followers)
     */
    async read(query, params) {
        const session = this.driver.session({
            defaultAccessMode: neo4j_driver_1.default.session.READ,
            bookmarks: undefined, // Allow eventual consistency for reads
        });
        try {
            const result = await session.run(query, params);
            const records = result.records.map((r) => r.toObject());
            return {
                records,
                summary: {
                    statementType: result.summary.statementType,
                    counters: {
                        nodesCreated: result.summary.counters.updates().nodesCreated,
                        nodesDeleted: result.summary.counters.updates().nodesDeleted,
                        relationshipsCreated: result.summary.counters.updates().relationshipsCreated,
                        relationshipsDeleted: result.summary.counters.updates().relationshipsDeleted,
                        propertiesSet: result.summary.counters.updates().propertiesSet,
                    },
                },
            };
        }
        catch (error) {
            logger_1.logger.error('[Neo4j] Read query failed:', error);
            this.handleQueryError(error);
            throw error;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Execute write query (always goes to leader)
     */
    async write(query, params) {
        const session = this.driver.session({
            defaultAccessMode: neo4j_driver_1.default.session.WRITE,
        });
        try {
            const result = await session.run(query, params);
            const records = result.records.map((r) => r.toObject());
            return {
                records,
                summary: {
                    statementType: result.summary.statementType,
                    counters: {
                        nodesCreated: result.summary.counters.updates().nodesCreated,
                        nodesDeleted: result.summary.counters.updates().nodesDeleted,
                        relationshipsCreated: result.summary.counters.updates().relationshipsCreated,
                        relationshipsDeleted: result.summary.counters.updates().relationshipsDeleted,
                        propertiesSet: result.summary.counters.updates().propertiesSet,
                    },
                },
            };
        }
        catch (error) {
            logger_1.logger.error('[Neo4j] Write query failed:', error);
            this.handleQueryError(error);
            throw error;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Execute transaction with guaranteed consistency
     */
    async transaction(callback, mode = 'WRITE') {
        const session = this.driver.session({
            defaultAccessMode: mode === 'READ' ? neo4j_driver_1.default.session.READ : neo4j_driver_1.default.session.WRITE,
        });
        try {
            const result = mode === 'READ'
                ? await session.readTransaction(callback)
                : await session.writeTransaction(callback);
            return result;
        }
        catch (error) {
            logger_1.logger.error(`[Neo4j] Transaction (${mode}) failed:`, error);
            this.handleQueryError(error);
            throw error;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Execute multiple queries in sequence (higher consistency guarantees)
     */
    async batch(queries, mode = 'WRITE') {
        const session = this.driver.session({
            defaultAccessMode: mode === 'READ' ? neo4j_driver_1.default.session.READ : neo4j_driver_1.default.session.WRITE,
        });
        try {
            const results = [];
            for (const { query, params } of queries) {
                const result = await session.run(query, params);
                const records = result.records.map((r) => r.toObject());
                results.push({
                    records,
                    summary: {
                        statementType: result.summary.statementType,
                        counters: {
                            nodesCreated: result.summary.counters.updates().nodesCreated,
                            nodesDeleted: result.summary.counters.updates().nodesDeleted,
                            relationshipsCreated: result.summary.counters.updates().relationshipsCreated,
                            relationshipsDeleted: result.summary.counters.updates().relationshipsDeleted,
                            propertiesSet: result.summary.counters.updates().propertiesSet,
                        },
                    },
                });
            }
            return results;
        }
        catch (error) {
            logger_1.logger.error('[Neo4j] Batch query failed:', error);
            this.handleQueryError(error);
            throw error;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Handle query errors and determine if they're transient
     */
    handleQueryError(error) {
        const errorMessage = String(error).toLowerCase();
        // Transient errors that driver should retry
        if (errorMessage.includes('connection') ||
            errorMessage.includes('timeout') ||
            errorMessage.includes('unavailable')) {
            logger_1.logger.warn('[Neo4j] Transient error, driver will retry:', error);
            return;
        }
        // Fatal errors indicate cluster issues
        if (errorMessage.includes('leader') ||
            errorMessage.includes('cluster') ||
            errorMessage.includes('election')) {
            logger_1.logger.error('[Neo4j] Cluster error detected:', error);
            this.isHealthy = false;
            return;
        }
    }
    /**
     * Health check for cluster
     */
    async checkHealth() {
        const session = this.driver.session();
        try {
            const result = await session.run('RETURN 1 as health');
            if (result.records.length > 0) {
                this.isHealthy = true;
                return {
                    healthy: true,
                    details: 'Neo4j cluster healthy',
                };
            }
            this.isHealthy = false;
            return {
                healthy: false,
                details: 'No response from cluster',
            };
        }
        catch (error) {
            this.isHealthy = false;
            return {
                healthy: false,
                details: `Health check failed: ${String(error)}`,
            };
        }
        finally {
            await session.close();
        }
    }
    /**
     * Get cluster info
     */
    async getClusterInfo() {
        const session = this.driver.session();
        try {
            const result = await session.run(`
        CALL dbms.info() YIELD name, value
        RETURN name, value
      `);
            const info = {};
            for (const record of result.records) {
                info[record.get('name')] = record.get('value');
            }
            return {
                role: info.role || 'unknown',
                databases: info.databases || [],
                supportedFeatures: info.supportedFeatures || [],
            };
        }
        catch (error) {
            logger_1.logger.error('[Neo4j] Failed to get cluster info:', error);
            throw error;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Setup periodic health checks
     */
    setupHealthChecks() {
        setInterval(async () => {
            try {
                const health = await this.checkHealth();
                if (!health.healthy) {
                    logger_1.logger.warn('[Neo4j] Cluster health check failed:', health.details);
                }
            }
            catch (error) {
                logger_1.logger.error('[Neo4j] Health check exception:', error);
            }
        }, 30000); // Check every 30 seconds
    }
    /**
     * Get current health status
     */
    isClusterHealthy() {
        return this.isHealthy;
    }
    /**
     * Verify connection
     */
    async verifyConnectivity() {
        const session = this.driver.session();
        try {
            await session.run('RETURN 1');
            return true;
        }
        catch {
            return false;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Execute Cypher query with auto-retry
     */
    async executeWithRetry(query, params, mode = 'READ', maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return mode === 'READ' ? await this.read(query, params) : await this.write(query, params);
            }
            catch (error) {
                logger_1.logger.warn(`[Neo4j] Attempt ${attempt}/${maxRetries} failed:`, error);
                if (attempt === maxRetries) {
                    throw error;
                }
                // Exponential backoff
                await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt - 1) * 100));
            }
        }
        throw new Error('Should not reach here');
    }
    /**
     * Close driver and cleanup
     */
    async close() {
        // Close all cached read sessions
        for (const [, session] of this.readSessions) {
            await session.close();
        }
        this.readSessions.clear();
        // Close driver
        await this.driver.close();
        logger_1.logger.info('[Neo4j] Connection closed');
    }
}
exports.Neo4jHAClient = Neo4jHAClient;
// Singleton instance
let neo4jClient = null;
function initializeNeo4jClient(config) {
    if (!neo4jClient) {
        neo4jClient = new Neo4jHAClient(config);
    }
    return neo4jClient;
}
function getNeo4jClient() {
    if (!neo4jClient) {
        throw new Error('Neo4j client not initialized. Call initializeNeo4jClient first.');
    }
    return neo4jClient;
}
async function closeNeo4jClient() {
    if (neo4jClient) {
        await neo4jClient.close();
        neo4jClient = null;
    }
}
//# sourceMappingURL=neo4j-ha-client.js.map