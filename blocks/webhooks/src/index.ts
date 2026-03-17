import * as crypto from 'crypto';

/**
 * @interface Webhook
 * @description Represents a registered webhook.
 */
export interface Webhook {
  /**
   * Unique identifier for the webhook.
   */
  id: string;
  /**
   * The URL where the webhook payload will be sent.
   */
  url: string;
  /**
   * The secret used to sign and verify webhook payloads.
   */
  secret: string;
  /**
   * Optional metadata associated with the webhook.
   */
  metadata?: Record<string, any>;
}

/**
 * @interface WebhookRegistrationOptions
 * @description Options for registering a new webhook.
 */
export interface WebhookRegistrationOptions {
  /**
   * Optional metadata to associate with the webhook.
   */
  metadata?: Record<string, any>;
}

/**
 * @interface WebhookSendOptions
 * @description Options for sending a webhook, including retry logic configuration.
 */
export interface WebhookSendOptions {
  /**
   * The maximum number of retry attempts for sending the webhook.
   * Defaults to 3.
   */
  maxRetries?: number;
  /**
   * The initial delay in milliseconds before the first retry.
   * Defaults to 1000 (1 second).
   */
  initialRetryDelayMs?: number;
  /**
   * The backoff factor for exponential retry delays. E.g., 2 for 1s, 2s, 4s, 8s...
   * Defaults to 2.
   */
  retryBackoffFactor?: number;
}

/**
 * @class WebhookService
 * @description Provides functionalities for webhook registration, HMAC signature verification, and sending webhooks with retry logic.
 */
export class WebhookService {
  private registeredWebhooks: Map<string, Webhook> = new Map();

  /**
   * Registers a new webhook.
   * @param url The URL where the webhook payload will be sent.
   * @param secret The secret key used for HMAC signature generation and verification.
   * @param options Optional registration options.
   * @returns The registered Webhook object.
   */
  public registerWebhook(url: string, secret: string, options?: WebhookRegistrationOptions): Webhook {
    if (!url || !secret) {
      throw new Error('Webhook URL and secret are required.');
    }

    const id = crypto.randomBytes(16).toString('hex');
    const newWebhook: Webhook = {
      id,
      url,
      secret,
      metadata: options?.metadata,
    };
    this.registeredWebhooks.set(id, newWebhook);
    return newWebhook;
  }

  /**
   * Retrieves a registered webhook by its ID.
   * @param id The ID of the webhook to retrieve.
   * @returns The Webhook object if found, otherwise undefined.
   */
  public getWebhook(id: string): Webhook | undefined {
    return this.registeredWebhooks.get(id);
  }

  /**
   * Verifies the HMAC SHA256 signature of a webhook payload.
   * @param payload The raw payload string received from the webhook.
   * @param signature The signature string, typically from a request header (e.g., 'sha256=...');
   * @param secret The secret key used to generate the expected signature.
   * @returns True if the signature is valid, false otherwise.
   */
  public verifySignature(payload: string, signature: string, secret: string): boolean {
    if (!payload || !signature || !secret) {
      return false;
    }

    const [algorithm, hash] = signature.split('=');
    if (algorithm !== 'sha256' || !hash) {
      return false; // Only SHA256 is supported, or signature format is incorrect
    }

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const expectedHash = hmac.digest('hex');

    // Use crypto.timingSafeEqual to prevent timing attacks
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash));
  }

  /**
   * Sends a webhook payload to the specified URL with retry logic.
   * @param webhook The webhook object containing URL and secret.
   * @param payload The data to send in the webhook body. Will be JSON.stringified.
   * @param options Optional sending options, including retry configuration.
   * @throws Error if the webhook sending fails after all retries.
   */
  public async sendWebhook(webhook: Webhook, payload: any, options?: WebhookSendOptions): Promise<void> {
    const maxRetries = options?.maxRetries ?? 3;
    let currentDelay = options?.initialRetryDelayMs ?? 1000; // 1 second
    const retryBackoffFactor = options?.retryBackoffFactor ?? 2;

    const payloadString = JSON.stringify(payload);
    const signature = `sha256=${this.generateHmacSignature(payloadString, webhook.secret)}`;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Hub-Signature-256': signature,
          },
          body: payloadString,
        });

        if (!response.ok) {
          throw new Error(`Webhook delivery failed with status: ${response.status} ${response.statusText}`);
        }
        console.log(`Webhook successfully delivered to ${webhook.url} on attempt ${attempt + 1}`);
        return; // Success
      } catch (error: any) {
        console.warn(`Attempt ${attempt + 1} failed for webhook ${webhook.url}: ${error.message}`);
        if (attempt < maxRetries) {
          console.log(`Retrying in ${currentDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, currentDelay));
          currentDelay *= retryBackoffFactor;
        } else {
          throw new Error(`Failed to deliver webhook to ${webhook.url} after ${maxRetries + 1} attempts: ${error.message}`);
        }
      }
    }
  }

  /**
   * Generates an HMAC SHA256 signature for a given payload and secret.
   * @param payload The raw payload string to sign.
   * @param secret The secret key to use for signing.
   * @returns The HMAC SHA256 signature in hexadecimal format.
   */
  private generateHmacSignature(payload: string, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    return hmac.digest('hex');
  }
}
