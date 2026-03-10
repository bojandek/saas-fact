export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-6xl font-bold mb-8">Frizerski Salon Booking</h1>
      <p className="text-xl mb-8">Rezerviši termin za striženje</p>
      <div className="space-x-4">
        <a href="/login" className="px-8 py-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
          Login
        </a>
        <a href="/register" className="px-8 py-4 bg-green-500 text-white rounded-lg hover:bg-green-600">
          Register
        </a>
        <a href="/pricing" className="px-8 py-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600">
          Pricing
        </a>
      </div>
    </main>
  )
}