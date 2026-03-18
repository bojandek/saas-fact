/**
 * Knowledge Graph - Real-time Knowledge Sync Architecture
 * Neo4j-based graph za čuvanje i deljenje znanja između 150+ SaaS aplikacija
 */
export interface KnowledgeEntity {
    id: string;
    type: EntityType;
    label: string;
    metadata: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
    relevance: number;
}
export type EntityType = 'Pattern' | 'Solution' | 'Metric' | 'Learning' | 'BugFix' | 'Optimization' | 'Experiment' | 'BestPractice';
export interface PatternEntity extends KnowledgeEntity {
    type: 'Pattern';
    category: PatternCategory;
    problem: string;
    solution: string;
    applicableToSaaS: string[];
    successRate: number;
    adoptionCount: number;
    examples: string[];
}
export type PatternCategory = 'Architecture' | 'Performance' | 'Security' | 'Scaling' | 'Monetization' | 'UX' | 'Operations';
export interface SolutionEntity extends KnowledgeEntity {
    type: 'Solution';
    problem: string;
    implementation: string;
    codeSnippet?: string;
    language: string;
    solvedByApp: string;
    timeToDeploy: number;
    riskLevel: 'Low' | 'Medium' | 'High';
    benefitsSummary: string;
}
export interface MetricEntity extends KnowledgeEntity {
    type: 'Metric';
    category: 'Performance' | 'Business' | 'SRE' | 'User';
    value: number;
    unit: string;
    benchmark: number;
    sourceApp: string;
    timestamp: Date;
    trend: 'Improving' | 'Stable' | 'Declining';
}
export interface LearningEntity extends KnowledgeEntity {
    type: 'Learning';
    category: LearningCategory;
    discovery: string;
    sourceApp: string;
    impact: 'High' | 'Medium' | 'Low';
    actionItems: ActionItem[];
    relatedApps: string[];
}
export type LearningCategory = 'SuccessFactor' | 'FailurePattern' | 'Optimization' | 'DomainKnowledge';
export interface ActionItem {
    title: string;
    description: string;
    owner?: string;
    dueDate?: Date;
    completed: boolean;
}
export interface BugFixEntity extends KnowledgeEntity {
    type: 'BugFix';
    bugDescription: string;
    rootCause: string;
    fix: string;
    fixedInVersion: string;
    affectedSystems: string[];
    preventionStrategy: string;
    implementationTime: number;
}
export interface GraphRelationship {
    id: string;
    sourceId: string;
    targetId: string;
    type: RelationshipType;
    strength: number;
    direction: 'forward' | 'bidirectional';
    metadata?: Record<string, unknown>;
}
export type RelationshipType = 'solves' | 'relatedTo' | 'dependsOn' | 'improvesUpon' | 'conflictsWith' | 'synergizesWith' | 'leadsTo' | 'preventsFrom';
export interface GraphQuery {
    type: 'Node' | 'Path' | 'Subgraph';
    startNodeId?: string;
    filters: QueryFilter[];
    limit?: number;
    orderBy?: string;
}
export interface QueryFilter {
    field: string;
    operator: 'eq' | 'gt' | 'lt' | 'contains' | 'in';
    value: unknown;
}
export interface KnowledgeEvent {
    id: string;
    type: 'Created' | 'Updated' | 'Applied' | 'Deprecated';
    entityType: EntityType;
    entityId: string;
    sourceApp: string;
    timestamp: Date;
    payload: Record<string, unknown>;
    priority: 'Low' | 'Medium' | 'High' | 'Critical';
    relatedApps?: string[];
}
export interface SyncMessage {
    id: string;
    event: KnowledgeEvent;
    enrichment: EventEnrichment;
    targetApps: SyncTarget[];
    status: 'Pending' | 'Synced' | 'Failed';
    deliveryLog: DeliveryLog[];
}
export interface EventEnrichment {
    linkedPatterns: string[];
    linkedSolutions: string[];
    estimatedImpact: number;
    recommendedActions: string[];
}
export interface SyncTarget {
    appId: string;
    applicability: number;
    async: boolean;
    retryCount: number;
}
export interface DeliveryLog {
    appId: string;
    timestamp: Date;
    status: 'Delivered' | 'Failed' | 'Rejected';
    reason?: string;
}
export interface KnowledgeAggregate {
    totalPatterns: number;
    totalSolutions: number;
    activeLearnings: number;
    recentDiscoveries: KnowledgeEntity[];
    topPatterns: PatternEntity[];
    commonIssues: {
        issue: string;
        frequency: number;
        affectedApps: string[];
    }[];
    syncHealth: number;
    lastUpdated: Date;
}
export interface ApplicabilityScore {
    entityId: string;
    appId: string;
    score: number;
    factors: ApplicabilityFactor[];
    recommendation: 'Adopt' | 'Consider' | 'Monitor' | 'Ignore';
}
export interface ApplicabilityFactor {
    name: string;
    weight: number;
    value: number;
    reasoning: string;
}
export interface KnowledgeRecommendation {
    appId: string;
    entityId: string;
    entityType: EntityType;
    title: string;
    description: string;
    expectedBenefit: number;
    implementationEffort: 'Low' | 'Medium' | 'High';
    urgency: 'Low' | 'Medium' | 'High' | 'Critical';
    relatedEntities: string[];
    actionItems: string[];
}
export interface GraphStatistics {
    totalNodes: number;
    totalRelationships: number;
    averageConnectivity: number;
    densestCluster: {
        nodeIds: string[];
        density: number;
    };
    mostInfluentialNodes: {
        id: string;
        type: EntityType;
        centralityScore: number;
    }[];
    lastMaintenance: Date;
    indexHealth: number;
}
//# sourceMappingURL=types.d.ts.map