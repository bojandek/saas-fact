'use client';

import { useState } from 'react';

interface EvolutionCycle {
  generation: number;
  status: 'Running' | 'Completed' | 'Pending';
  startTime: string;
  duration: string;
  improvements: number[];
  topMutations: {
    appId: string;
    appName: string;
    mutation: string;
    expectedImprovement: number;
  }[];
  successRate: number;
}

export default function EvolutionPage() {
  const [cycles] = useState<EvolutionCycle[]>([
    {
      generation: 42,
      status: 'Running',
      startTime: '2 hours ago',
      duration: '2h 15m remaining',
      improvements: [15, 18, 12, 22, 19],
      topMutations: [
        {
          appId: 'dent-pro',
          appName: 'DentistPro',
          mutation: 'Enable multi-layer caching (Redis + CDN)',
          expectedImprovement: 25,
        },
        {
          appId: 'truck-logistics',
          appName: 'TruckLogistics',
          mutation: 'Optimize database indices (3 new)',
          expectedImprovement: 18,
        },
        {
          appId: 'lawyer-bot',
          appName: 'LawyerBot',
          mutation: 'Switch caching strategy to GraphQL subscriptions',
          expectedImprovement: 22,
        },
      ],
      successRate: 87.5,
    },
    {
      generation: 41,
      status: 'Completed',
      startTime: '26 hours ago',
      duration: '24h 18m',
      improvements: [12, 14, 16, 13, 11],
      topMutations: [
        {
          appId: 'design-assist',
          appName: 'DesignAssist',
          mutation: 'Implement rate limiting (Upstash)',
          expectedImprovement: 14,
        },
        {
          appId: 'ai-tutor',
          appName: 'AI Tutor',
          mutation: 'Add feature flags for A/B testing',
          expectedImprovement: 16,
        },
      ],
      successRate: 92.3,
    },
    {
      generation: 40,
      status: 'Completed',
      startTime: '50 hours ago',
      duration: '24h 22m',
      improvements: [18, 19, 17, 20, 16],
      topMutations: [
        {
          appId: 'marketing-suite',
          appName: 'MarketingSuite',
          mutation: 'Implement webhook system with retries',
          expectedImprovement: 19,
        },
      ],
      successRate: 88.7,
    },
  ]);

  const currentCycle = cycles[0];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <section className="space-y-2">
        <h2 className="text-3xl font-bold flex items-center gap-2">
          <span>🧬</span> MetaClaw Evolution System
        </h2>
        <p className="text-slate-400">
          Real-time genetic algorithm optimization of your SaaS ecosystem
        </p>
      </section>

      {/* Current Generation */}
      <section className="glass-hover rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Generation {currentCycle.generation}</h3>
          <span className="status-badge status-healthy animate-pulse">
            ⚡ {currentCycle.status}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Cycle Progress</span>
            <span className="text-cyan-400 font-medium">67%</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
              style={{ width: '67%' }}></div>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-cyan-400">87.5%</p>
            <p className="text-xs text-slate-400 mt-1">Success Rate</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-400">+18%</p>
            <p className="text-xs text-slate-400 mt-1">Avg Improvement</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-400">142</p>
            <p className="text-xs text-slate-400 mt-1">Active Neurons</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-400">2h 15m</p>
            <p className="text-xs text-slate-400 mt-1">Remaining</p>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="mt-6 pt-6 border-t border-slate-800 space-y-3">
          <p className="text-sm font-medium text-slate-300 mb-3">Cycle Status</p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span>
              <span className="text-slate-300">Population evaluated (142 genomes)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span>
              <span className="text-slate-300">Elite selection completed (top 20%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-cyan-400">⏳</span>
              <span className="text-slate-300">Mutation phase (67% complete)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">⏸</span>
              <span className="text-slate-400">Crossover phase (pending)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">⏸</span>
              <span className="text-slate-400">Recommendations (pending)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Top Mutations */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span>🔀</span> Top Mutations This Generation
        </h3>

        <div className="space-y-3">
          {currentCycle.topMutations.map((mutation, idx) => (
            <div key={idx} className="glass-hover rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-cyan-400">{mutation.appName}</p>
                  <p className="text-sm text-slate-300 mt-1">{mutation.mutation}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-emerald-400">
                    +{mutation.expectedImprovement}%
                  </p>
                </div>
              </div>

              {/* Progress indicator */}
              <div className="h-1 w-full bg-slate-800 rounded-full mt-3">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${mutation.expectedImprovement}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Fitness Chart */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span>📈</span> Fitness Improvement Trend
        </h3>

        <div className="glass-hover rounded-lg p-6">
          <div className="space-y-2">
            <p className="text-xs text-slate-400 uppercase mb-4">Generations</p>

            {/* Simple bar chart */}
            {cycles.map((cycle, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="text-sm font-medium w-20 text-slate-400">
                  Gen {cycle.generation}
                </span>
                <div className="flex-1 flex gap-1 h-8 bg-slate-800/30 rounded p-1">
                  {cycle.improvements.map((imp, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-gradient-to-t from-cyan-500 to-cyan-400 rounded"
                      style={{
                        height: `${(imp / 25) * 100}%`,
                        transition: 'all 0.3s ease',
                      }}
                      title={`${imp}% improvement`}
                    ></div>
                  ))}
                </div>
                <span className="text-sm font-medium text-emerald-400 w-12">
                  {cycle.successRate}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Previous Generations */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span>📚</span> Previous Generations
        </h3>

        <div className="space-y-3">
          {cycles.slice(1).map((cycle) => (
            <div key={cycle.generation} className="glass-hover rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold">Generation {cycle.generation}</p>
                <p className="text-sm text-slate-400 mt-1">{cycle.duration}</p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-sm text-slate-300">
                  <span className="text-emerald-400 font-semibold">{cycle.successRate}%</span> Success Rate
                </p>
                <p className="text-xs text-slate-400">
                  {cycle.status}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Actions */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button className="glass-hover rounded-lg p-4 text-left group">
          <h4 className="font-semibold group-hover:text-cyan-400 transition-colors mb-2">
            ⏸ Pause Cycle
          </h4>
          <p className="text-sm text-slate-400">Pause the current evolution cycle</p>
        </button>

        <button className="glass-hover rounded-lg p-4 text-left group">
          <h4 className="font-semibold group-hover:text-cyan-400 transition-colors mb-2">
            🎯 Apply All Mutations
          </h4>
          <p className="text-sm text-slate-400">Deploy all suggested mutations immediately</p>
        </button>

        <button className="glass-hover rounded-lg p-4 text-left group">
          <h4 className="font-semibold group-hover:text-cyan-400 transition-colors mb-2">
            📊 View Detailed Metrics
          </h4>
          <p className="text-sm text-slate-400">Analyze fitness scores per app</p>
        </button>

        <button className="glass-hover rounded-lg p-4 text-left group">
          <h4 className="font-semibold group-hover:text-cyan-400 transition-colors mb-2">
            🔧 Evolution Settings
          </h4>
          <p className="text-sm text-slate-400">Configure mutation rates and parameters</p>
        </button>
      </section>
    </div>
  );
}
