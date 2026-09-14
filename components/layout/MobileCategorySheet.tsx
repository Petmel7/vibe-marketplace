'use client'

import Link from 'next/link'
import { useState } from 'react'
import { X } from 'lucide-react'
import type { CategoryTreeNode } from '@/components/category/category.data'
import CategoryImage from '@/components/category/CategoryImage'
import DialogShell from '@/components/ui/dialog/DialogShell'
import Icon from '@/components/ui/Icon'

const MOBILE_CATEGORY_SHEET_TITLE_ID = 'mobile-category-sheet-title'
export const MOBILE_CATEGORY_SHEET_ID = 'mobile-category-sheet'

type MobileCategorySheetProps = {
  categories: CategoryTreeNode[]
  open: boolean
  onClose: () => void
}

export default function MobileCategorySheet({
  categories,
  open,
  onClose,
}: MobileCategorySheetProps) {
  const [selectedRootId, setSelectedRootId] = useState<string | null>(null)
  const selectedRoot =
    categories.find((category) => category.id === selectedRootId) ?? categories[0] ?? null

  return (
    <DialogShell
      id={MOBILE_CATEGORY_SHEET_ID}
      open={open}
      labelledBy={MOBILE_CATEGORY_SHEET_TITLE_ID}
      onClose={onClose}
      className="fixed inset-0 z-50 flex items-stretch justify-start bg-background/80 backdrop-blur-sm"
      panelClassName="h-dvh w-[min(100vw,420px)] overflow-hidden border-r border-panelBorder bg-background shadow-2xl motion-safe:animate-[mobile-drawer-in_180ms_ease-out]"
      useDefaultClassNames={false}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-panelBorder px-4 py-4">
          <div>
            <p className="ui-body-muted">Навігація</p>
            <h2 id={MOBILE_CATEGORY_SHEET_TITLE_ID} className="ui-heading-section">
              Категорії
            </h2>
          </div>

          <button
            type="button"
            className="ui-icon-button"
            aria-label="Закрити категорії"
            onClick={onClose}
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>

        {selectedRoot ? (
          <div className="grid min-h-0 flex-1 grid-cols-[96px_minmax(0,1fr)]">
            <aside className="min-h-0 overflow-y-auto border-r border-panelBorder bg-panelMuted/70 px-2 py-3">
              <nav aria-label="Основні категорії" className="space-y-2">
                {categories.map((category) => {
                  const isActive = category.id === selectedRoot.id

                  return (
                    <button
                      key={category.id}
                      type="button"
                      className={`flex min-h-20 w-full flex-col items-center justify-center gap-1.5 rounded-3xl border px-2 py-2 text-center text-[11px] font-medium leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                        isActive
                          ? 'border-brand/60 bg-brand/15 text-copy-strong'
                          : 'border-transparent text-copy-secondary hover:border-panelBorder hover:bg-panel/70 hover:text-copy-strong'
                      }`}
                      aria-pressed={isActive}
                      onClick={() => setSelectedRootId(category.id)}
                    >
                      <span className={`flex h-12 w-12 items-center justify-center rounded-full border ${
                        isActive
                          ? 'border-white/20 bg-white/15 text-white'
                          : 'border-panelBorder bg-white/10 text-white/85'
                      }`}>
                        <Icon
                          src={category.imageUrl}
                          size={26}
                          className="opacity-95"
                        />
                      </span>
                      <span className="line-clamp-2">{category.name}</span>
                    </button>
                  )
                })}
              </nav>
            </aside>

            <div className="min-h-0 overflow-y-auto px-3 py-4">
              {selectedRoot.children.length > 0 ? (
                <div className="space-y-5">
                  {selectedRoot.children.map((category) => (
                    <MobileCategoryEntry
                      key={category.id}
                      category={category}
                      onNavigate={onClose}
                    />
                  ))}
                </div>
              ) : (
                <p className="rounded-3xl border border-panelBorder bg-panel/45 px-4 py-5 text-sm text-copy-secondary">
                  У цій категорії поки немає вкладених категорій.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-copy-secondary">
            Категорії поки що відсутні.
          </div>
        )}
      </div>
    </DialogShell>
  )
}

function MobileCategoryEntry({
  category,
  onNavigate,
}: {
  category: CategoryTreeNode
  onNavigate: () => void
}) {
  if (category.children.length === 0) {
    return <MobileCategoryCard category={category} onNavigate={onNavigate} />
  }

  const leafCategories = getLeafCategories(category)

  return (
    <section className="space-y-3" aria-labelledby={`mobile-category-section-${category.id}`}>
      <h3
        id={`mobile-category-section-${category.id}`}
        className="px-1 text-sm font-semibold uppercase tracking-[0.08em] text-copy-strong"
      >
        {category.name}
      </h3>

      {leafCategories.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {leafCategories.map((leafCategory) => (
            <MobileCategoryCard
              key={leafCategory.id}
              category={leafCategory}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}

function MobileCategoryCard({
  category,
  onNavigate,
}: {
  category: CategoryTreeNode
  onNavigate: () => void
}) {
  return (
    <article>
      <Link
        href={category.href}
        className="group block rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        onClick={onNavigate}
      >
        <CategoryImage
          src={category.imageUrl}
          alt={category.name}
          sizes="(max-width: 420px) 40vw, 150px"
          className="relative block aspect-square w-full overflow-hidden rounded-3xl border border-panelBorder bg-media transition-colors group-hover:border-brand/60"
          imageClassName="object-cover transition-transform duration-200 group-hover:scale-105"
        />
        <span className="line-clamp-2 block px-1.5 pt-2 text-sm font-medium leading-snug text-copy-primary transition-colors group-hover:text-copy-strong">
          {category.name}
        </span>
      </Link>
    </article>
  )
}

function getLeafCategories(category: CategoryTreeNode): CategoryTreeNode[] {
  if (category.children.length === 0) {
    return [category]
  }

  return category.children.flatMap(getLeafCategories)
}
