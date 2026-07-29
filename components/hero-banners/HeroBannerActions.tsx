'use client'

import Link from 'next/link'
import { useState } from 'react'
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

  const moveUpItems = buildSwappedOrder(banner, previousBanner)
  const moveDownItems = buildSwappedOrder(banner, nextBanner)

  return (
    <div className="flex min-w-52 flex-wrap justify-end gap-2 max-[640px]:justify-start">
      <Link href={`/admin/hero-banners/${banner.id}`} className="ui-secondary-button h-10 px-4 py-2 text-sm">
        Редагувати
      </Link>
      <button
        type="button"
        className="ui-secondary-button h-10 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isPending}
        onClick={() => void createHeroBanner(duplicatePayload(banner))}
      >
        Дублювати
      </button>
      <button
        type="button"
        className="rounded-2xl border border-panelBorder px-4 py-2 text-sm font-medium text-copy-strong transition hover:bg-panelAlt disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isPending || !moveUpItems}
        onClick={() => moveUpItems && void reorderHeroBanners(moveUpItems)}
      >
        Вище
      </button>
      <button
        type="button"
        className="rounded-2xl border border-panelBorder px-4 py-2 text-sm font-medium text-copy-strong transition hover:bg-panelAlt disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isPending || !moveDownItems}
        onClick={() => moveDownItems && void reorderHeroBanners(moveDownItems)}
      >
        Нижче
      </button>
      {banner.status === 'PUBLISHED' ? (
        <button
          type="button"
          className="rounded-2xl border border-amber-400/30 px-4 py-2 text-sm font-medium text-amber-200 transition hover:bg-amber-400/10 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isPending}
          onClick={() => void pauseHeroBanner(banner.id)}
        >
          Пауза
        </button>
      ) : (
        <button
          type="button"
          className="rounded-2xl border border-brand-success/30 px-4 py-2 text-sm font-medium text-brand-success transition hover:bg-brand-success/10 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isPending || banner.status === 'ARCHIVED'}
          onClick={() => void publishHeroBanner(banner.id)}
        >
          Опублікувати
        </button>
      )}
      {banner.status !== 'ARCHIVED' ? (
        <button
          type="button"
          className="rounded-2xl border border-panelBorder px-4 py-2 text-sm font-medium text-copy-strong transition hover:bg-panelAlt disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isPending}
          onClick={() => void archiveHeroBanner(banner.id)}
        >
          Архівувати
        </button>
      ) : null}
      {!confirmDelete ? (
        <button
          type="button"
          className="rounded-2xl border border-brand-danger/25 px-4 py-2 text-sm font-medium text-copy-strong transition hover:bg-brand-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isPending}
          onClick={() => setConfirmDelete(true)}
        >
          Видалити
        </button>
      ) : (
        <button
          type="button"
          className="rounded-2xl border border-brand-danger/25 bg-brand-danger/10 px-4 py-2 text-sm font-medium text-copy-strong transition hover:bg-brand-danger/20 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isPending}
          onClick={() => void deleteHeroBanner(banner.id)}
        >
          Підтвердити
        </button>
      )}
    </div>
  )
}
