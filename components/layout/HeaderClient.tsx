'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Search, CircleUser, ListPlus, LayoutGrid } from 'lucide-react'
import { usePathname } from 'next/navigation'
import type { CategoryTreeNode } from '@/components/category/category.data'
import SearchOverlay from '@/components/search/SearchOverlay'
import CartIcon from '@/components/cart/CartIcon'
import WishlistIcon from '../wishlist/WishlistIcon'
import Logo from '../ui/Logo'
import MegaMenu from '../mega-menu/MegaMenu'

function HeaderIconButton({
  label,
  children,
  onClick,
}: {
  label: string
  children: ReactNode
  onClick?: () => void
}) {
  return (
    <button aria-label={label} className="ui-icon-button" onClick={onClick}>
      {children}
    </button>
  )
}

export default function HeaderClient({ categories }: { categories: CategoryTreeNode[] }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      <HeaderBase className="md:hidden">
        <MobileHeader onSearch={() => setIsSearchOpen(true)} />
      </HeaderBase>

      <HeaderBase className="relative hidden md:block">
        <DesktopHeader
          key={pathname} // <-- reset state on route change
          categories={categories}
          onSearch={() => setIsSearchOpen(true)}
        />
      </HeaderBase>

      <SearchOverlay
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  )
}

function HeaderBase({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <header className={`ui-header-shell h-18 ${className}`}>
      <div className="ui-container relative flex h-full items-center">
        {children}
      </div>
    </header>
  )
}

function MobileHeader({ onSearch }: { onSearch: () => void }) {
  return (
    <>
      <div className="flex flex-1 items-center gap-3">
        <Logo />
      </div>

      <nav className="flex items-center gap-5">
        <HeaderIconButton label="Пошук" onClick={onSearch}>
          <Search size={24} color="#E8E9EA" />
        </HeaderIconButton>

        <HeaderIconButton label="Профіль користувача">
          <CircleUser size={24} color="#E8E9EA" />
        </HeaderIconButton>
      </nav>
    </>
  )
}

function DesktopHeader({
  categories,
  onSearch,
}: {
  categories: CategoryTreeNode[]
  onSearch: () => void
}) {
  const menuRef = useRef<HTMLDivElement | null>(null)

  const [isCatalogOpen, setIsCatalogOpen] = useState(false)
  const [activeRootSlug, setActiveRootSlug] = useState<string | null>(null)

  const currentRootSlug = useMemo(() => {
    if (!categories.length) return null

    if (activeRootSlug && categories.some(c => c.slug === activeRootSlug)) {
      return activeRootSlug
    }

    return categories[0].slug
  }, [activeRootSlug, categories])

  const handleToggleCatalog = useCallback(() => {
    if (!categories.length) return
    setIsCatalogOpen(prev => !prev)
  }, [categories.length])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'ArrowDown' && !isCatalogOpen && categories.length > 0) {
        event.preventDefault()
        setIsCatalogOpen(true)
      }
    },
    [isCatalogOpen, categories.length]
  )

  // outside click + escape
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

      <div className="absolute left-1/2 -translate-x-1/2">
        <button
          type="button"
          className={[
            'ui-icon-button flex items-center gap-2 rounded-full border px-4 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
            isCatalogOpen
              ? 'border-brand bg-brand/12 text-white'
              : 'border-panelBorder text-[#E8E9EA] hover:border-brand/60 hover:bg-panel/50',
          ].join(' ')}
          aria-expanded={isCatalogOpen}
          aria-controls="mega-menu-catalog"
          aria-haspopup="dialog"
          onClick={handleToggleCatalog}
          onKeyDown={handleKeyDown}
        >
          <LayoutGrid size={20} color="currentColor" />
          <span className="text-sm font-medium">Каталог</span>
        </button>
      </div>

      <nav className="ml-auto flex items-center gap-5">
        <HeaderIconButton label="Пошук" onClick={onSearch}>
          <Search size={24} color="#E8E9EA" />
        </HeaderIconButton>

        <WishlistIcon />

        <HeaderIconButton label="Список бажань">
          <ListPlus size={24} color="#E8E9EA" />
        </HeaderIconButton>

        <CartIcon />

        <HeaderIconButton label="Профіль користувача">
          <CircleUser size={24} color="#E8E9EA" />
        </HeaderIconButton>
      </nav>

      {isCatalogOpen && categories.length > 0 && currentRootSlug && (
        <div id="mega-menu-catalog" className="absolute inset-x-0 top-full">
          <MegaMenu
            categories={categories}
            activeRootSlug={currentRootSlug}
            onRootSelect={setActiveRootSlug}
            onNavigate={() => setIsCatalogOpen(false)}
          />
        </div>
      )}
    </div>
  )
}