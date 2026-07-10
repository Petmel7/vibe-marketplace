'use client'

import { useState } from 'react'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import CategoryFormDialog from '@/components/admin/CategoryFormDialog'
import ReorderControls from '@/components/admin/ReorderControls'
import { useAdminCategories } from '@/hooks/useAdminCategories'
import { useAdminMutation } from '@/hooks/useAdminMutation'
import { API_ROUTES } from '@/lib/constants/apiRoutes'
import {
  flattenCategoryTree,
  getSubtreeProductCount,
  type AdminCategoryTreeNode,
} from '@/types/categories'

type DialogState =
  | { mode: 'closed' }
  | { mode: 'create'; parentId?: string | null }
  | { mode: 'edit'; categoryId: string }

function findAdminCategoryById(nodes: AdminCategoryTreeNode[], id: string): AdminCategoryTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node
    }

    const childMatch = findAdminCategoryById(node.children, id)
    if (childMatch) {
      return childMatch
    }
  }

  return null
}

export default function AdminCategoryTree() {
  const { categories, isLoading, errorMessage, reloadCategories } = useAdminCategories()
  const { execute, errorMessage: mutationErrorMessage, isPending, setErrorMessage } = useAdminMutation()
  const [dialogState, setDialogState] = useState<DialogState>({ mode: 'closed' })

  const activeDialogCategory =
    dialogState.mode === 'edit' ? findAdminCategoryById(categories, dialogState.categoryId) : null

  const excludedIds =
    dialogState.mode === 'edit' && activeDialogCategory
      ? [activeDialogCategory.id, ...flattenCategoryTree(activeDialogCategory.children).map((node) => node.id)]
      : []

  async function handleReorder(siblings: AdminCategoryTreeNode[], currentId: string, direction: 'up' | 'down') {
    const currentIndex = siblings.findIndex((node) => node.id === currentId)
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= siblings.length) {
      return
    }

    const next = siblings.slice()
    const [item] = next.splice(currentIndex, 1)
    next.splice(targetIndex, 0, item)

    await execute<AdminCategoryTreeNode[]>({
      url: API_ROUTES.adminCategoryReorder,
      method: 'PATCH',
      body: {
        items: next.map((node, index) => ({ id: node.id, position: index })),
      },
      successMessage: 'Порядок категорій оновлено.',
      fallbackErrorMessage: 'Зараз не вдалося змінити порядок категорій.',
      onSuccess: async () => {
        await reloadCategories()
      },
    })
  }

  async function handleToggleActive(node: AdminCategoryTreeNode) {
    const action = node.isActive ? 'archive' : 'reactivate'
    const confirmed = window.confirm(
      node.isActive
        ? `Архівувати "${node.name}" і приховати її з дерева категорій продавця та публічного каталогу?`
        : `Повторно активувати "${node.name}" і знову показувати її в активних деревах категорій?`,
    )

    if (!confirmed) {
      return
    }

    await execute<AdminCategoryTreeNode>({
      url: `${API_ROUTES.adminCategories}/${node.id}`,
      method: 'PATCH',
      body: {
        isActive: !node.isActive,
      },
      successMessage: action === 'archive' ? 'Категорію архівовано.' : 'Категорію повторно активовано.',
      fallbackErrorMessage: 'Зараз не вдалося оновити видимість категорії.',
      onSuccess: async () => {
        await reloadCategories()
      },
    })
  }

  async function handleDelete(node: AdminCategoryTreeNode) {
    const subtreeProductCount = getSubtreeProductCount(node)
    if (subtreeProductCount > 0) {
      setErrorMessage('Категорії з прив’язаними товарами потрібно деактивувати, а не видаляти.')
      return
    }

    const confirmed = window.confirm(`Видалити "${node.name}" назавжди? Цю дію не можна скасувати.`)
    if (!confirmed) {
      return
    }

    await execute<{ deleted: true }>({
      url: `${API_ROUTES.adminCategories}/${node.id}`,
      method: 'DELETE',
      successMessage: 'Категорію видалено.',
      fallbackErrorMessage: 'Зараз не вдалося видалити цю категорію.',
      onSuccess: async () => {
        await reloadCategories()
      },
    })
  }

  async function handleDialogSubmit(payload: {
    name: string
    slug?: string | null
    parentId?: string | null
    isActive?: boolean
  }) {
    if (dialogState.mode === 'create') {
      const created = await execute<AdminCategoryTreeNode>({
        url: API_ROUTES.adminCategories,
        method: 'POST',
        body: {
          ...payload,
          parentId: payload.parentId ?? dialogState.parentId ?? null,
        },
        successMessage: 'Категорію створено.',
        fallbackErrorMessage: 'Зараз не вдалося створити цю категорію.',
        onSuccess: async () => {
          await reloadCategories()
          setDialogState({ mode: 'closed' })
        },
      })

      if (!created) {
        return
      }

      return
    }

    if (dialogState.mode === 'edit') {
      const updated = await execute<AdminCategoryTreeNode>({
        url: `${API_ROUTES.adminCategories}/${dialogState.categoryId}`,
        method: 'PATCH',
        body: payload,
        successMessage: 'Категорію оновлено.',
        fallbackErrorMessage: 'Зараз не вдалося оновити цю категорію.',
        onSuccess: async () => {
          await reloadCategories()
          setDialogState({ mode: 'closed' })
        },
      })

      if (!updated) {
        return
      }
    }
  }

  const totalCategories = flattenCategoryTree(categories).length

  if (isLoading) {
    return (
      <section className="ui-elevated-panel p-5 sm:p-6" aria-busy="true">
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-40 rounded bg-panelAlt" />
          <div className="h-24 rounded-2xl bg-panelAlt" />
          <div className="h-24 rounded-2xl bg-panelAlt" />
          <div className="h-24 rounded-2xl bg-panelAlt" />
        </div>
      </section>
    )
  }

  return (
    <div className="space-y-6">
      <section className="ui-elevated-panel p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-copy-strong">Таксономія маркетплейсу</h2>
            <p className="max-w-3xl text-sm text-copy-secondary">
              Керуйте вкладеним деревом категорій, яке продавці використовують для класифікації товарів. Порядок
              кореневих і дочірніх категорій лишається передбачуваним завдяки явним елементам керування позиціями.
            </p>
          </div>
          <button
            type="button"
            className="ui-primary-button"
            onClick={() => {
              setErrorMessage(null)
              setDialogState({ mode: 'create', parentId: null })
            }}
          >
            Створити кореневу категорію
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-panelBorder bg-panel px-4 py-4 text-sm text-copy-secondary">
          Усього вузлів категорій: <span className="font-medium text-copy-strong">{totalCategories}</span>
        </div>

        {errorMessage ? (
          <div className="mt-4 rounded-2xl border border-brand-danger/20 bg-brand-danger/10 px-4 py-4 text-sm text-copy-primary">
            {errorMessage}
          </div>
        ) : null}

        {mutationErrorMessage ? (
          <div className="mt-4 rounded-2xl border border-brand-danger/20 bg-brand-danger/10 px-4 py-4 text-sm text-copy-primary">
            {mutationErrorMessage}
          </div>
        ) : null}
      </section>

      <section className="ui-elevated-panel p-5 sm:p-6">
        {categories.length === 0 ? (
          <AdminEmptyState
            title="Дерево категорій порожнє"
            description="Створіть першу кореневу категорію, щоб почати будувати таксономію маркетплейсу."
          />
        ) : (
          <div className="space-y-4">
            {categories.map((node, index) => (
              <AdminCategoryBranch
                key={node.id}
                node={node}
                siblings={categories}
                index={index}
                ancestors={[]}
                isPending={isPending}
                onCreateChild={(parentId) => {
                  setErrorMessage(null)
                  setDialogState({ mode: 'create', parentId })
                }}
                onEdit={(categoryId) => {
                  setErrorMessage(null)
                  setDialogState({ mode: 'edit', categoryId })
                }}
                onToggleActive={handleToggleActive}
                onDelete={handleDelete}
                onReorder={handleReorder}
              />
            ))}
          </div>
        )}
      </section>

      <CategoryFormDialog
        key={
          dialogState.mode === 'edit'
            ? `edit-${dialogState.categoryId}`
            : dialogState.mode === 'create'
              ? `create-${dialogState.parentId ?? 'root'}`
              : 'closed'
        }
        open={dialogState.mode !== 'closed'}
        mode={dialogState.mode === 'edit' ? 'edit' : 'create'}
        title={dialogState.mode === 'edit' ? 'Редагувати категорію' : 'Створити категорію'}
        categories={categories}
        category={activeDialogCategory}
        parentId={dialogState.mode === 'create' ? dialogState.parentId : undefined}
        excludedIds={excludedIds}
        isPending={isPending}
        errorMessage={mutationErrorMessage}
        onClose={() => setDialogState({ mode: 'closed' })}
        onSubmit={handleDialogSubmit}
      />
    </div>
  )
}

function AdminCategoryBranch({
  node,
  siblings,
  index,
  ancestors,
  isPending,
  onCreateChild,
  onEdit,
  onToggleActive,
  onDelete,
  onReorder,
}: {
  node: AdminCategoryTreeNode
  siblings: AdminCategoryTreeNode[]
  index: number
  ancestors: string[]
  isPending: boolean
  onCreateChild: (parentId: string) => void
  onEdit: (categoryId: string) => void
  onToggleActive: (node: AdminCategoryTreeNode) => void
  onDelete: (node: AdminCategoryTreeNode) => void
  onReorder: (siblings: AdminCategoryTreeNode[], currentId: string, direction: 'up' | 'down') => void | Promise<void>
}) {
  const breadcrumb = [...ancestors, node.name].join(' / ')
  const subtreeProductCount = getSubtreeProductCount(node)

  return (
    <div className="rounded-3xl border border-panelBorder bg-panel/40 p-4 sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-copy-strong">{node.name}</h3>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                node.isActive ? 'bg-brand-success/15 text-copy-strong' : 'bg-panelAlt text-copy-secondary'
              }`}
            >
              {node.isActive ? 'Активна' : 'Неактивна'}
            </span>
            <span className="rounded-full bg-panelAlt px-3 py-1 text-xs font-medium text-copy-secondary">
              {node.slug}
            </span>
          </div>
          <p className="text-sm text-copy-secondary">{breadcrumb}</p>
          <div className="flex flex-wrap gap-3 text-xs text-copy-muted">
            <span>Дочірніх: {node.children.length}</span>
            <span>Прямих товарів: {node.productCount}</span>
            <span>Товарів у піддереві: {subtreeProductCount}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
          <ReorderControls
            label={node.name}
            canMoveUp={index > 0}
            canMoveDown={index < siblings.length - 1}
            disabled={isPending}
            onMoveUp={() => void onReorder(siblings, node.id, 'up')}
            onMoveDown={() => void onReorder(siblings, node.id, 'down')}
          />
          <button type="button" className="ui-secondary-button" onClick={() => onCreateChild(node.id)} disabled={isPending}>
            Додати дочірню
          </button>
          <button type="button" className="ui-secondary-button" onClick={() => onEdit(node.id)} disabled={isPending}>
            Редагувати
          </button>
          <button
            type="button"
            className="rounded-full border border-panelBorder px-4 py-2 text-sm text-copy-secondary transition-colors hover:bg-panelAlt hover:text-copy-strong"
            onClick={() => void onToggleActive(node)}
            disabled={isPending}
          >
            {node.isActive ? 'Архівувати' : 'Активувати знову'}
          </button>
          <button
            type="button"
            className="rounded-full border border-brand-danger/30 px-4 py-2 text-sm text-brand-danger transition-colors hover:bg-brand-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => void onDelete(node)}
            disabled={isPending || subtreeProductCount > 0}
            title={subtreeProductCount > 0 ? 'Деактивуйте категорії з товарами замість їх видалення.' : undefined}
          >
            Видалити
          </button>
        </div>
      </div>

      {node.children.length > 0 ? (
        <div className="mt-4 space-y-4 border-l border-panelBorder pl-4 sm:pl-5">
          {node.children.map((child, childIndex) => (
            <AdminCategoryBranch
              key={child.id}
              node={child}
              siblings={node.children}
              index={childIndex}
              ancestors={[...ancestors, node.name]}
              isPending={isPending}
              onCreateChild={onCreateChild}
              onEdit={onEdit}
              onToggleActive={onToggleActive}
              onDelete={onDelete}
              onReorder={onReorder}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
