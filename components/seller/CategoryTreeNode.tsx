'use client'

import type { CategoryTreeNode as CategoryTreeNodeValue } from '@/types/categories'

export default function CategoryTreeNode({
  node,
  depth,
  expandedIds,
  selectedId,
  allowParentSelection,
  onToggle,
  onSelect,
}: {
  node: CategoryTreeNodeValue
  depth: number
  expandedIds: Set<string>
  selectedId: string | null
  allowParentSelection: boolean
  onToggle: (id: string) => void
  onSelect: (id: string) => void
}) {
  const hasChildren = node.children.length > 0
  const isExpanded = expandedIds.has(node.id)
  const isSelected = selectedId === node.id
  const isSelectable = allowParentSelection || !hasChildren

  return (
    <li role="treeitem" aria-expanded={hasChildren ? isExpanded : undefined} aria-selected={isSelected}>
      <div
        className={`flex items-center gap-2 rounded-2xl px-2 py-1.5 ${
          isSelected ? 'bg-brand/10' : 'hover:bg-panel'
        }`}
        style={{ paddingInlineStart: `${depth * 0.875 + 0.5}rem` }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-panelBorder text-copy-secondary transition-colors hover:bg-panelAlt hover:text-copy-strong"
            onClick={() => onToggle(node.id)}
            aria-label={isExpanded ? `Згорнути ${node.name}` : `Розгорнути ${node.name}`}
          >
            <span aria-hidden="true">{isExpanded ? '−' : '+'}</span>
          </button>
        ) : (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center text-copy-muted" aria-hidden="true">
            •
          </span>
        )}

        <button
          type="button"
          className={`min-w-0 flex-1 rounded-2xl px-3 py-2 text-left text-sm transition-colors ${
            isSelectable
              ? isSelected
                ? 'bg-brand text-white'
                : 'text-copy-strong hover:bg-panelAlt'
              : 'cursor-default text-copy-muted'
          }`}
          onClick={() => {
            if (isSelectable) {
              onSelect(node.id)
            } else {
              onToggle(node.id)
            }
          }}
          disabled={!isSelectable}
          aria-current={isSelected ? 'true' : undefined}
        >
          <span className="block truncate">{node.name}</span>
          {!isSelectable ? <span className="mt-0.5 block text-xs">Оберіть підкатегорію</span> : null}
        </button>
      </div>

      {hasChildren && isExpanded ? (
        <ul role="group" className="mt-1 space-y-1">
          {node.children.map((child) => (
            <CategoryTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              selectedId={selectedId}
              allowParentSelection={allowParentSelection}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}
