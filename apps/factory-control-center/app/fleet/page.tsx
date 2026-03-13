'use client';

import { useState } from 'react';
import Link from 'next/link';

interface FleetApp {
  id: string;
  name: string;
  status: string;
  health: number;
  revenue: string;
  users: number;
  tier: 'Free' | 'Starter' | 'Pro' | 'Enterprise';
  activeFeatures: number;
  lastUpdated: string;
}

export default function FleetPage() {
  const [apps] = useState<FleetApp[]>([
    {
      id: 'dent-pro',
      name: 'DentistPro',
      status: 'Level 9 - Expert',
      health: 95,
      revenue: '$120K/mo',
      users: 2400,
      tier: 'Enterprise',
      activeFeatures: 45,
      lastUpdated: '2 hours ago',
    },
    {
      id: 'truck-logistics',
      name: 'TruckLogistics',
      status: 'Level 8 - Optimized',
      health: 88,
      revenue: '$95K/mo',
      users: 1850,
      tier: 'Enterprise',
      activeFeatures: 38,
      lastUpdated: '1 hour ago',
    },
    {
      id: 'lawyer-bot',
      name: 'LawyerBot',
      status: 'Level 9 - Expert',
      health: 92,
      revenue: '$145K/mo',
      users: 980,
      tier: 'Enterprise',
      activeFeatures: 42,
      lastUpdated: '3 hours ago',
    },
    {
      id: 'design-assist',
      name: 'DesignAssist',
      status: 'Level 5 - Learning',
      health: 72,
      revenue: '$45K/mo',
      users: 650,
      tier: 'Pro',
      activeFeatures: 28,
      lastUpdated: '5 hours ago',
    },
    {
      id: 'ai-tutor',
      name: 'AI Tutor',
      status: 'Level 4 - Growing',
      health: 65,
      revenue: '$28K/mo',
      users: 420,
      tier: 'Starter',
      activeFeatures: 18,
      lastUpdated: '6 hours ago',
    },
    {
      id: 'marketing-suite',
      name: 'MarketingSuite',
      status: 'Level 6 - Scaling',
      health: 78,
      revenue: '$52K/mo',
      users: 1200,
      tier: 'Pro',
      activeFeatures: 32,
      lastUpdated: '30 mins ago',
    },
  ]);

  const [sortBy, setSortBy] = useState<'revenue' | 'health' | 'users'>('revenue');
  const [filterTier, setFilterTier] = useState<string>('All');

  const filteredApps =
    filterTier === 'All'
      ? apps
      : apps.filter((app) => app.tier === filterTier);

  const sortedApps = [...filteredApps].sort((a, b) => {
    switch (sortBy) {
      case 'revenue':
        return (
          parseInt(b.revenue.replace(/[$,K/mo]/g, '')) -
          parseInt(a.revenue.replace(/[$,K/mo]/g, ''))
        );
      case 'health':
        return b.health - a.health;
      case 'users':
        return b.users - a.users;
      default:
        return 0;
    }
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <section className="space-y-2">
        <h2 className="text-3xl font-bold flex items-center gap-2">
          <span>🚀</span> The Fleet
        </h2>
        <p className="text-slate-400">
          Monitor and manage all 150+ SaaS applications in your ecosystem
        </p>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-hover rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-cyan-400">{apps.length}</p>
          <p className="text-sm text-slate-400 mt-1">Total Applications</p>
        </div>
        <div className="glass-hover rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-emerald-400">
            ${(apps.reduce((sum, app) => sum + parseInt(app.revenue.replace(/[$,K/mo]/g, '')), 0) / 1000).toFixed(1)}M
          </p>
          <p className="text-sm text-slate-400 mt-1">Total MRR</p>
        </div>
        <div className="glass-hover rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-blue-400">
            {(apps.reduce((sum, app) => sum + app.health, 0) / apps.length).toFixed(1)}%
          </p>
          <p className="text-sm text-slate-400 mt-1">Average Health</p>
        </div>
        <div className="glass-hover rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-amber-400">
            {apps.reduce((sum, app) => sum + app.users, 0).toLocaleString()}
          </p>
          <p className="text-sm text-slate-400 mt-1">Total Users</p>
        </div>
      </section>

      {/* Filters */}
      <section className="flex gap-4 items-center flex-wrap">
        <div className="flex gap-2">
          <button
            onClick={() => setFilterTier('All')}
            className={`px-3 py-1 rounded text-sm ${
              filterTier === 'All'
                ? 'bg-cyan-500 text-white'
                : 'glass hover:bg-slate-800'
            }`}
          >
            All Tiers
          </button>
          {['Free', 'Starter', 'Pro', 'Enterprise'].map((tier) => (
            <button
              key={tier}
              onClick={() => setFilterTier(tier)}
              className={`px-3 py-1 rounded text-sm ${
                filterTier === tier
                  ? 'bg-cyan-500 text-white'
                  : 'glass hover:bg-slate-800'
              }`}
            >
              {tier}
            </button>
          ))}
        </div>

        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => setSortBy('revenue')}
            className={`px-3 py-1 rounded text-sm ${
              sortBy === 'revenue'
                ? 'bg-cyan-500 text-white'
                : 'glass hover:bg-slate-800'
            }`}
          >
            💰 Revenue
          </button>
          <button
            onClick={() => setSortBy('health')}
            className={`px-3 py-1 rounded text-sm ${
              sortBy === 'health'
                ? 'bg-cyan-500 text-white'
                : 'glass hover:bg-slate-800'
            }`}
          >
            💚 Health
          </button>
          <button
            onClick={() => setSortBy('users')}
            className={`px-3 py-1 rounded text-sm ${
              sortBy === 'users'
                ? 'bg-cyan-500 text-white'
                : 'glass hover:bg-slate-800'
            }`}
          >
            👥 Users
          </button>
        </div>
      </section>

      {/* Fleet Table */}
      <section className="glass-hover rounded-xl overflow-hidden">
        <table className="fleet-table">
          <thead>
            <tr>
              <th>Application</th>
              <th>Evolution Status</th>
              <th>Health</th>
              <th>Revenue</th>
              <th>Users</th>
              <th>Tier</th>
              <th>Features</th>
              <th>Last Update</th>
            </tr>
          </thead>
          <tbody>
            {sortedApps.map((app) => (
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
                  <span
                    className={`status-badge ${
                      app.health > 85
                        ? 'status-healthy'
                        : app.health > 70
                          ? 'status-warning'
                          : 'status-critical'
                    }`}
                  >
                    {app.status}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <span
                      className={`health-indicator health-${
                        app.health > 85
                          ? 'good'
                          : app.health > 70
                            ? 'warning'
                            : 'critical'
                      }`}
                    ></span>
                    <span className="font-medium">{app.health}%</span>
                  </div>
                </td>
                <td className="font-semibold text-emerald-400">{app.revenue}</td>
                <td className="text-slate-300">{app.users.toLocaleString()}</td>
                <td>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      app.tier === 'Enterprise'
                        ? 'bg-purple-500/20 text-purple-300'
                        : app.tier === 'Pro'
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'bg-slate-600/20 text-slate-300'
                    }`}
                  >
                    {app.tier}
                  </span>
                </td>
                <td className="text-slate-300">{app.activeFeatures}</td>
                <td className="text-xs text-slate-400">{app.lastUpdated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Quick Actions */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bento-card">
          <h4 className="font-semibold mb-2">🔄 Batch Update</h4>
          <p className="text-sm text-slate-400 mb-4">
            Deploy updates to multiple applications at once
          </p>
          <button className="text-sm text-cyan-400 hover:text-cyan-300">
            Start Update →
          </button>
        </div>

        <div className="bento-card">
          <h4 className="font-semibold mb-2">📊 Analytics Sync</h4>
          <p className="text-sm text-slate-400 mb-4">
            Sync analytics data from all apps to central dashboard
          </p>
          <button className="text-sm text-cyan-400 hover:text-cyan-300">
            Sync Now →
          </button>
        </div>

        <div className="bento-card">
          <h4 className="font-semibold mb-2">⚙️ Configuration</h4>
          <p className="text-sm text-slate-400 mb-4">
            Update configurations across the fleet
          </p>
          <button className="text-sm text-cyan-400 hover:text-cyan-300">
            Configure →
          </button>
        </div>
      </section>
    </div>
  );
}
