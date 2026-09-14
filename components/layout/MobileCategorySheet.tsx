'use client'

import Link from 'next/link'
import { useState } from 'react'
import { X } from 'lucide-react'
import type { CategoryTreeNode } from '@/components/category/category.data'
import CategoryImage from '@/components/category/CategoryImage'
import DialogShell from '@/components/ui/dialog/DialogShell'

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
                      <CategoryImage
                        src={category.imageUrl}
                        alt={category.name}
                        sizes="48px"
                        className="relative block h-12 w-12 overflow-hidden rounded-full border border-panelBorder bg-media"
                        imageClassName="object-cover"
                      />
                      <span className="line-clamp-2">{category.name}</span>
                    </button>
                  )
                })}
              </nav>
            </aside>

            <div className="min-h-0 overflow-y-auto px-3 py-4">
              <div className="mb-4 rounded-3xl border border-panelBorder bg-panel/50 p-3">
                <CategoryHeroLink category={selectedRoot} onNavigate={onClose} />
              </div>

              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="ui-body-muted">Підкатегорії</p>
                  <h3 className="text-lg font-semibold text-copy-strong">{selectedRoot.name}</h3>
                </div>

                <Link
                  href="/categories"
                  className="shrink-0 rounded-full border border-panelBorder px-3 py-2 text-xs font-medium text-copy-secondary transition-colors hover:border-brand/60 hover:text-copy-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  onClick={onClose}
                >
                  Усі
                </Link>
              </div>

              {selectedRoot.children.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {selectedRoot.children.map((category) => (
                    <MobileCategoryCard
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

function CategoryHeroLink({
  category,
  onNavigate,
}: {
  category: CategoryTreeNode
  onNavigate: () => void
}) {
  return (
    <Link
      href={category.href}
      className="group flex items-center gap-3 rounded-2xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      onClick={onNavigate}
    >
      <CategoryImage
        src={category.imageUrl}
        alt={category.name}
        sizes="64px"
        className="relative block h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-media"
        imageClassName="object-cover transition-transform duration-200 group-hover:scale-105"
      />

      <div>
        <p className="text-sm font-semibold text-copy-strong">{category.name}</p>
        <p className="ui-body-muted mt-1">Переглянути всі товари</p>
      </div>
    </Link>
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
    <article className="space-y-2">
      <Link
        href={category.href}
        className="group block overflow-hidden rounded-3xl border border-panelBorder bg-panel/55 transition-colors hover:border-brand/60 hover:bg-panelAlt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        onClick={onNavigate}
      >
        <CategoryImage
          src={category.imageUrl}
          alt={category.name}
          sizes="(max-width: 420px) 40vw, 150px"
          className="relative block aspect-square w-full bg-media"
          imageClassName="object-cover transition-transform duration-200 group-hover:scale-105"
        />
        <span className="line-clamp-2 block px-3 py-2 text-sm font-medium leading-snug text-copy-primary">
          {category.name}
        </span>
      </Link>

      {category.children.length > 0 ? (
        <div className="space-y-1">
          {category.children.map((child) => (
            <NestedCategoryLink
              key={child.id}
              category={child}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ) : null}
    </article>
  )
}

function NestedCategoryLink({
  category,
  onNavigate,
}: {
  category: CategoryTreeNode
  onNavigate: () => void
}) {
  return (
    <Link
      href={category.href}
      className="block rounded-2xl border border-transparent bg-panel/40 px-3 py-2 text-xs text-copy-secondary transition-colors hover:border-panelBorder hover:bg-panelAlt hover:text-copy-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      onClick={onNavigate}
    >
      <span className="line-clamp-1">{category.name}</span>
    </Link>
  )
}
