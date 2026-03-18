/**
 * Knowledge Graph Engine - Real-time Knowledge Sync
 * Upravlja znanjem između 150+ SaaS aplikacija sa event-driven arhitekturom
 */
import { KnowledgeEntity, EntityType, GraphRelationship, KnowledgeEvent, KnowledgeRecommendation, KnowledgeAggregate } from './types';
export declare class KnowledgeGraphEngine {
    private nodes;
    private relationships;
    private eventLog;
    private syncQueue;
    private applicabilityCache;
    /**
     * Add knowledge entity (node) to graph
     */
    addEntity(entity: KnowledgeEntity): void;
    /**
     * Create relationship between two entities
     */
    addRelationship(relationship: GraphRelationship): void;
    /**
     * Record event from SaaS application
     */
    recordEvent(event: KnowledgeEvent): void;
    /**
     * Enrich event sa linked patterns/solutions
     */
    private enrichAndSync;
    /**
     * Find patterns related to event
     */
    private findLinkedPatterns;
    /**
     * Find solutions related to event
     */
    private findLinkedSolutions;
    /**
     * Find all apps that could benefit from this event
     */
    private findApplicableApps;
    /**
     * Score how applicable this event is to a specific app
     */
    private scoreApplicability;
    /**
     * Calculate potential impact of this event
     */
    private calculateImpact;
    /**
     * Generate recommended actions based on linked entities
     */
    private generateRecommendedActions;
    /**
     * Check if pattern is related to event (simple matching logic)
     */
    private isPatternRelated;
    /**
     * Process sync queue - deliver knowledge to target apps
     */
    processSyncQueue(): Promise<number>;
    /**
     * Deliver knowledge to specific app (placeholder)
     */
    private deliverKnowledge;
    /**
     * Generate recommendations for an app
     */
    generateRecommendations(appId: string): KnowledgeRecommendation[];
    /**
     * Find related entities in graph
     */
    private findRelatedEntities;
    /**
     * Get graph statistics
     */
    getGraphStatistics(): {
        totalNodes: number;
        totalRelationships: number;
        totalEvents: number;
        syncQueueSize: number;
        nodesByType: Record<EntityType, number>;
        recentEvents: KnowledgeEvent[];
    };
    /**
     * Count nodes by type
     */
    private getNodesByType;
    /**
     * Get knowledge aggregate for Dashboard
     */
    getKnowledgeAggregate(): KnowledgeAggregate;
    /**
     * Find common issues across apps
     */
    private findCommonIssues;
    /**
     * Calculate health of sync system
     */
    private calculateSyncHealth;
}
//# sourceMappingURL=knowledge-graph-engine.d.ts.map