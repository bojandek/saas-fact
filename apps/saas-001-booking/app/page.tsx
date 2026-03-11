'use client'

import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800">
      <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center text-white">
          <h1 className="text-5xl font-bold mb-4">Hair Salon Booking</h1>
          <p className="text-xl text-blue-100 mb-8">Book your appointment easily and manage your schedule</p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <button
            onClick={() => router.push('/auth/login')}
            className="px-8 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition"
          >
            Login
          </button>
          <button
            onClick={() => router.push('/auth/register')}
            className="px-8 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-400 transition border-2 border-white"
          >
            Get Started
          </button>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <FeatureCard 
            icon="📅"
            title="Easy Booking"
            description="Book your appointment in seconds"
          />
          <FeatureCard 
            icon="💳"
            title="Flexible Payments"
            description="Multiple payment options available"
          />
          <FeatureCard 
            icon="🔔"
            title="Notifications"
            description="Get reminders before your appointment"
          />
        </div>

        {/* Pricing Preview */}
        <div className="bg-white rounded-lg p-8 text-gray-900">
          <h2 className="text-2xl font-bold mb-6 text-center">Simple Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <PricingTier 
              name="Free"
              price="$0"
              features={['Up to 1 booking', 'Basic booking management']}
            />
            <PricingTier 
              name="Pro"
              price="$29/month"
              features={['Unlimited bookings', 'Advanced analytics', 'Priority support']}
              highlighted
            />
            <PricingTier 
              name="Enterprise"
              price="Custom"
              features={['Everything in Pro', 'Custom integration', 'Dedicated support']}
            />
          </div>
        </div>
      </div>
    </main>
  )
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-white border border-white/20">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-blue-100">{description}</p>
    </div>
  )
}

function PricingTier({ name, price, features, highlighted }: { name: string; price: string; features: string[]; highlighted?: boolean }) {
  return (
    <div className={`rounded-lg p-6 border-2 ${highlighted ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}>
      <h3 className="text-xl font-bold mb-2">{name}</h3>
      <p className="text-3xl font-bold mb-4 text-blue-600">{price}</p>
      <ul className="space-y-2">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-center text-gray-700">
            <span className="mr-2">✓</span>
            {feature}
          </li>
        ))}
      </ul>
    </div>
  )
}