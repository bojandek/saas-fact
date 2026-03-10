export default function Dashboard() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">SaaS Factory Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold">Projects</h2>
            <p className="text-4xl font-bold">1</p>
            <p className="text-sm text-gray-500">Live / Dev / Idea</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold">MRR</h2>
            <p className="text-4xl font-bold">$0</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold">Status</h2>
            <p className="text-xl">All healthy</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a href="/new-project" className="bg-blue-500 text-white p-6 rounded-lg text-center hover:bg-blue-600">
                New Project
              </a>
              <a href="/blocks" className="bg-green-500 text-white p-6 rounded-lg text-center hover:bg-green-600">
                Block Library
              </a>
              <a href="/deploy" className="bg-purple-500 text-white p-6 rounded-lg text-center hover:bg-purple-600">
                Deploy Center
              </a>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-4">Brain Chat</h2>
            <div className="bg-gray-100 p-4 rounded-lg h-64">
              Ask Brain: "Suggest architecture for booking SaaS"
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
