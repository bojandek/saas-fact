/**
 * Next.js Configuration for SaaS Factory Dashboard
 *
 * Features:
 * - Security headers (CSP, HSTS, X-Frame-Options, etc.)
 * - Standalone output for optimized Docker builds
 * - Bundle analyzer (enabled via ANALYZE=true env var)
 * - Image optimization with allowed domains
 * - Strict mode for catching React issues early
 */

import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const isDev = process.env.NODE_ENV === 'development'
const isAnalyze = process.env.ANALYZE === 'true'

// ── Security Headers ──────────────────────────────────────────────────────────
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  ...(!isDev ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }] : []),
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      isDev ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'" : "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co', pathname: '/storage/v1/object/public/**' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
  webpack(config, { isServer }) {
    if (!isServer) {
      config.resolve.fallback = { ...config.resolve.fallback, fs: false, net: false, tls: false }
    }
    return config
  },
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  logging: { fetches: { fullUrl: isDev } },
}

let config = nextConfig
if (isAnalyze) {
  try {
    const withBundleAnalyzer = require('@next/bundle-analyzer')({ enabled: true, openAnalyzer: true })
    config = withBundleAnalyzer(nextConfig)
  } catch {
    console.warn('⚠️  @next/bundle-analyzer not installed. Run: pnpm add -D @next/bundle-analyzer')
  }
}

export default config