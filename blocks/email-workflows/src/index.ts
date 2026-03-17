/**
 * @file src/index.ts
 * @description Minimal but functional TypeScript module for email-workflows block.
 */

import nodemailer from 'nodemailer';

/**
 * @interface EmailOptions
 * @description Defines the structure for email sending options.
 */
export interface EmailOptions {
  to: string | string[];
  from: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: any[];
}

/**
 * @interface EmailTemplate
 * @description Defines the structure for an email template.
 */
export interface EmailTemplate {
  name: string;
  subject: string;
  html: (data: any) => string;
  text?: (data: any) => string;
}

/**
 * @interface QueueItem
 * @description Defines the structure for an item in the retry queue.
 */
export interface QueueItem {
  options: EmailOptions;
  retries: number;
  lastAttempt: number;
}

/**
 * @class EmailService
 * @description Provides core email sending functionality, templating, and a retry queue.
 */
export class EmailService {
  private transporter: nodemailer.Transporter;
  private templates: Map<string, EmailTemplate> = new Map();
  private retryQueue: QueueItem[] = [];
  private maxRetries: number;
  private retryDelayMs: number;

  /**
   * @constructor
   * @param {nodemailer.TransportOptions} transportOptions - Nodemailer transport options.
   * @param {number} [maxRetries=3] - Maximum number of retries for failed emails.
   * @param {number} [retryDelayMs=5000] - Delay in milliseconds before retrying an email.
   */
  constructor(transportOptions: nodemailer.TransportOptions, maxRetries: number = 3, retryDelayMs: number = 5000) {
    this.transporter = nodemailer.createTransport(transportOptions);
    this.maxRetries = maxRetries;
    this.retryDelayMs = retryDelayMs;
    setInterval(() => this.processRetryQueue(), this.retryDelayMs);
  }

  /**
   * @method registerTemplate
   * @description Registers an email template with the service.
   * @param {EmailTemplate} template - The email template to register.
   */
  public registerTemplate(template: EmailTemplate): void {
    this.templates.set(template.name, template);
  }

  /**
   * @method sendTemplatedEmail
   * @description Sends an email using a registered template and provided data.
   * @param {string} templateName - The name of the registered template.
   * @param {string | string[]} to - The recipient(s) of the email.
   * @param {string} from - The sender of the email.
   * @param {any} data - The data to be used for rendering the template.
   * @returns {Promise<any>} A promise that resolves with the email sending result.
   */
  public async sendTemplatedEmail(templateName: string, to: string | string[], from: string, data: any): Promise<any> {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template \'${templateName}\' not found.`);
    }

    const emailOptions: EmailOptions = {
      to,
      from,
      subject: template.subject,
      html: template.html(data),
      text: template.text ? template.text(data) : undefined,
    };

    return this.sendEmail(emailOptions);
  }

  /**
   * @method sendEmail
   * @description Sends an email using the configured transporter, with retry logic.
   * @param {EmailOptions} options - The email options.
   * @returns {Promise<any>} A promise that resolves with the email sending result.
   */
  public async sendEmail(options: EmailOptions): Promise<any> {
    try {
      const info = await this.transporter.sendMail(options);
      console.log('Email sent: %s', info.messageId);
      return info;
    } catch (error) {
      console.error('Error sending email:', error);
      this.addToRetryQueue({ options, retries: 0, lastAttempt: Date.now() });
      throw error;
    }
  }

  /**
   * @private
   * @method addToRetryQueue
   * @description Adds a failed email to the retry queue.
   * @param {QueueItem} item - The queue item to add.
   */
  private addToRetryQueue(item: QueueItem): void {
    this.retryQueue.push(item);
    console.log(`Email added to retry queue. Retries left: ${this.maxRetries - item.retries}`);
  }

  /**
   * @private
   * @method processRetryQueue
   * @description Processes the retry queue, attempting to resend failed emails.
   */
  private async processRetryQueue(): Promise<void> {
    if (this.retryQueue.length === 0) {
      return;
    }

    const now = Date.now();
    const emailsToRetry = this.retryQueue.filter(item =>
      item.lastAttempt + this.retryDelayMs < now && item.retries < this.maxRetries
    );

    for (const item of emailsToRetry) {
      // Remove from queue before retrying to avoid duplicate processing if retry fails again
      this.retryQueue = this.retryQueue.filter(qItem => qItem !== item);

      try {
        console.log(`Retrying email to ${item.options.to} (attempt ${item.retries + 1}/${this.maxRetries})...`);
        await this.transporter.sendMail(item.options);
        console.log(`Successfully resent email to ${item.options.to}`);
      } catch (error) {
        console.error(`Failed to resend email to ${item.options.to}:`, error);
        item.retries++;
        item.lastAttempt = Date.now();
        if (item.retries < this.maxRetries) {
          this.addToRetryQueue(item); // Add back to queue for further retries
        } else {
          console.error(`Email to ${item.options.to} failed after ${this.maxRetries} attempts. Giving up.`);
        }
      }
    }
  }
}
