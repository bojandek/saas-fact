import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from './lib/supabase-client'
import { resolveOrgId } from './lib/org-context'
import { cookies } from 'next/headers'

/**
 * Middleware za zaštitu ruta - provjerava autentifikaciju i postavlja org_id
 * za RLS (Row Level Security) enforcement.
 *
 * Dodaje sljedeće headere na svaki zahtjev:
 *   x-user-id    — Supabase user UUID
 *   x-org-id     — Primary org_id za RLS (iz org_members tabele)
 *   x-user-role  — Korisnička rola (owner/admin/member/viewer)
 *   x-tenant-id  — Legacy tenant_id (backward compat)
 */
export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)

  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    // API rute vraćaju 401, stranice redirectuju na login
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      )
    }
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, role, tenant_id')
    .eq('id', session.user.id)
    .single()

  if (userError || !user) {
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'User not found', code: 'USER_NOT_FOUND' },
        { status: 401 }
      )
    }
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Resolve org_id for RLS context
  const orgId = await resolveOrgId(supabase, user.id)

  // Set headers for downstream API handlers and Server Components
  requestHeaders.set('x-user-id', user.id)
  requestHeaders.set('x-user-role', user.role ?? 'member')
  requestHeaders.set('x-tenant-id', user.tenant_id ?? '')

  if (orgId) {
    requestHeaders.set('x-org-id', orgId)
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  return response
}

export const config = {
  matcher: [
    // Dashboard pages
    '/dashboard/:path*',
    // All API routes except public ones
    '/api/((?!auth|health|webhooks/stripe).*)',
    // Factory dashboard pages
    '/orchestrator/:path*',
    '/fleet/:path*',
    '/memory/:path*',
    '/block-editor/:path*',
    '/pricing/:path*',
  ],
}
