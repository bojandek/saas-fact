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
export declare class CoolifyDeployAgent {
    private coolifyApiUrl;
    private coolifyApiKey;
    constructor();
    deployApplication(config: DeploymentConfig): Promise<DeploymentResult>;
    checkDeploymentStatus(deploymentId: string): Promise<DeploymentResult>;
    configureEnvironmentVariables(deploymentId: string, variables: Record<string, string>): Promise<void>;
}
export {};
//# sourceMappingURL=coolify-deploy-agent.d.ts.map