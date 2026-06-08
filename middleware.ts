import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/server'

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)
  requestHeaders.set('x-request-id', request.headers.get('x-request-id') ?? crypto.randomUUID())

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  const pathname = request.nextUrl.pathname

  const requestId = requestHeaders.get('x-request-id')
  if (requestId) {
    response.headers.set('x-request-id', requestId)
  }

  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')

  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    )
  }

  if (pathname.startsWith('/api/')) {
    return response
  }

  const supabase = createMiddlewareClient(request, response)
  // const { data } = await supabase.auth.getSession()
  // console.log('data.session?.access_token:', data.session?.access_token)

  // Refresh session cookies for SSR and gate protected route entry points.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isProtectedRoute =
    pathname === '/profile' ||
    pathname.startsWith('/profile/') ||
    pathname === '/seller' ||
    pathname.startsWith('/seller/') ||
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === '/wishlist' ||
    pathname.startsWith('/wishlist/')

  if (isProtectedRoute && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('notice', 'auth-required')
    loginUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
