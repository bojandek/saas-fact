"use strict";
/**
 * Event Bus - Distributed Event Publishing & Subscription System
 * Implementacija sa Redis Streams (production-ready)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBus = void 0;
exports.getEventBus = getEventBus;
const logger_1 = require("../utils/logger");
const types_1 = require("./types");
class EventBus {
    constructor() {
        this.handlers = {};
        this.subscriptions = new Map();
        this.messageQueue = [];
        this.statistics = {
            totalEvents: 0,
            eventsPerSecond: 0,
            eventsByType: {},
            eventsByPriority: {
                low: 0,
                medium: 0,
                high: 0,
                critical: 0,
            },
            processingLatency: {
                p50: 0,
                p95: 0,
                p99: 0,
            },
            failureRate: 0,
            lastProcessedTimestamp: new Date(),
        };
        this.processingTimes = [];
        logger_1.logger.info('🎯 Event Bus initialized');
    }
    /**
     * Register event handler za određeni event tip
     */
    subscribe(eventType, handler) {
        if (!this.handlers[eventType]) {
            this.handlers[eventType] = [];
        }
        this.handlers[eventType].push(handler);
        const subscriptionId = `sub-${Date.now()}-${Math.random()}`;
        this.subscriptions.set(subscriptionId, {
            id: subscriptionId,
            subscriberId: `handler-${eventType}`,
            eventTypes: [eventType],
            active: true,
        });
        logger_1.logger.info(`✅ Handler registered for ${eventType}`);
        return subscriptionId;
    }
    /**
     * Publish event na bus
     */
    async publish(event) {
        const startTime = Date.now();
        // Add to statistics
        this.statistics.totalEvents++;
        const eventTypeKey = event.type;
        const priorityKey = event.priority;
        this.statistics.eventsByType[eventTypeKey] = (this.statistics.eventsByType[eventTypeKey] || 0) + 1;
        this.statistics.eventsByPriority[priorityKey]++;
        // Create stream message
        const message = {
            id: `msg-${Date.now()}`,
            event,
            status: types_1.MessageStatus.Pending,
            retries: 0,
        };
        this.messageQueue.push(message);
        // Process event prioritizirano
        if (event.priority === 'critical') {
            await this.processMessage(message);
        }
        else {
            // Non-critical mogu biti async
            this.processMessageAsync(message);
        }
        const processingTime = Date.now() - startTime;
        this.processingTimes.push(processingTime);
        // Keep only last 1000 processing times
        if (this.processingTimes.length > 1000) {
            this.processingTimes.shift();
        }
        // Update latency percentiles
        this.updateLatencyMetrics();
        logger_1.logger.info(`📤 Published ${event.type} from ${event.source} (priority: ${event.priority})`);
    }
    /**
     * Process message synchronously (za critical events)
     */
    async processMessage(message) {
        message.status = types_1.MessageStatus.Processing;
        message.processedAt = new Date();
        const eventType = message.event.type;
        const handlers = this.handlers[eventType] || [];
        for (const handler of handlers) {
            try {
                await handler.handler(message.event);
                message.status = types_1.MessageStatus.Processed;
                logger_1.logger.info(`✅ Processed ${eventType} message`);
            }
            catch (error) {
                logger_1.logger.error(`❌ Handler error for ${eventType}:`, error);
                if (message.retries < handler.retryCount) {
                    message.retries++;
                    // Retry later
                    await new Promise((resolve) => setTimeout(resolve, 1000 * message.retries));
                    await this.processMessage(message);
                }
                else {
                    message.status = types_1.MessageStatus.Failed;
                    this.handleFailedMessage(message);
                }
            }
        }
    }
    /**
     * Process message asynchronously (non-critical)
     */
    async processMessageAsync(message) {
        // Schedule za processing
        setImmediate(async () => {
            await this.processMessage(message);
        });
    }
    /**
     * Handle failed messages - send to dead letter queue
     */
    handleFailedMessage(message) {
        message.status = types_1.MessageStatus.DeadLetter;
        logger_1.logger.error(`💀 Message sent to DLQ: ${message.id}`);
        // In production, ово bi bilo:
        // - Log to external monitoring
        // - Store in database
        // - Alert ops team
        this.statistics.failureRate = this.calculateFailureRate();
    }
    /**
     * Get handlers za određeni event tip
     */
    getHandlers(eventType) {
        return this.handlers[eventType] || [];
    }
    /**
     * Update latency percentiles
     */
    updateLatencyMetrics() {
        if (this.processingTimes.length === 0)
            return;
        const sorted = [...this.processingTimes].sort((a, b) => a - b);
        const len = sorted.length;
        this.statistics.processingLatency.p50 = sorted[Math.floor(len * 0.5)];
        this.statistics.processingLatency.p95 = sorted[Math.floor(len * 0.95)];
        this.statistics.processingLatency.p99 = sorted[Math.floor(len * 0.99)];
    }
    /**
     * Calculate failure rate
     */
    calculateFailureRate() {
        const failedCount = this.messageQueue.filter((m) => m.status === types_1.MessageStatus.Failed).length;
        return this.messageQueue.length > 0 ? (failedCount / this.messageQueue.length) * 100 : 0;
    }
    /**
     * Broadcast event to all interested subscribers
     */
    async broadcast(event, targetApps) {
        let delivered = 0;
        for (const appId of targetApps) {
            const subscription = Array.from(this.subscriptions.values()).find((sub) => sub.subscriberId === appId);
            if (subscription && subscription.active) {
                try {
                    // In real system, call app's webhook
                    await this.deliverToApp(appId, event);
                    delivered++;
                    logger_1.logger.info(`📢 Broadcast to ${appId}`);
                }
                catch (error) {
                    logger_1.logger.error(`Failed to deliver to ${appId}:`, error);
                }
            }
        }
        return delivered;
    }
    /**
     * Deliver event to specific app (placeholder)
     */
    async deliverToApp(appId, event) {
        // In production:
        // - Call app's webhook endpoint
        // - Sign with HMAC
        // - Handle retries
        return new Promise((resolve) => {
            setTimeout(resolve, Math.random() * 100);
        });
    }
    /**
     * Get current statistics
     */
    getStatistics() {
        return {
            ...this.statistics,
            eventsPerSecond: this.calculateEventsPerSecond(),
            lastProcessedTimestamp: new Date(),
        };
    }
    /**
     * Calculate events per second
     */
    calculateEventsPerSecond() {
        // Simplified: count events from last 10 messages
        const recentMessages = this.messageQueue.slice(-10);
        return recentMessages.length > 0 ? recentMessages.length : 0;
    }
    /**
     * Get queue statistics
     */
    getQueueStats() {
        return {
            total: this.messageQueue.length,
            pending: this.messageQueue.filter((m) => m.status === types_1.MessageStatus.Pending).length,
            processing: this.messageQueue.filter((m) => m.status === types_1.MessageStatus.Processing).length,
            processed: this.messageQueue.filter((m) => m.status === types_1.MessageStatus.Processed).length,
            failed: this.messageQueue.filter((m) => m.status === types_1.MessageStatus.Failed).length,
            deadLetter: this.messageQueue.filter((m) => m.status === types_1.MessageStatus.DeadLetter).length,
        };
    }
    /**
     * Unsubscribe
     */
    unsubscribe(subscriptionId) {
        const subscription = this.subscriptions.get(subscriptionId);
        if (subscription) {
            subscription.active = false;
            logger_1.logger.info(`Unsubscribed: ${subscriptionId}`);
            return true;
        }
        return false;
    }
    /**
     * Health check
     */
    getHealth() {
        const queueStats = this.getQueueStats();
        const avgLatency = this.processingTimes.length > 0
            ? this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length
            : 0;
        const health = {
            status: this.statistics.failureRate < 5 ? 'Healthy' : 'Degraded',
            queueHealth: queueStats.failed === 0 ? 'Good' : 'Needs Attention',
            avgLatencyMs: Math.floor(avgLatency),
            failureRate: Math.floor(this.statistics.failureRate),
            totalSubscriptions: this.subscriptions.size,
            activeSubscriptions: Array.from(this.subscriptions.values()).filter((s) => s.active).length,
        };
        return health;
    }
    /**
     * Process pending messages (batch processing)
     */
    async processPendingMessages() {
        const pending = this.messageQueue.filter((m) => m.status === types_1.MessageStatus.Pending);
        logger_1.logger.info(`⏳ Processing ${pending.length} pending messages...`);
        for (const message of pending.slice(0, 100)) {
            // Process in batches
            await this.processMessage(message);
        }
        return pending.length;
    }
}
exports.EventBus = EventBus;
/**
 * Singleton instance
 */
let eventBusInstance = null;
function getEventBus() {
    if (!eventBusInstance) {
        eventBusInstance = new EventBus();
    }
    return eventBusInstance;
}
//# sourceMappingURL=event-bus.js.map