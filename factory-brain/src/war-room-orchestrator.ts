import OpenAI from 'openai';

interface AgentMessage {
  sender: string;
  recipient: string;
  type: 'request' | 'response' | 'info' | 'decision';
  content: string;
  payload?: any; // Optional data related to the message
}

interface AgentContext {
  saasDescription: string;
  appName: string;
  theme?: any;
  blueprint?: any;
  landingPage?: any;
  growthPlan?: any;
  complianceChecks?: any;
  // Add other shared context data here
}

export class WarRoomOrchestrator {
  private openai: OpenAI;
  private messageLog: AgentMessage[] = [];
  private context: AgentContext;

  constructor(initialContext: AgentContext) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.context = initialContext;
  }

  async sendMessage(message: AgentMessage): Promise<void> {
    this.messageLog.push(message);
    console.log(`[${message.sender} -> ${message.recipient}]: ${message.content}`);
    // In a real implementation, this would trigger the recipient agent's handler
    // For now, we just log and can later use this log for AI analysis
  }

  getMessageLog(): AgentMessage[] {
    return this.messageLog;
  }

  updateContext(newContext: Partial<AgentContext>): void {
    this.context = { ...this.context, ...newContext };
  }

  getContext(): AgentContext {
    return this.context;
  }

  async orchestrateRound(agents: any[]): Promise<void> {
    // This is a simplified orchestration round.
    // In a full implementation, agents would have specific roles and respond to messages.
    // For now, we simulate a round where agents process the current context and potentially update it.

    for (const agent of agents) {
      console.log(`\n--- Agent ${agent.name} is thinking ---`);
      // Simulate agent processing and potential context update
      // Each agent would have a method like `processContext(context, orchestrator)`
      // For now, we'll just have them log their 
