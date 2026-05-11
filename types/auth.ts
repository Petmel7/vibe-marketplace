import type { UserRole } from '@/types/roles'

export type SessionUser = {
  id: string
  email: string
  roles: UserRole[]
}
