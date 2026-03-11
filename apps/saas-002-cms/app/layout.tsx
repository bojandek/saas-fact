import type { Metadata } from 'next'
import '../../packages/ui/src/index.ts'
import './globals.css'

export const metadata: Metadata = {
  title: 'ContentFlow - Headless CMS',
  description: 'Modern headless CMS built on SaaS Factory',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 min-h-screen">
        {children}
      </body>
    </html>
  )
}
