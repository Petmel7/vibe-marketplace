'use client'

import { useState, type ReactNode } from 'react'
import Image from 'next/image'
import { Search, CircleUser, Menu, ListPlus } from 'lucide-react'
import SearchOverlay from '@/components/search/SearchOverlay'
import CartIcon from '@/components/cart/CartIcon'
import WishlistIcon from '../wishlist/WishlistIcon'

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
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  return (
    <>
      <header className="ui-header-shell md:hidden h-18">
        <div className="ui-container flex h-full items-center">
          <div className="flex flex-1 items-center gap-3">
            <div className="ui-logo-lockup">
              <Image src="/logo.svg" alt="Вайб" width={30} height={50} priority />
              <span className="ui-logo-text" style={{ width: '161px' }}>
                Вайб
              </span>
            </div>
          </div>

          <nav aria-label="Utility navigation" className="flex items-center gap-5">
            <HeaderIconButton label="Пошук" onClick={() => setIsSearchOpen(true)}>
              <Search size={24} color="#E8E9EA" aria-hidden="true" />
            </HeaderIconButton>
            <HeaderIconButton label="Профіль користувача">
              <CircleUser size={24} color="#E8E9EA" aria-hidden="true" />
            </HeaderIconButton>
          </nav>
        </div>
      </header>

      <header className="ui-header-shell relative hidden h-18 md:block">
        <div className="ui-container relative flex h-full items-center">

          <div className="flex items-center gap-2">
            <button aria-label="Меню" className="ui-icon-button gap-2">
              <Menu size={24} color="#E8E9EA" aria-hidden="true" />
              <span className="text-sm font-medium text-[#E8E9EA]">Меню</span>
            </button>
          </div>

          {/* Центрована лого */}
          <div className="ui-logo-lockup absolute left-1/2 -translate-x-1/2">
            <Image src="/logo.svg" alt="Вайб" width={30} height={50} priority />
            <span className="ui-logo-text">Вайб</span>
          </div>

          <nav className="ml-auto flex items-center gap-5">
            <HeaderIconButton label="Пошук" onClick={() => setIsSearchOpen(true)}>
              <Search size={24} color="#E8E9EA" aria-hidden="true" />
            </HeaderIconButton>
            <WishlistIcon />
            <HeaderIconButton label="Список бажань">
              <ListPlus size={24} color="#E8E9EA" aria-hidden="true" />
            </HeaderIconButton>
            <CartIcon />
            <HeaderIconButton label="Профіль користувача">
              <CircleUser size={24} color="#E8E9EA" aria-hidden="true" />
            </HeaderIconButton>
          </nav>

        </div>
      </header>

      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  )
}
