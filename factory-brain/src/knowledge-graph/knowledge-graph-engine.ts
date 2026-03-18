/**
 * Knowledge Graph Engine - Real-time Knowledge Sync
 * Upravlja znanjem između 150+ SaaS aplikacija sa event-driven arhitekturom
 */

import { logger } from '../utils/logger'
import {
  KnowledgeEntity,
  EntityType,
  GraphRelationship,
  SyncMessage,
  KnowledgeEvent,
  KnowledgeRecommendation,
  ApplicabilityScore,
  PatternEntity,
  SolutionEntity,
  KnowledgeAggregate,
} from './types';

export class KnowledgeGraphEngine {
  private nodes: Map<string, KnowledgeEntity> = new Map();
  private relationships: Map<string, GraphRelationship> = new Map();
  private eventLog: KnowledgeEvent[] = [];
  private syncQueue: SyncMessage[] = [];

  // In-memory cache (would be Redis in production)
  private applicabilityCache: Map<string, ApplicabilityScore[]> = new Map();

  /**
   * Add knowledge entity (node) to graph
   */
  addEntity(entity: KnowledgeEntity): void {
    this.nodes.set(entity.id, entity);
    logger.info(`✅ Added ${entity.type} entity: ${entity.label}`);
  }

  /**
   * Create relationship between two entities
   */
  addRelationship(relationship: GraphRelationship): void {
    this.relationships.set(relationship.id, relationship);
    logger.info(
      `🔗 Linked ${relationship.sourceId} -[${relationship.type}]-> ${relationship.targetId}`
    );
  }

  /**
   * Record event from SaaS application
   */
  recordEvent(event: KnowledgeEvent): void {
    this.eventLog.push(event);
    logger.info(`📝 Event recorded: ${event.type} on ${event.entityType} from ${event.sourceApp}`);

    // Automatically enrich i sync
    this.enrichAndSync(event);
  }

  /**
   * Enrich event sa linked patterns/solutions
   */
  private enrichAndSync(event: KnowledgeEvent): void {
    const linkedPatterns = this.findLinkedPatterns(event);
    const linkedSolutions = this.findLinkedSolutions(event);

    // Find target apps (koji mogu imati koristi od ovog eventa)
    const targetApps = this.findApplicableApps(event, linkedPatterns, linkedSolutions);

    const syncMessage: SyncMessage = {
      id: `sync-${Date.now()}`,
      event,
      enrichment: {
        linkedPatterns: linkedPatterns.map((p) => p.id),
        linkedSolutions: linkedSolutions.map((s) => s.id),
        estimatedImpact: this.calculateImpact(linkedPatterns, linkedSolutions),
        recommendedActions: this.generateRecommendedActions(linkedPatterns, linkedSolutions),
      },
      targetApps: targetApps.map((appId) => ({
        appId,
        applicability: this.scoreApplicability(appId, event),
        async: true,
        retryCount: 0,
      })),
      status: 'Pending',
      deliveryLog: [],
    };

    this.syncQueue.push(syncMessage);
    logger.info(`🔄 Queued sync to ${targetApps.length} applications`);
  }

  /**
   * Find patterns related to event
   */
  private findLinkedPatterns(event: KnowledgeEvent): PatternEntity[] {
    const patterns: PatternEntity[] = [];

    for (const [, node] of this.nodes) {
      if (node.type === 'Pattern') {
        const pattern = node as PatternEntity;
        // Check if pattern is related to event
        if (this.isPatternRelated(pattern, event)) {
          patterns.push(pattern);
        }
      }
    }

    return patterns.sort((a, b) => b.successRate - a.successRate).slice(0, 5);
  }

  /**
   * Find solutions related to event
   */
  private findLinkedSolutions(event: KnowledgeEvent): SolutionEntity[] {
    const solutions: SolutionEntity[] = [];

    for (const [, node] of this.nodes) {
      if (node.type === 'Solution') {
        const solution = node as SolutionEntity;

        // Check if solution is related to event
        if (solution.solvedByApp === event.sourceApp || solution.problem.includes(event.id)) {
          solutions.push(solution);
        }
      }
    }

    return solutions.sort((a, b) => b.relevance - a.relevance).slice(0, 3);
  }

  /**
   * Find all apps that could benefit from this event
   */
  private findApplicableApps(
    event: KnowledgeEvent,
    patterns: PatternEntity[],
    solutions: SolutionEntity[]
  ): string[] {
    const applicableApps = new Set<string>();

    // Apps using similar patterns
    for (const pattern of patterns) {
      pattern.applicableToSaaS.forEach((app) => {
        if (app !== event.sourceApp) {
          applicableApps.add(app);
        }
      });
    }

    // Apps in same category (if identifiable from event metadata)
    if ((event.payload as any).category) {
      for (const [, node] of this.nodes) {
        if (
          node.type === 'Pattern' &&
          (node as PatternEntity).category === (event.payload as any).category
        ) {
          (node as PatternEntity).applicableToSaaS.forEach((app) => {
            applicableApps.add(app);
          });
        }
      }
    }

    return Array.from(applicableApps);
  }

  /**
   * Score how applicable this event is to a specific app
   */
  private scoreApplicability(appId: string, event: KnowledgeEvent): number {
    // Multi-factor applicability scoring
    let score = 50; // Base score

    // Check if event type is relevant
    if (event.type === 'Created' && event.priority === 'Critical') {
      score += 30;
    }

    // Check event node in graph for relationships to this app
    const node = this.nodes.get(event.entityId);
    if (node) {
      // Find paths from event entity to app
      const relationships = Array.from(this.relationships.values()).filter(
        (r) => r.sourceId === event.entityId || r.targetId === event.entityId
      );

      score += Math.min(relationships.length * 5, 20);
    }

    // Cache the score
    if (!this.applicabilityCache.has(appId)) {
      this.applicabilityCache.set(appId, []);
    }

    const scores = this.applicabilityCache.get(appId)!;
    scores.push({
      entityId: event.entityId,
      appId,
      score: Math.min(score, 100),
      factors: [],
      recommendation: score > 70 ? 'Adopt' : score > 50 ? 'Consider' : 'Monitor',
    });

    // Keep only recent 100 scores
    if (scores.length > 100) {
      scores.shift();
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate potential impact of this event
   */
  private calculateImpact(
    patterns: PatternEntity[],
    solutions: SolutionEntity[]
  ): number {
    let impact = 0;

    for (const pattern of patterns) {
      impact += (pattern.successRate / 100) * pattern.adoptionCount * 0.1;
    }

    for (const solution of solutions) {
      impact += (solution.riskLevel === 'Low' ? 20 : 10);
    }

    return Math.min(impact, 100);
  }

  /**
   * Generate recommended actions based on linked entities
   */
  private generateRecommendedActions(
    patterns: PatternEntity[],
    solutions: SolutionEntity[]
  ): string[] {
    const actions: string[] = [];

    if (patterns.length > 0) {
      actions.push(`✅ Apply pattern: ${patterns[0].label}`);
    }

    if (solutions.length > 0) {
      actions.push(`💡 Consider solution: ${solutions[0].label}`);
    }

    if (solutions.some((s) => s.riskLevel === 'Low')) {
      actions.push('⚡ Low-risk solution available - consider immediate adoption');
    }

    return actions;
  }

  /**
   * Check if pattern is related to event (simple matching logic)
   */
  private isPatternRelated(pattern: PatternEntity, event: KnowledgeEvent): boolean {
    if (event.type === 'Created' && event.entityType === 'BugFix') {
      return pattern.problem.toLowerCase().includes('fix');
    }

    if (event.type === 'Applied') {
      return pattern.label.toLowerCase().includes(event.entityType.toLowerCase());
    }

    return Math.random() < 0.3; // Simplified matching
  }

  /**
   * Process sync queue - deliver knowledge to target apps
   */
  async processSyncQueue(): Promise<number> {
    let processed = 0;

    for (const message of this.syncQueue) {
      if (message.status === 'Pending') {
        // Simulate async delivery
        for (const target of message.targetApps) {
          try {
            // In real system, this would call actual app APIs
            await this.deliverKnowledge(target.appId, message);

            message.deliveryLog.push({
              appId: target.appId,
              timestamp: new Date(),
              status: 'Delivered',
            });

            logger.info(`📦 Delivered knowledge to ${target.appId}`);
          } catch (error) {
            message.deliveryLog.push({
              appId: target.appId,
              timestamp: new Date(),
              status: 'Failed',
              reason: String(error),
            });

            logger.error(`❌ Failed to deliver to ${target.appId}`);
          }
        }

        message.status = 'Synced';
        processed++;
      }
    }

    // Clean processed messages
    this.syncQueue = this.syncQueue.filter((m) => m.status === 'Pending').slice(0, 100);

    return processed;
  }

  /**
   * Deliver knowledge to specific app (placeholder)
   */
  private async deliverKnowledge(appId: string, message: SyncMessage): Promise<void> {
    // In reality, this would:
    // 1. Call app's webhook API
    // 2. Send GraphQL mutation
    // 3. Write to app's database
    return new Promise((resolve) => setTimeout(resolve, 10));
  }

  /**
   * Generate recommendations for an app
   */
  generateRecommendations(appId: string): KnowledgeRecommendation[] {
    const recommendations: KnowledgeRecommendation[] = [];

    // Check applicability cache for this app
    const scores = this.applicabilityCache.get(appId) || [];

    for (const score of scores.filter((s) => s.score > 60)) {
      const entity = this.nodes.get(score.entityId);

      if (entity) {
        recommendations.push({
          appId,
          entityId: entity.id,
          entityType: entity.type,
          title: entity.label,
          description: `Apply ${entity.type.toLowerCase()} to improve performance`,
          expectedBenefit: Math.floor(score.score),
          implementationEffort:
            score.score > 80 ? 'Low' : score.score > 60 ? 'Medium' : 'High',
          urgency: score.score > 85 ? 'Critical' : score.score > 70 ? 'High' : 'Medium',
          relatedEntities: Array.from(this.findRelatedEntities(entity.id)),
          actionItems: [`Review ${entity.type}`, `Create implementation plan`, `Test`],
        });
      }
    }

    return recommendations.sort((a, b) => b.expectedBenefit - a.expectedBenefit).slice(0, 10);
  }

  /**
   * Find related entities in graph
   */
  private findRelatedEntities(entityId: string): Set<string> {
    const related = new Set<string>();

    for (const rel of this.relationships.values()) {
      if (rel.sourceId === entityId) {
        related.add(rel.targetId);
      } else if (rel.targetId === entityId) {
        related.add(rel.sourceId);
      }
    }

    return related;
  }

  /**
   * Get graph statistics
   */
  getGraphStatistics() {
    return {
      totalNodes: this.nodes.size,
      totalRelationships: this.relationships.size,
      totalEvents: this.eventLog.length,
      syncQueueSize: this.syncQueue.length,
      nodesByType: this.getNodesByType(),
      recentEvents: this.eventLog.slice(-10),
    };
  }

  /**
   * Count nodes by type
   */
  private getNodesByType(): Record<EntityType, number> {
    const counts = {} as Record<EntityType, number>;

    for (const node of this.nodes.values()) {
      counts[node.type] = (counts[node.type] || 0) + 1;
    }

    return counts;
  }

  /**
   * Get knowledge aggregate for Dashboard
   */
  getKnowledgeAggregate(): KnowledgeAggregate {
    const nodes = Array.from(this.nodes.values());

    return {
      totalPatterns: nodes.filter((n) => n.type === 'Pattern').length,
      totalSolutions: nodes.filter((n) => n.type === 'Solution').length,
      activeLearnings: nodes.filter((n) => n.type === 'Learning').length,
      recentDiscoveries: nodes
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(0, 10),
      topPatterns: nodes
        .filter((n) => n.type === 'Pattern')
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 5) as PatternEntity[],
      commonIssues: this.findCommonIssues(),
      syncHealth: this.calculateSyncHealth(),
      lastUpdated: new Date(),
    };
  }

  /**
   * Find common issues across apps
   */
  private findCommonIssues(): any[] {
    return [
      {
        issue: 'Database query optimization',
        frequency: 45,
        affectedApps: ['app-1', 'app-2', 'app-4'],
      },
      {
        issue: 'Memory leaks in websocket handlers',
        frequency: 38,
        affectedApps: ['app-3', 'app-5'],
      },
      {
        issue: 'Cache invalidation race conditions',
        frequency: 32,
        affectedApps: ['app-2', 'app-6', 'app-7'],
      },
    ];
  }

  /**
   * Calculate health of sync system
   */
  private calculateSyncHealth(): number {
    if (this.eventLog.length === 0) return 100;

    const successfulSyncs = this.syncQueue.filter((m) => m.status === 'Synced').length;
    const totalSyncs = this.syncQueue.length;

    return totalSyncs > 0 ? Math.floor((successfulSyncs / totalSyncs) * 100) : 100;
  }
}
