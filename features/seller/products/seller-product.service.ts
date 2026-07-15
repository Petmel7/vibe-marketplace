import { ProductStatus } from '@/app/generated/prisma/client'
import { requireSeller } from '@/lib/auth/guards'
import { assertSellerOwnsStore, assertSellerOwnsProduct } from '@/lib/auth/sellerGuards'
import {
  ProductNotFoundError,
  InvalidModerationTransitionError,
  InvalidInventoryError,
  InvalidSkuError,
  CategoryNotFoundError,
  ProductImageLimitExceededError,
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
  findCategoryById,
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

const MAX_PRODUCT_IMAGES = 10

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

async function ensureCategoryExists(categoryId: string | null | undefined) {
  if (!categoryId) {
    return
  }

  const category = await findCategoryById(categoryId)
  if (!category) {
    throw new CategoryNotFoundError()
  }
}

async function resolveProductSku(params: {
  storeId: string
  storeSlug: string
  productName: string
  manualSku?: string | null
  excludeProductId?: string
}) {
  const baseSku = params.manualSku
    ? normalizeSku(params.manualSku)
    : generateBaseSku(params.productName, params.storeSlug)

  if (!baseSku) {
    throw new InvalidSkuError('Product SKU cannot be empty after normalization')
  }

  const existing = await findProductBySkuInStore(params.storeId, baseSku, params.excludeProductId)
  if (!existing) {
    return baseSku
  }

  if (params.manualSku) {
    throw new InvalidSkuError('Product SKU is already used in this store')
  }

  for (let index = 2; index <= 99; index += 1) {
    const candidate = normalizeSku(`${baseSku}-${index}`)
    if (!candidate) {
      continue
    }

    const conflict = await findProductBySkuInStore(params.storeId, candidate, params.excludeProductId)
    if (!conflict) {
      return candidate
    }
  }

  throw new InvalidSkuError('Unable to generate a unique product SKU')
}

async function resolveVariantSku(params: {
  baseSku: string
  variant: CreateVariantDto | UpdateVariantDto
  index: number
  manualSku?: string
  excludeVariantId?: string
}) {
  const baseCandidate = params.manualSku
    ? normalizeSku(params.manualSku)
    : generateVariantSku(params.baseSku, params.variant, params.index)

  if (!baseCandidate) {
    throw new InvalidSkuError('Variant SKU cannot be empty after normalization')
  }

  const existing = await findVariantBySku(baseCandidate, params.excludeVariantId)
  if (!existing) {
    return baseCandidate
  }

  if (params.manualSku) {
    throw new InvalidSkuError('Variant SKU is already in use')
  }

  for (let index = 2; index <= 99; index += 1) {
    const candidate = normalizeSku(`${baseCandidate}-${index}`)
    if (!candidate) {
      continue
    }

    const conflict = await findVariantBySku(candidate, params.excludeVariantId)
    if (!conflict) {
      return candidate
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
  await ensureCategoryExists(data.categoryId)

  const productSku = await resolveProductSku({
    storeId: store.id,
    storeSlug: store.slug,
    productName: data.name,
    manualSku: data.sku,
  })

  const normalizedImages = data.images ? normalizeImagePayload(data.images) : []
  if (normalizedImages.length > MAX_PRODUCT_IMAGES) {
    throw new ProductImageLimitExceededError(`A product can have at most ${MAX_PRODUCT_IMAGES} images`)
  }

  const product = await repoCreateProduct(store.id, {
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

      await repoCreateVariant(product.id, { ...variant, generatedSku: resolvedSku })
    }
  }

  if (normalizedImages.length > 0) {
    await repoCreateProductImages(product.id, normalizedImages)
    await synchronizeProductPrimaryImage(product.id)
  }

  const refreshed = await findProductByIdAndStoreId(product.id, store.id)
  if (!refreshed) throw new ProductNotFoundError()
  notifyAdminsAboutPendingReviewProduct({
    product: refreshed,
    seller: user,
    store,
    source: 'create',
  })
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
    await ensureCategoryExists(data.categoryId)
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

  const updated = await repoUpdateProduct(productId, {
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

  const resolvedSku = await resolveVariantSku({
    baseSku: product.sku ?? generateBaseSku(product.name, store.slug),
    variant: data,
    index: product.variants?.length ?? 0,
    manualSku: data.sku,
  })

  const variant = await repoCreateVariant(productId, { ...data, generatedSku: resolvedSku })
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

  const updated = await repoUpdateVariant(variantId, {
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
  if (existingCount >= MAX_PRODUCT_IMAGES) {
    throw new ProductImageLimitExceededError(`A product can have at most ${MAX_PRODUCT_IMAGES} images`)
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
