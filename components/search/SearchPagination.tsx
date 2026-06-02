'use client'

interface SearchPaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

function getPageRange(currentPage: number, totalPages: number) {
  const start = Math.max(1, currentPage - 2)
  const end = Math.min(totalPages, currentPage + 2)
  const pages: number[] = []

  for (let page = start; page <= end; page += 1) {
    pages.push(page)
  }

  return pages
}

export default function SearchPagination({
  page,
  totalPages,
  onPageChange,
}: SearchPaginationProps) {
  if (totalPages <= 1) {
    return null
  }

  const pages = getPageRange(page, totalPages)

  return (
    <nav
      className="flex flex-wrap items-center justify-center gap-2"
      aria-label="Пагінація результатів пошуку"
    >
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="rounded-full border border-panelBorder px-4 py-2 text-sm text-copy-primary transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        Назад
      </button>

      {pages.map((pageNumber) => (
        <button
          key={pageNumber}
          type="button"
          onClick={() => onPageChange(pageNumber)}
          aria-current={pageNumber === page ? 'page' : undefined}
          className={`h-10 min-w-10 rounded-full px-3 text-sm transition ${
            pageNumber === page
              ? 'bg-brand text-white'
              : 'border border-panelBorder text-copy-primary hover:border-white/20 hover:text-white'
          }`}
        >
          {pageNumber}
        </button>
      ))}

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="rounded-full border border-panelBorder px-4 py-2 text-sm text-copy-primary transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        Далі
      </button>
    </nav>
  )
}
