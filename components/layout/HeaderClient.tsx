'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import type { CategoryTreeNode } from '@/components/category/category.data'
import SearchOverlay from '@/components/search/SearchOverlay'
import HeaderBase from './HeaderBase'
import DesktopHeader from './DesktopHeader'
import MobileHeader from './MobileHeader'

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
