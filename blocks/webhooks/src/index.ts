/**
 * Webhooks Block
 * Reliable webhook delivery with signing, retries, and idempotency
 */

import { createClient } from '@supabase/supabase-js'
import { Webhook as SvixWebhook } from 'svix'

export interface WebhookEndpoint {
  id: string
  url: string
  version: number
  description?: string
  enabled: boolean
  events: string[] // ['user.signup', 'payment.completed', '*']
  created_at: string
}

export interface WebhookEvent {
  id: string
  type: string
  data: Record<string, any>
  timestamp: string
}

export interface WebhookDelivery {
  id: string
  event_id: string
  endpoint_id: string
  status: 'pending' | 'delivered' | 'failed'
  attempts: number
  last_error?: string
  next_retry?: string
}

export class WebhookManager {
  private supabase: ReturnType<typeof createClient>
  private svix: SvixWebhook

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    )
    this.svix = new SvixWebhook(process.env.SVIX_AUTH_TOKEN || '')
  }

  /**
   * Create webhook endpoint
   */
  async createEndpoint(
    url: string,
    events: string[],
    description?: string
  ): Promise<WebhookEndpoint> {
    const { data, error } = await this.supabase
      .from('webhook_endpoints')
      .insert({
        url,
        events,
        description,
        enabled: true,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Emit webhook event
   */
  async emit(
    eventType: string,
    data: Record<string, any>
  ): Promise<void> {
    // Save event
    const { data: event, error: eventError } = await this.supabase
      .from('webhook_events')
      .insert({
        type: eventType,
        data,
      })
      .select()
      .single()

    if (eventError) throw eventError

    // Get matching endpoints
    const { data: endpoints, error: endpointError } = await this.supabase
      .from('webhook_endpoints')
      .select('*')
      .eq('enabled', true)
      .filter('events', 'cs', `["${eventType}","*"]`)

    if (endpointError) throw endpointError

    // Create deliveries
    for (const endpoint of endpoints) {
      await this.supabase.from('webhook_deliveries').insert({
        event_id: event.id,
        endpoint_id: endpoint.id,
        status: 'pending',
        attempts: 0,
      })

      // Attempt delivery
      this.attemptDelivery(event.id, endpoint.id).catch((error) => {
        console.error('Webhook delivery failed:', error)
      })
    }
  }

  /**
   * Attempt webhook delivery with retry logic
   */
  private async attemptDelivery(
    eventId: string,
    endpointId: string,
    attempt: number = 0
  ): Promise<void> {
    const maxAttempts = 5
    const backoffMs = Math.min(1000 * Math.pow(2, attempt), 300000) // Exponential backoff, max 5 min

    if (attempt > maxAttempts) {
      await this.supabase
        .from('webhook_deliveries')
        .update({ status: 'failed' })
        .eq('event_id', eventId)
        .eq('endpoint_id', endpointId)
      return
    }

    // Get event and endpoint
    const [{ data: event }, { data: endpoint }] = await Promise.all([
      this.supabase.from('webhook_events').select('*').eq('id', eventId).single(),
      this.supabase.from('webhook_endpoints').select('*').eq('id', endpointId).single(),
    ])

    // Create signed payload
    const payload = JSON.stringify(event)
    const signature = this.svix.sign('webhook_secret', payload, Math.floor(Date.now() / 1000))

    try {
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Id': event.id,
          'X-Webhook-Timestamp': event.timestamp,
          'X-Webhook-Signature': signature,
        },
        body: payload,
      })

      if (response.ok) {
        await this.supabase
          .from('webhook_deliveries')
          .update({
            status: 'delivered',
            attempts: attempt + 1,
          })
          .eq('event_id', eventId)
          .eq('endpoint_id', endpointId)
        return
      }

      throw new Error(`HTTP ${response.status}`)
    } catch (error) {
      // Schedule retry
      const nextRetry = new Date(Date.now() + backoffMs)

      await this.supabase
        .from('webhook_deliveries')
        .update({
          attempts: attempt + 1,
          last_error: String(error),
          next_retry: nextRetry.toISOString(),
        })
        .eq('event_id', eventId)
        .eq('endpoint_id', endpointId)

      // Schedule next attempt
      setTimeout(
        () => this.attemptDelivery(eventId, endpointId, attempt + 1),
        backoffMs
      )
    }
  }

  /**
   * Get webhook deliveries for monitoring
   */
  async getDeliveries(endpointId: string, limit: number = 100) {
    const { data, error } = await this.supabase
      .from('webhook_deliveries')
      .select('*')
      .eq('endpoint_id', endpointId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  }
}

export const webhooks = new WebhookManager()
