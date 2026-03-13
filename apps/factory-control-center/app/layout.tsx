import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SaaS Factory Control Center - Master Dashboard',
  description: 'God View za upravljanje 150+ SaaS aplikacija sa MetaClaw evolutionary system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-white">
        <div className="min-h-screen">
          {/* Header */}
          <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-bold">🏭</div>
                  <div>
                    <h1 className="text-xl font-bold">SaaS Factory Control Center</h1>
                    <p className="text-sm text-slate-400">Master Dashboard • MetaClaw Evolution System</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-medium">Generation</p>
                    <p className="text-2xl font-bold text-emerald-400">42</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t border-slate-800 bg-slate-900/50 py-4 text-center text-sm text-slate-400">
            <p>© 2026 SaaS Factory. Powered by MetaClaw Evolution Engine & Knowledge Graph.</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
