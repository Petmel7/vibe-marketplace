'use client'

import { useEffect, useState } from 'react'
import { List, Search } from 'lucide-react'
import type { CategoryTreeNode } from '@/components/category/category.data'
import type { SessionUser } from '@/types/auth'
import AuthUserMenu from '@/components/auth/AuthUserMenu'
import NotificationBell from '@/components/notifications/NotificationBell'
import HeaderIconButton from './HeaderIconButton'
import MobileCategorySheet, { MOBILE_CATEGORY_SHEET_ID } from './MobileCategorySheet'
import Logo from '../ui/Logo'

export default function MobileHeader({
  categories,
  user,
  onSearch,
}: {
  categories: CategoryTreeNode[]
  user: SessionUser | null
  onSearch: () => void
}) {
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)')
    const closeAtTablet = (event: MediaQueryListEvent | MediaQueryList) => {
      if (event.matches) {
        setIsCategorySheetOpen(false)
      }
    }

    mediaQuery.addEventListener('change', closeAtTablet)

    return () => {
      mediaQuery.removeEventListener('change', closeAtTablet)
    }
  }, [])

  return (
    <>
      <div className="flex flex-1 items-center gap-3">
        <Logo />
      </div>

      <nav className="flex items-center gap-5">
        <HeaderIconButton label="Пошук" onClick={onSearch}>
          <Search size={24} color="#E8E9EA" />
        </HeaderIconButton>

        <button
          type="button"
          className="ui-icon-button h-10 w-10"
          aria-label="Відкрити категорії"
          aria-expanded={isCategorySheetOpen}
          aria-controls={MOBILE_CATEGORY_SHEET_ID}
          onClick={() => setIsCategorySheetOpen(true)}
        >
          <List size={24} color="#E8E9EA" aria-hidden="true" />
        </button>

        {user ? <NotificationBell /> : null}

        <AuthUserMenu user={user} />
      </nav>

      <MobileCategorySheet
        categories={categories}
        open={isCategorySheetOpen}
        onClose={() => setIsCategorySheetOpen(false)}
      />
    </>
  )
}
