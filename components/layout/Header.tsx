'use client'

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, CircleUser, Menu, Heart, ListPlus, ShoppingCart } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import SearchOverlay from "@/components/search/SearchOverlay";

function HeaderIconButton({
  label,
  children,
  onClick,
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button aria-label={label} className="ui-icon-button" onClick={onClick}>
      {children}
    </button>
  );
}

function CartIcon() {
  const itemCount = useCartStore((s) => s.itemCount);

  return (
    <Link
      href="/cart"
      aria-label={`Кошик${itemCount > 0 ? `, ${itemCount} товарів` : ""}`}
      className="relative flex items-center justify-center"
    >
      <ShoppingCart size={24} color="#E8E9EA" aria-hidden="true" />
      {itemCount > 0 && (
        <span className="ui-badge-counter" aria-hidden="true">
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      )}
    </Link>
  );
}

export default function Header() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <>
      <header className="ui-header-shell md:hidden flex h-18 items-center px-4">
        <div className="flex flex-1 items-center gap-3">
          <div className="ui-logo-lockup">
            <Image src="/logo.svg" alt="Вайб" width={30} height={50} priority />
            <span className="ui-logo-text" style={{ width: "161px" }}>
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
      </header>

      <header className="ui-header-shell relative hidden h-18 items-center px-6 md:flex">
        <div className="flex items-center gap-2">
          <button aria-label="Меню" className="ui-icon-button gap-2">
            <Menu size={24} color="#E8E9EA" aria-hidden="true" />
            <span className="text-sm font-medium text-[#E8E9EA]">Меню</span>
          </button>
        </div>

        <div className="ui-logo-lockup absolute left-1/2 -translate-x-1/2">
          <Image src="/logo.svg" alt="Вайб" width={30} height={50} priority />
          <span className="ui-logo-text">Вайб</span>
        </div>

        <nav aria-label="Utility navigation" className="ml-auto flex items-center gap-5">
          <HeaderIconButton label="Пошук" onClick={() => setIsSearchOpen(true)}>
            <Search size={24} color="#E8E9EA" aria-hidden="true" />
          </HeaderIconButton>
          <HeaderIconButton label="Обране">
            <Heart size={24} color="#E8E9EA" aria-hidden="true" />
          </HeaderIconButton>
          <HeaderIconButton label="Список бажань">
            <ListPlus size={24} color="#E8E9EA" aria-hidden="true" />
          </HeaderIconButton>
          <CartIcon />
          <HeaderIconButton label="Профіль користувача">
            <CircleUser size={24} color="#E8E9EA" aria-hidden="true" />
          </HeaderIconButton>
        </nav>
      </header>

      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
