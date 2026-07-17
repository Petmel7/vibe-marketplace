import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

function buildHref(pathname: string, query: Record<string, string | undefined>, page: number) {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    if (value) {
      params.set(key, value)
    }
  }

  params.set('page', String(page))
  return `${pathname}?${params.toString()}`
}

export default function PaginationControls({
  pathname,
  page,
  limit,
  total,
  query,
}: {
  pathname: string
  page: number
  limit: number
  total: number
  query: Record<string, string | undefined>
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const previousPage = page > 1 ? page - 1 : null
  const nextPage = page < totalPages ? page + 1 : null

  return (
    <div className="flex items-center justify-between gap-4 rounded-3xl border border-panelBorder bg-panel px-4 py-4 text-sm text-copy-secondary">
      <div className="flex min-w-0 flex-wrap items-center gap-2.5">
        <span className="text-sm font-medium text-copy-secondary">
          Сторінка
        </span>

        <span className="inline-flex min-h-10 items-center rounded-full border border-panelBorder bg-panelAlt px-4 py-2 text-base font-semibold tabular-nums text-copy-strong shadow-sm">
          {page} із {totalPages}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {previousPage ? (
          <Link
            href={buildHref(pathname, query, previousPage)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-panelBorder bg-panelAlt text-copy-strong transition hover:border-brand-accent/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel"
            aria-label="Попередня сторінка"
          >
            <ChevronLeft size={18} strokeWidth={2.25} />
          </Link>
        ) : (
          <span
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-panelBorder bg-panelAlt text-copy-muted opacity-45"
            aria-label="Попередня сторінка"
            aria-disabled="true"
          >
            <ChevronLeft size={18} strokeWidth={2.25} />
          </span>
        )}
        {nextPage ? (
          <Link
            href={buildHref(pathname, query, nextPage)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-panelBorder bg-panelAlt text-copy-strong transition hover:border-brand-accent/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel"
            aria-label="Наступна сторінка"
          >
            <ChevronRight size={18} strokeWidth={2.25} />
          </Link>
        ) : (
          <span
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-panelBorder bg-panelAlt text-copy-muted opacity-45"
            aria-label="Наступна сторінка"
            aria-disabled="true"
          >
            <ChevronRight size={18} strokeWidth={2.25} />
          </span>
        )}
      </div>
    </div>
  )
}
