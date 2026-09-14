export type CategoryCatalogPathRecord = {
  id: string
  slug: string
  parentId: string | null
  position?: number
  name?: string
}

export type CategoryCatalogPath = {
  id: string
  slug: string
  href: string
  pathSegments: string[]
}

export type CategoryCatalogPathIndex = {
  items: CategoryCatalogPath[]
  byId: Map<string, CategoryCatalogPath>
  bySlug: Map<string, CategoryCatalogPath>
}

export function buildCategoryCatalogHref(pathSegments: readonly string[]) {
  const safeSegments = pathSegments
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))

  return safeSegments.length > 0 ? `/catalog/${safeSegments.join('/')}` : '/catalog'
}

function sortCategoryCatalogRecords<T extends CategoryCatalogPathRecord>(records: T[]) {
  return [...records].sort(
    (left, right) =>
      (left.position ?? 0) - (right.position ?? 0) ||
      (left.name ?? '').localeCompare(right.name ?? '', 'uk') ||
      left.id.localeCompare(right.id),
  )
}

export function buildCategoryCatalogPathIndex(
  records: CategoryCatalogPathRecord[],
): CategoryCatalogPathIndex {
  const byParent = new Map<string | null, CategoryCatalogPathRecord[]>()
  const items: CategoryCatalogPath[] = []
  const byId = new Map<string, CategoryCatalogPath>()
  const bySlug = new Map<string, CategoryCatalogPath>()

  for (const record of records) {
    const bucket = byParent.get(record.parentId) ?? []
    bucket.push(record)
    byParent.set(record.parentId, bucket)
  }

  const visit = (parentId: string | null, ancestors: string[]) => {
    for (const record of sortCategoryCatalogRecords(byParent.get(parentId) ?? [])) {
      const pathSegments = [...ancestors, record.slug]
      const path = {
        id: record.id,
        slug: record.slug,
        href: buildCategoryCatalogHref(pathSegments),
        pathSegments,
      }

      items.push(path)
      byId.set(record.id, path)
      bySlug.set(record.slug, path)
      visit(record.id, pathSegments)
    }
  }

  visit(null, [])

  return {
    items,
    byId,
    bySlug,
  }
}
