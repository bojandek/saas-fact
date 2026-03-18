export interface Neo4jHAConfig {
    uri: string;
    username: string;
    password: string;
    maxConnectionPoolSize?: number;
    connectionAcquisitionTimeout?: number;
    encrypted?: boolean;
}
export interface QueryResult<T> {
    records: T[];
    summary: {
        statementType: string;
        counters: {
            nodesCreated: number;
            nodesDeleted: number;
            relationshipsCreated: number;
            relationshipsDeleted: number;
            propertiesSet: number;
        };
    };
}
/**
 * Neo4j High Availability Client
 * - Automatic leader detection in 3-node cluster
 * - Read/Write separation (followers handle reads)
 * - Connection pooling with circuit breaker
 * - Session management with retry logic
 */
export declare class Neo4jHAClient {
    private driver;
    private readSessions;
    private isHealthy;
    constructor(config: Neo4jHAConfig);
    /**
     * Execute read query (can hit any node, typically followers)
     */
    read<T>(query: string, params?: Record<string, any>): Promise<QueryResult<T>>;
    /**
     * Execute write query (always goes to leader)
     */
    write<T>(query: string, params?: Record<string, any>): Promise<QueryResult<T>>;
    /**
     * Execute transaction with guaranteed consistency
     */
    transaction<T>(callback: (tx: neo4j.Transaction) => Promise<T>, mode?: 'READ' | 'WRITE'): Promise<T>;
    /**
     * Execute multiple queries in sequence (higher consistency guarantees)
     */
    batch<T>(queries: Array<{
        query: string;
        params?: Record<string, any>;
    }>, mode?: 'READ' | 'WRITE'): Promise<QueryResult<T>[]>;
    /**
     * Handle query errors and determine if they're transient
     */
    private handleQueryError;
    /**
     * Health check for cluster
     */
    checkHealth(): Promise<{
        healthy: boolean;
        details: string;
    }>;
    /**
     * Get cluster info
     */
    getClusterInfo(): Promise<{
        role: string;
        databases: string[];
        supportedFeatures: string[];
    }>;
    /**
     * Setup periodic health checks
     */
    private setupHealthChecks;
    /**
     * Get current health status
     */
    isClusterHealthy(): boolean;
    /**
     * Verify connection
     */
    verifyConnectivity(): Promise<boolean>;
    /**
     * Execute Cypher query with auto-retry
     */
    executeWithRetry<T>(query: string, params?: Record<string, any>, mode?: 'READ' | 'WRITE', maxRetries?: number): Promise<QueryResult<T>>;
    /**
     * Close driver and cleanup
     */
    close(): Promise<void>;
}
export declare function initializeNeo4jClient(config: Neo4jHAConfig): Neo4jHAClient;
export declare function getNeo4jClient(): Neo4jHAClient;
export declare function closeNeo4jClient(): Promise<void>;
//# sourceMappingURL=neo4j-ha-client.d.ts.map