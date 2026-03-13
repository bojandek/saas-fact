/**
 * Monitoring & Alerting Rules
 * SLO tracking, incident response, and health monitoring
 */

import { SlackAlertService, type SlackAlertConfig } from './alerts/slack-alert'
import { EmailAlertService, type EmailAlertConfig } from './alerts/email-alert'
import { PagerDutyAlertService, type PagerDutyAlertConfig } from './alerts/pagerduty-alert'

export type SeverityLevel = 'info' | 'warning' | 'critical'
export type AlertChannel = 'slack' | 'pagerduty' | 'email' | 'webhook'

/** Alert service instances */
let slackService: SlackAlertService | null = null
let emailService: EmailAlertService | null = null
let pagerdutyService: PagerDutyAlertService | null = null

export interface SLO {
  name: string
  description?: string
  targetPercentage: number
  window: 'hourly' | 'daily' | 'weekly' | 'monthly'
  metric: string
}

export interface Alert {
  id: string
  name: string
  description?: string
  condition: (metrics: MetricsSnapshot) => boolean
  severity: SeverityLevel
  channels: AlertChannel[]
  cooldown?: number // ms before re-alerting
  enabled: boolean
}

export interface Incident {
  id: string
  alertId: string
  severity: SeverityLevel
  title: string
  description?: string
  startTime: Date
  endTime?: Date
  status: 'open' | 'acknowledged' | 'resolved'
  responders?: string[]
  metadata?: Record<string, any>
}

export interface MetricsSnapshot {
  timestamp: Date
  // Application metrics
  requestCount: number
  errorCount: number
  errorRate: number
  p50Latency: number
  p95Latency: number
  p99Latency: number
  // External service health
  stripeHealth: boolean
  supabaseHealth: boolean
  redisHealth: boolean
  // Circuit breaker status
  circuitBreakerStates: Record<string, 'CLOSED' | 'OPEN' | 'HALF_OPEN'>
  // Business metrics
  activeUsers: number
  newSignups: number
  failedPayments: number
}

export interface SLOStatus {
  slo: SLO
  currentPercentage: number
  isBreached: boolean
  remainingErrorBudget: number
}

/**
 * Monitoring Engine - Tracks metrics and fires alerts
 */
export class MonitoringEngine {
  private slos: Map<string, SLO> = new Map()
  private alerts: Map<string, Alert> = new Map()
  private incidents: Map<string, Incident> = new Map()
  private history: MetricsSnapshot[] = []
  private lastAlertTime: Map<string, number> = new Map()
  private alertHandlers: Map<AlertChannel, (alert: string, incident: Incident) => Promise<void>> =
    new Map()

  constructor() {
    // Register alert handlers - try to use real services if configured
    this.registerAlertHandler('slack', this.handleSlackAlert.bind(this))
    this.registerAlertHandler('email', this.handleEmailAlert.bind(this))
    this.registerAlertHandler('webhook', this.defaultWebhookHandler.bind(this))
    this.registerAlertHandler('pagerduty', this.handlePagerDutyAlert.bind(this))
  }

  /**
   * Register SLO
   */
  registerSLO(slo: SLO): void {
    this.slos.set(slo.name, slo)
    console.log(`[Monitoring] Registered SLO: ${slo.name} (${slo.targetPercentage}%)`)
  }

  /**
   * Register alert rule
   */
  registerAlert(alert: Alert): void {
    this.alerts.set(alert.id, alert)
    console.log(`[Monitoring] Registered alert: ${alert.name}`)
  }

  /**
   * Register alert handler (Slack, PagerDuty, etc.)
   */
  registerAlertHandler(
    channel: AlertChannel,
    handler: (message: string, incident: Incident) => Promise<void>
  ): void {
    this.alertHandlers.set(channel, handler)
  }

  /**
   * Initialize Slack alert service
   */
  initializeSlackAlerts(config: SlackAlertConfig): void {
    try {
      slackService = new SlackAlertService(config)
      console.log('[Monitoring] Slack alert service initialized')
    } catch (error) {
      console.error('[Monitoring] Failed to initialize Slack alerts:', error)
    }
  }

  /**
   * Initialize Email alert service
   */
  initializeEmailAlerts(config: EmailAlertConfig): void {
    try {
      emailService = new EmailAlertService(config)
      console.log('[Monitoring] Email alert service initialized')
    } catch (error) {
      console.error('[Monitoring] Failed to initialize Email alerts:', error)
    }
  }

  /**
   * Initialize PagerDuty alert service
   */
  initializePagerDutyAlerts(config: PagerDutyAlertConfig): void {
    try {
      pagerdutyService = new PagerDutyAlertService(config)
      console.log('[Monitoring] PagerDuty alert service initialized')
    } catch (error) {
      console.error('[Monitoring] Failed to initialize PagerDuty alerts:', error)
    }
  }

  /**
   * Process metrics snapshot and check alerts/SLOs
   */
  async processMetrics(metrics: MetricsSnapshot): Promise<void> {
    this.history.push(metrics)

    // Keep only last 24 hours
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    this.history = this.history.filter((m) => m.timestamp.getTime() > oneDayAgo)

    // Check SLOs
    for (const slo of this.slos.values()) {
      const status = this.calculateSLOStatus(slo)
      if (status.isBreached) {
        console.warn(`[Monitoring] SLO BREACH: ${slo.name}`)
      }
    }

    // Check alerts
    for (const alert of this.alerts.values()) {
      if (!alert.enabled) continue

      try {
        const shouldAlert = alert.condition(metrics)

        if (shouldAlert && this.canAlert(alert.id, alert.cooldown)) {
          await this.fireAlert(alert, metrics)
        }
      } catch (error) {
        console.error(`[Monitoring] Alert check failed for ${alert.id}:`, error)
      }
    }
  }

  /**
   * Calculate SLO status
   */
  calculateSLOStatus(slo: SLO): SLOStatus {
    const data = this.getMetricsWindow(slo.window)
    if (data.length === 0) {
      return {
        slo,
        currentPercentage: 100,
        isBreached: false,
        remainingErrorBudget: 100 - slo.targetPercentage,
      }
    }

    const totalRequests = data.reduce((sum, m) => sum + m.requestCount, 0)
    const totalErrors = data.reduce((sum, m) => sum + m.errorCount, 0)

    const currentPercentage =
      totalRequests > 0 ? ((totalRequests - totalErrors) / totalRequests) * 100 : 100

    const errorBudget = 100 - slo.targetPercentage
    const spent = 100 - currentPercentage
    const remaining = Math.max(0, errorBudget - spent)

    return {
      slo,
      currentPercentage,
      isBreached: currentPercentage < slo.targetPercentage,
      remainingErrorBudget: remaining,
    }
  }

  /**
   * Get all SLO statuses
   */
  getAllSLOStatus(): SLOStatus[] {
    return Array.from(this.slos.values()).map((slo) => this.calculateSLOStatus(slo))
  }

  /**
   * Get all active incidents
   */
  getActiveIncidents(): Incident[] {
    return Array.from(this.incidents.values()).filter((i) => i.status === 'open')
  }

  /**
   * Acknowledge incident
   */
  acknowledgeIncident(incidentId: string, responders: string[]): void {
    const incident = this.incidents.get(incidentId)
    if (incident) {
      incident.status = 'acknowledged'
      incident.responders = responders
      console.log(`[Monitoring] Incident acknowledged: ${incidentId}`)
    }
  }

  /**
   * Resolve incident
   */
  resolveIncident(incidentId: string): void {
    const incident = this.incidents.get(incidentId)
    if (incident) {
      incident.status = 'resolved'
      incident.endTime = new Date()
      console.log(`[Monitoring] Incident resolved: ${incidentId}`)
    }
  }

  /**
   * Get metrics for last N minutes
   */
  getRecentMetrics(minutes: number = 60): MetricsSnapshot[] {
    const cutoff = Date.now() - minutes * 60 * 1000
    return this.history.filter((m) => m.timestamp.getTime() > cutoff)
  }

  /**
   * Get health report
   */
  getHealthReport(): {
    slos: SLOStatus[]
    activeIncidents: number
    recentErrors: number
    avgLatency: number
  } {
    const recentMetrics = this.getRecentMetrics(60)
    const recentErrors = recentMetrics.reduce((sum, m) => sum + m.errorCount, 0)
    const avgLatency =
      recentMetrics.length > 0
        ? recentMetrics.reduce((sum, m) => sum + m.p95Latency, 0) / recentMetrics.length
        : 0

    return {
      slos: this.getAllSLOStatus(),
      activeIncidents: this.getActiveIncidents().length,
      recentErrors,
      avgLatency,
    }
  }

  // Private helpers
  private async fireAlert(alert: Alert, metrics: MetricsSnapshot): Promise<void> {
    const incidentId = `incident_${Date.now()}`
    const incident: Incident = {
      id: incidentId,
      alertId: alert.id,
      severity: alert.severity,
      title: alert.name,
      description: alert.description,
      startTime: new Date(),
      status: 'open',
    }

    this.incidents.set(incidentId, incident)
    this.lastAlertTime.set(alert.id, Date.now())

    const message = this.formatIncidentMessage(alert, incident, metrics)

    for (const channel of alert.channels) {
      const handler = this.alertHandlers.get(channel)
      if (handler) {
        try {
          await handler(message, incident)
        } catch (error) {
          console.error(`[Monitoring] Failed to send alert to ${channel}:`, error)
        }
      }
    }

    console.log(`[Monitoring] Alert fired: ${alert.name} (${alert.severity})`)
  }

  private canAlert(alertId: string, cooldown?: number): boolean {
    const lastTime = this.lastAlertTime.get(alertId)
    if (!lastTime) return true

    const cooledOff = cooldown || 300000 // 5 minutes default
    return Date.now() - lastTime > cooledOff
  }

  private getMetricsWindow(window: string): MetricsSnapshot[] {
    const now = Date.now()
    let cutoff: number

    switch (window) {
      case 'hourly':
        cutoff = now - 60 * 60 * 1000
        break
      case 'daily':
        cutoff = now - 24 * 60 * 60 * 1000
        break
      case 'weekly':
        cutoff = now - 7 * 24 * 60 * 60 * 1000
        break
      case 'monthly':
        cutoff = now - 30 * 24 * 60 * 60 * 1000
        break
      default:
        cutoff = now - 60 * 60 * 1000
    }

    return this.history.filter((m) => m.timestamp.getTime() > cutoff)
  }

  private formatIncidentMessage(alert: Alert, incident: Incident, metrics: MetricsSnapshot): string {
    return `
🚨 **${alert.name}** [${incident.severity.toUpperCase()}]

${incident.description || 'No description'}

📊 Current Metrics:
  • Error Rate: ${metrics.errorRate.toFixed(2)}%
  • P95 Latency: ${metrics.p95Latency}ms
  • Active Users: ${metrics.activeUsers}

🔧 Services:
  • Stripe: ${metrics.stripeHealth ? '✓' : '✗'}
  • Supabase: ${metrics.supabaseHealth ? '✓' : '✗'}
  • Redis: ${metrics.redisHealth ? '✓' : '✗'}

🆔 Incident ID: ${incident.id}
⏰ Time: ${new Date().toISOString()}
    `
  }

  // Real alert handlers
  private async handleSlackAlert(message: string, incident: Incident): Promise<void> {
    if (!slackService) {
      console.warn('[Monitoring] Slack alert service not initialized')
      return
    }

    try {
      await slackService.sendAlert(message, incident)
    } catch (error) {
      console.error('[Monitoring] Slack alert failed:', error)
    }
  }

  private async handleEmailAlert(message: string, incident: Incident): Promise<void> {
    if (!emailService) {
      console.warn('[Monitoring] Email alert service not initialized')
      return
    }

    try {
      await emailService.sendAlert(message, incident)
    } catch (error) {
      console.error('[Monitoring] Email alert failed:', error)
    }
  }

  private async defaultWebhookHandler(message: string, incident: Incident): Promise<void> {
    console.log(`[Alerts] Webhook: ${message}`)
    // Default webhook handler - can be overridden
  }

  private async handlePagerDutyAlert(message: string, incident: Incident): Promise<void> {
    if (!pagerdutyService) {
      console.warn('[Monitoring] PagerDuty alert service not initialized')
      return
    }

    try {
      await pagerdutyService.sendAlert(message, incident)
    } catch (error) {
      console.error('[Monitoring] PagerDuty alert failed:', error)
    }
  }
}

// Singleton instance
let monitoringInstance: MonitoringEngine | null = null

export function getMonitoringEngine(): MonitoringEngine {
  if (!monitoringInstance) {
    monitoringInstance = new MonitoringEngine()
  }
  return monitoringInstance
}

/**
 * Initialize all alert services from environment variables
 */
export function initializeAlertServices(): void {
  const monitoring = getMonitoringEngine()

  // Initialize Slack if configured
  if (process.env.SLACK_WEBHOOK_URL) {
    monitoring.initializeSlackAlerts({
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
      channel: process.env.SLACK_CHANNEL,
      mentionOnSeverity: {
        critical: (process.env.SLACK_CRITICAL_MENTIONS || '').split(',').filter(Boolean),
        warning: (process.env.SLACK_WARNING_MENTIONS || '').split(',').filter(Boolean),
      },
    })
  }

  // Initialize Email if configured
  if (process.env.RESEND_API_KEY) {
    monitoring.initializeEmailAlerts({
      resendApiKey: process.env.RESEND_API_KEY,
      fromEmail: process.env.EMAIL_FROM || 'alerts@saas-factory.io',
      recipients: (process.env.EMAIL_RECIPIENTS || '').split(',').filter(Boolean),
      onCritical: (process.env.EMAIL_CRITICAL_RECIPIENTS || '').split(',').filter(Boolean),
    })
  }

  // Initialize PagerDuty if configured
  if (process.env.PAGERDUTY_INTEGRATION_KEY) {
    monitoring.initializePagerDutyAlerts({
      integrationKey: process.env.PAGERDUTY_INTEGRATION_KEY,
      serviceId: process.env.PAGERDUTY_SERVICE_ID,
    })
  }

  console.log('[Monitoring] Alert services initialization completed')
}
