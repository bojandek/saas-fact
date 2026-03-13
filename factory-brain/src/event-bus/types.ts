/**
 * Event Bus - Distributed messaging za real-time sync između 150+ SaaS aplikacija
 * Redis Streams + Kafka fallback za high-volume event distribution
 */

// ===== EVENTS =====
export interface SystemEvent {
  id: string;
  type: EventType;
  source: string; // App ID
  timestamp: Date;
  payload: Record<string, unknown>;
  priority: EventPriority;
  correlationId?: string;
}

export enum EventType {
  // Metrics
  MetricsUpdated = 'metrics.updated',
  PerformanceAlert = 'perf.alert',
  
  // Application
  AppDeployed = 'app.deployed',
  AppFailed = 'app.failed',
  AppOptimized = 'app.optimized',
  
  // MetaClaw
  EvolutionCycleStarted = 'evolution.started',
  EvolutionCycleCompleted = 'evolution.completed',
  OfferingApplied = 'offering.applied',
  
  // Knowledge
  PatternDiscovered = 'pattern.discovered',
  SolutionFound = 'solution.found',
  LearningRecorded = 'learning.recorded',
  
  // Business
  RevenueUpdate = 'revenue.updated',
  UserMetricsUpdate = 'user.metrics.updated',
  
  // System
  SyncHealthCheck = 'sync.healthcheck',
  ErrorOccurred = 'error.occurred',
}

export enum EventPriority {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Critical = 'critical',
}

// ===== EVENT HANDLERS =====
export interface EventHandler {
  eventType: EventType;
  handler: (event: SystemEvent) => Promise<void>;
  asyncProcessing: boolean;
  retryCount: number;
}

export interface EventHandlerRegistry {
  [key: string]: EventHandler[];
}

// ===== EVENT STREAM =====
export interface EventStreamConfig {
  backend: 'redis' | 'kafka';
  topic: string;
  consumerGroup: string;
  batchSize: number;
  processingTimeout: number; // minutes
}

export interface StreamMessage {
  id: string;
  event: SystemEvent;
  processedAt?: Date;
  status: MessageStatus;
  retries: number;
}

export enum MessageStatus {
  Pending = 'pending',
  Processing = 'processing',
  Processed = 'processed',
  Failed = 'failed',
  DeadLetter = 'deadletter',
}

// ===== METRICS EVENTS =====
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

// ===== EVOLUTION EVENTS =====
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

// ===== KNOWLEDGE EVENTS =====
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

// ===== BUSINESS EVENTS =====
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

// ===== ERROR EVENTS =====
export interface ErrorEvent extends SystemEvent {
  errorId: string;
  message: string;
  stack?: string;
  affectedSystems: string[];
  suggestedFix?: string;
}

// ===== SUBSCRIPTIONS =====
export interface EventSubscription {
  id: string;
  subscriberId: string;
  eventTypes: EventType[];
  endpoint?: string; // For webhooks
  filters?: EventFilter[];
  active: boolean;
}

export interface EventFilter {
  field: string;
  operator: 'eq' | 'gt' | 'lt' | 'contains' | 'in';
  value: unknown;
}

// ===== DELIVERY GUARANTEE =====
export interface DeliveryGuarantee {
  acknowledgment: 'none' | 'offset' | 'manual';
  timeout: number; // minutes
  maxRetries: number;
  deadLetterQueue: boolean;
}

// ===== EVENT STATISTICS =====
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
