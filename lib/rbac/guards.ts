import { UserRole } from '@/app/generated/prisma/client'
import { ForbiddenError } from '@/lib/errors/auth'
import type { SessionUser } from '@/features/auth/auth.dto'

export function hasRole(user: SessionUser, role: UserRole): boolean {
  return user.roles.includes(role)
}

export function requireRole(user: SessionUser, role: UserRole): void {
  if (!hasRole(user, role)) {
    throw new ForbiddenError(`Role ${role} required`)
  }
}
