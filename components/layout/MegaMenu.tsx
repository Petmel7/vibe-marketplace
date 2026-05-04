'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { getCategoryImage } from '@/components/category/category.data'
import type { CategoryTreeNode } from '@/components/category/category.data'

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
              <button
                key={category.id}
                type="button"
                className={[
                  'flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition-colors',
                  isActive
                    ? 'bg-brand text-white'
                    : 'text-copy-secondary hover:bg-panelAlt hover:text-copy-strong',
                ].join(' ')}
                aria-current={isActive ? 'true' : undefined}
                onClick={() => onRootSelect(category.slug)}
                onKeyDown={(event) => {
                  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
                    return
                  }

                  event.preventDefault()

                  const nextIndex =
                    event.key === 'ArrowDown'
                      ? (index + 1) % categories.length
                      : (index - 1 + categories.length) % categories.length

                  onRootSelect(categories[nextIndex]?.slug ?? category.slug)

                  const nextButton = document.querySelector<HTMLButtonElement>(
                    `[data-root-category="${categories[nextIndex]?.slug ?? ''}"]`,
                  )

                  nextButton?.focus()
                }}
                data-root-category={category.slug}
              >
                <span>{category.name}</span>
                {isActive ? <ArrowUpRight size={16} aria-hidden="true" /> : null}
              </button>
            )
          })}
        </nav>
      </aside>

      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="ui-body-muted">Каталог</p>
            <h2 className="ui-heading-product text-[28px] leading-8">{activeRoot.name}</h2>
          </div>

          <Link
            href={activeRoot.href}
            className="inline-flex items-center gap-2 rounded-full border border-panelBorder px-4 py-2 text-sm text-copy-secondary transition-colors hover:border-brand hover:text-copy-strong"
            onClick={onNavigate}
          >
            Переглянути всі
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-6 xl:grid-cols-3">
          {activeRoot.children.map((group) => (
            <section key={group.id} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Link
                  href={group.href}
                  className="text-base font-semibold text-copy-strong transition-colors hover:text-brand-accent"
                  onClick={onNavigate}
                >
                  {group.name}
                </Link>

                <Link
                  href={group.href}
                  className="text-xs uppercase tracking-[0.16em] text-copy-muted transition-colors hover:text-copy-strong"
                  onClick={onNavigate}
                >
                  Переглянути всі
                </Link>
              </div>

              <div className="grid gap-3">
                {group.children.length > 0 ? (
                  group.children.map((child) => (
                    <Link
                      key={child.id}
                      href={child.href}
                      className="group flex items-center gap-3 rounded-2xl border border-transparent bg-panel/60 p-3 transition-colors hover:border-panelBorder hover:bg-panelAlt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      onClick={onNavigate}
                    >
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-media">
                        <Image
                          src={getCategoryImage(child.slug, child.image)}
                          alt={child.name}
                          fill
                          className="object-cover transition-transform duration-200 group-hover:scale-105"
                          sizes="56px"
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-copy-primary">
                          {child.name}
                        </p>
                        <p className="ui-body-muted mt-1">Перейти до категорії</p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <Link
                    href={group.href}
                    className="group flex items-center gap-3 rounded-2xl border border-transparent bg-panel/60 p-3 transition-colors hover:border-panelBorder hover:bg-panelAlt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    onClick={onNavigate}
                  >
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-media">
                      <Image
                        src={getCategoryImage(group.slug, group.image)}
                        alt={group.name}
                        fill
                        className="object-cover transition-transform duration-200 group-hover:scale-105"
                        sizes="56px"
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-copy-primary">{group.name}</p>
                      <p className="ui-body-muted mt-1">Перейти до категорії</p>
                    </div>
                  </Link>
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
