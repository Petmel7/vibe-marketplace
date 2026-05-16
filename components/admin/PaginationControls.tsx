import Link from 'next/link'

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
    <div className="flex flex-col gap-3 rounded-3xl border border-panelBorder bg-panel px-4 py-4 text-sm text-copy-secondary sm:flex-row sm:items-center sm:justify-between">
      <p>
        Page {page} of {totalPages} · {total} results
      </p>
      <div className="flex gap-2">
        {previousPage ? (
          <Link href={buildHref(pathname, query, previousPage)} className="ui-secondary-button">
            Previous
          </Link>
        ) : (
          <span className="ui-secondary-button pointer-events-none opacity-50">Previous</span>
        )}
        {nextPage ? (
          <Link href={buildHref(pathname, query, nextPage)} className="ui-secondary-button">
            Next
          </Link>
        ) : (
          <span className="ui-secondary-button pointer-events-none opacity-50">Next</span>
        )}
      </div>
    </div>
  )
}
