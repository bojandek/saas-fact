/**
 * Event Bus - Distributed Event Publishing & Subscription System
 * Implementacija sa Redis Streams (production-ready)
 */
import { SystemEvent, EventType, EventHandler, EventBusStatistics } from './types';
export declare class EventBus {
    private handlers;
    private subscriptions;
    private messageQueue;
    private statistics;
    private processingTimes;
    constructor();
    /**
     * Register event handler za određeni event tip
     */
    subscribe(eventType: EventType, handler: EventHandler): string;
    /**
     * Publish event na bus
     */
    publish(event: SystemEvent): Promise<void>;
    /**
     * Process message synchronously (za critical events)
     */
    private processMessage;
    /**
     * Process message asynchronously (non-critical)
     */
    private processMessageAsync;
    /**
     * Handle failed messages - send to dead letter queue
     */
    private handleFailedMessage;
    /**
     * Get handlers za određeni event tip
     */
    private getHandlers;
    /**
     * Update latency percentiles
     */
    private updateLatencyMetrics;
    /**
     * Calculate failure rate
     */
    private calculateFailureRate;
    /**
     * Broadcast event to all interested subscribers
     */
    broadcast(event: SystemEvent, targetApps: string[]): Promise<number>;
    /**
     * Deliver event to specific app (placeholder)
     */
    private deliverToApp;
    /**
     * Get current statistics
     */
    getStatistics(): EventBusStatistics;
    /**
     * Calculate events per second
     */
    private calculateEventsPerSecond;
    /**
     * Get queue statistics
     */
    getQueueStats(): {
        total: number;
        pending: number;
        processing: number;
        processed: number;
        failed: number;
        deadLetter: number;
    };
    /**
     * Unsubscribe
     */
    unsubscribe(subscriptionId: string): boolean;
    /**
     * Health check
     */
    getHealth(): {
        status: string;
        queueHealth: string;
        avgLatencyMs: number;
        failureRate: number;
        totalSubscriptions: number;
        activeSubscriptions: number;
    };
    /**
     * Process pending messages (batch processing)
     */
    processPendingMessages(): Promise<number>;
}
export declare function getEventBus(): EventBus;
//# sourceMappingURL=event-bus.d.ts.map