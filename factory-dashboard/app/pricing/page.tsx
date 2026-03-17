import type { Metadata } from 'next'
import { FACTORY_PLANS } from '../../factory-brain-types'

export const metadata: Metadata = {
  title: 'Pricing | SaaS Factory',
  description: 'Simple, transparent pricing for SaaS Factory',
}

// Re-export plan data for client rendering (avoid importing server-side module directly)
const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for solo developers exploring the platform',
    features: [
      '3 SaaS exports per month',
      '10 AI agent runs per month',
      'Community blocks only',
      'Single user',
      'Watermarked output',
    ],
    cta: 'Get Started Free',
    ctaHref: '/sign-up',
    highlighted: false,
    badge: null,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$29',
    period: '/month',
    yearlyPrice: '$290/year',
    yearlySavings: 'Save $58',
    description: 'For developers and freelancers building client projects',
    features: [
      'Unlimited SaaS exports',
      '500 AI agent runs per month',
      'All premium blocks',
      'Priority generation queue',
      'No watermark',
      'Export to GitHub',
    ],
    cta: 'Start Pro Trial',
    ctaHref: '/sign-up?plan=pro',
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    id: 'agency',
    name: 'Agency',
    price: '$99',
    period: '/month',
    yearlyPrice: '$990/year',
    yearlySavings: 'Save $198',
    description: 'For agencies and teams building multiple SaaS products',
    features: [
      'Everything in Pro',
      'Unlimited AI agent runs',
      '10 team seats',
      'REST API access',
      'White-label output',
      'Custom block development',
      'Priority support',
    ],
    cta: 'Contact Sales',
    ctaHref: '/contact?plan=agency',
    highlighted: false,
    badge: 'Best Value',
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="max-w-5xl mx-auto px-4 pt-16 pb-8 text-center">
        <h1 className="text-4xl font-bold mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          Start for free, upgrade when you need more. No hidden fees, no surprises.
          Cancel anytime.
        </p>
      </div>

      {/* Plans */}
      <div className="max-w-5xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-6 border ${
                plan.highlighted
                  ? 'bg-blue-950/40 border-blue-500 shadow-lg shadow-blue-500/10'
                  : 'bg-slate-900 border-slate-700'
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold ${
                  plan.highlighted ? 'bg-blue-500 text-white' : 'bg-slate-600 text-white'
                }`}>
                  {plan.badge}
                </div>
              )}

              {/* Plan header */}
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-1">{plan.name}</h2>
                <p className="text-slate-400 text-sm mb-4">{plan.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-slate-400 text-sm">{plan.period}</span>
                </div>
                {'yearlyPrice' in plan && (
                  <div className="mt-1 text-xs text-slate-500">
                    {plan.yearlyPrice} &middot; <span className="text-green-400">{plan.yearlySavings}</span>
                  </div>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <span className="text-green-400 mt-0.5 flex-shrink-0">✓</span>
                    <span className="text-slate-300">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <a
                href={plan.ctaHref}
                className={`block w-full text-center py-3 rounded-xl font-semibold text-sm transition-colors ${
                  plan.highlighted
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-white'
                }`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              {
                q: 'What counts as an "export"?',
                a: 'An export is when you generate and download a complete SaaS project (code, schema, deployment config). Previewing and editing within the dashboard does not count.',
              },
              {
                q: 'What are "AI agent runs"?',
                a: 'Each time an AI agent (Architect, QA, Growth Hacker, etc.) processes a request, it counts as one run. A full SaaS generation typically uses 5-10 runs.',
              },
              {
                q: 'Can I upgrade or downgrade at any time?',
                a: 'Yes. Upgrades take effect immediately. Downgrades take effect at the end of your current billing period.',
              },
              {
                q: 'What is white-label output?',
                a: 'Agency plan users can remove all SaaS Factory branding from generated code and documentation, making it suitable for client delivery.',
              },
            ].map((faq) => (
              <div key={faq.q} className="bg-slate-900 rounded-xl p-4 border border-slate-700">
                <h3 className="font-semibold text-white mb-2">{faq.q}</h3>
                <p className="text-slate-400 text-sm">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
