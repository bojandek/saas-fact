import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Factory Dashboard Middleware
 *
 * Responsibilities:
 *  1. Protect all dashboard pages (redirect to /auth/login if unauthenticated)
 *  2. Protect all /api/* routes (return 401 JSON if unauthenticated)
 *  3. Add HTTP security headers to every response
 *
 * Public routes (no auth required):
 *  - /auth/*            Login, signup, password reset pages
 *  - /api/health        Health check endpoint
 *  - /pricing           Public pricing page
 *  - /_next/*           Next.js static assets
 *  - /favicon.ico
 */

// ─── Public Routes ───────────────────────────────────────────────────────────

const PUBLIC_PAGE_PREFIXES = ['/auth', '/pricing']
const PUBLIC_API_ROUTES = ['/api/health']

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_API_ROUTES.includes(pathname)) return true
  return PUBLIC_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

// ─── Security Headers ────────────────────────────────────────────────────────

function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY')
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')
  // Enable XSS protection in older browsers
  response.headers.set('X-XSS-Protection', '1; mode=block')
  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  // Permissions policy - disable unnecessary browser features
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  )
  // Content Security Policy - allow same-origin + Supabase + Stripe
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com https://api.anthropic.com https://api.stripe.com",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
    ].join('; ')
  )
  return response
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip auth check for public routes
  if (isPublicRoute(pathname)) {
    const response = NextResponse.next({ request })
    return addSecurityHeaders(response)
  }

  // Initialize Supabase client for auth check
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ─── API Routes: Return 401 JSON (not a redirect) ─────────────────────────
  if (pathname.startsWith('/api/')) {
    if (!user) {
      return addSecurityHeaders(
        NextResponse.json(
          {
            error: 'Unauthorized',
            message: 'Authentication required. Please sign in to use this API.',
          },
          { status: 401 }
        )
      )
    }
    // Inject user ID into request headers for downstream handlers
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', user.id)
    requestHeaders.set('x-user-email', user.email ?? '')

    const apiResponse = NextResponse.next({
      request: { headers: requestHeaders },
    })
    return addSecurityHeaders(apiResponse)
  }

  // ─── Page Routes: Redirect to login ──────────────────────────────────────
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirectedFrom', pathname)
    return NextResponse.redirect(url)
  }

  return addSecurityHeaders(supabaseResponse)
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
