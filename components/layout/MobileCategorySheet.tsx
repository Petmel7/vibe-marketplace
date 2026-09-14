'use client'

import Link from 'next/link'
import { X } from 'lucide-react'
import type { CategoryTreeNode } from '@/components/category/category.data'
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
  return (
    <DialogShell
      id={MOBILE_CATEGORY_SHEET_ID}
      open={open}
      labelledBy={MOBILE_CATEGORY_SHEET_TITLE_ID}
      onClose={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 px-3 pb-3 pt-16 backdrop-blur-sm"
      panelClassName="max-h-[82vh] w-full overflow-hidden rounded-[28px] border border-panelBorder bg-background shadow-2xl"
      useDefaultClassNames={false}
    >
      <div className="flex items-center justify-between gap-4 border-b border-panelBorder px-5 py-4">
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

      <div className="max-h-[calc(82vh-88px)] overflow-y-auto px-5 py-4">
        <nav aria-label="Категорії товарів" className="space-y-4">
          <Link
            href="/categories"
            className="flex items-center justify-between rounded-2xl border border-panelBorder bg-panel/60 px-4 py-3 text-sm font-medium text-copy-primary transition-colors hover:border-brand/60 hover:bg-panelAlt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            onClick={onClose}
          >
            Усі категорії
          </Link>

          {categories.map((category) => (
            <MobileCategoryGroup
              key={category.id}
              category={category}
              onNavigate={onClose}
            />
          ))}
        </nav>
      </div>
    </DialogShell>
  )
}

function MobileCategoryGroup({
  category,
  onNavigate,
}: {
  category: CategoryTreeNode
  onNavigate: () => void
}) {
  return (
    <section className="rounded-3xl border border-panelBorder bg-panel/45 p-3">
      <Link
        href={category.href}
        className="block rounded-2xl px-3 py-2 text-base font-semibold text-copy-strong transition-colors hover:bg-panelAlt hover:text-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        onClick={onNavigate}
      >
        {category.name}
      </Link>

      {category.children.length > 0 ? (
        <div className="mt-2 space-y-1">
          {category.children.map((child) => (
            <MobileCategoryLink
              key={child.id}
              category={child}
              level={1}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}

function MobileCategoryLink({
  category,
  level,
  onNavigate,
}: {
  category: CategoryTreeNode
  level: number
  onNavigate: () => void
}) {
  return (
    <div>
      <Link
        href={category.href}
        className="block rounded-2xl px-3 py-2 text-sm text-copy-secondary transition-colors hover:bg-panelAlt hover:text-copy-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        style={{ paddingLeft: `${0.75 + level * 0.75}rem` }}
        onClick={onNavigate}
      >
        {category.name}
      </Link>

      {category.children.length > 0 ? (
        <div className="space-y-1">
          {category.children.map((child) => (
            <MobileCategoryLink
              key={child.id}
              category={child}
              level={level + 1}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
