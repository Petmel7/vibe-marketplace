'use client'

import { useState } from 'react'
import CategoryTreeNode from '@/components/seller/CategoryTreeNode'
import {
  collectExpandedCategoryIds,
  filterCategoryTreeByQuery,
  type CategoryTreeNode as CategoryTreeNodeValue,
} from '@/types/categories'

export default function CategoryTreeSelect({
  tree,
  value,
  onChange,
  disabled = false,
  isLoading = false,
  errorMessage,
  allowParentSelection = false,
}: {
  tree: CategoryTreeNodeValue[]
  value: string | null
  onChange: (id: string | null) => void
  disabled?: boolean
  isLoading?: boolean
  errorMessage?: string | null
  allowParentSelection?: boolean
}) {
  const [query, setQuery] = useState('')
  const [manualExpandedIds, setManualExpandedIds] = useState<Set<string>>(new Set())

  const filteredTree = filterCategoryTreeByQuery(tree, query)
  const expandedIds = query.trim()
    ? new Set(collectExpandedCategoryIds(filteredTree))
    : manualExpandedIds.size > 0
      ? manualExpandedIds
      : new Set(tree.map((node) => node.id))

  const hasResults = filteredTree.length > 0

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          className="ui-surface-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Знайти категорію"
          disabled={disabled || isLoading}
          aria-label="Пошук категорії"
        />
        {value ? (
          <button
            type="button"
            className="ui-secondary-button"
            onClick={() => onChange(null)}
            disabled={disabled || isLoading}
          >
            Очистити вибір
          </button>
        ) : null}
      </div>

      <div className="rounded-3xl border border-panelBorder bg-panel/50 p-3">
        {isLoading ? (
          <div className="rounded-2xl border border-dashed border-panelBorder bg-panel px-4 py-8 text-sm text-copy-muted">
            Завантажуємо дерево категорій…
          </div>
        ) : errorMessage ? (
          <div className="rounded-2xl border border-brand-danger/20 bg-brand-danger/10 px-4 py-4 text-sm text-copy-primary">
            {errorMessage}
          </div>
        ) : !hasResults ? (
          <div className="rounded-2xl border border-dashed border-panelBorder bg-panel px-4 py-8 text-sm text-copy-muted">
            За цим запитом категорій не знайдено.
          </div>
        ) : (
          <ul role="tree" aria-label="Ієрархія категорій" className="space-y-1">
            {filteredTree.map((node) => (
              <CategoryTreeNode
                key={node.id}
                node={node}
                depth={0}
                expandedIds={expandedIds}
                selectedId={value}
                allowParentSelection={allowParentSelection}
                onToggle={(id) =>
                  setManualExpandedIds((current) => {
                    const next = new Set(current)
                    if (next.has(id)) {
                      next.delete(id)
                    } else {
                      next.add(id)
                    }
                    return next
                  })
                }
                onSelect={(id) => onChange(id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
