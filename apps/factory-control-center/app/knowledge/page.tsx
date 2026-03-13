'use client';

import { useState } from 'react';
import Link from 'next/link';

interface KnowledgeEntity {
  id: string;
  type: 'Pattern' | 'Solution' | 'Learning';
  title: string;
  description: string;
  adoptionRate: number;
  sourceApp?: string;
  relatedApps: number;
  icon: string;
}

export default function KnowledgePage() {
  const [entities] = useState<KnowledgeEntity[]>([
    {
      id: 'pattern-1',
      type: 'Pattern',
      title: 'Multi-layer Caching (Redis + CDN)',
      description: 'Implement Redis cache layer with CDN for static assets',
      adoptionRate: 92,
      sourceApp: 'DentistPro',
      relatedApps: 23,
      icon: '⚡',
    },
    {
      id: 'solution-1',
      type: 'Solution',
      title: 'Database Index Optimization',
      description: 'Add indices on frequently queried columns to improve response times',
      adoptionRate: 84,
      sourceApp: 'TruckLogistics',
      relatedApps: 18,
      icon: '🔍',
    },
    {
      id: 'learning-1',
      type: 'Learning',
      title: 'GraphQL Subscriptions for Real-time Updates',
      description: 'WebSocket-based subscriptions reduce polling overhead by 60%',
      adoptionRate: 76,
      sourceApp: 'LawyerBot',
      relatedApps: 12,
      icon: '📡',
    },
    {
      id: 'pattern-2',
      type: 'Pattern',
      title: 'Rate Limiting with Upstash',
      description: 'Implement distributed rate limiting to prevent abuse',
      adoptionRate: 88,
      sourceApp: 'DesignAssist',
      relatedApps: 15,
      icon: '🚦',
    },
    {
      id: 'solution-2',
      type: 'Solution',
      title: 'Webhook Retry Strategy',
      description: 'Exponential backoff with max retries for reliable delivery',
      adoptionRate: 79,
      sourceApp: 'MarketingSuite',
      relatedApps: 20,
      icon: '🔄',
    },
    {
      id: 'learning-2',
      type: 'Learning',
      title: 'Modular Monolith Architecture Benefits',
      description: 'Separate concerns within monolith improves maintainability 45%',
      adoptionRate: 71,
      sourceApp: 'AI Tutor',
      relatedApps: 8,
      icon: '🏗️',
    },
  ]);

  const [selectedType, setSelectedType] = useState<'All' | 'Pattern' | 'Solution' | 'Learning'>('All');

  const filtered =
    selectedType === 'All'
      ? entities
      : entities.filter((e) => e.type === selectedType);

  const stats = {
    totalPatterns: entities.filter((e) => e.type === 'Pattern').length,
    totalSolutions: entities.filter((e) => e.type === 'Solution').length,
    totalLearnings: entities.filter((e) => e.type === 'Learning').length,
    avgAdoption:
      Math.round(entities.reduce((sum, e) => sum + e.adoptionRate, 0) / entities.length),
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <section className="space-y-2">
        <h2 className="text-3xl font-bold flex items-center gap-2">
          <span>🔗</span> Knowledge Graph
        </h2>
        <p className="text-slate-400">
          Shared knowledge, patterns, and solutions across all 150+ SaaS applications
        </p>
      </section>

      {/* Statistics */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-hover rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-cyan-400">{stats.totalPatterns}</p>
          <p className="text-sm text-slate-400 mt-1">Active Patterns</p>
        </div>
        <div className="glass-hover rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-emerald-400">{stats.totalSolutions}</p>
          <p className="text-sm text-slate-400 mt-1">Solutions</p>
        </div>
        <div className="glass-hover rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-blue-400">{stats.totalLearnings}</p>
          <p className="text-sm text-slate-400 mt-1">Active Learnings</p>
        </div>
        <div className="glass-hover rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-amber-400">{stats.avgAdoption}%</p>
          <p className="text-sm text-slate-400 mt-1">Avg Adoption</p>
        </div>
      </section>

      {/* Filters */}
      <section className="flex gap-2 justify-center">
        {['All', 'Pattern', 'Solution', 'Learning'].map((type) => (
          <button
            key={type}
            onClick={() => setSelectedType(type as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedType === type
                ? 'bg-cyan-500 text-white'
                : 'glass text-slate-300 hover:bg-slate-800'
            }`}
          >
            {type}
            {type === 'All' && ` (${entities.length})`}
            {type === 'Pattern' && ` (${stats.totalPatterns})`}
            {type === 'Solution' && ` (${stats.totalSolutions})`}
            {type === 'Learning' && ` (${stats.totalLearnings})`}
          </button>
        ))}
      </section>

      {/* Knowledge Entities */}
      <section className="space-y-4">
        {filtered.map((entity) => (
          <div key={entity.id} className={`glass-hover rounded-lg p-5 space-y-3 group cursor-pointer`}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-start gap-3 flex-1">
                <span className="text-3xl">{entity.icon}</span>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold group-hover:text-cyan-400 transition-colors">
                    {entity.title}
                  </h4>
                  <p className="text-sm text-slate-400 mt-1">{entity.description}</p>

                  {/* Metadata */}
                  <div className="flex gap-4 mt-3 flex-wrap text-xs">
                    {entity.sourceApp && (
                      <span className="text-slate-400">
                        <span className="text-slate-500">Source:</span> {entity.sourceApp}
                      </span>
                    )}
                    <span className="text-slate-400">
                      <span className="text-slate-500">Adopted by:</span> {entity.relatedApps} apps
                    </span>
                    <span className={`inline-block px-2 py-1 rounded ${
                      entity.type === 'Pattern'
                        ? 'bg-blue-500/20 text-blue-300'
                        : entity.type === 'Solution'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {entity.type}
                    </span>
                  </div>
                </div>
              </div>

              {/* Adoption Rate */}
              <div className="text-right ml-4">
                <p className="text-2xl font-bold text-emerald-400">{entity.adoptionRate}%</p>
                <p className="text-xs text-slate-400 mt-1">Adoption</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full"
                style={{ width: `${entity.adoptionRate}%` }}
              ></div>
            </div>
          </div>
        ))}
      </section>

      {/* Sync Status */}
      <section className="glass-hover rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <span>🔄</span> Real-time Sync Status
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <p className="text-sm text-slate-400">Events Processed (24h)</p>
            <p className="text-3xl font-bold text-cyan-400">24,521</p>
            <p className="text-xs text-emerald-400">↑ 12% from yesterday</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-slate-400">Sync Success Rate</p>
            <p className="text-3xl font-bold text-emerald-400">98.7%</p>
            <p className="text-xs text-slate-500">Last event: 30 seconds ago</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-slate-400">Knowledge Queue</p>
            <p className="text-3xl font-bold text-blue-400">142</p>
            <p className="text-xs text-slate-500">Events pending distribution</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-6 pt-6 border-t border-slate-800 space-y-2">
          <p className="text-sm font-medium text-slate-300 mb-3">Recent Events</p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between text-slate-400">
              <span>📡 Pattern published: Multi-layer Caching</span>
              <span className="text-xs">2 mins ago</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>✅ Solution synced to 23 apps</span>
              <span className="text-xs">5 mins ago</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>📚 Learning recorded: GraphQL optimization</span>
              <span className="text-xs">12 mins ago</span>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button className="bento-card group">
          <h4 className="font-semibold mb-2 group-hover:text-cyan-400 transition-colors">
            📤 Publish Pattern
          </h4>
          <p className="text-sm text-slate-400">Share a new pattern with the fleet</p>
        </button>

        <button className="bento-card group">
          <h4 className="font-semibold mb-2 group-hover:text-cyan-400 transition-colors">
            🔗 Create Relationship
          </h4>
          <p className="text-sm text-slate-400">Link related patterns and solutions</p>
        </button>

        <button className="bento-card group">
          <h4 className="font-semibold mb-2 group-hover:text-cyan-400 transition-colors">
            📊 Analytics
          </h4>
          <p className="text-sm text-slate-400">View knowledge graph metrics</p>
        </button>
      </section>
    </div>
  );
}
