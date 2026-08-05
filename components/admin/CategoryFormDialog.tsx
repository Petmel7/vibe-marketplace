'use client'

import { useId, useMemo, useState } from 'react'
import {
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogShell,
} from '@/components/ui/dialog'
import {
  ImagePreview,
  UploadActions,
  UploadCard,
  UploadDropzone,
  UploadError,
} from '@/components/ui/upload'
import { flattenCategoryTree, type AdminCategoryTreeNode } from '@/types/categories'

type CategoryFormState = {
  name: string
  slug: string
  parentId: string
  isActive: boolean
  imageUrl: string | null
  imageStoragePath: string | null
}

type CategoryImageState = {
  imageUrl: string | null
  imageStoragePath: string | null
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
    imageUrl: options.category?.imageUrl ?? null,
    imageStoragePath: options.category?.imageStoragePath ?? null,
  }
}

function CategoryImageUploadCard({
  categoryName,
  imageUrl,
  imageStoragePath,
  disabled,
  isEnabled,
  action,
  errorMessage,
  onUpload,
  onRemove,
}: {
  categoryName: string
  imageUrl: string | null
  imageStoragePath: string | null
  disabled: boolean
  isEnabled: boolean
  action: 'upload' | 'remove' | null
  errorMessage: string | null
  onUpload: (file: File) => void
  onRemove: () => void
}) {
  const inputId = useId()
  const descriptionId = `${inputId}-description`
  const errorId = `${inputId}-error`
  const isUploading = action === 'upload'
  const isRemoving = action === 'remove'

  return (
    <UploadCard>
      <div className="space-y-1">
        <label htmlFor={inputId} className="block text-sm font-medium text-copy-strong">
          Зображення категорії
        </label>
        <p id={descriptionId} className="text-sm text-copy-muted">
          JPG, PNG або WEBP до 2 МБ. Рекомендований мінімальний розмір — 512×512.
        </p>
        {!isEnabled ? (
          <p className="text-sm text-copy-secondary">
            Зображення можна додати після створення категорії.
          </p>
        ) : null}
        <UploadDropzone
          id={inputId}
          accept="image/png,image/jpeg,image/webp"
          disabled={disabled || !isEnabled}
          describedBy={errorMessage ? `${descriptionId} ${errorId}` : descriptionId}
          invalid={Boolean(errorMessage)}
          className="mt-3"
          onFilesSelected={(files) => {
            const file = files?.[0]
            if (file) {
              onUpload(file)
            }
          }}
        />
        <UploadError id={errorId}>{errorMessage}</UploadError>
      </div>

      <ImagePreview
        src={imageUrl}
        alt={categoryName}
        emptyLabel="Зображення ще не завантажено"
        sizes="(max-width: 768px) 100vw, 480px"
      />

      <div className="space-y-1">
        <p className="text-sm font-medium text-copy-strong">
          {imageUrl ? 'Поточне зображення категорії' : 'Зображення відсутнє'}
        </p>
        <p className="break-all text-sm text-copy-muted">
          {imageStoragePath ? imageStoragePath : imageUrl ? 'Legacy URL без storage path' : 'Завантажте файл, щоб показати мініатюру в дереві категорій.'}
        </p>
      </div>

      <UploadActions compact>
        <button
          type="button"
          className="ui-secondary-button h-10 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled || !isEnabled || !imageUrl}
          onClick={onRemove}
        >
          {isRemoving ? 'Видаляємо…' : isUploading ? 'Завантажуємо…' : 'Видалити зображення'}
        </button>
      </UploadActions>
    </UploadCard>
  )
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
  onImageUpload,
  onImageRemove,
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
  onImageUpload?: (categoryId: string, file: File) => Promise<CategoryImageState>
  onImageRemove?: (categoryId: string) => Promise<CategoryImageState>
}) {
  const [formState, setFormState] = useState<CategoryFormState>(() => toFormState({ category, parentId }))
  const [imageAction, setImageAction] = useState<'upload' | 'remove' | null>(null)
  const [imageErrorMessage, setImageErrorMessage] = useState<string | null>(null)
  const dialogTitleId = useId()
  const dialogDescriptionId = `${dialogTitleId}-description`

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

  const canManageImage = mode === 'edit' && Boolean(category?.id) && Boolean(onImageUpload) && Boolean(onImageRemove)
  const isImageBusy = imageAction !== null
  const isBusy = isPending || isImageBusy

  async function handleImageUpload(file: File) {
    if (!category?.id || !onImageUpload || isImageBusy) {
      return
    }

    setImageAction('upload')
    setImageErrorMessage(null)

    try {
      const uploaded = await onImageUpload(category.id, file)
      setFormState((current) => ({
        ...current,
        imageUrl: uploaded.imageUrl,
        imageStoragePath: uploaded.imageStoragePath,
      }))
    } catch (error) {
      setImageErrorMessage(error instanceof Error ? error.message : 'Зараз не вдалося завантажити зображення.')
    } finally {
      setImageAction(null)
    }
  }

  async function handleImageRemove() {
    if (!category?.id || !onImageRemove || isImageBusy) {
      return
    }

    setImageAction('remove')
    setImageErrorMessage(null)

    try {
      const removed = await onImageRemove(category.id)
      setFormState((current) => ({
        ...current,
        imageUrl: removed.imageUrl,
        imageStoragePath: removed.imageStoragePath,
      }))
    } catch (error) {
      setImageErrorMessage(error instanceof Error ? error.message : 'Зараз не вдалося видалити зображення.')
    } finally {
      setImageAction(null)
    }
  }

  return (
    <DialogShell
      open={open}
      labelledBy={dialogTitleId}
      describedBy={dialogDescriptionId}
      onClose={onClose}
      useDefaultClassNames={false}
      className="fixed inset-0 z-50 flex items-center justify-center bg-surface/70 px-4 py-8 backdrop-blur-sm"
      panelClassName="max-h-[calc(100vh-4rem)] w-full max-w-2xl overflow-y-auto rounded-4xl border border-panelBorder bg-[#1d2533] p-6 shadow-soft"
    >
      <DialogHeader
        title={title}
        titleId={dialogTitleId}
        descriptionId={dialogDescriptionId}
        description={
          <>
            {mode === 'create'
              ? 'Створіть новий вузол категорії в таксономії маркетплейсу.'
              : 'Оновіть назву категорії, slug, розташування та видимість.'}
          </>
        }
        actions={
          <button
            type="button"
            className="rounded-full border border-panelBorder px-3 py-2 text-sm text-copy-secondary transition-colors hover:bg-panelAlt hover:text-copy-strong"
            onClick={onClose}
          >
            Закрити
          </button>
        }
      />
      <DialogBody>
        <form
          className="space-y-4"
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

          <label className="mt-2 flex items-start gap-3 rounded-2xl border border-panelBorder bg-panel px-4 py-4">
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

          <CategoryImageUploadCard
            categoryName={formState.name || category?.name || 'Категорія'}
            imageUrl={formState.imageUrl}
            imageStoragePath={formState.imageStoragePath}
            disabled={isBusy}
            isEnabled={canManageImage}
            action={imageAction}
            errorMessage={imageErrorMessage}
            onUpload={handleImageUpload}
            onRemove={handleImageRemove}
          />

          {errorMessage ? (
            <p className="rounded-2xl border border-brand-danger/20 bg-brand-danger/10 px-4 py-3 text-sm text-copy-primary">
              {errorMessage}
            </p>
          ) : null}

          <DialogFooter className="!mt-0">
            <button
              type="button"
              className="ui-secondary-button max-[500px]:w-full"
              onClick={onClose}
              disabled={isBusy}
            >
              Скасувати
            </button>
            <button type="submit" className="ui-primary-button max-[500px]:w-full" disabled={isBusy}>
              {isPending ? 'Зберігаємо…' : mode === 'create' ? 'Створити категорію' : 'Зберегти зміни'}
            </button>
          </DialogFooter>
        </form>
      </DialogBody>
    </DialogShell>
  )
}
