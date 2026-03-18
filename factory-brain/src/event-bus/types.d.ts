/**
 * Event Bus - Distributed messaging za real-time sync između 150+ SaaS aplikacija
 * Redis Streams + Kafka fallback za high-volume event distribution
 */
export interface SystemEvent {
    id: string;
    type: EventType;
    source: string;
    timestamp: Date;
    payload: Record<string, unknown>;
    priority: EventPriority;
    correlationId?: string;
}
export declare enum EventType {
    MetricsUpdated = "metrics.updated",
    PerformanceAlert = "perf.alert",
    AppDeployed = "app.deployed",
    AppFailed = "app.failed",
    AppOptimized = "app.optimized",
    EvolutionCycleStarted = "evolution.started",
    EvolutionCycleCompleted = "evolution.completed",
    OfferingApplied = "offering.applied",
    PatternDiscovered = "pattern.discovered",
    SolutionFound = "solution.found",
    LearningRecorded = "learning.recorded",
    RevenueUpdate = "revenue.updated",
    UserMetricsUpdate = "user.metrics.updated",
    SyncHealthCheck = "sync.healthcheck",
    ErrorOccurred = "error.occurred"
}
export declare enum EventPriority {
    Low = "low",
    Medium = "medium",
    High = "high",
    Critical = "critical"
}
export interface EventHandler {
    eventType: EventType;
    handler: (event: SystemEvent) => Promise<void>;
    asyncProcessing: boolean;
    retryCount: number;
}
export interface EventHandlerRegistry {
    [key: string]: EventHandler[];
}
export interface EventStreamConfig {
    backend: 'redis' | 'kafka';
    topic: string;
    consumerGroup: string;
    batchSize: number;
    processingTimeout: number;
}
export interface StreamMessage {
    id: string;
    event: SystemEvent;
    processedAt?: Date;
    status: MessageStatus;
    retries: number;
}
export declare enum MessageStatus {
    Pending = "pending",
    Processing = "processing",
    Processed = "processed",
    Failed = "failed",
    DeadLetter = "deadletter"
}
export interface MetricsUpdatedEvent extends SystemEvent {
    metrics: {
        responseTime: number;
        throughput: number;
        errorRate: number;
        cpuUsage: number;
        memoryUsage: number;
        activeConnections: number;
    };
}
export interface PerformanceAlertEvent extends SystemEvent {
    metric: string;
    threshold: number;
    current: number;
    severity: 'Warning' | 'Critical';
}
export interface EvolutionCycleCompletedEvent extends SystemEvent {
    generation: number;
    improvementRate: number;
    topPerformers: string[];
    suggestedMutations: {
        appId: string;
        suggestion: string;
    }[];
}
export interface OfferingAppliedEvent extends SystemEvent {
    appId: string;
    offering: string;
    result: 'Success' | 'Pending' | 'Failed';
    metrics?: Record<string, number>;
}
export interface PatternDiscoveredEvent extends SystemEvent {
    patternId: string;
    patternName: string;
    applicableApps: string[];
    successRate: number;
}
export interface SolutionFoundEvent extends SystemEvent {
    solutionId: string;
    problem: string;
    affectedAppCount: number;
    timeToDeploy: number;
}
export interface RevenueUpdateEvent extends SystemEvent {
    appId: string;
    mrr: number;
    arr: number;
    churnRate: number;
    newCustomers: number;
}
export interface UserMetricsUpdateEvent extends SystemEvent {
    appId: string;
    totalUsers: number;
    activeUsers: number;
    conversionRate: number;
    nps: number;
}
export interface ErrorEvent extends SystemEvent {
    errorId: string;
    message: string;
    stack?: string;
    affectedSystems: string[];
    suggestedFix?: string;
}
export interface EventSubscription {
    id: string;
    subscriberId: string;
    eventTypes: EventType[];
    endpoint?: string;
    filters?: EventFilter[];
    active: boolean;
}
export interface EventFilter {
    field: string;
    operator: 'eq' | 'gt' | 'lt' | 'contains' | 'in';
    value: unknown;
}
export interface DeliveryGuarantee {
    acknowledgment: 'none' | 'offset' | 'manual';
    timeout: number;
    maxRetries: number;
    deadLetterQueue: boolean;
}
export interface EventBusStatistics {
    totalEvents: number;
    eventsPerSecond: number;
    eventsByType: Record<EventType, number>;
    eventsByPriority: Record<EventPriority, number>;
    processingLatency: {
        p50: number;
        p95: number;
        p99: number;
    };
    failureRate: number;
    lastProcessedTimestamp: Date;
}
//# sourceMappingURL=types.d.ts.map