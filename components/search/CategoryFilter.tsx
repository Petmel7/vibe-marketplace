'use client'

import type { CategoryTreeNode } from '@/components/category/category.data'
import type { ProductSearchCategoryFacetDto } from '@/features/products/product.dto'

interface CategoryFilterProps {
  value: string | null
  categories: CategoryTreeNode[]
  facets: ProductSearchCategoryFacetDto[]
  onChange: (value: string | null) => void
}

function buildFacetCountMap(facets: ProductSearchCategoryFacetDto[]) {
  return new Map(facets.map((facet) => [facet.slug, facet.count]))
}

function getNodeCount(node: CategoryTreeNode, facetCounts: Map<string, number>): number {
  const directCount = facetCounts.get(node.slug) ?? 0

  if (!node.children.length) {
    return directCount
  }

  return node.children.reduce(
    (sum, child) => sum + getNodeCount(child, facetCounts),
    directCount,
  )
}

function CategoryNode({
  node,
  selectedCategory,
  facetCounts,
  depth,
  onChange,
}: {
  node: CategoryTreeNode
  selectedCategory: string | null
  facetCounts: Map<string, number>
  depth: number
  onChange: (value: string | null) => void
}) {
  const count = getNodeCount(node, facetCounts)
  const isSelected = selectedCategory === node.slug

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => onChange(isSelected ? null : node.slug)}
        className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
          isSelected
            ? 'bg-brand/20 text-white'
            : 'text-copy-primary hover:bg-panelAlt/60'
        }`}
        style={{ paddingLeft: `${depth * 14 + 12}px` }}
      >
        <span>{node.name}</span>
        <span className="text-xs text-copy-muted">{count}</span>
      </button>

      {node.children.length > 0 ? (
        <div className="space-y-1">
          {node.children.map((child) => (
            <CategoryNode
              key={child.id}
              node={child}
              selectedCategory={selectedCategory}
              facetCounts={facetCounts}
              depth={depth + 1}
              onChange={onChange}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default function CategoryFilter({
  value,
  categories,
  facets,
  onChange,
}: CategoryFilterProps) {
  if (categories.length === 0) {
    return null
  }

  const facetCounts = buildFacetCountMap(facets)

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-copy-strong">Категорії</h3>
        {value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs text-copy-muted transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            Скинути
          </button>
        ) : null}
      </div>

      <div className="space-y-1">
        {categories.map((node) => (
          <CategoryNode
            key={node.id}
            node={node}
            selectedCategory={value}
            facetCounts={facetCounts}
            depth={0}
            onChange={onChange}
          />
        ))}
      </div>
    </section>
  )
}
