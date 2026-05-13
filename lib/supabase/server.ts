import { createServerClient as createSSRServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { NextRequest, NextResponse } from 'next/server'
import { env } from '@/config/env'

/**
 * Server-side Supabase client for Server Components and Route Handlers.
 * Uses the anon key — never the service role key.
 * Creates a new instance per request (cookies() is request-scoped).
 */
export async function createServerClient() {
  const cookieStore = await cookies()

  return createSSRServerClient(
    env.supabaseUrl,
    env.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from a Server Component — cookie writes are no-ops.
            // Middleware must handle the token refresh write-back in that case.
          }
        },
      },
    }
  )
}

/**
 * Middleware-specific Supabase client.
 * Reads cookies from the request and writes updated cookies to the response.
 * This is required so that token refreshes are persisted across requests.
 */
export function createMiddlewareClient(
  request: NextRequest,
  response: NextResponse
) {
  return createSSRServerClient(
    env.supabaseUrl,
    env.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )
}
