/**
 * Knowledge Graph - Real-time Knowledge Sync Architecture
 * Neo4j-based graph za čuvanje i deljenje znanja između 150+ SaaS aplikacija
 */

// ===== GRAPH ENTITIES =====
export interface KnowledgeEntity {
  id: string;
  type: EntityType;
  label: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  relevance: number; // 0-100
}

export type EntityType =
  | 'Pattern'
  | 'Solution'
  | 'Metric'
  | 'Learning'
  | 'BugFix'
  | 'Optimization'
  | 'Experiment'
  | 'BestPractice';

// ===== PATTERNS =====
export interface PatternEntity extends KnowledgeEntity {
  type: 'Pattern';
  category: PatternCategory;
  problem: string;
  solution: string;
  applicableToSaaS: string[]; // SaaS app IDs
  successRate: number; // 0-100
  adoptionCount: number;
  examples: string[];
}

export type PatternCategory =
  | 'Architecture'
  | 'Performance'
  | 'Security'
  | 'Scaling'
  | 'Monetization'
  | 'UX'
  | 'Operations';

// ===== SOLUTIONS =====
export interface SolutionEntity extends KnowledgeEntity {
  type: 'Solution';
  problem: string;
  implementation: string;
  codeSnippet?: string;
  language: string;
  solvedByApp: string; // SaaS app ID
  timeToDeploy: number; // minutes
  riskLevel: 'Low' | 'Medium' | 'High';
  benefitsSummary: string;
}

// ===== METRICS =====
export interface MetricEntity extends KnowledgeEntity {
  type: 'Metric';
  category: 'Performance' | 'Business' | 'SRE' | 'User';
  value: number;
  unit: string;
  benchmark: number; // Expected value
  sourceApp: string;
  timestamp: Date;
  trend: 'Improving' | 'Stable' | 'Declining';
}

// ===== LEARNINGS =====
export interface LearningEntity extends KnowledgeEntity {
  type: 'Learning';
  category: LearningCategory;
  discovery: string;
  sourceApp: string;
  impact: 'High' | 'Medium' | 'Low';
  actionItems: ActionItem[];
  relatedApps: string[];
}

export type LearningCategory =
  | 'SuccessFactor'
  | 'FailurePattern'
  | 'Optimization'
  | 'DomainKnowledge';

export interface ActionItem {
  title: string;
  description: string;
  owner?: string;
  dueDate?: Date;
  completed: boolean;
}

// ===== BUG FIXES =====
export interface BugFixEntity extends KnowledgeEntity {
  type: 'BugFix';
  bugDescription: string;
  rootCause: string;
  fix: string;
  fixedInVersion: string;
  affectedSystems: string[];
  preventionStrategy: string;
  implementationTime: number; // minutes
}

// ===== GRAPH RELATIONSHIPS =====
export interface GraphRelationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: RelationshipType;
  strength: number; // 0-100
  direction: 'forward' | 'bidirectional';
  metadata?: Record<string, unknown>;
}

export type RelationshipType =
  | 'solves'
  | 'relatedTo'
  | 'dependsOn'
  | 'improvesUpon'
  | 'conflictsWith'
  | 'synergizesWith'
  | 'leadsTo'
  | 'preventsFrom';

// ===== QUERY BUILDERS =====
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

// ===== EVENT STREAM =====
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

// ===== SYNC PROTOCOL =====
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
  applicability: number; // 0-100, how relevant is this event
  async: boolean;
  retryCount: number;
}

export interface DeliveryLog {
  appId: string;
  timestamp: Date;
  status: 'Delivered' | 'Failed' | 'Rejected';
  reason?: string;
}

// ===== KNOWLEDGE AGGREGATION =====
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
  syncHealth: number; // 0-100
  lastUpdated: Date;
}

// ===== APPLICABILITY SCORING =====
export interface ApplicabilityScore {
  entityId: string;
  appId: string;
  score: number; // 0-100
  factors: ApplicabilityFactor[];
  recommendation: 'Adopt' | 'Consider' | 'Monitor' | 'Ignore';
}

export interface ApplicabilityFactor {
  name: string;
  weight: number;
  value: number;
  reasoning: string;
}

// ===== KNOWLEDGE RECOMMENDATIONS =====
export interface KnowledgeRecommendation {
  appId: string;
  entityId: string;
  entityType: EntityType;
  title: string;
  description: string;
  expectedBenefit: number; // 0-100
  implementationEffort: 'Low' | 'Medium' | 'High';
  urgency: 'Low' | 'Medium' | 'High' | 'Critical';
  relatedEntities: string[];
  actionItems: string[];
}

// ===== GRAPH STATISTICS =====
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
  indexHealth: number; // 0-100
}
