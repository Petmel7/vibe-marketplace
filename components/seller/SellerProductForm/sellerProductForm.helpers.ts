import type { ProductImageDraft } from '@/hooks/useProductImageUpload'
import { getCreateSkuPayloadValue, generateVariantSkuDraft } from '@/lib/utils/sellerForm'
import type { AllowedProductSize } from '@/features/seller/products/seller-product.sizes'
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
import type { SellerProductFieldErrors, VariantState } from './types'

export function createVariantState(): VariantState {
  return { sku: '', size: '', color: '', price: '', stock: 0, isSkuManual: false }
}

export function createImageDraftId() {
  return `draft-${crypto.randomUUID()}`
}

export function revokePreviewUrl(image: ProductImageDraft | undefined) {
  if (image?.previewUrl && image.previewUrl.startsWith('blob:')) {
    URL.revokeObjectURL(image.previewUrl)
  }
}

export function normalizeImageDrafts(images: ProductImageDraft[]) {
  const ordered = images.map((image, index) => ({ ...image, position: index }))
  if (ordered.length === 0) return ordered
  const primaryIndex = ordered.findIndex((image) => image.isPrimary)
  return ordered.map((image, index) => ({
    ...image,
    isPrimary: primaryIndex === -1 ? index === 0 : index === primaryIndex,
  }))
}

export function moveImageDraft(images: ProductImageDraft[], id: string, direction: 'up' | 'down') {
  const currentIndex = images.findIndex((image) => image.id === id)
  if (currentIndex === -1) return images
  const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
  if (nextIndex < 0 || nextIndex >= images.length) return images
  const updated = images.slice()
  const [item] = updated.splice(currentIndex, 1)
  updated.splice(nextIndex, 0, item)
  return normalizeImageDrafts(updated)
}

export function syncVariantSku(baseSku: string, variant: VariantState, index: number) {
  return variant.isSkuManual ? variant : { ...variant, sku: generateVariantSkuDraft(baseSku, variant, index) }
}

export function syncVariantList(baseSku: string, variants: VariantState[]) {
  return variants.map((variant, index) => syncVariantSku(baseSku, variant, index))
}

export function dedupeSelectedSizes(sizes: AllowedProductSize[]) {
  return Array.from(new Set(sizes))
}

export function buildCreateVariantsFromSizes(
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

export function renderSizeValueLabel(size: string) {
  return size || 'Без розміру'
}

export function toVariantPayload(variant: VariantState) {
  return {
    sku: getCreateSkuPayloadValue(variant.sku, variant.isSkuManual),
    size: variant.size || null,
    color: variant.color || null,
    price: variant.price || null,
    stock: variant.stock,
  }
}

export function hasMeaningfulVariantData(variant: VariantState) {
  return Boolean(
    variant.size
    || variant.color.trim()
    || variant.price.trim()
    || variant.stock > 0
    || (variant.isSkuManual && variant.sku.trim()),
  )
}

export function serializeFormState(state: {
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

export function serializeVariants(variants: VariantState[]) {
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

export function serializeImageDrafts(images: ProductImageDraft[]) {
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

export function mapSchemaIssuesToFieldErrors(
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

export function collectFieldMessages(
  localErrors: SellerProductFieldErrors,
  remoteErrors: Record<string, string[]> | null,
  field: string,
) {
  return [...(localErrors[field] ?? []), ...(remoteErrors?.[field] ?? [])]
}

export function validateModerationFormState(params: {
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
