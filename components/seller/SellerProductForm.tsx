'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import CategoryBreadcrumb from '@/components/seller/CategoryBreadcrumb'
import CategoryTreeSelect from '@/components/seller/CategoryTreeSelect'
import MultiImageUploadField from '@/components/seller/MultiImageUploadField'
import ProductStatusBadge from '@/components/seller/ProductStatusBadge'
import UploadProgress from '@/components/seller/UploadProgress'
import { hasUnsavedSellerProductChanges } from '@/components/seller/seller-product-form.helpers'
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
import {
  PRODUCT_DESCRIPTION_MAX_LENGTH,
  PRODUCT_DESCRIPTION_MODERATION_MIN_LENGTH,
  PRODUCT_NAME_MAX_LENGTH,
  PRODUCT_NAME_MODERATION_MIN_LENGTH,
  PRODUCT_PRICE_MAX,
  PRODUCT_PRICE_MIN,
  PRODUCT_VARIANT_STOCK_MAX,
  categoryRequiresSize,
} from '@/features/seller/products/seller-product.validation'
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

type SellerProductFieldErrors = Record<string, string[]>

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

function toVariantPayload(variant: VariantState) {
  return {
    sku: getCreateSkuPayloadValue(variant.sku, variant.isSkuManual),
    size: variant.size || null,
    color: variant.color || null,
    price: variant.price || null,
    stock: variant.stock,
  }
}

function hasMeaningfulVariantData(variant: VariantState) {
  return Boolean(
    variant.size
    || variant.color.trim()
    || variant.price.trim()
    || variant.stock > 0
    || (variant.isSkuManual && variant.sku.trim()),
  )
}

function serializeFormState(state: {
  name: string
  description: string
  price: string
  sku: string
  categoryId: string
}, isManual: boolean) {
  return JSON.stringify({
    ...state,
    isManual,
  })
}

function serializeVariants(variants: VariantState[]) {
  return JSON.stringify(
    variants.map((variant) => ({
      id: variant.id ?? null,
      sku: variant.sku,
      size: variant.size,
      color: variant.color,
      price: variant.price,
      stock: variant.stock,
      isSkuManual: variant.isSkuManual,
    })),
  )
}

function serializeImageDrafts(images: ProductImageDraft[]) {
  return JSON.stringify(
    normalizeImageDrafts(images).map((image) => ({
      id: image.id,
      source: image.source,
      url: image.url,
      storagePath: image.storagePath ?? null,
      altText: image.altText,
      isPrimary: image.isPrimary,
      position: image.position,
      fileName: image.file?.name ?? null,
    })),
  )
}

function addFieldError(fieldErrors: SellerProductFieldErrors, field: string, message: string) {
  fieldErrors[field] = [...(fieldErrors[field] ?? []), message]
}

function mapSchemaIssuesToFieldErrors(
  issues: Array<{ path: PropertyKey[]; message: string }>,
): SellerProductFieldErrors {
  const fieldErrors: SellerProductFieldErrors = {}

  for (const issue of issues) {
    const firstPath = issue.path[0]
    const nestedField = typeof issue.path[1] === 'number'
      ? issue.path[2]
      : issue.path[1]

    if (firstPath === 'variants') {
      if (nestedField === 'size') {
        addFieldError(fieldErrors, 'variantSize', issue.message)
        continue
      }
      if (nestedField === 'stock') {
        addFieldError(fieldErrors, 'variantStock', issue.message)
        continue
      }
      if (nestedField === 'price') {
        addFieldError(fieldErrors, 'variantPrice', issue.message)
        continue
      }
      addFieldError(fieldErrors, 'variants', issue.message)
      continue
    }

    if (firstPath === 'images') {
      addFieldError(fieldErrors, 'images', issue.message)
      continue
    }

    addFieldError(fieldErrors, typeof firstPath === 'string' ? firstPath : 'form', issue.message)
  }

  return fieldErrors
}

function collectFieldMessages(
  localErrors: SellerProductFieldErrors,
  remoteErrors: Record<string, string[]> | null,
  field: string,
) {
  return [...(localErrors[field] ?? []), ...(remoteErrors?.[field] ?? [])]
}

function validateModerationFormState(params: {
  formState: {
    name: string
    description: string
    price: string
    categoryId: string
  }
  productImages: ProductImageDraft[]
  variants: VariantState[]
  categoryPathSlugs: string[]
  selectedCategoryIsValid: boolean
}): SellerProductFieldErrors {
  const fieldErrors: SellerProductFieldErrors = {}
  const trimmedName = params.formState.name.trim()
  const trimmedDescription = params.formState.description.trim()
  const normalizedImages = normalizeImageDrafts(params.productImages)
  const meaningfulVariants = params.variants.filter(hasMeaningfulVariantData)
  const requiresSize = categoryRequiresSize(params.categoryPathSlugs)

  if (
    trimmedName.length < PRODUCT_NAME_MODERATION_MIN_LENGTH
    || trimmedName.length > PRODUCT_NAME_MAX_LENGTH
  ) {
    addFieldError(
      fieldErrors,
      'name',
      `Назва має містити від ${PRODUCT_NAME_MODERATION_MIN_LENGTH} до ${PRODUCT_NAME_MAX_LENGTH} символів.`,
    )
  }

  if (
    trimmedDescription.length < PRODUCT_DESCRIPTION_MODERATION_MIN_LENGTH
    || trimmedDescription.length > PRODUCT_DESCRIPTION_MAX_LENGTH
  ) {
    addFieldError(
      fieldErrors,
      'description',
      `Опис має містити від ${PRODUCT_DESCRIPTION_MODERATION_MIN_LENGTH} до ${PRODUCT_DESCRIPTION_MAX_LENGTH} символів.`,
    )
  }

  const parsedPrice = Number(params.formState.price)
  if (!Number.isFinite(parsedPrice) || parsedPrice < PRODUCT_PRICE_MIN || parsedPrice > PRODUCT_PRICE_MAX) {
    addFieldError(fieldErrors, 'price', `Базова ціна має бути в межах ${PRODUCT_PRICE_MIN}–${PRODUCT_PRICE_MAX}.`)
  }

  if (!params.formState.categoryId) {
    addFieldError(fieldErrors, 'categoryId', 'Оберіть категорію товару.')
  } else if (!params.selectedCategoryIsValid) {
    addFieldError(fieldErrors, 'categoryId', 'Категорія має бути фінальною підкатегорією без дочірніх елементів.')
  }

  if (normalizedImages.length === 0) {
    addFieldError(fieldErrors, 'images', 'Додайте щонайменше одне зображення товару.')
  }

  const primaryImage = normalizedImages.find((image) => image.isPrimary) ?? null
  if (normalizedImages.length > 0 && !primaryImage) {
    addFieldError(fieldErrors, 'primaryImage', 'Позначте головне фото товару.')
  }

  if (meaningfulVariants.length === 0) {
    addFieldError(fieldErrors, 'variants', 'Додайте щонайменше один варіант товару.')
  } else {
    let hasStock = false

    for (const variant of meaningfulVariants) {
      if (variant.stock > 0) {
        hasStock = true
      }

      if (!Number.isInteger(variant.stock) || variant.stock < 0 || variant.stock > PRODUCT_VARIANT_STOCK_MAX) {
        addFieldError(
          fieldErrors,
          'variantStock',
          `Залишок варіанта має бути цілим числом у межах 0–${PRODUCT_VARIANT_STOCK_MAX}.`,
        )
      }

      if (variant.price.trim()) {
        const parsedVariantPrice = Number(variant.price)
        if (
          !Number.isFinite(parsedVariantPrice)
          || parsedVariantPrice < PRODUCT_PRICE_MIN
          || parsedVariantPrice > PRODUCT_PRICE_MAX
        ) {
          addFieldError(fieldErrors, 'variantPrice', `Ціна варіанта має бути в межах ${PRODUCT_PRICE_MIN}–${PRODUCT_PRICE_MAX}.`)
        }
      }

      if (requiresSize && !variant.size) {
        addFieldError(fieldErrors, 'variantSize', 'Для цієї категорії кожен варіант повинен мати розмір.')
      }
    }

    if (!hasStock) {
      addFieldError(fieldErrors, 'variantStock', 'Щонайменше один варіант має бути в наявності.')
    }
  }

  return fieldErrors
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
  const {
    execute,
    isPending,
    errorMessage,
    setErrorMessage,
    errorDetails,
    setErrorDetails,
  } = useSellerMutation()
  const { uploadImages, removeImage, reorderImages, setPrimaryImage, progress, isUploading } = useProductImageUpload()
  const { categories, isLoading: isLoadingCategories, errorMessage: categoryError } = useSellerCategories()
  const initialFormState = {
    name: initialProduct?.name ?? '',
    description: initialProduct?.description ?? '',
    price: initialProduct?.price ?? '',
    sku: initialProduct?.sku ?? '',
    categoryId: initialProduct?.categoryId ?? '',
  }
  const initialImageDrafts = normalizeImageDrafts(
    initialProduct?.images.map((image) => ({
      id: image.id,
      url: image.url,
      previewUrl: null,
      storagePath: image.storagePath,
      altText: image.altText ?? '',
      isPrimary: image.isPrimary,
      position: image.position,
      source: 'server' as const,
    })) ?? [],
  )
  const initialEditVariantState = initialProduct?.variants.map((variant) => ({
    id: variant.id,
    sku: variant.sku,
    size: variant.size ?? '',
    color: variant.color ?? '',
    price: variant.price ?? '',
    stock: variant.stock,
    isSkuManual: true,
  })) ?? []
  const [formState, setFormState] = useState(initialFormState)
  const [isBaseSkuManual, setIsBaseSkuManual] = useState(mode === 'edit' || Boolean(initialProduct?.sku))
  const [productImages, setProductImages] = useState<ProductImageDraft[]>(initialImageDrafts)
  const [persistedImageIds, setPersistedImageIds] = useState<string[]>(initialProduct?.images.map((image) => image.id) ?? [])
  const [productImageError, setProductImageError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<SellerProductFieldErrors>({})
  const [createVariants, setCreateVariants] = useState<VariantState[]>(
    mode === 'create'
      ? initialEditVariantState.length > 0 ? initialEditVariantState : [createVariantState()]
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
    initialEditVariantState,
  )
  const [newVariant, setNewVariant] = useState<VariantState>(() =>
    syncVariantSku(initialProduct?.sku ?? '', createVariantState(), initialProduct?.variants.length ?? 0),
  )
  const [savedFormSnapshot, setSavedFormSnapshot] = useState(() =>
    serializeFormState(initialFormState, mode === 'edit' || Boolean(initialProduct?.sku)),
  )
  const [savedImageSnapshot, setSavedImageSnapshot] = useState(() => serializeImageDrafts(initialImageDrafts))
  const [savedEditVariantsSnapshot, setSavedEditVariantsSnapshot] = useState(() => serializeVariants(initialEditVariantState))
  const [isCreateFlowActive, setIsCreateFlowActive] = useState(false)
  const [isSubmitFlowActive, setIsSubmitFlowActive] = useState(false)
  const isBusy = isPending || isUploading
  const productImagesRef = useRef(productImages)
  const isDraftSaveInFlightRef = useRef(false)
  const isSubmitForReviewInFlightRef = useRef(false)
  const createdDraftIdRef = useRef<string | null>(initialProduct?.id ?? null)

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
  const createDraftVariants = createVariants.filter(hasMeaningfulVariantData)
  const moderationVariants = mode === 'create' ? createVariants : editVariants
  const isProductDirty = serializeFormState(formState, isBaseSkuManual) !== savedFormSnapshot
  const isGalleryDirty = serializeImageDrafts(productImages) !== savedImageSnapshot
  const isExistingVariantsDirty = serializeVariants(editVariants) !== savedEditVariantsSnapshot
  const isNewVariantDirty = hasMeaningfulVariantData(newVariant)
  const isActionLocked = isBusy || isCreateFlowActive || isSubmitFlowActive

  function clearValidationState() {
    setErrorMessage(null)
    setErrorDetails(null)
    setFieldErrors({})
    setProductImageError(null)
  }

  function applyFieldErrors(nextErrors: SellerProductFieldErrors, fallbackMessage: string) {
    setFieldErrors(nextErrors)
    setErrorMessage(fallbackMessage)
  }

  function getMessages(field: string) {
    return collectFieldMessages(fieldErrors, errorDetails, field)
  }

  function renderFieldErrors(field: string) {
    const messages = getMessages(field)
    if (messages.length === 0) {
      return null
    }

    return (
      <div className="space-y-1">
        {messages.map((message, index) => (
          <p key={`${field}-${index}`} className="text-sm text-brand-danger" role="alert">
            {message}
          </p>
        ))}
      </div>
    )
  }

  function validateModerationSubmission() {
    const nextFieldErrors = validateModerationFormState({
      formState,
      productImages,
      variants: moderationVariants,
      categoryPathSlugs: selectedCategoryPath.map((category) => category.slug),
      selectedCategoryIsValid,
    })

    if (Object.keys(nextFieldErrors).length > 0) {
      applyFieldErrors(nextFieldErrors, 'Товар ще не готовий до модерації. Виправте позначені поля.')
      return false
    }

    return true
  }

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
      setSavedImageSnapshot(serializeImageDrafts([]))
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
    setSavedImageSnapshot(serializeImageDrafts(withPrimary))
    return true
  }

  async function submitBaseForm() {
    if (isDraftSaveInFlightRef.current) {
      return
    }

    clearValidationState()

    if (!selectedCategoryIsValid) {
      applyFieldErrors(
        { categoryId: ['Категорія має бути фінальною підкатегорією без дочірніх елементів.'] },
        'Оберіть коректну категорію.',
      )
      return
    }

    if (mode === 'create') {
      const parsed = createSellerProductSchema.safeParse({
        name: formState.name,
        description: formState.description || null,
        price: formState.price,
        sku: getCreateSkuPayloadValue(formState.sku, isBaseSkuManual),
        categoryId: formState.categoryId || null,
        variants: createDraftVariants.map(toVariantPayload),
      })

      if (!parsed.success) {
        applyFieldErrors(
          mapSchemaIssuesToFieldErrors(parsed.error.issues),
          parsed.error.issues[0]?.message ?? 'Перевірте поля товару.',
        )
        return
      }

      let navigationStarted = false
      isDraftSaveInFlightRef.current = true
      setIsCreateFlowActive(true)
      try {
        const draftId = createdDraftIdRef.current

        if (draftId) {
          const gallerySaved = await persistProductGallery(draftId)
          if (!gallerySaved) return

          navigationStarted = true
          router.replace(`/seller/products/${draftId}`)
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
        createdDraftIdRef.current = data.id

        const gallerySaved = await persistProductGallery(data.id)
        if (!gallerySaved) return

        navigationStarted = true
        router.replace(`/seller/products/${data.id}`)
        return
      } finally {
        if (!navigationStarted) {
          isDraftSaveInFlightRef.current = false
          setIsCreateFlowActive(false)
        }
      }
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
      applyFieldErrors(
        mapSchemaIssuesToFieldErrors(parsed.error.issues),
        parsed.error.issues[0]?.message ?? 'Перевірте поля товару.',
      )
      return
    }

    isDraftSaveInFlightRef.current = true
    try {
      const saved = await execute({
        url: `/api/seller/products/${initialProduct.id}`,
        method: 'PATCH',
        body: parsed.data,
        successMessage: 'Товар оновлено.',
        refresh: false,
      })

      if (!saved) return
      setSavedFormSnapshot(serializeFormState(formState, isBaseSkuManual))
      const gallerySaved = await persistProductGallery(initialProduct.id)
      if (!gallerySaved) return
      router.refresh()
    } finally {
      isDraftSaveInFlightRef.current = false
    }
  }

  async function saveExistingVariant(index: number) {
    if (!initialProduct) return
    clearValidationState()

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
      applyFieldErrors(
        mapSchemaIssuesToFieldErrors(parsed.error.issues),
        parsed.error.issues[0]?.message ?? 'Перевірте поля варіанта.',
      )
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

    const nextVariants = editVariants.map((entry, currentIndex) =>
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
    )
    setEditVariants(nextVariants)
    setSavedEditVariantsSnapshot(serializeVariants(nextVariants))
    setNewVariant((current) => syncVariantSku(formState.sku, current, editVariants.length))
    router.refresh()
  }

  async function removeExistingVariant(index: number) {
    if (!initialProduct) return
    clearValidationState()

    const variant = editVariants[index]
    if (!variant?.id) return

    const removed = await execute<null>({
      url: `/api/seller/products/${initialProduct.id}/variants/${variant.id}`,
      method: 'DELETE',
      successMessage: 'Варіант видалено.',
      refresh: false,
    })

    if (removed === null) return

    const nextVariants = editVariants.filter((_, currentIndex) => currentIndex !== index)
    setEditVariants(nextVariants)
    setSavedEditVariantsSnapshot(serializeVariants(nextVariants))
    setNewVariant((current) => syncVariantSku(formState.sku, current, Math.max(editVariants.length - 1, 0)))
    router.refresh()
  }

  async function addNewVariant() {
    if (!initialProduct) return
    clearValidationState()

    const parsed = createVariantSchema.safeParse({
      sku: getCreateSkuPayloadValue(newVariant.sku, newVariant.isSkuManual),
      size: newVariant.size || null,
      color: newVariant.color || null,
      price: newVariant.price || null,
      stock: newVariant.stock,
    })

    if (!parsed.success) {
      applyFieldErrors(
        mapSchemaIssuesToFieldErrors(parsed.error.issues),
        parsed.error.issues[0]?.message ?? 'Перевірте поля нового варіанта.',
      )
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

    const nextVariants = [
      ...editVariants,
      {
        id: created.id,
        sku: created.sku,
        size: created.size ?? '',
        color: created.color ?? '',
        price: created.price ?? '',
        stock: created.stock,
        isSkuManual: true,
      },
    ]
    setEditVariants(nextVariants)
    setSavedEditVariantsSnapshot(serializeVariants(nextVariants))
    setNewVariant(syncVariantSku(formState.sku, createVariantState(), editVariants.length + 1))
    router.refresh()
  }

  async function submitForReview() {
    if (isSubmitForReviewInFlightRef.current || mode === 'create') {
      return
    }

    clearValidationState()

    if (!validateModerationSubmission()) {
      return
    }

    if (!initialProduct) return

    if (
      hasUnsavedSellerProductChanges({
        isProductDirty,
        isGalleryDirty,
        isExistingVariantsDirty,
        isNewVariantDirty,
      })
    ) {
      setErrorMessage('Спочатку збережіть незбережені зміни в полях, галереї та варіантах.')
      return
    }

    isSubmitForReviewInFlightRef.current = true
    setIsSubmitFlowActive(true)
    try {
      const submitted = await execute({
        url: `/api/seller/products/${initialProduct.id}/submit`,
        method: 'POST',
        successMessage: 'Товар відправлено на перевірку.',
        refresh: false,
      })

      if (!submitted) return
      router.refresh()
    } finally {
      isSubmitForReviewInFlightRef.current = false
      setIsSubmitFlowActive(false)
    }
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
              {renderFieldErrors('name')}
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="block text-sm font-medium text-copy-strong">Опис</span>
              <textarea
                className="ui-surface-input min-h-32 resize-y"
                value={formState.description}
                onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))}
              />
              {renderFieldErrors('description')}
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
              {renderFieldErrors('price')}
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
              {renderFieldErrors('categoryId')}
            </label>
          </div>
          <div className="rounded-2xl border border-panelBorder bg-panel px-4 py-3 text-sm text-copy-secondary">
            Бейджі маркетплейсу призначаються автоматично на основі дати публікації, продажів і аналітики платформи.
          </div>

          <MultiImageUploadField
            label="Галерея товару"
            description="Завантажте кілька зображень товару, виберіть головне фото, задайте доступний alt-текст і впорядкуйте галерею."
            items={productImages}
            disabled={isBusy}
            errorMessage={productImageError ?? progress.errorMessage ?? getMessages('images')[0] ?? getMessages('primaryImage')[0] ?? null}
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
          {renderFieldErrors('images')}
          {renderFieldErrors('primaryImage')}

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
                {renderFieldErrors('variants')}
                {renderFieldErrors('variantSize')}
                {renderFieldErrors('variantPrice')}
                {renderFieldErrors('variantStock')}
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
                {renderFieldErrors('variants')}
                {renderFieldErrors('variantSize')}
                {renderFieldErrors('variantPrice')}
                {renderFieldErrors('variantStock')}

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

          <div className="flex flex-col gap-3 min-[501px]:items-center">
            {initialProduct && canArchiveProduct(initialProduct.status) ? (
              <button
                type="button"
                className="w-full rounded-full border border-brand-danger/30 px-4 py-2 text-sm text-brand-danger transition-colors hover:bg-brand-danger/10 min-[501px]:w-fit"
                disabled={isActionLocked}
                onClick={() => void archiveProduct()}
              >
                Архівувати товар
              </button>
            ) : null}
            {/* <div className="flex w-full flex-wrap justify-center gap-3">
              {initialProduct && canSubmitProductForReview(initialProduct.status) ? (
                <button
                  type="button"
                  className="ui-secondary-button min-w-0 flex-1 basis-64"
                  disabled={isActionLocked}
                  onClick={() => void submitForReview()}
                >
                  Надіслати на модерацію
                </button>
              ) : null}

              <button
                type="submit"
                className="ui-primary-button min-w-0 flex-1 basis-64"
                disabled={isActionLocked}
              >
                {mode === 'create' || initialProduct?.status === 'DRAFT'
                  ? 'Зберегти чернетку'
                  : 'Зберегти зміни'}
              </button>
            </div> */}

            <div className="flex w-full flex-col gap-3 min-[501px]:w-auto min-[501px]:flex-row min-[501px]:justify-center">
              {initialProduct && canSubmitProductForReview(initialProduct.status) ? (
                <button
                  type="button"
                  className="ui-secondary-button w-full min-[501px]:w-64"
                  disabled={isActionLocked}
                  onClick={() => void submitForReview()}
                >
                  Надіслати на модерацію
                </button>
              ) : null}

              <button
                type="submit"
                className="ui-primary-button w-full min-[501px]:w-64"
                disabled={isActionLocked}
              >
                {mode === 'create' || initialProduct?.status === 'DRAFT'
                  ? 'Зберегти чернетку'
                  : 'Зберегти зміни'}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  )
}
