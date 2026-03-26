import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'SaaS Factory Control Center',
  description: 'God View za upravljanje SaaS aplikacijama sa MetaClaw evolutionary system',
};

const NAV_ITEMS = [
  { href: '/', label: '🏠 Dashboard' },
  { href: '/generate', label: '🚀 Generate' },
  { href: '/fleet', label: '🚢 Fleet' },
  { href: '/evolution', label: '🧬 Evolution' },
  { href: '/learning', label: '📚 Learning' },
  { href: '/pricing', label: '💰 Pricing' },
  { href: '/knowledge', label: '🔗 Knowledge' },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-white">
        <div className="min-h-screen flex flex-col">
          {/* Header */}
          <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between py-3">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                  <div className="text-2xl">🏭</div>
                  <div>
                    <h1 className="text-base font-bold leading-tight">SaaS Factory</h1>
                    <p className="text-xs text-slate-500">Control Center</p>
                  </div>
                </Link>

                {/* Nav */}
                <nav className="hidden md:flex items-center gap-0.5">
                  {NAV_ITEMS.map(nav => (
                    <Link
                      key={nav.href}
                      href={nav.href}
                      className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-all"
                    >
                      {nav.label}
                    </Link>
                  ))}
                </nav>

                {/* Status pill */}
                <div className="flex items-center gap-2 bg-emerald-900/30 border border-emerald-500/20 rounded-full px-3 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-emerald-400 font-medium">Gen 42 • Live</span>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t border-slate-800 bg-slate-900/30 py-4 text-center text-xs text-slate-600">
            © 2026 SaaS Factory — MetaClaw Evolution Engine • Knowledge Graph • Autonomous Learning Loop
          </footer>
        </div>
      </body>
    </html>
  );
}
