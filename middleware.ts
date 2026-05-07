import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })
  const supabase = createMiddlewareClient(request, response)

  // Refresh session cookie if expired — required by @supabase/ssr.
  // This does NOT block unauthenticated requests. Per-route auth enforcement
  // is done via requireAuth() in individual handlers.
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/products|api/categories).*)',
  ],
}
