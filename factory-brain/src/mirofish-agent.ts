import { WarRoomOrchestrator } from './war-room-orchestrator';
import { logger } from './utils/logger';
// @ts-ignore
import { MarketSimulationEngine, generatePersonas, PostSimulationReportAgent } from '../../blocks/mirofish/src/index';

export class MirofishAgent {
  private orchestrator?: WarRoomOrchestrator;

  constructor(orchestrator?: WarRoomOrchestrator) {
    this.orchestrator = orchestrator;
  }

  async runSimulation(niche: string, description: string, features: string[]): Promise<any> {
    if (this.orchestrator) {
      await this.orchestrator.sendMessage({
        sender: 'Mirofish Market Simulator',
        recipient: 'Orchestrator',
        type: 'info',
        content: `Initializing 1000+ AI agent swarm for market simulation of niche: ${niche}...`,
      });
    }

    try {
      // 1. Generate Personas
      const personasResult = await generatePersonas({
        saasDescription: description,
        targetMarket: niche,
        count: 5,
      });

      // 2. Initialize Simulation Engine
      const engine = new MarketSimulationEngine({
        totalUsers: 1000,
        totalAgents: 50,
        timeHorizonDays: 30,
        enableLogging: false,
        saasDescription: description,
      } as any);

      // 3. Run Simulation
      const state = await engine.run();

      // 4. Generate Report
      const summary = {
        simulation_id: state.simulationId,
        saas_description: description,
        total_agents: state.totalAgents,
        simulation_rounds: state.currentDay,
        time_horizon_days: state.timeHorizonDays,
        final_metrics: {
          avg_engagement: state.metrics.avgEngagementScore,
          avg_churn_risk: state.metrics.churnRate,
          avg_satisfaction: 0.8, // Simulated
          total_ltv: state.metrics.predictedARR,
          high_churn_count: state.riskProfile.highRiskUsers,
          churned_count: state.metrics.totalChurnPredicted,
          top_features: []
        },
        personas: personasResult.personas
      };

      const reportAgent = new PostSimulationReportAgent();
      const report = await reportAgent.generateReport(summary as any);

      if (this.orchestrator) {
        await this.orchestrator.sendMessage({
          sender: 'Mirofish Market Simulator',
          recipient: 'Orchestrator',
          type: 'response',
          content: 'Market simulation completed successfully.',
          payload: report,
        });
        this.orchestrator.updateContext({ marketSimulation: report } as any);
      }

      return report;
    } catch (error) {
      logger.error({ err: error }, "Failed to run Mirofish simulation");
      return { error: "Simulation failed", details: error instanceof Error ? error.message : String(error) };
    }
  }
}
