'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import type { SessionUser } from '@/features/auth/auth.dto'
import {
  authCredentialsSchema,
  type AuthActionState,
} from '@/features/auth/auth-form.schema'
import { getPostAuthRedirectPath } from '@/lib/auth/redirects'
import { getDefaultAuthenticatedHref } from '@/lib/auth/navigation'

import { mergeGuestViewedProducts } from '@/features/viewed/viewed.repository'
import { getVisitorId } from '@/lib/visitor/visitor.server'
import { logError } from '@/utils/logger'

/**
 * Best-effort: transfer the guest visitor's viewed-product history onto the
 * just-authenticated user. We deliberately swallow errors — failing here must
 * never block sign-in / sign-up. The visitor cookie is left in place so it
 * expires naturally; we do not clear it (a follow-up request as the now-auth'd
 * user will simply ignore it because the API prefers the user identifier).
 */
async function mergeGuestViewsAfterAuth(userId: string): Promise<void> {
  try {
    const visitorId = await getVisitorId()
    if (!visitorId) return
    await mergeGuestViewedProducts(visitorId, userId)
  } catch (error) {
    logError('mergeGuestViewsAfterAuth', error)
  }
}

function mapSupabaseAuthError(code?: string, message?: string): string {
  switch (code) {
    case 'invalid_credentials':
      return 'Incorrect email or password.'
    case 'email_not_confirmed':
      return 'Please verify your email before signing in.'
    case 'user_already_exists':
      return 'An account with this email already exists.'
    case 'weak_password':
      return 'Use a stronger password and try again.'
    default:
      if (message?.toLowerCase().includes('already registered')) {
        return 'An account with this email already exists.'
      }
      return 'We could not complete your request. Please try again.'
  }
}

async function getRequestOrigin(): Promise<string> {
  const requestHeaders = await headers()
  const protocol = requestHeaders.get('x-forwarded-proto') ?? 'http'
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host')

  if (!host) {
    throw new Error('Missing request host for auth sync')
  }

  return `${protocol}://${host}`
}

async function syncAuthenticatedUser(accessToken: string): Promise<SessionUser> {
  const origin = await getRequestOrigin()
  const response = await fetch(`${origin}/api/auth/sync`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error('Failed to sync authenticated user')
  }

  const payload = (await response.json()) as
    | { success: true; data: SessionUser }
    | { success: false; error: { message: string; code: string } }

  if (!payload.success) {
    throw new Error('Failed to sync authenticated user')
  }

  return payload.data
}

export async function signInWithPasswordAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const validated = authCredentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    next: formData.get('next'),
  })

  if (!validated.success) {
    return { fieldErrors: validated.error.flatten().fieldErrors }
  }

  const { email, password, next } = validated.data

  const supabase = await createServerClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error || !data.session) {
    return {
      formError: mapSupabaseAuthError(error?.code, error?.message),
    }
  }

  const sessionUser = await syncAuthenticatedUser(
    data.session.access_token
  )

  await mergeGuestViewsAfterAuth(sessionUser.id)

  revalidatePath('/', 'layout')

  redirect(getPostAuthRedirectPath(sessionUser, next))
}

export async function signUpWithPasswordAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const validated = authCredentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    next: formData.get('next'),
  })

  if (!validated.success) {
    return { fieldErrors: validated.error.flatten().fieldErrors }
  }

  const { email, password, next } = validated.data
  const supabase = await createServerClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    return { formError: mapSupabaseAuthError(error.code, error.message) }
  }

  if (data.session?.access_token) {
    const sessionUser = await syncAuthenticatedUser(data.session.access_token)
    await mergeGuestViewsAfterAuth(sessionUser.id)
    revalidatePath('/', 'layout')
    redirect(getPostAuthRedirectPath(sessionUser, next))
  }

  redirect('/login?notice=check-email')
}

export async function signOutAction(): Promise<void> {
  const supabase = await createServerClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login?notice=signed-out')
}

export async function redirectAuthenticatedUser(user: SessionUser, next: string | null | undefined) {
  redirect(getPostAuthRedirectPath(user, next))
}

export async function redirectAfterAuthFallback(user: SessionUser) {
  redirect(getDefaultAuthenticatedHref(user))
}
