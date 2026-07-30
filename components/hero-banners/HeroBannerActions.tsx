'use client'

import { ArrowDown, ArrowUp, MoreVertical } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useAdminHeroBanners } from '@/hooks/useAdminHeroBanners'
import type { HeroBanner, HeroBannerPayload } from '@/types/hero-banners'

function duplicatePayload(banner: HeroBanner): HeroBannerPayload {
  return {
    eyebrow: banner.eyebrow,
    title: `${banner.title} копія`,
    subtitle: banner.subtitle,
    description: banner.description,
    desktopImageUrl: banner.desktopImageUrl,
    desktopImageStoragePath: banner.desktopImageStoragePath,
    tabletImageUrl: banner.tabletImageUrl,
    tabletImageStoragePath: banner.tabletImageStoragePath,
    mobileImageUrl: banner.mobileImageUrl,
    mobileImageStoragePath: banner.mobileImageStoragePath,
    imageAlt: banner.imageAlt,
    backgroundColor: banner.backgroundColor,
    textColor: banner.textColor,
    overlayOpacity: Number(banner.overlayOpacity),
    ctaText: banner.ctaText,
    destinationType: banner.destination.type,
    categoryId: banner.destination.categoryId,
    productId: banner.destination.productId,
    storeId: banner.destination.storeId,
    promotionId: banner.destination.promotionId,
    searchQuery: banner.destination.searchQuery,
    customUrl: banner.destination.customUrl,
    sortOrder: banner.sortOrder + 1,
    status: 'DRAFT',
    autoplay: banner.autoplay,
    autoplayDelay: banner.autoplay ? banner.autoplayDelay : null,
    openInNewTab: banner.openInNewTab,
    publishStartAt: banner.publishStartAt,
    publishEndAt: banner.publishEndAt,
  }
}

function buildSwappedOrder(
  current: HeroBanner,
  neighbor: HeroBanner | null,
) {
  if (!neighbor) {
    return null
  }

  return [
    { id: current.id, sortOrder: neighbor.sortOrder },
    { id: neighbor.id, sortOrder: current.sortOrder },
  ]
}

export default function HeroBannerActions({
  banner,
  previousBanner,
  nextBanner,
}: {
  banner: HeroBanner
  previousBanner: HeroBanner | null
  nextBanner: HeroBanner | null
}) {
  const {
    createHeroBanner,
    publishHeroBanner,
    pauseHeroBanner,
    archiveHeroBanner,
    deleteHeroBanner,
    reorderHeroBanners,
    isPending,
  } = useAdminHeroBanners()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const moveUpItems = buildSwappedOrder(banner, previousBanner)
  const moveDownItems = buildSwappedOrder(banner, nextBanner)

  useEffect(() => {
    if (!isMenuOpen) {
      return
    }

    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onEscape)

    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onEscape)
    }
  }, [isMenuOpen])

  const handleMenuAction = (action: () => void) => {
    action()
    setIsMenuOpen(false)
  }

  return (
    <div className="flex min-w-44 flex-col items-end gap-2 max-[640px]:items-start">
      <div className="flex items-center gap-2">
        <Link href={`/admin/hero-banners/${banner.id}`} className="ui-primary-button h-10 px-4 py-2 text-sm">
          Редагувати
        </Link>
        <div ref={menuRef} className="relative">
          <button
            type="button"
            aria-expanded={isMenuOpen}
            aria-haspopup="menu"
            aria-label="Відкрити меню дій Hero-банера"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-panelBorder text-copy-strong transition hover:bg-panelAlt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isPending}
            onClick={() => setIsMenuOpen((current) => !current)}
          >
            <MoreVertical size={18} aria-hidden="true" />
          </button>

          {isMenuOpen ? (
            <div
              role="menu"
              className="absolute right-0 z-30 mt-2 w-48 rounded-2xl border border-panelBorder bg-panel p-2 text-sm shadow-[0_24px_64px_rgba(0,0,0,0.45)] max-[640px]:left-0 max-[640px]:right-auto"
            >
              <button
                type="button"
                role="menuitem"
                className="flex w-full rounded-xl px-3 py-2 text-left text-copy-primary transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isPending}
                onClick={() => handleMenuAction(() => void createHeroBanner(duplicatePayload(banner)))}
              >
                Дублювати
              </button>
              {banner.status === 'PUBLISHED' ? (
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full rounded-xl px-3 py-2 text-left text-amber-200 transition-colors hover:bg-amber-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isPending}
                  onClick={() => handleMenuAction(() => void pauseHeroBanner(banner.id))}
                >
                  Пауза
                </button>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full rounded-xl px-3 py-2 text-left text-brand-success transition-colors hover:bg-brand-success/10 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isPending || banner.status === 'ARCHIVED'}
                  onClick={() => handleMenuAction(() => void publishHeroBanner(banner.id))}
                >
                  Опублікувати
                </button>
              )}
              {banner.status !== 'ARCHIVED' ? (
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full rounded-xl px-3 py-2 text-left text-copy-primary transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isPending}
                  onClick={() => handleMenuAction(() => void archiveHeroBanner(banner.id))}
                >
                  Архівувати
                </button>
              ) : null}
              {!confirmDelete ? (
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full rounded-xl px-3 py-2 text-left text-brand-danger transition-colors hover:bg-brand-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isPending}
                  onClick={() => setConfirmDelete(true)}
                >
                  Видалити
                </button>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full rounded-xl bg-brand-danger/10 px-3 py-2 text-left text-brand-danger transition-colors hover:bg-brand-danger/20 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isPending}
                  onClick={() => handleMenuAction(() => void deleteHeroBanner(banner.id))}
                >
                  Підтвердити
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-panelBorder px-3 py-1.5 text-xs font-medium text-copy-strong transition hover:bg-panelAlt disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isPending || !moveUpItems}
          onClick={() => moveUpItems && void reorderHeroBanners(moveUpItems)}
        >
          <ArrowUp size={14} aria-hidden="true" />
          Вище
        </button>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-panelBorder px-3 py-1.5 text-xs font-medium text-copy-strong transition hover:bg-panelAlt disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isPending || !moveDownItems}
          onClick={() => moveDownItems && void reorderHeroBanners(moveDownItems)}
        >
          <ArrowDown size={14} aria-hidden="true" />
          Нижче
        </button>
      </div>
    </div>
  )
}
