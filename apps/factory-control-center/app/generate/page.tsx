'use client';

import { useState, useRef, useEffect } from 'react';

const NICHES = [
  { value: 'teretana-crm', label: 'Teretana CRM' },
  { value: 'salon-booking', label: 'Salon Booking' },
  { value: 'online-course-platform', label: 'Online Course Platform' },
  { value: 'clinic-management', label: 'Clinic Management' },
  { value: 'hotel-management', label: 'Hotel Management' },
  { value: 'freelancer-crm', label: 'Freelancer CRM' },
  { value: 'restaurant-management', label: 'Restaurant Management' },
  { value: 'project-management', label: 'Project Management' },
  { value: 'hr-management', label: 'HR Management' },
  { value: 'email-marketing', label: 'Email Marketing' },
  { value: 'property-management', label: 'Property Management' },
  { value: 'accounting-saas', label: 'Accounting SaaS' },
  { value: 'law-firm-crm', label: 'Law Firm CRM' },
  { value: 'ats-recruiting', label: 'ATS / Recruiting' },
  { value: 'subscription-box', label: 'Subscription Box' },
  { value: 'tutoring-platform', label: 'Tutoring Platform' },
  { value: 'yoga-studio', label: 'Yoga Studio' },
  { value: 'online-store', label: 'Online Store' },
  { value: 'custom', label: 'Custom (describe below)' },
];

const STYLES = [
  { value: 'apple', label: '🍎 Apple — Clean, #007AFF, SF Pro' },
  { value: 'minimalist', label: '⬜ Minimalist — Whitespace, monochrome' },
  { value: 'corporate', label: '🏢 Corporate — Navy blue, enterprise' },
  { value: 'linear', label: '⚫ Linear — Dark mode, developer-first' },
  { value: 'elegant', label: '✨ Elegant — Serif, gold accents' },
  { value: 'playful', label: '🎨 Playful — Rounded, vibrant purple' },
  { value: 'cyberpunk', label: '🌐 Cyberpunk — Neon, dark, zero radius' },
  { value: 'brutalism', label: '🔲 Brutalism — Bold borders, flat' },
  { value: 'auto', label: '🤖 Auto — AI picks best for niche' },
];

interface LogLine {
  id: number;
  time: string;
  agent: string;
  type: 'info' | 'success' | 'error' | 'warning' | 'thinking';
  message: string;
}

interface AgentStatus {
  name: string;
  status: 'idle' | 'running' | 'done' | 'error';
  icon: string;
}

const AGENTS: AgentStatus[] = [
  { name: 'ThemeAgent', status: 'idle', icon: '🎨' },
  { name: 'ArchitectAgent', status: 'idle', icon: '🏗️' },
  { name: 'AssemblerAgent', status: 'idle', icon: '⚙️' },
  { name: 'GrowthHackerAgent', status: 'idle', icon: '📈' },
  { name: 'ComplianceAgent', status: 'idle', icon: '🛡️' },
  { name: 'QAAgent', status: 'idle', icon: '🧪' },
  { name: 'LegalAgent', status: 'idle', icon: '⚖️' },
  { name: 'PricingAgent', status: 'idle', icon: '💰' },
];

export default function GeneratePage() {
  const [niche, setNiche] = useState('teretana-crm');
  const [appName, setAppName] = useState('');
  const [style, setStyle] = useState('auto');
  const [color, setColor] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [agents, setAgents] = useState<AgentStatus[]>(AGENTS);
  const [generatedAppUrl, setGeneratedAppUrl] = useState<string | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const logIdRef = useRef(0);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (agent: string, type: LogLine['type'], message: string) => {
    const now = new Date();
    const time = now.toLocaleTimeString('en-GB', { hour12: false });
    setLogs(prev => [...prev, { id: logIdRef.current++, time, agent, type, message }]);
  };

  const updateAgent = (name: string, status: AgentStatus['status']) => {
    setAgents(prev => prev.map(a => a.name === name ? { ...a, status } : a));
  };

  const simulateGeneration = async () => {
    setIsGenerating(true);
    setIsDone(false);
    setLogs([]);
    setAgents(AGENTS.map(a => ({ ...a, status: 'idle' })));
    setGeneratedAppUrl(null);

    const selectedNiche = niche === 'custom' ? customDescription : niche;
    const finalName = appName || selectedNiche.replace(/-/g, '_');

    addLog('Orchestrator', 'info', `Starting SaaS generation pipeline for "${finalName}"`);
    addLog('Orchestrator', 'info', `Niche: ${selectedNiche} | Style: ${style} | Color: ${color || 'auto'}`);
    await delay(600);

    // ThemeAgent
    updateAgent('ThemeAgent', 'running');
    addLog('ThemeAgent', 'thinking', `Selecting design system for "${selectedNiche}"...`);
    await delay(800);
    const resolvedStyle = style === 'auto' ? 'corporate' : style;
    addLog('ThemeAgent', 'success', `Generated "${resolvedStyle}" theme — primary: ${color || '#1e3a8a'}, mode: light`);
    addLog('ThemeAgent', 'info', `Applied Apple HIG principles: 8pt grid, shadow-sm cards, WCAG AA contrast`);
    updateAgent('ThemeAgent', 'done');
    await delay(400);

    // ArchitectAgent
    updateAgent('ArchitectAgent', 'running');
    addLog('ArchitectAgent', 'thinking', `Designing multi-tenant PostgreSQL schema for "${selectedNiche}"...`);
    await delay(1200);
    addLog('ArchitectAgent', 'info', `Mapped niche to blocks: auth, payments, calendar, notifications, analytics`);
    addLog('ArchitectAgent', 'success', `Generated SQL schema: 8 tables, RLS policies, org_id isolation`);
    addLog('ArchitectAgent', 'success', `Generated OpenAPI spec: 24 endpoints, JWT auth, rate limiting`);
    updateAgent('ArchitectAgent', 'done');
    await delay(400);

    // Parallel: Assembler + Growth + Compliance + Legal + Pricing
    addLog('Orchestrator', 'info', `Launching 5 agents in parallel...`);
    await delay(300);

    updateAgent('AssemblerAgent', 'running');
    updateAgent('GrowthHackerAgent', 'running');
    updateAgent('ComplianceAgent', 'running');
    updateAgent('LegalAgent', 'running');
    updateAgent('PricingAgent', 'running');

    addLog('AssemblerAgent', 'thinking', `Generating Next.js 14 app with App Router...`);
    addLog('GrowthHackerAgent', 'thinking', `Researching "${selectedNiche}" market trends (last 30 days)...`);
    addLog('ComplianceAgent', 'thinking', `Running GDPR + HIPAA compliance check...`);
    addLog('LegalAgent', 'thinking', `Drafting Terms of Service and Privacy Policy...`);
    addLog('PricingAgent', 'thinking', `Analyzing pricing models for "${selectedNiche}"...`);
    await delay(1500);

    addLog('AssemblerAgent', 'info', `Generated: layout.tsx, sidebar.tsx, dashboard/page.tsx`);
    addLog('GrowthHackerAgent', 'info', `Found 12 trending topics on Reddit r/${selectedNiche.replace(/-/g, '')}`);
    addLog('ComplianceAgent', 'info', `GDPR: ✓ consent banner, ✓ data deletion endpoint, ✓ audit log`);
    addLog('LegalAgent', 'info', `Generated ToS (2,400 words) and Privacy Policy (1,800 words)`);
    addLog('PricingAgent', 'info', `Recommended: Freemium → Starter ($29) → Pro ($79) → Enterprise (custom)`);
    await delay(1200);

    addLog('AssemblerAgent', 'info', `Generated: auth/login.tsx, billing/page.tsx, settings/page.tsx`);
    addLog('GrowthHackerAgent', 'success', `Growth plan: 90-day SEO roadmap, 12 email sequences, 30 social posts`);
    addLog('ComplianceAgent', 'success', `Compliance score: 94/100 — 2 recommendations added to README`);
    addLog('LegalAgent', 'success', `Legal documents saved to docs/terms-of-service.md and docs/privacy-policy.md`);
    addLog('PricingAgent', 'success', `Pricing page generated with 3 tiers, feature comparison table, annual discount`);

    updateAgent('GrowthHackerAgent', 'done');
    updateAgent('ComplianceAgent', 'done');
    updateAgent('LegalAgent', 'done');
    updateAgent('PricingAgent', 'done');
    await delay(800);

    addLog('AssemblerAgent', 'success', `Generated 47 components, 12 pages, tailwind.config.ts with design tokens`);
    updateAgent('AssemblerAgent', 'done');
    await delay(400);

    // QA
    updateAgent('QAAgent', 'running');
    addLog('QAAgent', 'thinking', `Running Playwright e2e tests...`);
    await delay(1000);
    addLog('QAAgent', 'info', `Tests: auth flow ✓, payments ✓, tenant isolation ✓, booking flow ✓`);
    addLog('QAAgent', 'success', `18/18 tests passed — 0 TypeScript errors`);
    updateAgent('QAAgent', 'done');
    await delay(400);

    // Done
    addLog('Orchestrator', 'success', `✅ Generation complete! App "${finalName}" is ready.`);
    addLog('Orchestrator', 'info', `Output: apps/${finalName}/ — Run: cd apps/${finalName} && pnpm dev`);
    
    setGeneratedAppUrl(`apps/${finalName}`);
    setIsDone(true);
    setIsGenerating(false);
  };

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  const logTypeColor: Record<LogLine['type'], string> = {
    info: 'text-slate-300',
    success: 'text-emerald-400',
    error: 'text-red-400',
    warning: 'text-yellow-400',
    thinking: 'text-cyan-400',
  };

  const agentStatusColor: Record<AgentStatus['status'], string> = {
    idle: 'text-slate-500',
    running: 'text-cyan-400 animate-pulse',
    done: 'text-emerald-400',
    error: 'text-red-400',
  };

  const agentStatusDot: Record<AgentStatus['status'], string> = {
    idle: 'bg-slate-600',
    running: 'bg-cyan-400 animate-pulse',
    done: 'bg-emerald-400',
    error: 'bg-red-400',
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold gradient-text">Generate New SaaS</h2>
        <p className="text-slate-400 mt-1">Configure your SaaS and watch all agents work in real time</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Config Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass rounded-xl p-6 space-y-5">
            <h3 className="font-semibold text-slate-200">Configuration</h3>

            {/* Niche */}
            <div>
              <label className="block text-sm text-slate-400 mb-1">Niche</label>
              <select
                value={niche}
                onChange={e => setNiche(e.target.value)}
                disabled={isGenerating}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                {NICHES.map(n => (
                  <option key={n.value} value={n.value}>{n.label}</option>
                ))}
              </select>
            </div>

            {/* Custom description */}
            {niche === 'custom' && (
              <div>
                <label className="block text-sm text-slate-400 mb-1">Custom Description</label>
                <textarea
                  value={customDescription}
                  onChange={e => setCustomDescription(e.target.value)}
                  disabled={isGenerating}
                  rows={3}
                  placeholder="e.g. A SaaS for managing dog grooming salons..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>
            )}

            {/* App Name */}
            <div>
              <label className="block text-sm text-slate-400 mb-1">App Name <span className="text-slate-500">(optional)</span></label>
              <input
                type="text"
                value={appName}
                onChange={e => setAppName(e.target.value)}
                disabled={isGenerating}
                placeholder="e.g. moj-gym"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Style */}
            <div>
              <label className="block text-sm text-slate-400 mb-1">Visual Style</label>
              <select
                value={style}
                onChange={e => setStyle(e.target.value)}
                disabled={isGenerating}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                {STYLES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm text-slate-400 mb-1">Brand Color <span className="text-slate-500">(optional)</span></label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={color || '#1e3a8a'}
                  onChange={e => setColor(e.target.value)}
                  disabled={isGenerating}
                  className="w-10 h-10 rounded cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  disabled={isGenerating}
                  placeholder="#1e3a8a"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={simulateGeneration}
              disabled={isGenerating || (niche === 'custom' && !customDescription)}
              className="w-full py-3 rounded-lg font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20"
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⚙️</span> Generating...
                </span>
              ) : isDone ? '🔄 Generate Another' : '🚀 Generate SaaS'}
            </button>

            {isDone && generatedAppUrl && (
              <div className="bg-emerald-900/30 border border-emerald-500/30 rounded-lg p-3 text-sm">
                <p className="text-emerald-400 font-semibold">✅ Ready!</p>
                <p className="text-slate-300 mt-1 font-mono text-xs">cd {generatedAppUrl} && pnpm dev</p>
              </div>
            )}
          </div>

          {/* Agent Status Panel */}
          <div className="glass rounded-xl p-6">
            <h3 className="font-semibold text-slate-200 mb-4">Agent Status</h3>
            <div className="space-y-2">
              {agents.map(agent => (
                <div key={agent.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{agent.icon}</span>
                    <span className="text-sm text-slate-300">{agent.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${agentStatusDot[agent.status]}`} />
                    <span className={`text-xs ${agentStatusColor[agent.status]}`}>
                      {agent.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Log Panel */}
        <div className="lg:col-span-2">
          <div className="glass rounded-xl p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-200">Live Agent Log</h3>
              {isGenerating && (
                <span className="flex items-center gap-2 text-xs text-cyan-400">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  Live
                </span>
              )}
              {!isGenerating && logs.length === 0 && (
                <span className="text-xs text-slate-500">Waiting for generation...</span>
              )}
            </div>

            <div className="flex-1 bg-slate-950/60 rounded-lg p-4 font-mono text-xs overflow-y-auto min-h-[400px] max-h-[600px] space-y-1">
              {logs.length === 0 && (
                <div className="flex items-center justify-center h-full text-slate-600">
                  <div className="text-center">
                    <p className="text-4xl mb-3">🏭</p>
                    <p>Configure and click Generate to start</p>
                  </div>
                </div>
              )}
              {logs.map(log => (
                <div key={log.id} className="flex gap-3 leading-relaxed">
                  <span className="text-slate-600 shrink-0">{log.time}</span>
                  <span className="text-slate-500 shrink-0 w-32 truncate">[{log.agent}]</span>
                  <span className={logTypeColor[log.type]}>{log.message}</span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
