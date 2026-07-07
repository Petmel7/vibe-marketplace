'use client'

import { useState } from 'react'
import type { CategoryTreeNode } from '@/components/category/category.data'
import SearchOverlay from '@/components/search/SearchOverlay'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import HeaderBase from './HeaderBase'
import DesktopHeader from './DesktopHeader'
import MobileHeader from './MobileHeader'

export default function HeaderClient({ categories }: { categories: CategoryTreeNode[] }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const { user } = useCurrentUser()

  return (
    <>
      <HeaderBase className="md:hidden">
        <MobileHeader user={user} onSearch={() => setIsSearchOpen(true)} />
      </HeaderBase>

      <HeaderBase className="relative hidden md:block">
        <DesktopHeader
          categories={categories}
          user={user}
          onSearch={() => setIsSearchOpen(true)}
        />
      </HeaderBase>

      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  )
}
