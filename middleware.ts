import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/server'

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  const supabase = createMiddlewareClient(request, response)
  // const { data } = await supabase.auth.getSession()
  // console.log('data.session?.access_token:', data.session?.access_token)
  const pathname = request.nextUrl.pathname

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
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
