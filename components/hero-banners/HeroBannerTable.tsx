import Link from 'next/link'
import HeroBannerActions from '@/components/hero-banners/HeroBannerActions'
import HeroBannerStatusBadge from '@/components/hero-banners/HeroBannerStatusBadge'
import type { HeroBanner } from '@/types/hero-banners'
import { getHeroBannerDestinationTypeLabel } from '@/types/hero-banners'

function formatDateTime(value: string | null) {
  return value ? new Date(value).toLocaleString('uk-UA') : 'Без обмеження'
}

function formatPublishPeriod(banner: HeroBanner) {
  return `${formatDateTime(banner.publishStartAt)} — ${formatDateTime(banner.publishEndAt)}`
}

function Preview({ banner }: { banner: HeroBanner }) {
  if (!banner.desktopImageUrl) {
    return (
      <div className="flex h-16 w-28 items-center justify-center rounded-2xl border border-panelBorder bg-panelAlt text-xs text-copy-muted">
        Без фото
      </div>
    )
  }

  return (
    <div
      className="h-16 w-28 rounded-2xl border border-panelBorder bg-cover bg-center"
      style={{ backgroundImage: `url("${banner.desktopImageUrl}")` }}
      role="img"
      aria-label={banner.imageAlt ?? banner.title}
    />
  )
}

function HeroBannerCard({
  banner,
  previousBanner,
  nextBanner,
}: {
  banner: HeroBanner
  previousBanner: HeroBanner | null
  nextBanner: HeroBanner | null
}) {
  return (
    <article className="space-y-4 border-b border-panelBorder p-5 last:border-b-0 md:hidden">
      <div className="flex items-start gap-4">
        <Preview banner={banner} />
        <div className="min-w-0 flex-1 space-y-2">
          <Link href={`/admin/hero-banners/${banner.id}`} className="font-semibold text-copy-strong hover:text-white">
            {banner.title}
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <HeroBannerStatusBadge status={banner.status} />
            <span className="rounded-full border border-panelBorder px-3 py-1 text-xs text-copy-muted">
              {getHeroBannerDestinationTypeLabel(banner.destination.type)}
            </span>
          </div>
        </div>
      </div>
      <dl className="grid gap-3 text-sm text-copy-secondary sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-[0.14em] text-copy-muted">Період</dt>
          <dd>{formatPublishPeriod(banner)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.14em] text-copy-muted">Порядок</dt>
          <dd>{banner.sortOrder}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.14em] text-copy-muted">Оновлено</dt>
          <dd>{formatDateTime(banner.updatedAt)}</dd>
        </div>
      </dl>
      <HeroBannerActions banner={banner} previousBanner={previousBanner} nextBanner={nextBanner} />
    </article>
  )
}

export default function HeroBannerTable({ items }: { items: HeroBanner[] }) {
  return (
    <>
      <div className="hidden md:block">
        <table className="min-w-full divide-y divide-panelBorder text-sm">
          <thead className="bg-panel/60 text-xs uppercase tracking-[0.14em] text-copy-muted">
            <tr>
              <th scope="col" className="px-5 py-3 text-left font-medium">
                Прев’ю
              </th>
              <th scope="col" className="px-5 py-3 text-left font-medium">
                Назва
              </th>
              <th scope="col" className="px-5 py-3 text-left font-medium">
                Статус
              </th>
              <th scope="col" className="px-5 py-3 text-left font-medium">
                Період публікації
              </th>
              <th scope="col" className="px-5 py-3 text-left font-medium">
                Порядок
              </th>
              <th scope="col" className="px-5 py-3 text-left font-medium">
                Оновлено
              </th>
              <th scope="col" className="px-5 py-3 text-right font-medium">
                Дії
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-panelBorder">
            {items.map((banner, index) => (
              <tr key={banner.id} className="align-top">
                <td className="px-5 py-4">
                  <Preview banner={banner} />
                </td>
                <td className="px-5 py-4">
                  <div className="max-w-xs space-y-1">
                    <Link
                      href={`/admin/hero-banners/${banner.id}`}
                      className="font-semibold text-copy-strong hover:text-white"
                    >
                      {banner.title}
                    </Link>
                    <p className="text-xs text-copy-muted">
                      {getHeroBannerDestinationTypeLabel(banner.destination.type)}
                    </p>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <HeroBannerStatusBadge status={banner.status} />
                </td>
                <td className="max-w-xs px-5 py-4 text-copy-secondary">{formatPublishPeriod(banner)}</td>
                <td className="px-5 py-4 tabular-nums text-copy-secondary">{banner.sortOrder}</td>
                <td className="px-5 py-4 text-copy-secondary">{formatDateTime(banner.updatedAt)}</td>
                <td className="px-5 py-4">
                  <HeroBannerActions
                    banner={banner}
                    previousBanner={items[index - 1] ?? null}
                    nextBanner={items[index + 1] ?? null}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="md:hidden">
        {items.map((banner, index) => (
          <HeroBannerCard
            key={banner.id}
            banner={banner}
            previousBanner={items[index - 1] ?? null}
            nextBanner={items[index + 1] ?? null}
          />
        ))}
      </div>
    </>
  )
}
