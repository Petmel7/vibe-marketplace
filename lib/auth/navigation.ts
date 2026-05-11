import type { SessionUser } from '@/types/auth'
import { ROLE_VALUES, hasRole } from '@/lib/constants/roles'

export type RoleAwareNavLink = {
  href: string
  label: string
}

export function getDefaultAuthenticatedHref(user: SessionUser): string {
  if (hasRole(user.roles, ROLE_VALUES.ADMIN)) return '/admin'
  if (hasRole(user.roles, ROLE_VALUES.SELLER)) return '/seller'
  return '/profile'
}

export function getRoleAwareNavLinks(user: SessionUser): RoleAwareNavLink[] {
  const links: RoleAwareNavLink[] = [{ href: '/profile', label: 'Account' }]

  if (hasRole(user.roles, ROLE_VALUES.SELLER)) {
    links.push({ href: '/seller', label: 'Seller' })
  }

  if (hasRole(user.roles, ROLE_VALUES.ADMIN)) {
    links.push({ href: '/admin', label: 'Admin' })
  }

  return links
}

export function getGuestNavLinks(): RoleAwareNavLink[] {
  return [
    { href: '/login', label: 'Sign in' },
    { href: '/register', label: 'Create account' },
  ]
}
