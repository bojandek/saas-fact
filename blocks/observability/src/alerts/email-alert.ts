/**
 * Real Email Alert Integration
 * Uses Resend for transactional emails
 */

import { Incident, SeverityLevel } from '../monitoring'

export interface EmailAlertConfig {
  resendApiKey: string
  fromEmail: string
  recipients: string[]
  onCritical?: string[] // Additional recipients for critical alerts
}

export class EmailAlertService {
  private config: EmailAlertConfig
  private resendBaseUrl = 'https://api.resend.com'

  constructor(config: EmailAlertConfig) {
    if (!config.resendApiKey) {
      throw new Error('Resend API key is required')
    }
    if (!config.fromEmail) {
      throw new Error('From email is required')
    }
    this.config = config
  }

  /**
   * Send alert via email
   */
  async sendAlert(message: string, incident: Incident): Promise<void> {
    try {
      const recipients = this.getRecipients(incident.severity)
      const subject = this.getEmailSubject(incident)
      const html = this.buildEmailHtml(incident, message)

      const response = await fetch(`${this.resendBaseUrl}/emails`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.config.fromEmail,
          to: recipients,
          subject,
          html,
          reply_to: this.config.fromEmail,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Resend API error: ${JSON.stringify(error)}`)
      }

      const data = (await response.json()) as { id: string }
      console.log(`[Email Alert] Successfully sent alert (ID: ${data.id}) for incident ${incident.id}`)
    } catch (error) {
      console.error('[Email Alert] Failed to send alert:', error)
      throw error
    }
  }

  private getRecipients(severity: SeverityLevel): string[] {
    const recipients = [...this.config.recipients]

    if (severity === 'critical' && this.config.onCritical) {
      recipients.push(...this.config.onCritical)
    }

    return Array.from(new Set(recipients)) // Remove duplicates
  }

  private getEmailSubject(incident: Incident): string {
    const icon = this.getSeverityIcon(incident.severity)
    return `${icon} [${incident.severity.toUpperCase()}] ${incident.title}`
  }

  private buildEmailHtml(incident: Incident, message: string): string {
    const severityColor = this.getSeverityColor(incident.severity)
    const timestamp = new Date().toISOString()

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: ${severityColor}; color: white; padding: 20px; border-radius: 8px; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { background-color: #f5f5f5; padding: 20px; margin-top: 20px; border-radius: 8px; }
            .field { margin: 10px 0; }
            .field strong { color: #666; }
            .footer { font-size: 12px; color: #999; margin-top: 20px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${this.getSeverityIcon(incident.severity)} ${incident.title}</h1>
              <p>Severity: <strong>${incident.severity.toUpperCase()}</strong></p>
            </div>

            <div class="content">
              <p>${message}</p>

              <h3>Incident Details</h3>
              <div class="field">
                <strong>Incident ID:</strong> ${incident.id}
              </div>
              <div class="field">
                <strong>Alert ID:</strong> ${incident.alertId}
              </div>
              <div class="field">
                <strong>Start Time:</strong> ${incident.startTime.toISOString()}
              </div>
              <div class="field">
                <strong>Current Time:</strong> ${timestamp}
              </div>

              ${incident.description ? `<p><strong>Description:</strong> ${incident.description}</p>` : ''}

              ${incident.metadata ? `
                <h3>Additional Details</h3>
                <pre>${JSON.stringify(incident.metadata, null, 2)}</pre>
              ` : ''}
            </div>

            <div class="footer">
              <p>This is an automated alert from SaaS Factory Monitoring.</p>
              <p>Do not reply to this email. Contact your system administrator for assistance.</p>
            </div>
          </div>
        </body>
      </html>
    `
  }

  private getSeverityIcon(severity: SeverityLevel): string {
    switch (severity) {
      case 'critical':
        return '🚨'
      case 'warning':
        return '⚠️'
      case 'info':
        return 'ℹ️'
      default:
        return '📧'
    }
  }

  private getSeverityColor(severity: SeverityLevel): string {
    switch (severity) {
      case 'critical':
        return '#DC2626' // Red
      case 'warning':
        return '#F59E0B' // Orange
      case 'info':
        return '#3B82F6' // Blue
      default:
        return '#6B7280' // Gray
    }
  }
}
