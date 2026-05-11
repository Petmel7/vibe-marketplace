'use client'

import type { SessionUser } from '@/types/auth'
import AuthUserMenu from '@/components/auth/AuthUserMenu'

export default function AuthNavigation({ user }: { user: SessionUser | null }) {
  return <AuthUserMenu user={user} />
}
