import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  MonitoringEngine,
  type MetricsSnapshot,
  type SLO,
} from './monitoring'

describe('MonitoringEngine', () => {
  let monitoring: MonitoringEngine
  let mockHandler: ReturnType<typeof vi.fn>

  beforeEach(() => {
    monitoring = new MonitoringEngine()
    mockHandler = vi.fn()
  })

  describe('SLO tracking', () => {
    it('should register and track SLOs', () => {
      const slo: SLO = {
        name: 'API Availability',
        targetPercentage: 99.9,
        window: 'daily',
        metric: 'uptime',
      }

      monitoring.registerSLO(slo)

      const metrics: MetricsSnapshot = {
        timestamp: new Date(),
        requestCount: 1000,
        errorCount: 1,
        errorRate: 0.1,
        p50Latency: 100,
        p95Latency: 200,
        p99Latency: 500,
        stripeHealth: true,
        supabaseHealth: true,
        redisHealth: true,
        circuitBreakerStates: {},
        activeUsers: 100,
        newSignups: 5,
        failedPayments: 0,
      }

      monitoring.processMetrics(metrics)

      const status = monitoring.getAllSLOStatus()
      expect(status).toHaveLength(1)
      expect(status[0].isBreached).toBe(false)
    })

    it('should detect SLO breaches', async () => {
      const slo: SLO = {
        name: 'API Availability',
        targetPercentage: 99.5,
        window: 'hourly',
        metric: 'uptime',
      }

      monitoring.registerSLO(slo)

      const metrics: MetricsSnapshot = {
        timestamp: new Date(),
        requestCount: 1000,
        errorCount: 100, // 10% error rate - breaks 99.5% SLO
        errorRate: 10,
        p50Latency: 100,
        p95Latency: 200,
        p99Latency: 500,
        stripeHealth: true,
        supabaseHealth: true,
        redisHealth: true,
        circuitBreakerStates: {},
        activeUsers: 100,
        newSignups: 5,
        failedPayments: 0,
      }

      await monitoring.processMetrics(metrics)

      const status = monitoring.getAllSLOStatus()
      expect(status[0].isBreached).toBe(true)
      expect(status[0].currentPercentage).toBeLessThan(99.5)
    })

    it('should calculate error budget remaining', async () => {
      const slo: SLO = {
        name: 'API Availability',
        targetPercentage: 99,
        window: 'monthly',
        metric: 'uptime',
      }

      monitoring.registerSLO(slo)

      const metrics: MetricsSnapshot = {
        timestamp: new Date(),
        requestCount: 10000,
        errorCount: 50, // 0.5% error rate
        errorRate: 0.5,
        p50Latency: 100,
        p95Latency: 200,
        p99Latency: 500,
        stripeHealth: true,
        supabaseHealth: true,
        redisHealth: true,
        circuitBreakerStates: {},
        activeUsers: 100,
        newSignups: 5,
        failedPayments: 0,
      }

      await monitoring.processMetrics(metrics)

      const status = monitoring.getAllSLOStatus()
      expect(status[0].remainingErrorBudget).toBeGreaterThan(0)
    })
  })

  describe('Alert management', () => {
    it('should register and fire alerts', async () => {
      const alert = {
        id: 'high_error_rate',
        name: 'High Error Rate',
        condition: (metrics: MetricsSnapshot) => metrics.errorRate > 5,
        severity: 'critical' as const,
        channels: ['slack' as const],
        enabled: true,
      }

      monitoring.registerAlert(alert)
      monitoring.registerAlertHandler('slack', mockHandler)

      const metrics: MetricsSnapshot = {
        timestamp: new Date(),
        requestCount: 1000,
        errorCount: 100,
        errorRate: 10, // > 5, should trigger
        p50Latency: 100,
        p95Latency: 200,
        p99Latency: 500,
        stripeHealth: true,
        supabaseHealth: true,
        redisHealth: true,
        circuitBreakerStates: {},
        activeUsers: 100,
        newSignups: 5,
        failedPayments: 0,
      }

      await monitoring.processMetrics(metrics)

      expect(mockHandler).toHaveBeenCalled()
    })

    it('should respect alert cooldown', async () => {
      const alert = {
        id: 'test_alert',
        name: 'Test Alert',
        condition: () => true,
        severity: 'warning' as const,
        channels: ['slack' as const],
        cooldown: 10000,
        enabled: true,
      }

      monitoring.registerAlert(alert)
      monitoring.registerAlertHandler('slack', mockHandler)

      const metrics: MetricsSnapshot = {
        timestamp: new Date(),
        requestCount: 1000,
        errorCount: 0,
        errorRate: 0,
        p50Latency: 100,
        p95Latency: 200,
        p99Latency: 500,
        stripeHealth: true,
        supabaseHealth: true,
        redisHealth: true,
        circuitBreakerStates: {},
        activeUsers: 100,
        newSignups: 5,
        failedPayments: 0,
      }

      // First fire
      await monitoring.processMetrics(metrics)
      expect(mockHandler).toHaveBeenCalledTimes(1)

      // Immediate second fire - should be blocked by cooldown
      await monitoring.processMetrics(metrics)
      expect(mockHandler).toHaveBeenCalledTimes(1) // Still 1, not 2
    })

    it('should detect service health issues', async () => {
      const alert = {
        id: 'stripe_down',
        name: 'Stripe Service Down',
        condition: (metrics: MetricsSnapshot) => !metrics.stripeHealth,
        severity: 'critical' as const,
        channels: ['slack' as const, 'pagerduty' as const],
        enabled: true,
      }

      monitoring.registerAlert(alert)
      monitoring.registerAlertHandler('slack', mockHandler)
      monitoring.registerAlertHandler('pagerduty', mockHandler)

      const metrics: MetricsSnapshot = {
        timestamp: new Date(),
        requestCount: 1000,
        errorCount: 0,
        errorRate: 0,
        p50Latency: 100,
        p95Latency: 200,
        p99Latency: 500,
        stripeHealth: false, // Stripe is down
        supabaseHealth: true,
        redisHealth: true,
        circuitBreakerStates: {},
        activeUsers: 100,
        newSignups: 5,
        failedPayments: 0,
      }

      await monitoring.processMetrics(metrics)

      expect(mockHandler).toHaveBeenCalledTimes(2) // Both channels
    })
  })

  describe('Incident management', () => {
    it('should create incidents', async () => {
      const alert = {
        id: 'test_alert',
        name: 'Test Alert',
        condition: () => true,
        severity: 'critical' as const,
        channels: [] as const[],
        enabled: true,
      }

      monitoring.registerAlert(alert)

      const metrics: MetricsSnapshot = {
        timestamp: new Date(),
        requestCount: 1000,
        errorCount: 0,
        errorRate: 0,
        p50Latency: 100,
        p95Latency: 200,
        p99Latency: 500,
        stripeHealth: true,
        supabaseHealth: true,
        redisHealth: true,
        circuitBreakerStates: {},
        activeUsers: 100,
        newSignups: 5,
        failedPayments: 0,
      }

      await monitoring.processMetrics(metrics)

      const incidents = monitoring.getActiveIncidents()
      expect(incidents).toHaveLength(1)
      expect(incidents[0].status).toBe('open')
    })

    it('should acknowledge and resolve incidents', async () => {
      const alert = {
        id: 'test_alert',
        name: 'Test Alert',
        condition: () => true,
        severity: 'critical' as const,
        channels: [] as const[],
        enabled: true,
      }

      monitoring.registerAlert(alert)

      const metrics: MetricsSnapshot = {
        timestamp: new Date(),
        requestCount: 1000,
        errorCount: 0,
        errorRate: 0,
        p50Latency: 100,
        p95Latency: 200,
        p99Latency: 500,
        stripeHealth: true,
        supabaseHealth: true,
        redisHealth: true,
        circuitBreakerStates: {},
        activeUsers: 100,
        newSignups: 5,
        failedPayments: 0,
      }

      await monitoring.processMetrics(metrics)

      const incidents = monitoring.getActiveIncidents()
      const incidentId = incidents[0].id

      monitoring.acknowledgeIncident(incidentId, ['alice@example.com'])
      let incident = monitoring.getActiveIncidents()[0]
      expect(incident.status).toBe('acknowledged')
      expect(incident.responders).toContain('alice@example.com')

      monitoring.resolveIncident(incidentId)
      const resolved = monitoring.getActiveIncidents().filter((i) => i.id === incidentId)
      expect(resolved).toHaveLength(0)
    })
  })

  describe('Metrics tracking', () => {
    it('should track recent metrics', async () => {
      const metrics: MetricsSnapshot = {
        timestamp: new Date(),
        requestCount: 1000,
        errorCount: 10,
        errorRate: 1,
        p50Latency: 100,
        p95Latency: 200,
        p99Latency: 500,
        stripeHealth: true,
        supabaseHealth: true,
        redisHealth: true,
        circuitBreakerStates: {},
        activeUsers: 100,
        newSignups: 5,
        failedPayments: 0,
      }

      await monitoring.processMetrics(metrics)

      const recent = monitoring.getRecentMetrics(60)
      expect(recent).toHaveLength(1)
      expect(recent[0].requestCount).toBe(1000)
    })

    it('should generate health reports', async () => {
      const slo: SLO = {
        name: 'API Availability',
        targetPercentage: 99,
        window: 'hourly',
        metric: 'uptime',
      }

      monitoring.registerSLO(slo)

      const metrics: MetricsSnapshot = {
        timestamp: new Date(),
        requestCount: 1000,
        errorCount: 5,
        errorRate: 0.5,
        p50Latency: 100,
        p95Latency: 150,
        p99Latency: 300,
        stripeHealth: true,
        supabaseHealth: true,
        redisHealth: true,
        circuitBreakerStates: {},
        activeUsers: 150,
        newSignups: 10,
        failedPayments: 0,
      }

      await monitoring.processMetrics(metrics)

      const report = monitoring.getHealthReport()
      expect(report.slos).toHaveLength(1)
      expect(report.activeIncidents).toBe(0)
      expect(report.recentErrors).toBe(5)
      expect(report.avgLatency).toBeGreaterThan(0)
    })
  })

  describe('Concurrent metric processing', () => {
    it('should handle multiple metrics concurrently', async () => {
      const slo: SLO = {
        name: 'API Availability',
        targetPercentage: 99,
        window: 'hourly',
        metric: 'uptime',
      }

      monitoring.registerSLO(slo)

      const metrics: MetricsSnapshot = {
        timestamp: new Date(),
        requestCount: 100,
        errorCount: 1,
        errorRate: 1,
        p50Latency: 100,
        p95Latency: 150,
        p99Latency: 300,
        stripeHealth: true,
        supabaseHealth: true,
        redisHealth: true,
        circuitBreakerStates: {},
        activeUsers: 50,
        newSignups: 2,
        failedPayments: 0,
      }

      // Process multiple metrics concurrently
      await Promise.all([
        ...Array.from({ length: 10 }, () => monitoring.processMetrics(metrics)),
      ])

      const recent = monitoring.getRecentMetrics(1)
      expect(recent.length).toBeGreaterThanOrEqual(1)
    })
  })
})
