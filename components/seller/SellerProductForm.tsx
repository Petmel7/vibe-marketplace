'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import CategoryBreadcrumb from '@/components/seller/CategoryBreadcrumb'
import CategoryTreeSelect from '@/components/seller/CategoryTreeSelect'
import MultiImageUploadField from '@/components/seller/MultiImageUploadField'
import ProductStatusBadge from '@/components/seller/ProductStatusBadge'
import UploadProgress from '@/components/seller/UploadProgress'
import {
  createVariantSchema,
  createSellerProductSchema,
  updateVariantSchema,
  updateSellerProductSchema,
} from '@/features/seller/products/seller-product.schema'
import {
  PRODUCT_SIZE_OPTIONS,
  type AllowedProductSize,
  isAllowedProductSize,
} from '@/features/seller/products/seller-product.sizes'
import { useProductImageUpload, type ProductImageDraft } from '@/hooks/useProductImageUpload'
import { useSellerCategories } from '@/hooks/useSellerCategories'
import { useSellerMutation } from '@/hooks/useSellerMutation'
import {
  getCreateSkuPayloadValue,
  getUpdateSkuPayloadValue,
  generateBaseSkuDraft,
  generateVariantSkuDraft,
  validateProductImageFile,
} from '@/lib/utils/sellerForm'
import { findCategoryPathById, flattenCategoryTree, isLeafCategoryNode } from '@/types/categories'
import { canArchiveProduct, canSubmitProductForReview, type SellerProductStatus } from '@/types/seller'

type VariantState = {
  id?: string
  sku: string
  size: string
  color: string
  price: string
  stock: number
  isSkuManual: boolean
}

type ProductEditorValue = {
  id: string
  name: string
  description: string | null
  price: string
  imageUrl: string | null
  sku: string | null
  categoryId: string | null
  status: SellerProductStatus
  rejectionReason: string | null
  images: Array<{
    id: string
    url: string
    storagePath: string
    altText: string | null
    position: number
    isPrimary: boolean
  }>
  variants: Array<{
    id: string
    sku: string
    size: string | null
    color: string | null
    price: string | null
    stock: number
  }>
}

function createVariantState(): VariantState {
  return { sku: '', size: '', color: '', price: '', stock: 0, isSkuManual: false }
}

function createImageDraftId() {
  return `draft-${crypto.randomUUID()}`
}

function revokePreviewUrl(image: ProductImageDraft | undefined) {
  if (image?.previewUrl && image.previewUrl.startsWith('blob:')) {
    URL.revokeObjectURL(image.previewUrl)
  }
}

function normalizeImageDrafts(images: ProductImageDraft[]) {
  const ordered = images.map((image, index) => ({ ...image, position: index }))
  if (ordered.length === 0) return ordered
  const primaryIndex = ordered.findIndex((image) => image.isPrimary)
  return ordered.map((image, index) => ({
    ...image,
    isPrimary: primaryIndex === -1 ? index === 0 : index === primaryIndex,
  }))
}

function moveImageDraft(images: ProductImageDraft[], id: string, direction: 'up' | 'down') {
  const currentIndex = images.findIndex((image) => image.id === id)
  if (currentIndex === -1) return images
  const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
  if (nextIndex < 0 || nextIndex >= images.length) return images
  const updated = images.slice()
  const [item] = updated.splice(currentIndex, 1)
  updated.splice(nextIndex, 0, item)
  return normalizeImageDrafts(updated)
}

function syncVariantSku(baseSku: string, variant: VariantState, index: number) {
  return variant.isSkuManual ? variant : { ...variant, sku: generateVariantSkuDraft(baseSku, variant, index) }
}

function syncVariantList(baseSku: string, variants: VariantState[]) {
  return variants.map((variant, index) => syncVariantSku(baseSku, variant, index))
}

function dedupeSelectedSizes(sizes: AllowedProductSize[]) {
  return Array.from(new Set(sizes))
}

function buildCreateVariantsFromSizes(
  selectedSizes: AllowedProductSize[],
  currentVariants: VariantState[],
  baseSku: string,
) {
  if (selectedSizes.length === 0) {
    const fallbackVariant = currentVariants.find((variant) => !variant.size) ?? createVariantState()
    return syncVariantList(baseSku, [{ ...fallbackVariant, size: '' }])
  }

  const variants = selectedSizes.map((size) => {
    const existingVariant = currentVariants.find((variant) => variant.size === size)
    return existingVariant
      ? { ...existingVariant, size }
      : { ...createVariantState(), size }
  })

  return syncVariantList(baseSku, variants)
}

function renderSizeValueLabel(size: string) {
  return size || 'Без розміру'
}

export default function SellerProductForm({
  mode,
  storeSlug,
  initialProduct,
}: {
  mode: 'create' | 'edit'
  storeSlug: string
  initialProduct?: ProductEditorValue | null
}) {
  const router = useRouter()
  const { execute, isPending, errorMessage, setErrorMessage } = useSellerMutation()
  const { uploadImages, removeImage, reorderImages, setPrimaryImage, progress, isUploading } = useProductImageUpload()
  const { categories, isLoading: isLoadingCategories, errorMessage: categoryError } = useSellerCategories()
  const [formState, setFormState] = useState({
    name: initialProduct?.name ?? '',
    description: initialProduct?.description ?? '',
    price: initialProduct?.price ?? '',
    sku: initialProduct?.sku ?? '',
    categoryId: initialProduct?.categoryId ?? '',
  })
  const [isBaseSkuManual, setIsBaseSkuManual] = useState(mode === 'edit' || Boolean(initialProduct?.sku))
  const [productImages, setProductImages] = useState<ProductImageDraft[]>(
    normalizeImageDrafts(
      initialProduct?.images.map((image) => ({
        id: image.id,
        url: image.url,
        previewUrl: null,
        storagePath: image.storagePath,
        altText: image.altText ?? '',
        isPrimary: image.isPrimary,
        position: image.position,
        source: 'server',
      })) ?? [],
    ),
  )
  const [persistedImageIds, setPersistedImageIds] = useState<string[]>(initialProduct?.images.map((image) => image.id) ?? [])
  const [productImageError, setProductImageError] = useState<string | null>(null)
  const [createVariants, setCreateVariants] = useState<VariantState[]>(
    mode === 'create'
      ? initialProduct?.variants.map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        size: variant.size ?? '',
        color: variant.color ?? '',
        price: variant.price ?? '',
        stock: variant.stock,
        isSkuManual: true,
      })) ?? [createVariantState()]
      : [],
  )
  const [selectedCreateSizes, setSelectedCreateSizes] = useState<AllowedProductSize[]>(
    mode === 'create'
      ? dedupeSelectedSizes(
        initialProduct?.variants
          .map((variant) => variant.size)
          .filter((size): size is AllowedProductSize => isAllowedProductSize(size)) ?? [],
      )
      : [],
  )
  const [editVariants, setEditVariants] = useState<VariantState[]>(
    initialProduct?.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      size: variant.size ?? '',
      color: variant.color ?? '',
      price: variant.price ?? '',
      stock: variant.stock,
      isSkuManual: true,
    })) ?? [],
  )
  const [newVariant, setNewVariant] = useState<VariantState>(() =>
    syncVariantSku(initialProduct?.sku ?? '', createVariantState(), initialProduct?.variants.length ?? 0),
  )
  const isBusy = isPending || isUploading
  const productImagesRef = useRef(productImages)

  useEffect(() => {
    productImagesRef.current = productImages
  }, [productImages])

  useEffect(() => {
    return () => {
      for (const image of productImagesRef.current) {
        revokePreviewUrl(image)
      }
    }
  }, [])

  const flattenedCategories = flattenCategoryTree(categories)
  const leafCategories = flattenedCategories.filter(isLeafCategoryNode)
  const selectedCategoryPath = findCategoryPathById(categories, formState.categoryId || null)
  const selectedCategoryIsValid =
    !formState.categoryId || leafCategories.some((category) => category.id === formState.categoryId)

  function updateBaseSku(nextSku: string, manual: boolean) {
    setIsBaseSkuManual(manual)
    setFormState((current) => ({ ...current, sku: nextSku }))
    if (mode === 'create') {
      setCreateVariants((current) => buildCreateVariantsFromSizes(selectedCreateSizes, current, nextSku))
    }
    setNewVariant((current) => syncVariantSku(nextSku, current, editVariants.length))
  }

  function toggleCreateSize(size: AllowedProductSize) {
    setSelectedCreateSizes((current) => {
      const next = current.includes(size)
        ? current.filter((entry) => entry !== size)
        : [...current, size]

      setCreateVariants((variants) => buildCreateVariantsFromSizes(next, variants, formState.sku))
      return next
    })
  }

  function setCreateVariantField(index: number, field: keyof VariantState, value: string | number | boolean) {
    setCreateVariants((current) =>
      current.map((variant, currentIndex) => {
        if (currentIndex !== index) return variant
        const updated = { ...variant, [field]: value }
        return field === 'sku' || updated.isSkuManual
          ? updated
          : { ...updated, sku: generateVariantSkuDraft(formState.sku, updated, index) }
      }),
    )
  }

  function setEditVariantField(index: number, field: keyof VariantState, value: string | number | boolean) {
    setEditVariants((current) =>
      current.map((variant, currentIndex) => {
        if (currentIndex !== index) return variant
        const updated = { ...variant, [field]: value }
        return field === 'sku' || updated.isSkuManual
          ? updated
          : { ...updated, sku: generateVariantSkuDraft(formState.sku, updated, currentIndex) }
      }),
    )
  }

  function renderVariantSizeSelect(params: {
    value: string
    onChange: (value: string) => void
    disabled?: boolean
  }) {
    return (
      <select
        className="ui-surface-input"
        value={params.value}
        onChange={(event) => params.onChange(event.target.value)}
        disabled={params.disabled}
      >
        <option value="">Без розміру</option>
        {PRODUCT_SIZE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    )
  }

  function handleFilesSelected(files: File[]) {
    if (files.length === 0) return
    const nextDrafts: ProductImageDraft[] = []
    let validationError: string | null = null
    for (const file of files) {
      const fileError = validateProductImageFile(file)
      if (fileError) {
        validationError = fileError
        continue
      }
      nextDrafts.push({
        id: createImageDraftId(),
        file,
        url: '',
        previewUrl: URL.createObjectURL(file),
        storagePath: null,
        altText: formState.name ? `${formState.name} — зображення товару` : '',
        isPrimary: false,
        position: 0,
        source: 'local',
      })
    }
    setProductImageError(validationError)
    if (nextDrafts.length > 0) {
      setProductImages((current) => normalizeImageDrafts([...current, ...nextDrafts]))
    }
  }

  async function persistProductGallery(productId: string) {
    const normalized = normalizeImageDrafts(productImages)
    const removedServerIds = persistedImageIds.filter(
      (imageId) => !normalized.some((image) => image.source === 'server' && image.id === imageId),
    )

    for (const imageId of removedServerIds) {
      const removed = await removeImage(productId, imageId)
      if (!removed) return false
    }

    const localImages = normalized.filter((image) => image.source === 'local')
    let uploadedMap = new Map<string, ProductImageDraft>()

    if (localImages.length > 0) {
      const uploaded = await uploadImages(
        productId,
        localImages.map((image) => ({
          ...image,
          position: normalized.findIndex((entry) => entry.id === image.id),
        })),
      )
      if (!uploaded) return false
      for (const image of localImages) {
        revokePreviewUrl(image)
      }
      uploadedMap = new Map(localImages.map((image, index) => [image.id, uploaded[index]]))
    }

    const finalImages = normalized
      .map((image) => (image.source === 'server' ? image : uploadedMap.get(image.id)))
      .filter((image): image is ProductImageDraft => Boolean(image))

    if (finalImages.length === 0) {
      for (const image of normalized) {
        revokePreviewUrl(image)
      }
      setProductImages([])
      setPersistedImageIds([])
      return true
    }

    const reordered = await reorderImages(
      productId,
      finalImages.map((image, index) => ({ id: image.id, position: index })),
    )
    if (!reordered) return false

    const primary = finalImages.find((image) => image.isPrimary) ?? finalImages[0]
    const withPrimary = primary ? await setPrimaryImage(productId, primary.id) : reordered
    if (!withPrimary) return false

    setProductImages(withPrimary)
    setPersistedImageIds(withPrimary.map((image) => image.id))
    return true
  }

  async function submitBaseForm() {
    setErrorMessage(null)
    setProductImageError(null)

    if (!selectedCategoryIsValid) {
      setErrorMessage('Оберіть коректну категорію.')
      return
    }

    if (mode === 'create') {
      const parsed = createSellerProductSchema.safeParse({
        name: formState.name,
        description: formState.description || null,
        price: formState.price,
        sku: getCreateSkuPayloadValue(formState.sku, isBaseSkuManual),
        categoryId: formState.categoryId || null,
        variants: createVariants.map((variant) => ({
          sku: getCreateSkuPayloadValue(variant.sku, variant.isSkuManual),
          size: variant.size || null,
          color: variant.color || null,
          price: variant.price || null,
          stock: variant.stock,
        })),
      })

      if (!parsed.success) {
        setErrorMessage(parsed.error.issues[0]?.message ?? 'Перевірте поля товару.')
        return
      }

      const data = await execute<{ id: string }>({
        url: '/api/seller/products',
        method: 'POST',
        body: parsed.data,
        successMessage: 'Чернетку товару створено.',
        refresh: false,
      })

      if (!data) return
      await persistProductGallery(data.id)
      router.push(`/seller/products/${data.id}`)
      return
    }

    if (!initialProduct) return

    const parsed = updateSellerProductSchema.safeParse({
      name: formState.name,
      description: formState.description || null,
      price: formState.price,
      sku: getUpdateSkuPayloadValue(formState.sku, isBaseSkuManual),
      categoryId: formState.categoryId || null,
    })

    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? 'Перевірте поля товару.')
      return
    }

    const saved = await execute({
      url: `/api/seller/products/${initialProduct.id}`,
      method: 'PATCH',
      body: parsed.data,
      successMessage: 'Товар оновлено.',
      refresh: false,
    })

    if (!saved) return
    const gallerySaved = await persistProductGallery(initialProduct.id)
    if (!gallerySaved) return
    router.refresh()
  }

  async function saveExistingVariant(index: number) {
    if (!initialProduct) return

    const variant = editVariants[index]
    if (!variant?.id) return

    const parsed = updateVariantSchema.safeParse({
      sku: getCreateSkuPayloadValue(variant.sku, variant.isSkuManual),
      size: variant.size || null,
      color: variant.color || null,
      price: variant.price || null,
      stock: variant.stock,
    })

    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? 'Перевірте поля варіанта.')
      return
    }

    const saved = await execute<{
      id: string
      sku: string
      size: string | null
      color: string | null
      price: string | null
      stock: number
    }>({
      url: `/api/seller/products/${initialProduct.id}/variants/${variant.id}`,
      method: 'PATCH',
      body: parsed.data,
      successMessage: 'Варіант оновлено.',
      refresh: false,
    })

    if (!saved) return

    setEditVariants((current) =>
      current.map((entry, currentIndex) =>
        currentIndex === index
          ? {
            id: saved.id,
            sku: saved.sku,
            size: saved.size ?? '',
            color: saved.color ?? '',
            price: saved.price ?? '',
            stock: saved.stock,
            isSkuManual: true,
          }
          : entry,
      ),
    )
    setNewVariant((current) => syncVariantSku(formState.sku, current, editVariants.length))
    router.refresh()
  }

  async function removeExistingVariant(index: number) {
    if (!initialProduct) return

    const variant = editVariants[index]
    if (!variant?.id) return

    const removed = await execute<null>({
      url: `/api/seller/products/${initialProduct.id}/variants/${variant.id}`,
      method: 'DELETE',
      successMessage: 'Варіант видалено.',
      refresh: false,
    })

    if (removed === null) return

    setEditVariants((current) => current.filter((_, currentIndex) => currentIndex !== index))
    setNewVariant((current) => syncVariantSku(formState.sku, current, Math.max(editVariants.length - 1, 0)))
    router.refresh()
  }

  async function addNewVariant() {
    if (!initialProduct) return

    const parsed = createVariantSchema.safeParse({
      sku: getCreateSkuPayloadValue(newVariant.sku, newVariant.isSkuManual),
      size: newVariant.size || null,
      color: newVariant.color || null,
      price: newVariant.price || null,
      stock: newVariant.stock,
    })

    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? 'Перевірте поля нового варіанта.')
      return
    }

    const created = await execute<{
      id: string
      sku: string
      size: string | null
      color: string | null
      price: string | null
      stock: number
    }>({
      url: `/api/seller/products/${initialProduct.id}/variants`,
      method: 'POST',
      body: parsed.data,
      successMessage: 'Варіант додано.',
      refresh: false,
    })

    if (!created) return

    setEditVariants((current) => [
      ...current,
      {
        id: created.id,
        sku: created.sku,
        size: created.size ?? '',
        color: created.color ?? '',
        price: created.price ?? '',
        stock: created.stock,
        isSkuManual: true,
      },
    ])
    setNewVariant(syncVariantSku(formState.sku, createVariantState(), editVariants.length + 1))
    router.refresh()
  }

  async function submitForReview() {
    if (!initialProduct) return

    const submitted = await execute({
      url: `/api/seller/products/${initialProduct.id}/submit`,
      method: 'POST',
      successMessage: 'Товар відправлено на перевірку.',
      refresh: false,
    })

    if (!submitted) return
    router.refresh()
  }

  async function archiveProduct() {
    if (!initialProduct) return

    const archived = await execute({
      url: `/api/seller/products/${initialProduct.id}/archive`,
      method: 'POST',
      successMessage: 'Товар архівовано.',
      refresh: false,
    })

    if (!archived) return
    router.push('/seller/products')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <section className="ui-elevated-panel p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-copy-strong">
              {mode === 'create' ? 'Нова чернетка товару' : 'Деталі товару'}
            </h2>
            <p className="mt-1 text-sm text-copy-muted">
              Підготуйте чернетку для модерації з керованим вибором категорії, редагованою генерацією SKU та галереєю товару.
            </p>
          </div>
          {initialProduct ? <ProductStatusBadge status={initialProduct.status} /> : null}
        </div>

        {initialProduct?.rejectionReason ? (
          <div className="mt-5 rounded-2xl border border-brand-danger/20 bg-brand-danger/10 px-4 py-3 text-sm text-copy-primary">
            {initialProduct.rejectionReason}
          </div>
        ) : null}

        <form
          className="mt-6 grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault()
            await submitBaseForm()
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 sm:col-span-2">
              <span className="block text-sm font-medium text-copy-strong">Назва товару</span>
              <input
                className="ui-surface-input"
                value={formState.name}
                onChange={(event) => {
                  const nextName = event.target.value
                  if (mode === 'create' && !isBaseSkuManual) {
                    const nextSku = generateBaseSkuDraft(nextName, storeSlug)
                    setFormState((current) => ({ ...current, name: nextName, sku: nextSku }))
                    setCreateVariants((current) => syncVariantList(nextSku, current))
                    setNewVariant((current) => syncVariantSku(nextSku, current, editVariants.length))
                    return
                  }

                  setFormState((current) => ({ ...current, name: nextName }))
                }}
                required
              />
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="block text-sm font-medium text-copy-strong">Опис</span>
              <textarea
                className="ui-surface-input min-h-32 resize-y"
                value={formState.description}
                onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))}
              />
            </label>
            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Базова ціна</span>
              <input
                className="ui-surface-input"
                value={formState.price}
                onChange={(event) => setFormState((current) => ({ ...current, price: event.target.value }))}
                placeholder="1299.00"
                required
              />
            </label>
            <div className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Базовий SKU</span>
              <div className="flex gap-2">
                <input
                  className="ui-surface-input"
                  value={formState.sku}
                  onChange={(event) => updateBaseSku(event.target.value, true)}
                />
                <button
                  type="button"
                  className="ui-secondary-button h-12 px-4 py-2 text-sm"
                  onClick={() => updateBaseSku(generateBaseSkuDraft(formState.name, storeSlug), mode !== 'create')}
                >
                  Авто
                </button>
              </div>
              <p className="text-sm text-copy-muted">
                Чернетки SKU формуються з назви товару та контексту магазину, доки ви не перевизначите їх вручну.
              </p>
            </div>
            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Категорія</span>
              <CategoryTreeSelect
                tree={categories}
                value={formState.categoryId || null}
                onChange={(id) => setFormState((current) => ({ ...current, categoryId: id ?? '' }))}
                disabled={isBusy}
                isLoading={isLoadingCategories}
                errorMessage={categoryError}
              />
              <CategoryBreadcrumb
                items={selectedCategoryPath.map((category) => category.name)}
                emptyLabel="Оберіть фінальну підкатегорію. Для товару доступні лише листові категорії."
              />
              {!selectedCategoryIsValid ? (
                <p className="text-sm text-brand-danger">Оберіть коректну фінальну категорію.</p>
              ) : null}
            </label>
            <div className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Контекст магазину</span>
              <div className="rounded-2xl border border-panelBorder bg-panel px-4 py-3 text-sm text-copy-secondary">
                Чернетки використовують <span className="font-medium text-copy-strong">{storeSlug}</span> для формування підказок SKU.
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-panelBorder bg-panel px-4 py-3 text-sm text-copy-secondary">
            Бейджі маркетплейсу призначаються автоматично на основі дати публікації, продажів і аналітики платформи.
          </div>

          <MultiImageUploadField
            label="Галерея товару"
            description="Завантажте кілька зображень товару, виберіть головне фото, задайте доступний alt-текст і впорядкуйте галерею."
            items={productImages}
            disabled={isBusy}
            errorMessage={productImageError ?? progress.errorMessage}
            onFilesSelected={handleFilesSelected}
            onRemove={(id) => {
              setProductImages((current) => {
                const removed = current.find((image) => image.id === id)
                revokePreviewUrl(removed)
                return normalizeImageDrafts(current.filter((image) => image.id !== id))
              })
            }}
            onMove={(id, direction) => {
              setProductImages((current) => moveImageDraft(current, id, direction))
            }}
            onSetPrimary={(id) => {
              setProductImages((current) =>
                normalizeImageDrafts(current.map((image) => ({ ...image, isPrimary: image.id === id }))),
              )
            }}
            onAltTextChange={(id, value) => {
              setProductImages((current) =>
                current.map((image) => (image.id === id ? { ...image, altText: value } : image)),
              )
            }}
          />

          {progress.label ? (
            <UploadProgress
              label={progress.label}
              current={progress.current}
              total={progress.total}
              isActive={progress.status === 'uploading'}
            />
          ) : null}

          {mode === 'create' ? (
            <div className="space-y-4 rounded-3xl border border-panelBorder bg-panel/40 p-5">
              <div>
                <h3 className="text-base font-semibold text-copy-strong">Початкові варіанти</h3>
                <p className="mt-1 text-sm text-copy-muted">
                  Почніть з одного або кількох варіантів для продажу. SKU варіантів наслідують базовий SKU, доки ви не перевизначите їх.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <span className="block text-sm font-medium text-copy-strong">Розміри</span>
                  <div className="flex flex-wrap gap-2">
                    {PRODUCT_SIZE_OPTIONS.map((option) => {
                      const isSelected = selectedCreateSizes.includes(option.value)
                      const chipClass = isSelected
                        ? 'ui-filter-chip ui-filter-chip-selected'
                        : 'ui-filter-chip ui-filter-chip-default'

                      return (
                        <button
                          key={option.value}
                          type="button"
                          className={chipClass}
                          onClick={() => toggleCreateSize(option.value)}
                        >
                          {option.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <p className="text-sm text-copy-muted">
                  Оберіть доступні розміри, щоб автоматично створити варіанти. Якщо розмір не потрібен, залиште список порожнім.
                </p>
              </div>

              <div className="space-y-4">
                {createVariants.map((variant, index) => (
                  <div key={`create-variant-${index}`} className="grid gap-3 rounded-2xl border border-panelBorder bg-panel p-4">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                      <label className="space-y-2">
                        <span className="block text-sm font-medium text-copy-strong">Розмір</span>
                        <div className="ui-surface-input flex items-center">
                          {renderSizeValueLabel(variant.size)}
                        </div>
                      </label>
                      <label className="space-y-2">
                        <span className="block text-sm font-medium text-copy-strong">Колір</span>
                        <input
                          className="ui-surface-input"
                          value={variant.color}
                          onChange={(event) => setCreateVariantField(index, 'color', event.target.value)}
                          placeholder="Чорний"
                        />
                      </label>
                      <label className="space-y-2">
                        <span className="block text-sm font-medium text-copy-strong">Ціна варіанта</span>
                        <input
                          className="ui-surface-input"
                          value={variant.price}
                          onChange={(event) => setCreateVariantField(index, 'price', event.target.value)}
                          placeholder="Необов’язкове перевизначення"
                        />
                      </label>
                      <label className="space-y-2">
                        <span className="block text-sm font-medium text-copy-strong">Залишок</span>
                        <input
                          type="number"
                          min={0}
                          className="ui-surface-input"
                          value={variant.stock}
                          onChange={(event) => setCreateVariantField(index, 'stock', Number(event.target.value))}
                        />
                      </label>
                      <div className="space-y-2">
                        <span className="block text-sm font-medium text-copy-strong">SKU варіанта</span>
                        <div className="flex gap-2">
                          <input
                            className="ui-surface-input"
                            value={variant.sku}
                            onChange={(event) =>
                              setCreateVariants((current) =>
                                current.map((entry, currentIndex) =>
                                  currentIndex === index
                                    ? { ...entry, sku: event.target.value, isSkuManual: true }
                                    : entry,
                                ),
                              )
                            }
                          />
                          <button
                            type="button"
                            className="ui-secondary-button h-12 px-4 py-2 text-sm"
                            onClick={() =>
                              setCreateVariants((current) =>
                                current.map((entry, currentIndex) =>
                                  currentIndex === index
                                    ? {
                                      ...entry,
                                      isSkuManual: false,
                                      sku: generateVariantSkuDraft(formState.sku, entry, index),
                                    }
                                    : entry,
                                ),
                              )
                            }
                          >
                            Авто
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="hidden">
                      <button
                        type="button"
                        className="rounded-full border border-brand-danger/30 px-4 py-2 text-sm text-brand-danger transition-colors hover:bg-brand-danger/10"
                        disabled={createVariants.length === 1}
                        onClick={() =>
                          setCreateVariants((current) =>
                            syncVariantList(
                              formState.sku,
                              current.length === 1
                                ? current
                                : current.filter((_, currentIndex) => currentIndex !== index),
                            ),
                          )
                        }
                      >
                        Видалити варіант
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden">
                <button
                  type="button"
                  className="ui-secondary-button"
                  onClick={() =>
                    setCreateVariants((current) => [
                      ...syncVariantList(formState.sku, current),
                      {
                        ...createVariantState(),
                        sku: generateVariantSkuDraft(formState.sku, createVariantState(), current.length),
                      },
                    ])
                  }
                >
                  Додати варіант
                </button>
              </div>
            </div>
          ) : null}

          {mode === 'edit' ? (
            <div className="space-y-4 rounded-3xl border border-panelBorder bg-panel/40 p-5">
              <div>
                <h3 className="text-base font-semibold text-copy-strong">Варіанти</h3>
                <p className="mt-1 text-sm text-copy-muted">
                  Тримайте ціни й залишки варіантів у порядку, зберігаючи можливість вручну редагувати SKU.
                </p>
              </div>

              <div className="space-y-4">
                {editVariants.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-panelBorder bg-panel px-5 py-8 text-sm text-copy-muted">
                    Варіантів ще немає. Додайте перший нижче.
                  </div>
                ) : null}

                {editVariants.map((variant, index) => (
                  <div key={variant.id ?? `variant-${index}`} className="grid gap-3 rounded-2xl border border-panelBorder bg-panel p-4">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                      <label className="space-y-2">
                        <span className="block text-sm font-medium text-copy-strong">Розмір</span>
                        {renderVariantSizeSelect({
                          value: variant.size,
                          onChange: (value) => setEditVariantField(index, 'size', value),
                          disabled: isBusy,
                        })}
                      </label>
                      <label className="space-y-2">
                        <span className="block text-sm font-medium text-copy-strong">Колір</span>
                        <input
                          className="ui-surface-input"
                          value={variant.color}
                          onChange={(event) => setEditVariantField(index, 'color', event.target.value)}
                          placeholder="Чорний"
                        />
                      </label>
                      <label className="space-y-2">
                        <span className="block text-sm font-medium text-copy-strong">Ціна варіанта</span>
                        <input
                          className="ui-surface-input"
                          value={variant.price}
                          onChange={(event) => setEditVariantField(index, 'price', event.target.value)}
                          placeholder="Необов’язкове перевизначення"
                        />
                      </label>
                      <label className="space-y-2">
                        <span className="block text-sm font-medium text-copy-strong">Залишок</span>
                        <input
                          type="number"
                          min={0}
                          className="ui-surface-input"
                          value={variant.stock}
                          onChange={(event) => setEditVariantField(index, 'stock', Number(event.target.value))}
                        />
                      </label>
                      <div className="space-y-2">
                        <span className="block text-sm font-medium text-copy-strong">SKU варіанта</span>
                        <div className="flex gap-2">
                          <input
                            className="ui-surface-input"
                            value={variant.sku}
                            onChange={(event) =>
                              setEditVariants((current) =>
                                current.map((entry, currentIndex) =>
                                  currentIndex === index
                                    ? { ...entry, sku: event.target.value, isSkuManual: true }
                                    : entry,
                                ),
                              )
                            }
                          />
                          <button
                            type="button"
                            className="ui-secondary-button h-12 px-4 py-2 text-sm"
                            onClick={() =>
                              setEditVariants((current) =>
                                current.map((entry, currentIndex) =>
                                  currentIndex === index
                                    ? {
                                      ...entry,
                                      isSkuManual: true,
                                      sku: generateVariantSkuDraft(formState.sku, entry, currentIndex),
                                    }
                                    : entry,
                                ),
                              )
                            }
                          >
                            Авто
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-end gap-3">
                      <button
                        type="button"
                        className="ui-secondary-button"
                        disabled={isBusy}
                        onClick={() => void saveExistingVariant(index)}
                      >
                        Зберегти варіант
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-brand-danger/30 px-4 py-2 text-sm text-brand-danger transition-colors hover:bg-brand-danger/10"
                        disabled={isBusy}
                        onClick={() => void removeExistingVariant(index)}
                      >
                        Видалити
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 rounded-2xl border border-dashed border-panelBorder bg-panel px-4 py-4">
                <div>
                  <h4 className="text-sm font-semibold text-copy-strong">Додати новий варіант</h4>
                  <p className="mt-1 text-sm text-copy-muted">
                    SKU нового варіанта наслідує поточний базовий SKU, доки ви не задасте його вручну.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <label className="space-y-2">
                    <span className="block text-sm font-medium text-copy-strong">Розмір</span>
                    {renderVariantSizeSelect({
                      value: newVariant.size,
                      onChange: (value) =>
                        setNewVariant((current) => {
                          const updated = { ...current, size: value }
                          return current.isSkuManual
                            ? updated
                            : syncVariantSku(formState.sku, updated, editVariants.length)
                        }),
                      disabled: isBusy,
                    })}
                  </label>
                  <label className="space-y-2">
                    <span className="block text-sm font-medium text-copy-strong">Колір</span>
                    <input
                      className="ui-surface-input"
                      value={newVariant.color}
                      onChange={(event) =>
                        setNewVariant((current) => {
                          const updated = { ...current, color: event.target.value }
                          return current.isSkuManual
                            ? updated
                            : syncVariantSku(formState.sku, updated, editVariants.length)
                        })
                      }
                      placeholder="Чорний"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="block text-sm font-medium text-copy-strong">Ціна варіанта</span>
                    <input
                      className="ui-surface-input"
                      value={newVariant.price}
                      onChange={(event) => setNewVariant((current) => ({ ...current, price: event.target.value }))}
                      placeholder="Необов’язкове перевизначення"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="block text-sm font-medium text-copy-strong">Залишок</span>
                    <input
                      type="number"
                      min={0}
                      className="ui-surface-input"
                      value={newVariant.stock}
                      onChange={(event) => setNewVariant((current) => ({ ...current, stock: Number(event.target.value) }))}
                    />
                  </label>
                  <div className="space-y-2">
                    <span className="block text-sm font-medium text-copy-strong">SKU варіанта</span>
                    <div className="flex gap-2">
                      <input
                        className="ui-surface-input"
                        value={newVariant.sku}
                        onChange={(event) =>
                          setNewVariant((current) => ({
                            ...current,
                            sku: event.target.value,
                            isSkuManual: true,
                          }))
                        }
                      />
                      <button
                        type="button"
                        className="ui-secondary-button h-12 px-4 py-2 text-sm"
                        onClick={() =>
                          setNewVariant((current) => ({
                            ...current,
                            isSkuManual: false,
                            sku: generateVariantSkuDraft(formState.sku, current, editVariants.length),
                          }))
                        }
                      >
                        Авто
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    className="ui-secondary-button"
                    disabled={isBusy}
                    onClick={() => void addNewVariant()}
                  >
                    Додати варіант
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {errorMessage ? (
            <p className="text-sm text-brand-danger" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-3">
            {initialProduct && canArchiveProduct(initialProduct.status) ? (
              <button
                type="button"
                className="rounded-full border border-brand-danger/30 px-4 py-2 text-sm text-brand-danger transition-colors hover:bg-brand-danger/10"
                disabled={isBusy}
                onClick={() => void archiveProduct()}
              >
                Архівувати товар
              </button>
            ) : null}
            {initialProduct && canSubmitProductForReview(initialProduct.status) ? (
              <button
                type="button"
                className="ui-secondary-button"
                disabled={isBusy}
                onClick={() => void submitForReview()}
              >
                Відправити на перевірку
              </button>
            ) : null}
            <button type="submit" className="ui-primary-button" disabled={isBusy}>
              {mode === 'create' ? 'Створити чернетку товару' : 'Зберегти зміни'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
