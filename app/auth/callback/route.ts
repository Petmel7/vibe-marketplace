import { revalidatePath } from 'next/cache'
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { syncUser } from '@/features/auth/auth.service'
import { getPostAuthRedirectPath, getSafeRedirectPath } from '@/lib/auth/redirects'
import { logError } from '@/utils/logger'

function redirectToLogin(request: NextRequest) {
  return NextResponse.redirect(new URL('/login?notice=auth-required', request.url))
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const next = requestUrl.searchParams.get('next')
  const code = requestUrl.searchParams.get('code')
  const tokenHash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')

  const supabase = await createServerClient()

  try {
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        logError('GET /auth/callback exchangeCodeForSession', error)
        return redirectToLogin(request)
      }
    } else if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as 'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change' | 'email',
      })

      if (error) {
        logError('GET /auth/callback verifyOtp', error)
        return redirectToLogin(request)
      }
    } else {
      return redirectToLogin(request)
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return redirectToLogin(request)
    }

    const sessionUser = await syncUser(user)
    revalidatePath('/', 'layout')

    return NextResponse.redirect(
      new URL(getPostAuthRedirectPath(sessionUser, next), request.url)
    )
  } catch (error) {
    logError('GET /auth/callback', error)
    return redirectToLogin(request)
  }
}
