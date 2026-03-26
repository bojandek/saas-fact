'use client';

import { useState } from 'react';

interface PricingTier {
  name: string;
  price: number | 'custom';
  annualDiscount: number;
  description: string;
  features: string[];
  highlighted: boolean;
  cta: string;
}

interface PricingAnalysis {
  niche: string;
  model: string;
  rationale: string;
  tiers: PricingTier[];
  freemiumRecommended: boolean;
  trialDays: number;
  insights: string[];
}

const SAMPLE_ANALYSES: Record<string, PricingAnalysis> = {
  'teretana-crm': {
    niche: 'Teretana CRM',
    model: 'Freemium → Subscription',
    rationale: 'Gym owners are price-sensitive SMBs. Freemium lowers acquisition barrier. Upgrade trigger: member limit (50 free → 500 paid). Annual billing reduces churn by ~40%.',
    freemiumRecommended: true,
    trialDays: 14,
    tiers: [
      {
        name: 'Free',
        price: 0,
        annualDiscount: 0,
        description: 'For small studios just starting out',
        features: ['Up to 50 members', 'Basic scheduling', 'Email notifications', '1 staff account'],
        highlighted: false,
        cta: 'Get started free',
      },
      {
        name: 'Starter',
        price: 29,
        annualDiscount: 20,
        description: 'For growing gyms',
        features: ['Up to 500 members', 'Advanced scheduling', 'SMS + email', '5 staff accounts', 'Payment processing', 'Basic analytics'],
        highlighted: false,
        cta: 'Start 14-day trial',
      },
      {
        name: 'Pro',
        price: 79,
        annualDiscount: 20,
        description: 'For established fitness businesses',
        features: ['Unlimited members', 'Multi-location support', 'Custom branding', 'Advanced analytics', 'API access', 'Priority support', 'Automated billing'],
        highlighted: true,
        cta: 'Start 14-day trial',
      },
      {
        name: 'Enterprise',
        price: 'custom',
        annualDiscount: 0,
        description: 'For gym chains and franchises',
        features: ['Everything in Pro', 'Dedicated account manager', 'Custom integrations', 'SLA guarantee', 'White-label option', 'SSO / SAML'],
        highlighted: false,
        cta: 'Contact sales',
      },
    ],
    insights: [
      'Competitor Mindbody charges $129-$599/mo — significant room to undercut on Starter/Pro',
      'Key upgrade trigger: member count limit (most gyms hit 50-member cap within 60 days)',
      'Annual billing discount of 20% is industry standard — reduces churn by ~38%',
      'Add-on revenue opportunity: SMS credits ($0.05/SMS), custom domain (+$10/mo)',
      'Free plan acts as a lead magnet — 23% of freemium users convert within 90 days (industry avg)',
    ],
  },
  'online-course-platform': {
    niche: 'Online Course Platform',
    model: 'Revenue Share → Subscription',
    rationale: 'Course creators prefer zero upfront cost. Revenue share aligns incentives early. Upgrade to subscription when revenue exceeds $500/mo (break-even point).',
    freemiumRecommended: true,
    trialDays: 0,
    tiers: [
      {
        name: 'Creator',
        price: 0,
        annualDiscount: 0,
        description: 'Start selling with zero upfront cost',
        features: ['Unlimited courses', '5% transaction fee', 'Basic landing pages', 'Email support', '100 students/course'],
        highlighted: false,
        cta: 'Start for free',
      },
      {
        name: 'Pro',
        price: 49,
        annualDiscount: 25,
        description: 'For serious course creators',
        features: ['0% transaction fee', 'Custom domain', 'Advanced analytics', 'Drip content', 'Certificates', 'Affiliate program', 'Unlimited students'],
        highlighted: true,
        cta: 'Start Pro',
      },
      {
        name: 'Business',
        price: 149,
        annualDiscount: 25,
        description: 'For course businesses and academies',
        features: ['Everything in Pro', 'Multi-instructor', 'White-label', 'Zapier integration', 'Priority support', 'Bulk enrollment', 'API access'],
        highlighted: false,
        cta: 'Start Business',
      },
    ],
    insights: [
      'Teachable charges 5% on free plan — match this to stay competitive',
      'Key upgrade trigger: creator earns >$500/mo (transaction fee exceeds subscription cost)',
      'Annual discount of 25% is higher than average — justified by creator revenue predictability',
      'Kajabi charges $149/mo for basic — significant value opportunity at $49',
    ],
  },
};

export default function PricingPage() {
  const [selectedNiche, setSelectedNiche] = useState('teretana-crm');
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  const analysis = SAMPLE_ANALYSES[selectedNiche] || SAMPLE_ANALYSES['teretana-crm'];

  const getPrice = (tier: PricingTier) => {
    if (tier.price === 'custom' || tier.price === 0) return tier.price;
    if (billingPeriod === 'annual') {
      return Math.round(tier.price * (1 - tier.annualDiscount / 100));
    }
    return tier.price;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold gradient-text">Pricing Intelligence</h2>
          <p className="text-slate-400 mt-1">AI-generated pricing strategy based on competitor analysis and niche data</p>
        </div>
        <select
          value={selectedNiche}
          onChange={e => setSelectedNiche(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
        >
          <option value="teretana-crm">Teretana CRM</option>
          <option value="online-course-platform">Online Course Platform</option>
        </select>
      </div>

      {/* Strategy Overview */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="text-3xl">💰</div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-slate-200">{analysis.niche} — Pricing Strategy</h3>
              <span className="px-2 py-0.5 bg-cyan-900/40 text-cyan-400 rounded text-xs font-medium border border-cyan-500/20">
                {analysis.model}
              </span>
              {analysis.freemiumRecommended && (
                <span className="px-2 py-0.5 bg-emerald-900/40 text-emerald-400 rounded text-xs font-medium border border-emerald-500/20">
                  Freemium ✓
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400">{analysis.rationale}</p>
            {analysis.trialDays > 0 && (
              <p className="text-sm text-cyan-400 mt-2">📅 Recommended trial: {analysis.trialDays} days (no credit card required)</p>
            )}
          </div>
        </div>
      </div>

      {/* Billing Toggle */}
      <div className="flex justify-center">
        <div className="glass rounded-full p-1 flex gap-1">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              billingPeriod === 'monthly' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod('annual')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
              billingPeriod === 'annual' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Annual
            <span className="text-xs text-emerald-400 font-semibold">Save 20%</span>
          </button>
        </div>
      </div>

      {/* Pricing Tiers */}
      <div className={`grid gap-4 ${analysis.tiers.length === 4 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-3'}`}>
        {analysis.tiers.map(tier => {
          const price = getPrice(tier);
          return (
            <div
              key={tier.name}
              className={`rounded-xl p-6 flex flex-col transition-all ${
                tier.highlighted
                  ? 'bg-gradient-to-b from-cyan-900/40 to-blue-900/40 border border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                  : 'glass'
              }`}
            >
              {tier.highlighted && (
                <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-3">⭐ Most Popular</div>
              )}
              <h4 className="font-bold text-lg text-slate-100">{tier.name}</h4>
              <p className="text-xs text-slate-500 mt-1 mb-4">{tier.description}</p>

              <div className="mb-4">
                {price === 0 ? (
                  <span className="text-3xl font-bold text-slate-100">Free</span>
                ) : price === 'custom' ? (
                  <span className="text-3xl font-bold text-slate-100">Custom</span>
                ) : (
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-bold text-slate-100">${price}</span>
                    <span className="text-slate-400 text-sm mb-1">/mo</span>
                    {billingPeriod === 'annual' && tier.annualDiscount > 0 && (
                      <span className="text-xs text-emerald-400 mb-1 ml-1">billed annually</span>
                    )}
                  </div>
                )}
              </div>

              <ul className="space-y-2 flex-1 mb-6">
                {tier.features.map(feature => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                className={`w-full py-2 rounded-lg text-sm font-medium transition-all ${
                  tier.highlighted
                    ? 'bg-cyan-500 hover:bg-cyan-400 text-white'
                    : price === 0
                    ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                    : 'border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-slate-100'
                }`}
              >
                {tier.cta}
              </button>
            </div>
          );
        })}
      </div>

      {/* Insights */}
      <div className="glass rounded-xl p-6">
        <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <span>🔍</span> Competitive Intelligence
        </h3>
        <div className="space-y-3">
          {analysis.insights.map((insight, i) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              <span className="text-cyan-400 mt-0.5 shrink-0">→</span>
              <span className="text-slate-300">{insight}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
