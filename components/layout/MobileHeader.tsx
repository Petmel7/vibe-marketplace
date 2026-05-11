'use client'

import { Search } from 'lucide-react'
import type { SessionUser } from '@/types/auth'
import AuthUserMenu from '@/components/auth/AuthUserMenu'
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
        <HeaderIconButton label="Search" onClick={onSearch}>
          <Search size={24} color="#E8E9EA" />
        </HeaderIconButton>

        <AuthUserMenu user={user} />
      </nav>
    </>
  )
}
