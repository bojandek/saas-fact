import { type NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

import type { Database } from '@saas-factory/db'

export async function middleware(request: NextRequest) {
  const supabase = createServerComponentClient<Database>({ cookies })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Redirect to login if no session
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Optional: Check tenant_id in session.user.user_metadata
  const tenantId = session.user.user_metadata?.tenant_id
  if (!tenantId && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/setup-tenant', request.url))
  }

  return NextResponse.next({
    request: {
      headers: request.headers,
    },
  })
}

export const config = {
  matcher: [
    '/((?!login|register|api|public|_next|_vercel|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$)).*',
  ],
}