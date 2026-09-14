'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search } from 'lucide-react'
import type { CategoryTreeNode } from '@/components/category/category.data'
import type { SessionUser } from '@/types/auth'
import CartIcon from '@/components/cart/CartIcon'
import AuthUserMenu from '@/components/auth/AuthUserMenu'
import NotificationBell from '@/components/notifications/NotificationBell'
import WishlistIcon from '../wishlist/WishlistIcon'
import CatalogToggleButton from '../ui/CatalogToggleButton'
import Logo from '../ui/Logo'
import HeaderIconButton from './HeaderIconButton'
import MegaMenu from '../mega-menu/MegaMenu'
import {
  ICON_BADGE_DESKTOP_HEADER_POSITION_CLASS,
  ICON_BADGE_DESKTOP_HEADER_TEXT_OFFSET_CLASS,
} from '../ui/IconWithBadge'

export default function DesktopHeader({
  categories,
  user,
  onSearch,
}: {
  categories: CategoryTreeNode[]
  user: SessionUser | null
  onSearch: () => void
}) {
  const pathname = usePathname()
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [catalogOpenPath, setCatalogOpenPath] = useState<string | null>(null)
  const [activeRootSlug, setActiveRootSlug] = useState<string | null>(null)
  const isCatalogOpen = catalogOpenPath === pathname

  const currentRootSlug = useMemo(() => {
    if (!categories.length) return null

    if (activeRootSlug && categories.some((category) => category.slug === activeRootSlug)) {
      return activeRootSlug
    }

    return categories[0].slug
  }, [activeRootSlug, categories])

  const handleToggleCatalog = useCallback(() => {
    if (!categories.length) return
    setCatalogOpenPath((current) => (current === pathname ? null : pathname))
  }, [categories.length, pathname])

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent) => {
      if (event.key === 'ArrowDown' && !isCatalogOpen && categories.length > 0) {
        event.preventDefault()
        setCatalogOpenPath(pathname)
      }
    },
    [isCatalogOpen, categories.length, pathname]
  )

  useEffect(() => {
    if (!isCatalogOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setCatalogOpenPath(null)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCatalogOpenPath(null)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isCatalogOpen])

  return (
    <div ref={menuRef} className="flex w-full items-center gap-6">
      <div className="flex items-center gap-3">
        <Logo />
      </div>

      <CatalogToggleButton
        isOpen={isCatalogOpen}
        onToggle={handleToggleCatalog}
        onKeyDown={handleKeyDown}
      />

      <Link
        href="/catalog"
        className="rounded-full border border-panelBorder px-4 py-2 text-sm font-medium text-[#E8E9EA] transition-colors hover:border-brand/60 hover:bg-panel/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        Каталог
      </Link>

      <nav className="ml-auto flex items-center gap-5">
        <HeaderIconButton label="Пошук" onClick={onSearch}>
          <Search size={24} color="#E8E9EA" />
        </HeaderIconButton>

        {user ? <NotificationBell /> : null}

        <WishlistIcon
          badgeClassName={ICON_BADGE_DESKTOP_HEADER_POSITION_CLASS}
          countTextClassName={ICON_BADGE_DESKTOP_HEADER_TEXT_OFFSET_CLASS}
        />

        <CartIcon
          badgeClassName={ICON_BADGE_DESKTOP_HEADER_POSITION_CLASS}
          countTextClassName={ICON_BADGE_DESKTOP_HEADER_TEXT_OFFSET_CLASS}
        />

        <AuthUserMenu user={user} />
      </nav>

      {isCatalogOpen && categories.length > 0 && currentRootSlug ? (
        <div id="mega-menu-categories" className="absolute inset-x-0 top-full">
          <MegaMenu
            categories={categories}
            activeRootSlug={currentRootSlug}
            onRootSelect={setActiveRootSlug}
            onNavigate={() => setCatalogOpenPath(null)}
          />
        </div>
      ) : null}
    </div>
  )
}
