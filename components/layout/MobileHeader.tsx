'use client'

import { Search } from 'lucide-react'
import type { SessionUser } from '@/types/auth'
import AuthUserMenu from '@/components/auth/AuthUserMenu'
import NotificationBell from '@/components/notifications/NotificationBell'
import HeaderIconButton from './HeaderIconButton'
import Logo from '../ui/Logo'

export default function MobileHeader({
  user,
  onSearch,
}: {
  user: SessionUser | null
  onSearch: () => void
}) {
  return (
    <>
      <div className="flex flex-1 items-center gap-3">
        <Logo />
      </div>

      <nav className="flex items-center gap-5">
        <HeaderIconButton label="Пошук" onClick={onSearch}>
          <Search size={24} color="#E8E9EA" />
        </HeaderIconButton>

        {user ? <NotificationBell /> : null}

        <AuthUserMenu user={user} />
      </nav>
    </>
  )
}
