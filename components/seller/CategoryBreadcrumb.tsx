'use client'

export default function CategoryBreadcrumb({
  items,
  emptyLabel = 'Оберіть фінальну категорію з дерева нижче.',
}: {
  items: string[]
  emptyLabel?: string
}) {
  if (items.length === 0) {
    return <p className="text-sm text-copy-muted">{emptyLabel}</p>
  }

  return (
    <p className="text-sm text-copy-secondary" aria-live="polite">
      {items.join(' / ')}
    </p>
  )
}
