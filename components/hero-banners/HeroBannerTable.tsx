import Link from 'next/link'
import HeroBannerActions from '@/components/hero-banners/HeroBannerActions'
import HeroBannerStatusBadge from '@/components/hero-banners/HeroBannerStatusBadge'
import {
  DataTable,
  ResponsiveTable,
  TableActionCell,
  TableCell,
  TableDateCell,
  TableHead,
  TableHeaderCell,
  TableMetaCell,
  TableRow,
  TableStatusCell,
} from '@/components/ui/table'
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
    <ResponsiveTable
      desktop={
        <DataTable className="divide-y divide-panelBorder">
          <TableHead className="text-xs uppercase tracking-[0.14em]">
            <tr>
              <TableHeaderCell>Прев’ю</TableHeaderCell>
              <TableHeaderCell>Назва</TableHeaderCell>
              <TableHeaderCell>Статус</TableHeaderCell>
              <TableHeaderCell>Період публікації</TableHeaderCell>
              <TableHeaderCell>Порядок</TableHeaderCell>
              <TableHeaderCell>Оновлено</TableHeaderCell>
              <TableHeaderCell align="right">Дії</TableHeaderCell>
            </tr>
          </TableHead>
          <tbody className="divide-y divide-panelBorder">
            {items.map((banner, index) => (
              <TableRow key={banner.id} className="border-t-0">
                <TableCell>
                  <Preview banner={banner} />
                </TableCell>
                <TableMetaCell
                  title={(
                    <Link
                      href={`/admin/hero-banners/${banner.id}`}
                      className="font-semibold text-copy-strong hover:text-white"
                    >
                      {banner.title}
                    </Link>
                  )}
                  meta={getHeroBannerDestinationTypeLabel(banner.destination.type)}
                />
                <TableStatusCell>
                  <HeroBannerStatusBadge status={banner.status} />
                </TableStatusCell>
                <TableCell tone="secondary" className="max-w-xs">{formatPublishPeriod(banner)}</TableCell>
                <TableCell tone="secondary" className="tabular-nums">{banner.sortOrder}</TableCell>
                <TableDateCell value={banner.updatedAt} />
                <TableActionCell align="right">
                  <HeroBannerActions
                    banner={banner}
                    previousBanner={items[index - 1] ?? null}
                    nextBanner={items[index + 1] ?? null}
                  />
                </TableActionCell>
              </TableRow>
            ))}
          </tbody>
        </DataTable>
      }
      mobile={
        <>
          {items.map((banner, index) => (
            <HeroBannerCard
              key={banner.id}
              banner={banner}
              previousBanner={items[index - 1] ?? null}
              nextBanner={items[index + 1] ?? null}
            />
          ))}
        </>
      }
    />
  )
}
