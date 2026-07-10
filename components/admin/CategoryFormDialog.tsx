'use client'

import { useMemo, useState } from 'react'
import { flattenCategoryTree, type AdminCategoryTreeNode } from '@/types/categories'

type CategoryFormState = {
  name: string
  slug: string
  parentId: string
  isActive: boolean
}

function toFormState(options: {
  category?: AdminCategoryTreeNode | null
  parentId?: string | null
}): CategoryFormState {
  return {
    name: options.category?.name ?? '',
    slug: options.category?.slug ?? '',
    parentId: options.category?.parentId ?? options.parentId ?? '',
    isActive: options.category?.isActive ?? true,
  }
}

export default function CategoryFormDialog({
  open,
  mode,
  title,
  categories,
  category,
  parentId,
  excludedIds = [],
  isPending = false,
  errorMessage,
  onClose,
  onSubmit,
}: {
  open: boolean
  mode: 'create' | 'edit'
  title: string
  categories: AdminCategoryTreeNode[]
  category?: AdminCategoryTreeNode | null
  parentId?: string | null
  excludedIds?: string[]
  isPending?: boolean
  errorMessage?: string | null
  onClose: () => void
  onSubmit: (payload: {
    name: string
    slug?: string | null
    parentId?: string | null
    isActive?: boolean
  }) => void | Promise<void>
}) {
  const [formState, setFormState] = useState<CategoryFormState>(() => toFormState({ category, parentId }))

  const parentOptions = useMemo(
    () =>
      flattenCategoryTree(categories)
        .filter((node) => !excludedIds.includes(node.id))
        .map((node) => ({
          id: node.id,
          label: `${'— '.repeat(node.level)}${node.name}`,
        })),
    [categories, excludedIds],
  )

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface/70 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-4xl border border-panelBorder bg-surface p-6 shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-copy-strong">{title}</h2>
            <p className="mt-1 text-sm text-copy-secondary">
              {mode === 'create'
                ? 'Створіть новий вузол категорії в таксономії маркетплейсу.'
                : 'Оновіть назву категорії, slug, розташування та видимість.'}
            </p>
          </div>
          <button
            type="button"
            className="rounded-full border border-panelBorder px-3 py-2 text-sm text-copy-secondary transition-colors hover:bg-panelAlt hover:text-copy-strong"
            onClick={onClose}
          >
            Закрити
          </button>
        </div>

        <form
          className="mt-6 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault()
            await onSubmit({
              name: formState.name,
              slug: formState.slug.trim() ? formState.slug.trim() : undefined,
              parentId: formState.parentId || null,
              isActive: formState.isActive,
            })
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Назва</span>
              <input
                className="ui-surface-input"
                value={formState.name}
                onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </label>
            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Slug</span>
              <input
                className="ui-surface-input"
                value={formState.slug}
                onChange={(event) => setFormState((current) => ({ ...current, slug: event.target.value }))}
                placeholder="авто-з-назви"
              />
            </label>
          </div>

          <label className="space-y-2">
            <span className="block text-sm font-medium text-copy-strong">Батьківська категорія</span>
            <select
              className="ui-surface-input"
              value={formState.parentId}
              onChange={(event) => setFormState((current) => ({ ...current, parentId: event.target.value }))}
            >
              <option value="">Коренева категорія</option>
              {parentOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-panelBorder bg-panel px-4 py-4">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-brand"
              checked={formState.isActive}
              onChange={(event) => setFormState((current) => ({ ...current, isActive: event.target.checked }))}
            />
            <span className="space-y-1 text-sm">
              <span className="block font-medium text-copy-strong">Активна в таксономії</span>
              <span className="block text-copy-secondary">
                Неактивні категорії приховуються з дерева категорій продавця та публічного каталогу.
              </span>
            </span>
          </label>

          {errorMessage ? (
            <p className="rounded-2xl border border-brand-danger/20 bg-brand-danger/10 px-4 py-3 text-sm text-copy-primary">
              {errorMessage}
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" className="ui-secondary-button" onClick={onClose} disabled={isPending}>
              Скасувати
            </button>
            <button type="submit" className="ui-primary-button" disabled={isPending}>
              {isPending ? 'Зберігаємо…' : mode === 'create' ? 'Створити категорію' : 'Зберегти зміни'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
