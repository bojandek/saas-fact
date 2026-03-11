import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from './lib/supabase-client'
import { cookies } from 'next/headers'

/**
 * Middleware za zaštitu ruta - provjerava autentifikaciju
 */
export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)

  const cookieStore = await cookies()

  const supabase = createServerClient(cookieStore)

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (userError || !user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  requestHeaders.set('x-user-id', user.id)
  requestHeaders.set('x-tenant-id', user.tenant_id)
  requestHeaders.set('x-user-role', user.role)

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/admin/:path*', '/api/user/:path*'],
}