import type { SessionUser } from '@/types/auth'
import { getDefaultAuthenticatedHref } from '@/lib/auth/navigation'

export function getSafeRedirectPath(candidate: string | null | undefined, fallback = '/profile'): string {
  if (!candidate) return fallback
  if (!candidate.startsWith('/')) return fallback
  if (candidate.startsWith('//')) return fallback
  if (candidate.startsWith('/login') || candidate.startsWith('/register')) return fallback
  return candidate
}

export function getPostAuthRedirectPath(
  user: SessionUser,
  candidate: string | null | undefined
): string {
  return getSafeRedirectPath(candidate, getDefaultAuthenticatedHref(user))
}
