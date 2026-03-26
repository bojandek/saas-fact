'use client';

import { useState } from 'react';

interface LearningOutcome {
  id: string;
  timestamp: string;
  saasName: string;
  niche: string;
  scores: {
    architect: number;
    assembler: number;
    tests: number;
    deploy: boolean;
    userRating: number | null;
  };
  patterns: string[];
  improvements: string[];
  generation: number;
}

interface EvolutionCycle {
  generation: number;
  avgFitness: number;
  bestFitness: number;
  diversity: number;
  mutations: number;
  crossovers: number;
  timestamp: string;
  improvements: string[];
}

const SAMPLE_OUTCOMES: LearningOutcome[] = [
  {
    id: '1',
    timestamp: '2026-03-26 14:32',
    saasName: 'moj-gym',
    niche: 'teretana-crm',
    generation: 42,
    scores: { architect: 0.94, assembler: 0.88, tests: 1.0, deploy: true, userRating: 5 },
    patterns: ['RLS policy with org_id works well for gym niche', 'Calendar component reused from salon-booking'],
    improvements: ['Added stripe webhook retry logic', 'Fixed timezone handling in booking calendar'],
  },
  {
    id: '2',
    timestamp: '2026-03-26 11:15',
    saasName: 'beauty-hub',
    niche: 'salon-booking',
    generation: 41,
    scores: { architect: 0.91, assembler: 0.85, tests: 0.94, deploy: true, userRating: 4 },
    patterns: ['Appointment reminder email template is highly effective', 'SMS integration increases retention by 23%'],
    improvements: ['Improved mobile responsiveness on booking page', 'Added cancellation policy modal'],
  },
  {
    id: '3',
    timestamp: '2026-03-25 16:44',
    saasName: 'learn-hub',
    niche: 'online-course-platform',
    generation: 40,
    scores: { architect: 0.89, assembler: 0.92, tests: 0.89, deploy: true, userRating: null },
    patterns: ['Video player component can be shared across course niches', 'Progress tracking increases completion by 31%'],
    improvements: ['Fixed video upload size limit', 'Added bulk enrollment CSV import'],
  },
  {
    id: '4',
    timestamp: '2026-03-25 09:20',
    saasName: 'dev-ops',
    niche: 'project-management',
    generation: 39,
    scores: { architect: 0.96, assembler: 0.79, tests: 0.83, deploy: false, userRating: 3 },
    patterns: ['Kanban board component is complex — needs dedicated block'],
    improvements: ['Assembler failed on drag-and-drop implementation', 'Deploy failed: missing DATABASE_URL env var'],
  },
];

const EVOLUTION_HISTORY: EvolutionCycle[] = [
  { generation: 42, avgFitness: 0.87, bestFitness: 0.94, diversity: 0.72, mutations: 8, crossovers: 12, timestamp: '2026-03-26', improvements: ['Improved RLS policy templates', 'Better mobile responsiveness defaults'] },
  { generation: 41, avgFitness: 0.84, bestFitness: 0.91, diversity: 0.68, mutations: 6, crossovers: 9, timestamp: '2026-03-25', improvements: ['SMS integration pattern extracted', 'Email template library expanded'] },
  { generation: 40, avgFitness: 0.81, bestFitness: 0.92, diversity: 0.75, mutations: 11, crossovers: 14, timestamp: '2026-03-24', improvements: ['Video player component added to shared library', 'Progress tracking pattern extracted'] },
  { generation: 39, avgFitness: 0.76, bestFitness: 0.96, diversity: 0.81, mutations: 14, crossovers: 7, timestamp: '2026-03-23', improvements: ['Architect agent improved for complex schemas', 'Deploy checklist added'] },
  { generation: 38, avgFitness: 0.73, bestFitness: 0.88, diversity: 0.79, mutations: 9, crossovers: 11, timestamp: '2026-03-22', improvements: ['Payment flow simplified', 'Stripe webhook handling improved'] },
];

const LEARNED_PATTERNS = [
  { category: 'Architecture', count: 24, top: 'org_id RLS isolation pattern — used in 98% of apps' },
  { category: 'Components', count: 31, top: 'Calendar/booking component — reused across 7 niches' },
  { category: 'Email Templates', count: 12, top: 'Appointment reminder — 34% open rate avg' },
  { category: 'Error Fixes', count: 47, top: 'Timezone handling in booking — fixed in gen 38' },
  { category: 'Growth Tactics', count: 18, top: 'SMS reminders increase retention by 23%' },
  { category: 'Pricing Patterns', count: 9, top: 'Freemium → $29 → $79 works for SMB niches' },
];

export default function LearningPage() {
  const [activeTab, setActiveTab] = useState<'outcomes' | 'evolution' | 'patterns'>('outcomes');

  const avgFitness = EVOLUTION_HISTORY[0].avgFitness;
  const totalPatterns = LEARNED_PATTERNS.reduce((s, p) => s + p.count, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold gradient-text">MetaClaw Learning Loop</h2>
        <p className="text-slate-400 mt-1">Every generated SaaS improves the next — closed feedback loop with genetic evolution</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-emerald-400">42</p>
          <p className="text-xs text-slate-400 mt-1">Current Generation</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-cyan-400">{Math.round(avgFitness * 100)}%</p>
          <p className="text-xs text-slate-400 mt-1">Avg Fitness Score</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-blue-400">{totalPatterns}</p>
          <p className="text-xs text-slate-400 mt-1">Learned Patterns</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-purple-400">+18%</p>
          <p className="text-xs text-slate-400 mt-1">Quality Improvement (10 gen)</p>
        </div>
      </div>

      {/* How it works */}
      <div className="glass rounded-xl p-6">
        <h3 className="font-semibold text-slate-200 mb-4">How the Learning Loop Works</h3>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {[
            { icon: '🏭', label: 'Generate SaaS' },
            { icon: '→', label: '' },
            { icon: '📊', label: 'Collect Outcomes' },
            { icon: '→', label: '' },
            { icon: '🔍', label: 'Extract Patterns' },
            { icon: '→', label: '' },
            { icon: '🧬', label: 'MetaClaw Evolves' },
            { icon: '→', label: '' },
            { icon: '📚', label: 'Update Knowledge' },
            { icon: '→', label: '' },
            { icon: '✨', label: 'Better Next Gen' },
          ].map((step, i) => (
            step.label ? (
              <div key={i} className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-2">
                <span>{step.icon}</span>
                <span className="text-slate-300">{step.label}</span>
              </div>
            ) : (
              <span key={i} className="text-slate-600 text-lg">→</span>
            )
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-3">
          AutonomousLearningLoop collects TypeScript errors, test pass rates, deploy success, and user ratings.
          MetaClawEngine runs genetic crossover + mutation on the top 20% of genomes every 24h.
          Learned patterns are automatically injected into agent prompts for the next generation.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900/50 rounded-lg p-1 w-fit">
        {(['outcomes', 'evolution', 'patterns'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded text-sm font-medium capitalize transition-all ${
              activeTab === tab ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab === 'outcomes' ? '📋 Generation Outcomes' : tab === 'evolution' ? '🧬 Evolution History' : '🔍 Learned Patterns'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'outcomes' && (
        <div className="space-y-3">
          {SAMPLE_OUTCOMES.map(outcome => (
            <div key={outcome.id} className="glass rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-slate-200">{outcome.saasName}</h4>
                    <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">{outcome.niche}</span>
                    <span className="text-xs text-slate-500">Gen {outcome.generation}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{outcome.timestamp}</p>
                </div>
                <div className="flex items-center gap-3">
                  {outcome.scores.deploy ? (
                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Deployed
                    </span>
                  ) : (
                    <span className="text-xs text-red-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Deploy Failed
                    </span>
                  )}
                  {outcome.scores.userRating && (
                    <span className="text-xs text-yellow-400">{'★'.repeat(outcome.scores.userRating)}</span>
                  )}
                </div>
              </div>

              {/* Score bars */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                {[
                  { label: 'Architect', score: outcome.scores.architect },
                  { label: 'Assembler', score: outcome.scores.assembler },
                  { label: 'Tests', score: outcome.scores.tests },
                ].map(s => (
                  <div key={s.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">{s.label}</span>
                      <span className={s.score >= 0.9 ? 'text-emerald-400' : s.score >= 0.8 ? 'text-yellow-400' : 'text-red-400'}>
                        {Math.round(s.score * 100)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${s.score >= 0.9 ? 'bg-emerald-400' : s.score >= 0.8 ? 'bg-yellow-400' : 'bg-red-400'}`}
                        style={{ width: `${s.score * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Patterns & Improvements */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-slate-500 mb-1">Patterns extracted:</p>
                  {outcome.patterns.map((p, i) => (
                    <p key={i} className="text-slate-400 flex items-start gap-1">
                      <span className="text-cyan-500 shrink-0">+</span>{p}
                    </p>
                  ))}
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Improvements applied:</p>
                  {outcome.improvements.map((imp, i) => (
                    <p key={i} className="text-slate-400 flex items-start gap-1">
                      <span className="text-emerald-500 shrink-0">✓</span>{imp}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'evolution' && (
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Generation</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Avg Fitness</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Best Fitness</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Diversity</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Mutations</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Key Improvements</th>
              </tr>
            </thead>
            <tbody>
              {EVOLUTION_HISTORY.map((cycle, i) => (
                <tr key={cycle.generation} className={`border-b border-slate-800/50 ${i === 0 ? 'bg-cyan-900/10' : 'hover:bg-slate-800/30'}`}>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${i === 0 ? 'text-cyan-400' : 'text-slate-300'}`}>
                      Gen {cycle.generation} {i === 0 && '← current'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cycle.avgFitness >= 0.85 ? 'text-emerald-400' : 'text-yellow-400'}>
                      {Math.round(cycle.avgFitness * 100)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{Math.round(cycle.bestFitness * 100)}%</td>
                  <td className="px-4 py-3 text-slate-300">{Math.round(cycle.diversity * 100)}%</td>
                  <td className="px-4 py-3 text-slate-400">{cycle.mutations} mut / {cycle.crossovers} cross</td>
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      {cycle.improvements.map((imp, j) => (
                        <p key={j} className="text-xs text-slate-400">{imp}</p>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'patterns' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {LEARNED_PATTERNS.map(pattern => (
            <div key={pattern.category} className="glass rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-slate-200">{pattern.category}</h4>
                <span className="text-2xl font-bold text-cyan-400">{pattern.count}</span>
              </div>
              <p className="text-xs text-slate-400">Top pattern: <span className="text-slate-300">{pattern.top}</span></p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
