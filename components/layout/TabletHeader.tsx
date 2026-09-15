'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { LayoutGrid, List, Search } from 'lucide-react'
import type { CategoryTreeNode } from '@/components/category/category.data'
import type { SessionUser } from '@/types/auth'
import AuthUserMenu from '@/components/auth/AuthUserMenu'
import CartIcon from '@/components/cart/CartIcon'
import NotificationBell from '@/components/notifications/NotificationBell'
import WishlistIcon from '@/components/wishlist/WishlistIcon'
import {
  ICON_BADGE_DESKTOP_HEADER_TEXT_OFFSET_CLASS,
  ICON_BADGE_HEADER_ROOT_CLASS,
  ICON_BADGE_TABLET_HEADER_POSITION_CLASS,
} from '@/components/ui/IconWithBadge'
import Logo from '@/components/ui/Logo'
import HeaderIconButton from './HeaderIconButton'
import MobileCategorySheet, { MOBILE_CATEGORY_SHEET_ID } from './MobileCategorySheet'

const TABLET_ICON_BUTTON_CLASS =
  'ui-icon-button h-10 w-10 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand'
const TABLET_BADGE_ICON_CLASS = `${ICON_BADGE_HEADER_ROOT_CLASS} h-10 w-10`

export default function TabletHeader({
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
    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    const closeAtDesktop = (event: MediaQueryListEvent | MediaQueryList) => {
      if (event.matches) {
        setIsCategorySheetOpen(false)
      }
    }

    mediaQuery.addEventListener('change', closeAtDesktop)

    return () => {
      mediaQuery.removeEventListener('change', closeAtDesktop)
    }
  }, [])

  return (
    <>
      <div className="flex flex-1 items-center gap-3">
        <Logo />
      </div>

      <nav className="flex items-center gap-3" aria-label="Навігація планшетної шапки">
        <Link
          href="/catalog"
          className="inline-flex h-10 items-center gap-2 rounded-full border border-panelBorder px-4 text-sm font-medium text-[#E8E9EA] transition-colors hover:border-brand/60 hover:bg-panel/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <LayoutGrid size={20} color="currentColor" aria-hidden="true" />
          Каталог
        </Link>

        <button
          type="button"
          className={TABLET_ICON_BUTTON_CLASS}
          aria-label="Відкрити категорії"
          aria-expanded={isCategorySheetOpen}
          aria-controls={MOBILE_CATEGORY_SHEET_ID}
          aria-haspopup="dialog"
          onClick={() => setIsCategorySheetOpen(true)}
        >
          <List size={22} color="#E8E9EA" aria-hidden="true" />
        </button>

        <HeaderIconButton
          label="Пошук"
          onClick={onSearch}
          className={TABLET_ICON_BUTTON_CLASS}
        >
          <Search size={22} color="#E8E9EA" aria-hidden="true" />
        </HeaderIconButton>

        {user ? (
          <NotificationBell
            triggerClassName={TABLET_BADGE_ICON_CLASS}
            badgeClassName={ICON_BADGE_TABLET_HEADER_POSITION_CLASS}
          />
        ) : null}

        <WishlistIcon
          className={TABLET_BADGE_ICON_CLASS}
          badgeClassName={ICON_BADGE_TABLET_HEADER_POSITION_CLASS}
          countTextClassName={ICON_BADGE_DESKTOP_HEADER_TEXT_OFFSET_CLASS}
        />

        <CartIcon
          className={TABLET_BADGE_ICON_CLASS}
          badgeClassName={ICON_BADGE_TABLET_HEADER_POSITION_CLASS}
          countTextClassName={ICON_BADGE_DESKTOP_HEADER_TEXT_OFFSET_CLASS}
        />

        <AuthUserMenu user={user} triggerClassName={TABLET_ICON_BUTTON_CLASS} />
      </nav>

      <MobileCategorySheet
        categories={categories}
        open={isCategorySheetOpen}
        onClose={() => setIsCategorySheetOpen(false)}
      />
    </>
  )
}
