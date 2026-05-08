import { UserRole } from '@/app/generated/prisma/client'
import { AdminAccessError, SelfModerationError } from '@/lib/errors/admin'
import type { SessionUser } from '@/features/auth/auth.dto'

export function assertAdminAccess(user: SessionUser): void {
  if (!user.roles.includes(UserRole.ADMIN)) {
    throw new AdminAccessError()
  }
}

export function assertNotSelfModeration(adminId: string, targetId: string): void {
  if (adminId === targetId) {
    throw new SelfModerationError()
  }
}
