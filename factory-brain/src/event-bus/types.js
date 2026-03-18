"use strict";
/**
 * Event Bus - Distributed messaging za real-time sync između 150+ SaaS aplikacija
 * Redis Streams + Kafka fallback za high-volume event distribution
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageStatus = exports.EventPriority = exports.EventType = void 0;
var EventType;
(function (EventType) {
    // Metrics
    EventType["MetricsUpdated"] = "metrics.updated";
    EventType["PerformanceAlert"] = "perf.alert";
    // Application
    EventType["AppDeployed"] = "app.deployed";
    EventType["AppFailed"] = "app.failed";
    EventType["AppOptimized"] = "app.optimized";
    // MetaClaw
    EventType["EvolutionCycleStarted"] = "evolution.started";
    EventType["EvolutionCycleCompleted"] = "evolution.completed";
    EventType["OfferingApplied"] = "offering.applied";
    // Knowledge
    EventType["PatternDiscovered"] = "pattern.discovered";
    EventType["SolutionFound"] = "solution.found";
    EventType["LearningRecorded"] = "learning.recorded";
    // Business
    EventType["RevenueUpdate"] = "revenue.updated";
    EventType["UserMetricsUpdate"] = "user.metrics.updated";
    // System
    EventType["SyncHealthCheck"] = "sync.healthcheck";
    EventType["ErrorOccurred"] = "error.occurred";
})(EventType || (exports.EventType = EventType = {}));
var EventPriority;
(function (EventPriority) {
    EventPriority["Low"] = "low";
    EventPriority["Medium"] = "medium";
    EventPriority["High"] = "high";
    EventPriority["Critical"] = "critical";
})(EventPriority || (exports.EventPriority = EventPriority = {}));
var MessageStatus;
(function (MessageStatus) {
    MessageStatus["Pending"] = "pending";
    MessageStatus["Processing"] = "processing";
    MessageStatus["Processed"] = "processed";
    MessageStatus["Failed"] = "failed";
    MessageStatus["DeadLetter"] = "deadletter";
})(MessageStatus || (exports.MessageStatus = MessageStatus = {}));
//# sourceMappingURL=types.js.map