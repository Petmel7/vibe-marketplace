import { Prisma, ProductStatus } from '@/app/generated/prisma/client'
import { requireSeller } from '@/lib/auth/guards'
import { assertSellerOwnsStore, assertSellerOwnsProduct } from '@/lib/auth/sellerGuards'
import {
  ProductNotFoundError,
  InvalidModerationTransitionError,
  InvalidInventoryError,
  InvalidSkuError,
  InvalidVariantConfigurationError,
  CategoryNotFoundError,
  ProductImageLimitExceededError,
  SellerProductValidationError,
} from '@/lib/errors/seller'
import {
  assertStoreOwnership,
  resolveSellerStoreContext,
} from '@/features/store/store.service'
import { uploadProductImageBinary, deleteProductImageBinary } from '@/features/media/media.service'
import type { SessionUser } from '@/features/auth/auth.dto'
import { createAdminNotification } from '@/features/notifications/notifications.service'
import { scheduleProductMetricsRecalculation } from '@/features/products/product-metrics.jobs'
import { logError } from '@/utils/logger'
import type {
  SellerProductDto,
  SellerProductSummaryDto,
  SellerVariantDto,
  CreateSellerProductDto,
  UpdateSellerProductDto,
  CreateVariantDto,
  UpdateVariantDto,
  ProductImageDto,
  SellerCategoryOptionDto,
} from './seller-product.dto'
import type { ProductFilters } from './seller-product.repository'
import {
  findProductsByStoreId,
  findProductById,
  findProductByIdAndStoreId,
  createProduct as repoCreateProduct,
  createVariant as repoCreateVariant,
  updateProduct as repoUpdateProduct,
  updateProductStatus,
  updateVariant as repoUpdateVariant,
  deleteVariant as repoDeleteVariant,
  updateVariantStock as repoUpdateVariantStock,
  archiveProduct as repoArchiveProduct,
  listActiveCategories,
  findProductBySkuInStore,
  findVariantBySku,
  findVariantByIdWithProduct,
  createProductImages as repoCreateProductImages,
  listProductImages as repoListProductImages,
  countProductImages,
  findProductImageById,
  deleteProductImage as repoDeleteProductImage,
  updateProductPrimaryImage,
  reorderProductImages as repoReorderProductImages,
  setPrimaryProductImage as repoSetPrimaryProductImage,
} from './seller-product.repository'
import { generateBaseSku, generateVariantSku, normalizeSku } from './seller-product.utils'
import { isAllowedProductSize } from './seller-product.sizes'
import {
  PRODUCT_DESCRIPTION_MAX_LENGTH,
  PRODUCT_DESCRIPTION_MODERATION_MIN_LENGTH,
  PRODUCT_IMAGE_LIMIT,
  PRODUCT_NAME_MAX_LENGTH,
  PRODUCT_NAME_MODERATION_MIN_LENGTH,
  PRODUCT_PRICE_MAX,
  PRODUCT_PRICE_MIN,
  PRODUCT_VARIANT_LIMIT,
  PRODUCT_VARIANT_STOCK_MAX,
  categoryRequiresSize,
  createVariantCombinationKey,
  isMoneyValueInRange,
} from './seller-product.validation'

const MAX_AUTO_SKU_GENERATION_ATTEMPTS = 5

function assertAllowedVariantSize(size: string | null | undefined) {
  if (size == null) {
    return
  }

  if (!isAllowedProductSize(size)) {
    throw new InvalidVariantConfigurationError(`Unsupported variant size "${size}"`)
  }
}

function assertNoDuplicateVariantCombinations(
  variants: Array<{
    size?: string | null
    color?: string | null
  }>,
  opts?: {
    existing?: Array<{
      id?: string
      size?: string | null
      color?: string | null
    }>
    excludeVariantId?: string
  },
) {
  const seen = new Set<string>()

  for (const existingVariant of opts?.existing ?? []) {
    if (opts?.excludeVariantId && existingVariant.id === opts.excludeVariantId) {
      continue
    }

    seen.add(createVariantCombinationKey(existingVariant))
  }

  for (const variant of variants) {
    assertAllowedVariantSize(variant.size ?? null)
    const key = createVariantCombinationKey(variant)
    if (seen.has(key)) {
      throw new InvalidVariantConfigurationError(
        'Variant size and color combinations must be unique within a product',
      )
    }

    seen.add(key)
  }
}

type SellerProductFieldErrors = Record<string, string[]>

function addFieldError(
  fieldErrors: SellerProductFieldErrors,
  field: string,
  message: string,
) {
  fieldErrors[field] = [...(fieldErrors[field] ?? []), message]
}

type SellerCategoryContext = {
  selected: SellerCategoryOptionDto
  path: SellerCategoryOptionDto[]
  isLeaf: boolean
}

async function getSellerCategoryContext(
  categoryId: string | null | undefined,
): Promise<SellerCategoryContext | null> {
  if (!categoryId) {
    return null
  }

  const categories = await listActiveCategories()
  const byId = new Map(categories.map((category) => [category.id, category]))
  const selected = byId.get(categoryId)

  if (!selected) {
    throw new CategoryNotFoundError()
  }

  const path: SellerCategoryOptionDto[] = []
  let current: SellerCategoryOptionDto | undefined = selected

  while (current) {
    path.unshift(current)
    current = current.parentId ? byId.get(current.parentId) : undefined
  }

  const isLeaf = !categories.some((category) => category.parentId === selected.id)

  return {
    selected,
    path,
    isLeaf,
  }
}

async function ensureLeafCategorySelection(categoryId: string | null | undefined) {
  const context = await getSellerCategoryContext(categoryId)
  if (!context) {
    return null
  }

  if (!context.isLeaf) {
    throw new SellerProductValidationError(
      'Оберіть фінальну категорію товару.',
      { categoryId: ['Категорія має бути фінальною підкатегорією без дочірніх елементів.'] },
    )
  }

  return context
}

function validateModerationReadiness(product: SellerProductDto, categoryContext: SellerCategoryContext | null) {
  const fieldErrors: SellerProductFieldErrors = {}
  const trimmedName = product.name.trim()
  const trimmedDescription = product.description?.trim() ?? ''

  if (trimmedName.length < PRODUCT_NAME_MODERATION_MIN_LENGTH || trimmedName.length > PRODUCT_NAME_MAX_LENGTH) {
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

  if (!isMoneyValueInRange(product.price)) {
    addFieldError(
      fieldErrors,
      'price',
      `Базова ціна має бути в межах ${PRODUCT_PRICE_MIN}–${PRODUCT_PRICE_MAX}.`,
    )
  }

  if (!categoryContext) {
    addFieldError(fieldErrors, 'categoryId', 'Оберіть категорію товару.')
  } else if (!categoryContext.isLeaf) {
    addFieldError(
      fieldErrors,
      'categoryId',
      'Категорія має бути фінальною підкатегорією без дочірніх елементів.',
    )
  }

  if (product.images.length === 0) {
    addFieldError(fieldErrors, 'images', 'Додайте щонайменше одне зображення товару.')
  } else {
    const primaryImage = product.images.find((image) => image.isPrimary) ?? null
    if (!primaryImage) {
      addFieldError(fieldErrors, 'primaryImage', 'Позначте головне фото товару.')
    } else if (!product.imageUrl || product.imageUrl !== primaryImage.url) {
      addFieldError(fieldErrors, 'primaryImage', 'Головне фото товару має бути коректно збережене.')
    }
  }

  if (product.variants.length === 0) {
    addFieldError(fieldErrors, 'variants', 'Додайте щонайменше один варіант товару.')
  } else {
    if (product.variants.length > PRODUCT_VARIANT_LIMIT) {
      addFieldError(fieldErrors, 'variants', `Максимальна кількість варіантів: ${PRODUCT_VARIANT_LIMIT}.`)
    }

    try {
      assertNoDuplicateVariantCombinations(product.variants)
    } catch {
      addFieldError(fieldErrors, 'variants', 'Комбінації розміру та кольору мають бути унікальними.')
    }

    const requiresSize = categoryRequiresSize(categoryContext?.path.map((category) => category.slug) ?? [])
    let hasVariantWithStock = false

    for (const variant of product.variants) {
      if (variant.stock > 0) {
        hasVariantWithStock = true
      }

      if (!Number.isInteger(variant.stock) || variant.stock < 0 || variant.stock > PRODUCT_VARIANT_STOCK_MAX) {
        addFieldError(
          fieldErrors,
          'variantStock',
          `Залишок варіанта має бути цілим числом у межах 0–${PRODUCT_VARIANT_STOCK_MAX}.`,
        )
      }

      if (variant.price !== null && !isMoneyValueInRange(variant.price)) {
        addFieldError(
          fieldErrors,
          'variantPrice',
          `Ціна варіанта має бути в межах ${PRODUCT_PRICE_MIN}–${PRODUCT_PRICE_MAX}.`,
        )
      }

      if (requiresSize && !variant.size) {
        addFieldError(fieldErrors, 'variantSize', 'Для цієї категорії кожен варіант повинен мати розмір.')
      }
    }

    if (!hasVariantWithStock) {
      addFieldError(fieldErrors, 'variantStock', 'Щонайменше один варіант має бути в наявності.')
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new SellerProductValidationError(
      'Товар ще не готовий до модерації. Виправте позначені поля.',
      fieldErrors,
    )
  }
}

function notifyAdminsAboutPendingReviewProduct(input: {
  product: Pick<SellerProductDto, 'id' | 'name' | 'status'>
  seller: Pick<SessionUser, 'id' | 'email'>
  store: { id: string; name: string }
  source: 'create' | 'submit'
}) {
  void createAdminNotification({
    title: 'Новий товар очікує модерації',
    message: `Продавець ${input.seller.email} надіслав товар "${input.product.name}" з магазину "${input.store.name}" на модерацію.`,
    actionUrl: '/admin/moderation',
    metadata: {
      productId: input.product.id,
      productName: input.product.name,
      storeId: input.store.id,
      storeName: input.store.name,
      sellerId: input.seller.id,
      sellerEmail: input.seller.email,
      status: input.product.status,
      source: input.source,
      roleTarget: 'admin',
      actorRole: 'SELLER',
    },
  }).catch((error) => {
    logError('seller-product:pending-review:admin-notification', error, {
      productId: input.product.id,
      sellerId: input.seller.id,
      storeId: input.store.id,
      source: input.source,
    })
  })
}

function toSellerVariantDto(variant: {
  id: string
  productId: string
  sku: string
  size: string | null
  color: string | null
  price: { toString(): string } | null
  stock: number
  createdAt: Date
  updatedAt: Date
}): SellerVariantDto {
  return {
    id: variant.id,
    productId: variant.productId,
    sku: variant.sku,
    size: variant.size,
    color: variant.color,
    price: variant.price ? variant.price.toString() : null,
    stock: variant.stock,
    createdAt: variant.createdAt,
    updatedAt: variant.updatedAt,
  }
}

function toProductImageDto(image: {
  id: string
  productId: string
  url: string
  storagePath: string
  altText: string | null
  position: number
  isPrimary: boolean
  createdAt: Date
  updatedAt: Date
}): ProductImageDto {
  return {
    id: image.id,
    productId: image.productId,
    url: image.url,
    storagePath: image.storagePath,
    altText: image.altText,
    position: image.position,
    isPrimary: image.isPrimary,
    createdAt: image.createdAt,
    updatedAt: image.updatedAt,
  }
}

function toSellerProductDto(product: {
  id: string
  storeId: string
  categoryId: string | null
  name: string
  description: string | null
  price: { toString(): string }
  imageUrl: string | null
  sku: string | null
  isHit: boolean
  isNew: boolean
  status: ProductStatus
  rejectionReason: string | null
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
  images?: Array<{
    id: string
    productId: string
    url: string
    storagePath: string
    altText: string | null
    position: number
    isPrimary: boolean
    createdAt: Date
    updatedAt: Date
  }>
  variants?: Array<{
    id: string
    productId: string
    sku: string
    size: string | null
    color: string | null
    price: { toString(): string } | null
    stock: number
    createdAt: Date
    updatedAt: Date
  }>
}): SellerProductDto {
  return {
    id: product.id,
    storeId: product.storeId,
    categoryId: product.categoryId,
    name: product.name,
    description: product.description,
    price: product.price.toString(),
    imageUrl: product.imageUrl,
    sku: product.sku,
    isHit: product.isHit,
    isNew: product.isNew,
    status: product.status,
    rejectionReason: product.rejectionReason,
    publishedAt: product.publishedAt,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    images: (product.images ?? []).map(toProductImageDto),
    variants: (product.variants ?? []).map(toSellerVariantDto),
  }
}

async function getOwnedStore(user: SessionUser, storeId?: string) {
  const store = await resolveSellerStoreContext(user, storeId)
  assertSellerOwnsStore(user, store)
  return store
}

async function getOwnedProduct(user: SessionUser, productId: string) {
  const product = await findProductById(productId)
  if (!product) throw new ProductNotFoundError()

  const store = await assertStoreOwnership(user.id, product.storeId)
  assertSellerOwnsProduct(product, store.id)
  return { store, product }
}

async function resolveProductSku(params: {
  storeId: string
  storeSlug: string
  productName: string
  manualSku?: string | null
  excludeProductId?: string
}) {
  const normalizedManualSku = params.manualSku?.trim()
    ? normalizeSku(params.manualSku)
    : null

  if (normalizedManualSku) {
    const existing = await findProductBySkuInStore(params.storeId, normalizedManualSku, params.excludeProductId)
    if (existing) {
      throw new InvalidSkuError('Product SKU is already used in this store')
    }

    return normalizedManualSku
  }

  for (let attempt = 0; attempt < MAX_AUTO_SKU_GENERATION_ATTEMPTS; attempt += 1) {
    const generatedSku = generateBaseSku(params.productName, params.storeSlug)
    if (!generatedSku) {
      continue
    }

    const conflict = await findProductBySkuInStore(params.storeId, generatedSku, params.excludeProductId)
    if (!conflict) {
      return generatedSku
    }
  }

  throw new InvalidSkuError('Unable to generate a unique product SKU')
}

function isPrismaUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError
    || (typeof error === 'object' && error !== null && 'code' in error)
  ) && (error as { code?: string }).code === 'P2002'
}

async function createVariantWithSafeSku(
  productId: string,
  data: CreateVariantDto & { generatedSku: string },
) {
  try {
    return await repoCreateVariant(productId, data)
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      throw new InvalidSkuError('Variant SKU is already in use')
    }

    throw error
  }
}

async function createProductWithSafeSku(
  storeId: string,
  data: CreateSellerProductDto,
) {
  try {
    return await repoCreateProduct(storeId, data)
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      throw new InvalidSkuError('Product SKU is already in use')
    }

    throw error
  }
}

async function updateProductWithSafeSku(
  productId: string,
  data: UpdateSellerProductDto,
) {
  try {
    return await repoUpdateProduct(productId, data)
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      throw new InvalidSkuError('Product SKU is already in use')
    }

    throw error
  }
}

async function updateVariantWithSafeSku(
  variantId: string,
  data: UpdateVariantDto,
) {
  try {
    return await repoUpdateVariant(variantId, data)
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      throw new InvalidSkuError('Variant SKU is already in use')
    }

    throw error
  }
}

async function resolveVariantSku(params: {
  baseSku: string
  variant: CreateVariantDto | UpdateVariantDto
  index: number
  manualSku?: string
  excludeVariantId?: string
}) {
  const normalizedManualSku = params.manualSku?.trim()
    ? normalizeSku(params.manualSku)
    : null

  if (normalizedManualSku) {
    const existing = await findVariantBySku(normalizedManualSku, params.excludeVariantId)
    if (existing) {
      throw new InvalidSkuError('Variant SKU is already in use')
    }

    return normalizedManualSku
  }

  for (let attempt = 0; attempt < MAX_AUTO_SKU_GENERATION_ATTEMPTS; attempt += 1) {
    const generatedSku = generateVariantSku(params.baseSku, params.variant, params.index)
    if (!generatedSku) {
      continue
    }

    const conflict = await findVariantBySku(generatedSku, params.excludeVariantId)
    if (!conflict) {
      return generatedSku
    }
  }

  throw new InvalidSkuError('Unable to generate a unique variant SKU')
}

function normalizeImagePayload(
  images: NonNullable<CreateSellerProductDto['images']>,
) {
  const hasExplicitPrimary = images.some((image: NonNullable<CreateSellerProductDto['images']>[number]) => image.isPrimary)

  return images.map((image: NonNullable<CreateSellerProductDto['images']>[number], index) => ({
    url: image.url,
    storagePath: image.storagePath,
    altText: image.altText ?? null,
    position: image.position ?? index,
    isPrimary: hasExplicitPrimary ? Boolean(image.isPrimary) : index === 0,
  }))
}

async function synchronizeProductPrimaryImage(productId: string) {
  const images = await repoListProductImages(productId)
  const primary = images.find((image: { isPrimary: boolean }) => image.isPrimary) ?? images[0] ?? null

  if (primary && !primary.isPrimary) {
    await repoSetPrimaryProductImage(productId, primary.id)
  }

  await updateProductPrimaryImage(productId, primary?.url ?? null)
  return repoListProductImages(productId)
}

export async function getMyProducts(
  user: SessionUser,
  filters: ProductFilters,
  storeId?: string,
): Promise<SellerProductSummaryDto[]> {
  requireSeller(user)
  const store = await getOwnedStore(user, storeId)

  const products = await findProductsByStoreId(store.id, filters)
  return products.map((product) => ({
    id: product.id,
    name: product.name,
    price: product.price.toString(),
    status: product.status,
    totalStock: product.variants.reduce((sum, variant) => sum + variant.stock, 0),
    createdAt: product.createdAt,
  }))
}

export async function getMyProductById(
  user: SessionUser,
  productId: string,
): Promise<SellerProductDto> {
  requireSeller(user)
  const { product } = await getOwnedProduct(user, productId)
  return toSellerProductDto(product)
}

export async function listSellerProductCategories(): Promise<SellerCategoryOptionDto[]> {
  return listActiveCategories()
}

export async function createProduct(
  user: SessionUser,
  data: CreateSellerProductDto,
): Promise<SellerProductDto> {
  requireSeller(user)
  const store = await getOwnedStore(user, data.storeId)
  await ensureLeafCategorySelection(data.categoryId)

  const productSku = await resolveProductSku({
    storeId: store.id,
    storeSlug: store.slug,
    productName: data.name,
    manualSku: data.sku,
  })

  const normalizedImages = data.images ? normalizeImagePayload(data.images) : []
  if (normalizedImages.length > PRODUCT_IMAGE_LIMIT) {
    throw new ProductImageLimitExceededError(`A product can have at most ${PRODUCT_IMAGE_LIMIT} images`)
  }
  assertNoDuplicateVariantCombinations(data.variants ?? [])

  const product = await createProductWithSafeSku(store.id, {
    ...data,
    sku: productSku,
    imageUrl: normalizedImages.find((image) => image.isPrimary)?.url ?? data.imageUrl ?? null,
  })

  if (data.variants && data.variants.length > 0) {
    for (let index = 0; index < data.variants.length; index += 1) {
      const variant = data.variants[index]
      const resolvedSku = await resolveVariantSku({
        baseSku: productSku,
        variant,
        index,
        manualSku: variant.sku,
      })

      await createVariantWithSafeSku(product.id, { ...variant, generatedSku: resolvedSku })
    }
  }

  if (normalizedImages.length > 0) {
    await repoCreateProductImages(product.id, normalizedImages)
    await synchronizeProductPrimaryImage(product.id)
  }

  const refreshed = await findProductByIdAndStoreId(product.id, store.id)
  if (!refreshed) throw new ProductNotFoundError()
  return toSellerProductDto(refreshed)
}

export async function updateProduct(
  user: SessionUser,
  productId: string,
  data: UpdateSellerProductDto,
): Promise<SellerProductDto> {
  requireSeller(user)
  const { store, product } = await getOwnedProduct(user, productId)

  if (data.categoryId !== undefined) {
    await ensureLeafCategorySelection(data.categoryId)
  }

  const resolvedSku = data.sku !== undefined
    ? data.sku === null
      ? null
      : await resolveProductSku({
          storeId: store.id,
          storeSlug: store.slug,
          productName: data.name ?? product.name,
          manualSku: data.sku,
          excludeProductId: product.id,
        })
    : undefined

  const updated = await updateProductWithSafeSku(productId, {
    ...data,
    ...(resolvedSku !== undefined ? { sku: resolvedSku } : {}),
  })
  return toSellerProductDto(updated)
}

export async function submitForReview(
  user: SessionUser,
  productId: string,
): Promise<SellerProductDto> {
  requireSeller(user)
  const { store, product } = await getOwnedProduct(user, productId)
  assertSellerOwnsProduct(product, store.id)

  if (product.status !== ProductStatus.DRAFT) {
    throw new InvalidModerationTransitionError(product.status, 'PENDING_REVIEW')
  }

  const productDto = toSellerProductDto(product)
  const categoryContext = await ensureLeafCategorySelection(product.categoryId)
  validateModerationReadiness(productDto, categoryContext)

  const updated = await updateProductStatus(productId, ProductStatus.PENDING_REVIEW)
  notifyAdminsAboutPendingReviewProduct({
    product: updated,
    seller: user,
    store,
    source: 'submit',
  })
  return toSellerProductDto(updated)
}

export async function archiveProduct(
  user: SessionUser,
  productId: string,
): Promise<SellerProductDto> {
  requireSeller(user)
  const { store, product } = await getOwnedProduct(user, productId)
  assertSellerOwnsProduct(product, store.id)

  if (product.status !== ProductStatus.PUBLISHED && product.status !== ProductStatus.REJECTED) {
    throw new InvalidModerationTransitionError(product.status, 'ARCHIVED')
  }

  const updated = await repoArchiveProduct(productId)
  scheduleProductMetricsRecalculation({
    reason: 'seller-product-archived',
    dedupeKey: `product-metrics:seller-product-archived:${updated.id}:${updated.updatedAt.toISOString()}`,
  })
  return toSellerProductDto(updated)
}

export async function addVariant(
  user: SessionUser,
  productId: string,
  data: CreateVariantDto,
): Promise<SellerVariantDto> {
  requireSeller(user)
  const { store, product } = await getOwnedProduct(user, productId)
  assertSellerOwnsProduct(product, store.id)
  assertNoDuplicateVariantCombinations([data], { existing: product.variants })

  const resolvedSku = await resolveVariantSku({
    baseSku: product.sku ?? generateBaseSku(product.name, store.slug),
    variant: data,
    index: product.variants?.length ?? 0,
    manualSku: data.sku,
  })

  const variant = await createVariantWithSafeSku(productId, { ...data, generatedSku: resolvedSku })
  return toSellerVariantDto(variant)
}

export async function updateVariant(
  user: SessionUser,
  variantId: string,
  data: UpdateVariantDto,
): Promise<SellerVariantDto> {
  requireSeller(user)
  const variant = await findVariantByIdWithProduct(variantId)

  if (!variant) throw new ProductNotFoundError('Variant not found')
  const store = await assertStoreOwnership(user.id, variant.product.storeId)
  assertSellerOwnsProduct(variant.product, store.id)
  const product = await findProductById(variant.productId)
  if (!product) throw new ProductNotFoundError()
  assertNoDuplicateVariantCombinations([
    {
      size: data.size ?? variant.size,
      color: data.color ?? variant.color,
    },
  ], {
    existing: product.variants,
    excludeVariantId: variant.id,
  })

  const resolvedSku = data.sku !== undefined
    ? await resolveVariantSku({
        baseSku: variant.product.sku ?? generateBaseSku(variant.product.name, store.slug),
        variant: {
          size: data.size ?? variant.size,
          color: data.color ?? variant.color,
          price: data.price ?? (variant.price ? variant.price.toString() : null),
          stock: data.stock ?? variant.stock,
        },
        index: 0,
        manualSku: data.sku,
        excludeVariantId: variant.id,
      })
    : undefined

  const updated = await updateVariantWithSafeSku(variantId, {
    ...data,
    ...(resolvedSku !== undefined ? { sku: resolvedSku } : {}),
  })
  return toSellerVariantDto(updated)
}

export async function removeVariant(user: SessionUser, variantId: string): Promise<void> {
  requireSeller(user)
  const variant = await findVariantByIdWithProduct(variantId)

  if (!variant) throw new ProductNotFoundError('Variant not found')
  const store = await assertStoreOwnership(user.id, variant.product.storeId)
  assertSellerOwnsProduct(variant.product, store.id)

  await repoDeleteVariant(variantId)
}

export async function updateInventory(
  user: SessionUser,
  variantId: string,
  stock: number,
): Promise<SellerVariantDto> {
  if (stock < 0) throw new InvalidInventoryError()

  requireSeller(user)
  const variant = await findVariantByIdWithProduct(variantId)

  if (!variant) throw new ProductNotFoundError('Variant not found')
  const store = await assertStoreOwnership(user.id, variant.product.storeId)
  assertSellerOwnsProduct(variant.product, store.id)

  const updated = await repoUpdateVariantStock(variantId, stock)
  return toSellerVariantDto(updated)
}

export async function listProductImages(user: SessionUser, productId: string): Promise<ProductImageDto[]> {
  requireSeller(user)
  await getOwnedProduct(user, productId)

  const images = await repoListProductImages(productId)
  return images.map(toProductImageDto)
}

export async function uploadProductImage(
  user: SessionUser,
  productId: string,
  params: { file: File; altText?: string; position?: number; isPrimary?: boolean },
): Promise<ProductImageDto> {
  requireSeller(user)
  await getOwnedProduct(user, productId)

  const existingCount = await countProductImages(productId)
  if (existingCount >= PRODUCT_IMAGE_LIMIT) {
    throw new ProductImageLimitExceededError(`A product can have at most ${PRODUCT_IMAGE_LIMIT} images`)
  }

  const uploaded = await uploadProductImageBinary({ productId, file: params.file })
  const desiredPosition = params.position ?? existingCount
  const shouldBecomePrimary = existingCount === 0 || Boolean(params.isPrimary)

  const [created] = await repoCreateProductImages(productId, [
    {
      url: uploaded.url,
      storagePath: uploaded.storagePath,
      altText: params.altText ?? null,
      position: desiredPosition,
      isPrimary: existingCount === 0,
    },
  ])

  if (shouldBecomePrimary && !created.isPrimary) {
    await repoSetPrimaryProductImage(productId, created.id)
  }

  const images = await synchronizeProductPrimaryImage(productId)
  const image = images.find((entry: { id: string }) => entry.id === created.id)
  if (!image) throw new ProductNotFoundError('Product image not found after upload')

  return toProductImageDto(image)
}

export async function removeProductImage(user: SessionUser, productId: string, imageId: string): Promise<void> {
  requireSeller(user)
  await getOwnedProduct(user, productId)

  const image = await findProductImageById(productId, imageId)
  if (!image) {
    throw new ProductNotFoundError('Product image not found')
  }

  await repoDeleteProductImage(image.id)
  await deleteProductImageBinary(image.storagePath)

  const remaining = await repoListProductImages(productId)
  if (remaining.length > 0 && !remaining.some((entry: { isPrimary: boolean }) => entry.isPrimary)) {
    await repoSetPrimaryProductImage(productId, remaining[0].id)
  }

  await synchronizeProductPrimaryImage(productId)
}

export async function reorderProductImages(
  user: SessionUser,
  productId: string,
  items: Array<{ id: string; position: number }>,
): Promise<ProductImageDto[]> {
  requireSeller(user)
  await getOwnedProduct(user, productId)

  const existingImages = await repoListProductImages(productId)
  const existingIds = new Set(existingImages.map((image: { id: string }) => image.id))

  if (items.some((item) => !existingIds.has(item.id))) {
    throw new ProductNotFoundError('One or more product images could not be found')
  }

  await repoReorderProductImages(productId, items)
  const images = await synchronizeProductPrimaryImage(productId)
  return images.map(toProductImageDto)
}

export async function setPrimaryProductImage(
  user: SessionUser,
  productId: string,
  imageId: string,
): Promise<ProductImageDto[]> {
  requireSeller(user)
  await getOwnedProduct(user, productId)

  const image = await findProductImageById(productId, imageId)
  if (!image) {
    throw new ProductNotFoundError('Product image not found')
  }

  await repoSetPrimaryProductImage(productId, image.id)
  const images = await synchronizeProductPrimaryImage(productId)
  return images.map(toProductImageDto)
}
