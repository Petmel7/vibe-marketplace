'use client'

import type { CategoryTreeNode } from '@/components/category/category.data'
import CategoryButton from '@/components/ui/CategoryButton'
import MegaMenuContent from '@/components/mega-menu/MegaMenuContent'

interface Props {
  categories: CategoryTreeNode[]
  activeRootSlug: string
  onRootSelect: (slug: string) => void
  onNavigate: () => void
}

export default function MegaMenu({
  categories,
  activeRootSlug,
  onRootSelect,
  onNavigate,
}: Props) {
  const activeRoot =
    categories.find((category) => category.slug === activeRootSlug) ?? categories[0] ?? null

  if (!activeRoot) {
    return null
  }

  return (
    <div
      className="ui-elevated-panel absolute left-0 top-full z-40 mt-3 hidden w-full overflow-hidden md:grid md:grid-cols-[280px_minmax(0,1fr)]"
      role="dialog"
      aria-label="Каталог товарів"
    >
      <aside className="border-r border-panelBorder bg-panelMuted p-3">
        <nav aria-label="Основні категорії" className="space-y-1">
          {categories.map((category, index) => {
            const isActive = category.slug === activeRoot.slug

            return (
              <CategoryButton
                key={category.id}
                category={category}
                index={index}
                categories={categories}
                isActive={isActive}
                onSelect={onRootSelect}
              />
            )
          })}
        </nav>
      </aside>

      <MegaMenuContent
        activeRoot={activeRoot}
        onNavigate={onNavigate} />
    </div >
  )
}
