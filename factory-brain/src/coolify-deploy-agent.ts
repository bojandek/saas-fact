// @ts-nocheck
import axios from 'axios';
import { logger } from './utils/logger'

interface DeploymentConfig {
  appName: string;
  gitRepository: string;
  branch: string;
  environment: 'staging' | 'production';
  domain?: string;
}

interface DeploymentResult {
  deploymentId: string;
  status: 'pending' | 'in_progress' | 'success' | 'failed';
  message: string;
  url?: string;
}

export class CoolifyDeployAgent {
  private coolifyApiUrl: string;
  private coolifyApiKey: string;

  constructor() {
    this.coolifyApiUrl = process.env.COOLIFY_API_URL || 'https://coolify.io/api';
    this.coolifyApiKey = process.env.COOLIFY_API_KEY || '';
  }

  async deployApplication(config: DeploymentConfig): Promise<DeploymentResult> {
    if (!this.coolifyApiKey) {
      throw new Error('COOLIFY_API_KEY is not configured');
    }

    try {
      // Step 1: Create a new application in Coolify
      const createAppResponse = await axios.post(
        `${this.coolifyApiUrl}/applications`,
        {
          name: config.appName,
          gitRepository: config.gitRepository,
          branch: config.branch,
          environment: config.environment,
          domain: config.domain,
        },
        {
          headers: {
            Authorization: `Bearer ${this.coolifyApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const deploymentId = createAppResponse.data.id;

      // Step 2: Trigger deployment
      const deployResponse = await axios.post(
        `${this.coolifyApiUrl}/applications/${deploymentId}/deploy`,
        {},
        {
          headers: {
            Authorization: `Bearer ${this.coolifyApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        deploymentId,
        status: 'in_progress',
        message: `Deployment of ${config.appName} started successfully`,
        url: deployResponse.data.url,
      };
    } catch (error: any) {
      logger.error('Coolify deployment error:', error);
      return {
        deploymentId: '',
        status: 'failed',
        message: `Failed to deploy: ${error.message}`,
      };
    }
  }

  async checkDeploymentStatus(deploymentId: string): Promise<DeploymentResult> {
    if (!this.coolifyApiKey) {
      throw new Error('COOLIFY_API_KEY is not configured');
    }

    try {
      const response = await axios.get(
        `${this.coolifyApiUrl}/applications/${deploymentId}`,
        {
          headers: {
            Authorization: `Bearer ${this.coolifyApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        deploymentId,
        status: response.data.status,
        message: response.data.message,
        url: response.data.url,
      };
    } catch (error: any) {
      logger.error('Coolify status check error:', error);
      return {
        deploymentId,
        status: 'failed',
        message: `Failed to check status: ${error.message}`,
      };
    }
  }

  async configureEnvironmentVariables(
    deploymentId: string,
    variables: Record<string, string>
  ): Promise<void> {
    if (!this.coolifyApiKey) {
      throw new Error('COOLIFY_API_KEY is not configured');
    }

    try {
      await axios.post(
        `${this.coolifyApiUrl}/applications/${deploymentId}/environment`,
        { variables },
        {
          headers: {
            Authorization: `Bearer ${this.coolifyApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error: any) {
      logger.error('Coolify environment configuration error:', error);
      throw new Error(`Failed to configure environment: ${error.message}`);
    }
  }
}
