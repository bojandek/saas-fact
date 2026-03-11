import { Button } from '@saas-factory/ui'

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-20 text-white">
      <div className="text-center mb-12">
        <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-300 to-purple-400 bg-clip-text text-transparent">
          ContentFlow
        </h1>
        <p className="text-xl text-gray-300 mb-8">
          Modern headless CMS. Fast. Flexible. Built on SaaS Factory.
        </p>
        <div className="flex gap-4 justify-center">
          <Button>Get Started</Button>
          <Button variant="outline">View Docs</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">⚡ Lightning Fast</h3>
          <p className="text-gray-300">Edge-optimized delivery with global CDN</p>
        </div>
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">🔌 API First</h3>
          <p className="text-gray-300">GraphQL + REST APIs for maximum flexibility</p>
        </div>
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">🔒 Secure</h3>
          <p className="text-gray-300">Enterprise-grade security with OWASP compliance</p>
        </div>
      </div>
    </main>
  )
}
