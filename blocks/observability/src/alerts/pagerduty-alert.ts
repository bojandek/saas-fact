/**
 * Real PagerDuty Alert Integration
 * Uses PagerDuty Events API v2 for incident management
 */

import { Incident, SeverityLevel } from '../monitoring'

export interface PagerDutyAlertConfig {
  integrationKey: string // Routing key for integration
  serviceId?: string
  deduplicationKey?: string
}

export interface PagerDutyEvent {
  routing_key: string
  event_action: 'trigger' | 'acknowledge' | 'resolve'
  deduplication_key?: string
  payload: {
    summary: string
    severity: 'critical' | 'error' | 'warning' | 'info'
    source: string
    component?: string
    custom_details?: Record<string, any>
    timestamp?: string
  }
  client?: {
    name: string
    url?: string
  }
  links?: Array<{
    href: string
    text: string
  }>
}

export class PagerDutyAlertService {
  private config: PagerDutyAlertConfig
  private apiUrl = 'https://events.pagerduty.com/v2/enqueue'
  private incidentMap: Map<string, { deduplicationKey: string; pdIncidentId: string }> = new Map()

  constructor(config: PagerDutyAlertConfig) {
    if (!config.integrationKey) {
      throw new Error('PagerDuty integration key is required')
    }
    this.config = config
  }

  /**
   * Send alert to PagerDuty
   */
  async sendAlert(message: string, incident: Incident): Promise<void> {
    try {
      const deduplicationKey = this.generateDeduplicationKey(incident)
      const pdSeverity = this.mapSeverity(incident.severity)

      const event: PagerDutyEvent = {
        routing_key: this.config.integrationKey,
        event_action: 'trigger',
        deduplication_key: deduplicationKey,
        payload: {
          summary: incident.title,
          severity: pdSeverity,
          source: 'SaaS Factory Monitoring',
          component: this.config.serviceId || 'main-application',
          custom_details: {
            incident_id: incident.id,
            alert_id: incident.alertId,
            description: incident.description,
            start_time: incident.startTime.toISOString(),
            metadata: incident.metadata,
          },
          timestamp: new Date().toISOString(),
        },
        client: {
          name: 'SaaS Factory',
          url: 'https://saas-factory.io',
        },
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`PagerDuty API error: ${JSON.stringify(error)}`)
      }

      const data = (await response.json()) as { status: string; dedup_key: string }

      // Store mapping for future acknowledgment/resolution
      this.incidentMap.set(incident.id, {
        deduplicationKey: data.dedup_key,
        pdIncidentId: incident.id,
      })

      console.log(`[PagerDuty Alert] Successfully triggered incident (DedupeKey: ${data.dedup_key})`)
    } catch (error) {
      console.error('[PagerDuty Alert] Failed to send alert:', error)
      throw error
    }
  }

  /**
   * Acknowledge incident in PagerDuty
   */
  async acknowledgeIncident(incidentId: string): Promise<void> {
    try {
      const mapping = this.incidentMap.get(incidentId)
      if (!mapping) {
        console.warn(`[PagerDuty] No mapping found for incident ${incidentId}`)
        return
      }

      const event: PagerDutyEvent = {
        routing_key: this.config.integrationKey,
        event_action: 'acknowledge',
        deduplication_key: mapping.deduplicationKey,
        payload: {
          summary: `Incident acknowledged: ${incidentId}`,
          severity: 'info',
          source: 'SaaS Factory Monitoring',
        },
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      })

      if (!response.ok) {
        throw new Error(`Failed to acknowledge incident in PagerDuty`)
      }

      console.log(`[PagerDuty Alert] Successfully acknowledged incident ${incidentId}`)
    } catch (error) {
      console.error('[PagerDuty Alert] Failed to acknowledge incident:', error)
      throw error
    }
  }

  /**
   * Resolve incident in PagerDuty
   */
  async resolveIncident(incidentId: string): Promise<void> {
    try {
      const mapping = this.incidentMap.get(incidentId)
      if (!mapping) {
        console.warn(`[PagerDuty] No mapping found for incident ${incidentId}`)
        return
      }

      const event: PagerDutyEvent = {
        routing_key: this.config.integrationKey,
        event_action: 'resolve',
        deduplication_key: mapping.deduplicationKey,
        payload: {
          summary: `Incident resolved: ${incidentId}`,
          severity: 'info',
          source: 'SaaS Factory Monitoring',
        },
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      })

      if (!response.ok) {
        throw new Error(`Failed to resolve incident in PagerDuty`)
      }

      console.log(`[PagerDuty Alert] Successfully resolved incident ${incidentId}`)
      this.incidentMap.delete(incidentId)
    } catch (error) {
      console.error('[PagerDuty Alert] Failed to resolve incident:', error)
      throw error
    }
  }

  private mapSeverity(severity: SeverityLevel): 'critical' | 'error' | 'warning' | 'info' {
    switch (severity) {
      case 'critical':
        return 'critical'
      case 'warning':
        return 'error'
      case 'info':
        return 'info'
      default:
        return 'warning'
    }
  }

  private generateDeduplicationKey(incident: Incident): string {
    return `saas-factory-${incident.alertId}-${incident.startTime.getTime()}`
  }
}
