import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { AuthProvider } from "@saas-factory/auth"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Frizerski Salon Booking - SaaS 001",
  description: "Booking app for hair salons",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}