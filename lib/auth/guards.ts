import { UserRole } from '@/app/generated/prisma/client'
import { requireRole } from '@/lib/rbac/guards'
import type { SessionUser } from '@/features/auth/auth.dto'

export function requireBuyer(user: SessionUser): void {
  requireRole(user, UserRole.BUYER)
}

export function requireSeller(user: SessionUser): void {
  requireRole(user, UserRole.SELLER)
}

export function requireAdmin(user: SessionUser): void {
  requireRole(user, UserRole.ADMIN)
}
