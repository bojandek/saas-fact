"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoolifyDeployAgent = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("./utils/logger");
class CoolifyDeployAgent {
    constructor() {
        this.coolifyApiUrl = process.env.COOLIFY_API_URL || 'https://coolify.io/api';
        this.coolifyApiKey = process.env.COOLIFY_API_KEY || '';
    }
    async deployApplication(config) {
        if (!this.coolifyApiKey) {
            throw new Error('COOLIFY_API_KEY is not configured');
        }
        try {
            // Step 1: Create a new application in Coolify
            const createAppResponse = await axios_1.default.post(`${this.coolifyApiUrl}/applications`, {
                name: config.appName,
                gitRepository: config.gitRepository,
                branch: config.branch,
                environment: config.environment,
                domain: config.domain,
            }, {
                headers: {
                    Authorization: `Bearer ${this.coolifyApiKey}`,
                    'Content-Type': 'application/json',
                },
            });
            const deploymentId = createAppResponse.data.id;
            // Step 2: Trigger deployment
            const deployResponse = await axios_1.default.post(`${this.coolifyApiUrl}/applications/${deploymentId}/deploy`, {}, {
                headers: {
                    Authorization: `Bearer ${this.coolifyApiKey}`,
                    'Content-Type': 'application/json',
                },
            });
            return {
                deploymentId,
                status: 'in_progress',
                message: `Deployment of ${config.appName} started successfully`,
                url: deployResponse.data.url,
            };
        }
        catch (error) {
            logger_1.logger.error('Coolify deployment error:', error);
            return {
                deploymentId: '',
                status: 'failed',
                message: `Failed to deploy: ${error.message}`,
            };
        }
    }
    async checkDeploymentStatus(deploymentId) {
        if (!this.coolifyApiKey) {
            throw new Error('COOLIFY_API_KEY is not configured');
        }
        try {
            const response = await axios_1.default.get(`${this.coolifyApiUrl}/applications/${deploymentId}`, {
                headers: {
                    Authorization: `Bearer ${this.coolifyApiKey}`,
                    'Content-Type': 'application/json',
                },
            });
            return {
                deploymentId,
                status: response.data.status,
                message: response.data.message,
                url: response.data.url,
            };
        }
        catch (error) {
            logger_1.logger.error('Coolify status check error:', error);
            return {
                deploymentId,
                status: 'failed',
                message: `Failed to check status: ${error.message}`,
            };
        }
    }
    async configureEnvironmentVariables(deploymentId, variables) {
        if (!this.coolifyApiKey) {
            throw new Error('COOLIFY_API_KEY is not configured');
        }
        try {
            await axios_1.default.post(`${this.coolifyApiUrl}/applications/${deploymentId}/environment`, { variables }, {
                headers: {
                    Authorization: `Bearer ${this.coolifyApiKey}`,
                    'Content-Type': 'application/json',
                },
            });
        }
        catch (error) {
            logger_1.logger.error('Coolify environment configuration error:', error);
            throw new Error(`Failed to configure environment: ${error.message}`);
        }
    }
}
exports.CoolifyDeployAgent = CoolifyDeployAgent;
//# sourceMappingURL=coolify-deploy-agent.js.map