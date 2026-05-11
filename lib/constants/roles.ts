import { USER_ROLES, type UserRole } from '@/types/roles'

export const ROLE_VALUES = {
  BUYER: USER_ROLES[0],
  SELLER: USER_ROLES[1],
  ADMIN: USER_ROLES[2],
} as const satisfies Record<UserRole, UserRole>

export function isSellerRole(role: UserRole): boolean {
  return role === ROLE_VALUES.SELLER
}

export function isAdminRole(role: UserRole): boolean {
  return role === ROLE_VALUES.ADMIN
}

export function hasRole(roles: readonly UserRole[], role: UserRole): boolean {
  return roles.includes(role)
}
