'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Search } from 'lucide-react'
import type { CategoryTreeNode } from '@/components/category/category.data'
import type { SessionUser } from '@/types/auth'
import CartIcon from '@/components/cart/CartIcon'
import AuthUserMenu from '@/components/auth/AuthUserMenu'
import WishlistIcon from '../wishlist/WishlistIcon'
import CatalogToggleButton from '../ui/CatalogToggleButton'
import Logo from '../ui/Logo'
import HeaderIconButton from './HeaderIconButton'
import MegaMenu from '../mega-menu/MegaMenu'

export default function DesktopHeader({
  categories,
  user,
  onSearch,
}: {
  categories: CategoryTreeNode[]
  user: SessionUser | null
  onSearch: () => void
}) {
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [isCatalogOpen, setIsCatalogOpen] = useState(false)
  const [activeRootSlug, setActiveRootSlug] = useState<string | null>(null)

  const currentRootSlug = useMemo(() => {
    if (!categories.length) return null

    if (activeRootSlug && categories.some((category) => category.slug === activeRootSlug)) {
      return activeRootSlug
    }

    return categories[0].slug
  }, [activeRootSlug, categories])

  const handleToggleCatalog = useCallback(() => {
    if (!categories.length) return
    setIsCatalogOpen((current) => !current)
  }, [categories.length])

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent) => {
      if (event.key === 'ArrowDown' && !isCatalogOpen && categories.length > 0) {
        event.preventDefault()
        setIsCatalogOpen(true)
      }
    },
    [isCatalogOpen, categories.length]
  )

  useEffect(() => {
    if (!isCatalogOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsCatalogOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsCatalogOpen(false)
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

      <nav className="ml-auto flex items-center gap-5">
        <HeaderIconButton label="Search" onClick={onSearch}>
          <Search size={24} color="#E8E9EA" />
        </HeaderIconButton>

        <WishlistIcon />

        <CartIcon />

        <AuthUserMenu user={user} />
      </nav>

      {isCatalogOpen && categories.length > 0 && currentRootSlug ? (
        <div id="mega-menu-catalog" className="absolute inset-x-0 top-full">
          <MegaMenu
            categories={categories}
            activeRootSlug={currentRootSlug}
            onRootSelect={setActiveRootSlug}
            onNavigate={() => setIsCatalogOpen(false)}
          />
        </div>
      ) : null}
    </div>
  )
}
