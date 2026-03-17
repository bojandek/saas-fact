import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "../components/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "SaaS Factory Dashboard",
  description: "AI-powered control center for SaaS generation",
  keywords: ["SaaS", "AI", "Factory", "Dashboard"],
  openGraph: {
    title: "SaaS Factory Dashboard",
    description: "AI-powered control center for SaaS generation",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // suppressHydrationWarning prevents React hydration mismatch
    // caused by ThemeProvider reading localStorage on client
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${
          inter.className
        } bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-50 transition-colors duration-200`}
      >
        <ThemeProvider defaultTheme="system" storageKey="saas-factory-theme">
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}