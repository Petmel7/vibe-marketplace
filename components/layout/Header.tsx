'use client'

import { useState, type ReactNode } from 'react'
import { Search, CircleUser, Menu, ListPlus } from 'lucide-react'
import SearchOverlay from '@/components/search/SearchOverlay'
import CartIcon from '@/components/cart/CartIcon'
import WishlistIcon from '../wishlist/WishlistIcon'
import Logo from '../ui/Logo'

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

export default function Header() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <>
      <HeaderBase className="md:hidden">
        <MobileHeader onSearch={() => setIsSearchOpen(true)} />
      </HeaderBase>

      <HeaderBase className="hidden md:block relative">
        <DesktopHeader onSearch={() => setIsSearchOpen(true)} />
      </HeaderBase>

      <SearchOverlay
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
}

function HeaderBase({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <header className={`ui-header-shell h-18 ${className}`}>
      <div className="ui-container relative flex h-full items-center">
        {children}
      </div>
    </header>
  );
}

function MobileHeader({ onSearch }: { onSearch: () => void }) {
  return (
    <>
      {/* left */}
      <div className="flex flex-1 items-center gap-3">
        <Logo />
      </div>

      {/* right */}
      <nav className="flex items-center gap-5">
        <HeaderIconButton label="Пошук" onClick={onSearch}>
          <Search size={24} color="#E8E9EA" />
        </HeaderIconButton>

        <HeaderIconButton label="Профіль користувача">
          <CircleUser size={24} color="#E8E9EA" />
        </HeaderIconButton>
      </nav>
    </>
  );
}

function DesktopHeader({ onSearch }: { onSearch: () => void }) {
  return (
    <>
      {/* left */}
      <div className="flex items-center gap-3">
        <Logo />
      </div>

      {/* center (Menu instead of Logo) */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <button className="ui-icon-button flex items-center gap-2">
          <Menu size={24} color="#E8E9EA" />
          <span className="text-sm font-medium text-[#E8E9EA]">Меню</span>
        </button>
      </div>

      {/* right */}
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
    </>
  );
}
