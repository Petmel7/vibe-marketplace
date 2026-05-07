import type { UserRole } from '@/app/generated/prisma/client'

export type SessionUser = {
  id: string
  email: string
  roles: UserRole[]
}

export type AuthSyncResponse = {
  user: SessionUser
}
