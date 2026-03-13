/**
 * Real Slack Alert Integration
 * Uses Slack incoming webhooks for alerts
 */

import { Incident, SeverityLevel } from '../monitoring'

export interface SlackAlertConfig {
  webhookUrl: string
  channel?: string
  mentionOnSeverity?: {
    critical: string[] // @user or @here
    warning: string[]
  }
}

export class SlackAlertService {
  private config: SlackAlertConfig

  constructor(config: SlackAlertConfig) {
    if (!config.webhookUrl) {
      throw new Error('Slack webhook URL is required')
    }
    this.config = config
  }

  /**
   * Send alert to Slack
   */
  async sendAlert(message: string, incident: Incident): Promise<void> {
    try {
      const color = this.getSeverityColor(incident.severity)
      const mentions = this.getMentions(incident.severity)

      const slackMessage = {
        channel: this.config.channel,
        attachments: [
          {
            color,
            title: `🚨 ${incident.title}`,
            text: message,
            fields: [
              {
                title: 'Severity',
                value: incident.severity.toUpperCase(),
                short: true,
              },
              {
                title: 'Incident ID',
                value: incident.id,
                short: true,
              },
              {
                title: 'Time',
                value: new Date().toISOString(),
                short: false,
              },
            ],
            footer: 'SaaS Factory Monitoring',
            ts: Math.floor(Date.now() / 1000),
          },
        ],
      }

      // Add mentions if configured
      if (mentions.length > 0) {
        slackMessage.attachments[0].pretext = mentions.join(' ')
      }

      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(slackMessage),
      })

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.statusText}`)
      }

      console.log(`[Slack Alert] Successfully sent alert for incident ${incident.id}`)
    } catch (error) {
      console.error('[Slack Alert] Failed to send alert:', error)
      throw error
    }
  }

  private getSeverityColor(severity: SeverityLevel): string {
    switch (severity) {
      case 'critical':
        return '#FF0000' // Red
      case 'warning':
        return '#FFA500' // Orange
      case 'info':
        return '#0099FF' // Blue
      default:
        return '#808080' // Gray
    }
  }

  private getMentions(severity: SeverityLevel): string[] {
    if (!this.config.mentionOnSeverity) return []

    const mentions = this.config.mentionOnSeverity[severity] || []
    return mentions.map((m) => (m.startsWith('@') ? m : `@${m}`))
  }
}
