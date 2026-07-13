import { describe, expect, it } from 'vitest'
import type { SessionUser } from '@/types/auth'
import {
  getDefaultAuthenticatedHref,
  getRoleAwareNavLinks,
} from '@/lib/auth/navigation'
import { getPostAuthRedirectPath, getSafeRedirectPath } from '@/lib/auth/redirects'
import { ROLE_VALUES } from '@/lib/constants/roles'
import type { UserRole } from '@/types/roles'

function makeUser(roles: UserRole[]): SessionUser {
  return {
    id: 'user-1',
    email: 'person@example.com',
    roles,
  }
}

describe('auth navigation helpers', () => {
  it('prefers admin destination when the user is an admin', () => {
    expect(getDefaultAuthenticatedHref(makeUser([ROLE_VALUES.BUYER, ROLE_VALUES.ADMIN]))).toBe('/admin')
  })

  it('falls back to seller destination when the user is not an admin', () => {
    expect(getDefaultAuthenticatedHref(makeUser([ROLE_VALUES.BUYER, ROLE_VALUES.SELLER]))).toBe('/seller')
  })

  it('falls back to profile for buyers', () => {
    expect(getDefaultAuthenticatedHref(makeUser([ROLE_VALUES.BUYER]))).toBe('/profile')
  })

  it('builds role-aware navigation links', () => {
    expect(getRoleAwareNavLinks(makeUser([ROLE_VALUES.BUYER, ROLE_VALUES.SELLER]))).toEqual([
      { href: '/profile', label: 'Акаунт' },
      { href: '/seller', label: 'Продавець' },
    ])
  })
})

describe('auth redirect helpers', () => {
  it('rejects non-local redirect targets', () => {
    expect(getSafeRedirectPath('https://example.com', '/profile')).toBe('/profile')
    expect(getSafeRedirectPath('//example.com', '/profile')).toBe('/profile')
  })

  it('rejects auth-page redirect loops', () => {
    expect(getSafeRedirectPath('/login?next=/admin', '/profile')).toBe('/profile')
    expect(getSafeRedirectPath('/register', '/profile')).toBe('/profile')
  })

  it('accepts safe local redirect targets', () => {
    expect(getSafeRedirectPath('/seller/orders', '/profile')).toBe('/seller/orders')
  })

  it('falls back to the default authenticated path when next is unsafe', () => {
    expect(getPostAuthRedirectPath(makeUser([ROLE_VALUES.ADMIN]), 'https://bad.example')).toBe('/admin')
  })
})
