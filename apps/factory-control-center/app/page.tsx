'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface MetricData {
  label: string;
  value: string;
  icon: string;
  change?: { value: number; direction: 'up' | 'down' };
  status: 'healthy' | 'warning' | 'critical';
}

interface FleetApp {
  id: string;
  name: string;
  status: 'Level 9' | 'Level 8' | 'Level 5' | 'Level 4';
  health: number;
  revenue: string;
  users: number;
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [recentApps, setRecentApps] = useState<FleetApp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate data loading
    setTimeout(() => {
      setMetrics([
        {
          label: 'Total Ecosystem Intelligence',
          value: '78.5%',
          icon: '🧠',
          change: { value: 12, direction: 'up' },
          status: 'healthy',
        },
        {
          label: 'Active Neurons',
          value: '142',
          icon: '⚡',
          change: { value: 8, direction: 'up' },
          status: 'healthy',
        },
        {
          label: 'Factory Throughput',
          value: '24',
          icon: '🏭',
          change: { value: 3, direction: 'up' },
          status: 'healthy',
        },
        {
          label: 'Monthly Recurring Revenue',
          value: '$4.2M',
          icon: '💰',
          change: { value: 18, direction: 'up' },
          status: 'healthy',
        },
      ]);

      setRecentApps([
        {
          id: 'dent-pro',
          name: 'DentistPro 🦷',
          status: 'Level 9',
          health: 95,
          revenue: '$120K/mo',
          users: 2400,
        },
        {
          id: 'truck-logistics',
          name: 'TruckLogistics 🚛',
          status: 'Level 8',
          health: 88,
          revenue: '$95K/mo',
          users: 1850,
        },
        {
          id: 'lawyer-bot',
          name: 'LawyerBot ⚖️',
          status: 'Level 9',
          health: 92,
          revenue: '$145K/mo',
          users: 980,
        },
        {
          id: 'design-assist',
          name: 'DesignAssist 🎨',
          status: 'Level 5',
          health: 72,
          revenue: '$45K/mo',
          users: 650,
        },
        {
          id: 'ai-tutor',
          name: 'AI Tutor 📚',
          status: 'Level 4',
          health: 65,
          revenue: '$28K/mo',
          users: 420,
        },
      ]);

      setLoading(false);
    }, 500);
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Section */}
      <section className="space-y-2">
        <h2 className="text-3xl font-bold">The God View 👁️</h2>
        <p className="text-slate-400">Real-time monitoring of your entire SaaS empire</p>
      </section>

      {/* Key Metrics - Bento Grid */}
      {!loading && (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className={`bento-card ${
                metric.status === 'healthy'
                  ? 'border-emerald-500/30'
                  : metric.status === 'warning'
                    ? 'border-amber-500/30'
                    : 'border-red-500/30'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-400">{metric.label}</p>
                  <p className="text-3xl font-bold gradient-text mt-2">{metric.value}</p>
                  {metric.change && (
                    <p
                      className={`text-xs mt-2 ${
                        metric.change.direction === 'up'
                          ? 'text-emerald-400'
                          : 'text-red-400'
                      }`}
                    >
                      {metric.change.direction === 'up' ? '↑' : '↓'}{' '}
                      {metric.change.value}% this generation
                    </p>
                  )}
                </div>
                <div className="text-4xl">{metric.icon}</div>
              </div>

              {/* Status indicator */}
              <div className="mt-4 h-1 w-full rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all ${
                    metric.status === 'healthy'
                      ? 'bg-emerald-500'
                      : metric.status === 'warning'
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                  }`}
                  style={{
                    width:
                      metric.value === '78.5%'
                        ? '78.5%'
                        : metric.value === '142'
                          ? '90%'
                          : metric.value === '24'
                            ? '85%'
                            : '92%',
                  }}
                ></div>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Quick Stats */}
      <section className="glass-hover rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>📊</span> Generation Status
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-cyan-400">42</p>
            <p className="text-xs text-slate-400 mt-1">Current Generation</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-emerald-400">+15%</p>
            <p className="text-xs text-slate-400 mt-1">Avg Improvement</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-400">150+</p>
            <p className="text-xs text-slate-400 mt-1">SaaS Apps</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-amber-400">$12.4M</p>
            <p className="text-xs text-slate-400 mt-1">Annual Revenue</p>
          </div>
        </div>
      </section>

      {/* Recent Top Performers */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span>🚀</span> Top Performers
          </h3>
          <Link
            href="/fleet"
            className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            View All →
          </Link>
        </div>

        <div className="glass-hover rounded-xl overflow-hidden">
          <table className="fleet-table">
            <thead>
              <tr>
                <th>App Name</th>
                <th>Evolution Level</th>
                <th>Health</th>
                <th>Revenue</th>
                <th>Users</th>
              </tr>
            </thead>
            <tbody>
              {recentApps.map((app) => (
                <tr key={app.id}>
                  <td>
                    <Link
                      href={`/app/${app.id}`}
                      className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
                    >
                      {app.name}
                    </Link>
                  </td>
                  <td>
                    <span className="status-badge status-healthy">{app.status}</span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className={`health-indicator health-${app.health > 85 ? 'good' : app.health > 70 ? 'warning' : 'critical'}`}></span>
                      <span>{app.health}%</span>
                    </div>
                  </td>
                  <td className="font-semibold text-emerald-400">{app.revenue}</td>
                  <td className="text-slate-300">{app.users.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Action Cards */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span>⚙️</span> System Actions
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/evolution"
            className="bento-card group cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <h4 className="font-semibold group-hover:text-cyan-400 transition-colors">
                MetaClaw Evolution
              </h4>
              <span className="text-2xl">🧬</span>
            </div>
            <p className="text-sm text-slate-400">
              Start new evolution cycle • Auto-optimize apps • Apply mutations
            </p>
            <p className="text-xs text-cyan-400 mt-3">Next cycle: 2h 15m →</p>
          </Link>

          <Link
            href="/knowledge"
            className="bento-card group cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <h4 className="font-semibold group-hover:text-cyan-400 transition-colors">
                Knowledge Graph
              </h4>
              <span className="text-2xl">🔗</span>
            </div>
            <p className="text-sm text-slate-400">
              View patterns • Sync solutions • Share learnings
            </p>
            <p className="text-xs text-cyan-400 mt-3">542 entities • 1,234 relationships →</p>
          </Link>

          <Link
            href="/fleet"
            className="bento-card group cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <h4 className="font-semibold group-hover:text-cyan-400 transition-colors">
                Fleet Management
              </h4>
              <span className="text-2xl">🚀</span>
            </div>
            <p className="text-sm text-slate-400">
              Manage 150+ apps • Monitor health • Deploy updates
            </p>
            <p className="text-xs text-cyan-400 mt-3">142 healthy • 8 need attention →</p>
          </Link>
        </div>
      </section>

      {/* System Health */}
      <section className="glass rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>💚</span> System Health
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-slate-400 mb-2">Event Bus</p>
            <p className="text-2xl font-bold text-emerald-400">✓ Healthy</p>
            <p className="text-xs text-slate-500 mt-1">4,521 events/sec</p>
          </div>
          <div>
            <p className="text-sm text-slate-400 mb-2">MetaClaw</p>
            <p className="text-2xl font-bold text-emerald-400">✓ Running</p>
            <p className="text-xs text-slate-500 mt-1">Gen 42 • 87% fitness</p>
          </div>
          <div>
            <p className="text-sm text-slate-400 mb-2">Knowledge Sync</p>
            <p className="text-2xl font-bold text-emerald-400">✓ Synced</p>
            <p className="text-xs text-slate-500 mt-1">98.7% delivery rate</p>
          </div>
          <div>
            <p className="text-sm text-slate-400 mb-2">API Gateway</p>
            <p className="text-2xl font-bold text-emerald-400">✓ Online</p>
            <p className="text-xs text-slate-500 mt-1">12ms avg latency</p>
          </div>
        </div>
      </section>
    </div>
  );
}
