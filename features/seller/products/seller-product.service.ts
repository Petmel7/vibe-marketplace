import { ProductStatus } from '@/app/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { requireSeller } from '@/lib/auth/guards'
import { assertSellerOwnsStore, assertSellerOwnsProduct } from '@/lib/auth/sellerGuards'
import {
  StoreNotFoundError,
  ProductNotFoundError,
  InvalidModerationTransitionError,
  InvalidInventoryError,
} from '@/lib/errors/seller'
import { findStoreByUserId } from '@/features/store/store.repository'
import type { SessionUser } from '@/features/auth/auth.dto'
import type {
  SellerProductDto,
  SellerProductSummaryDto,
  SellerVariantDto,
  CreateSellerProductDto,
  UpdateSellerProductDto,
  CreateVariantDto,
  UpdateVariantDto,
} from './seller-product.dto'
import type { ProductFilters } from './seller-product.repository'
import {
  findProductsByStoreId,
  findProductByIdAndStoreId,
  createProduct as repoCreateProduct,
  createVariant as repoCreateVariant,
  updateProduct as repoUpdateProduct,
  updateProductStatus,
  updateVariant as repoUpdateVariant,
  deleteVariant as repoDeleteVariant,
  updateVariantStock as repoUpdateVariantStock,
  archiveProduct as repoArchiveProduct,
} from './seller-product.repository'

// ---------------------------------------------------------------------------
// DTO mappers
// ---------------------------------------------------------------------------

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
  variants: Array<{
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
    variants: product.variants.map(toSellerVariantDto),
  }
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function getMyProducts(
  user: SessionUser,
  filters: ProductFilters,
): Promise<SellerProductSummaryDto[]> {
  requireSeller(user)
  const store = await findStoreByUserId(user.id)
  if (!store) throw new StoreNotFoundError()
  assertSellerOwnsStore(user, store)

  const products = await findProductsByStoreId(store.id, filters)
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price.toString(),
    status: p.status,
    totalStock: p.variants.reduce((sum, v) => sum + v.stock, 0),
    createdAt: p.createdAt,
  }))
}

export async function getMyProductById(
  user: SessionUser,
  productId: string,
): Promise<SellerProductDto> {
  requireSeller(user)
  const store = await findStoreByUserId(user.id)
  if (!store) throw new StoreNotFoundError()

  const product = await findProductByIdAndStoreId(productId, store.id)
  if (!product) throw new ProductNotFoundError()

  return toSellerProductDto(product)
}

export async function createProduct(
  user: SessionUser,
  data: CreateSellerProductDto,
): Promise<SellerProductDto> {
  requireSeller(user)
  const store = await findStoreByUserId(user.id)
  if (!store) throw new StoreNotFoundError()
  assertSellerOwnsStore(user, store)

  const product = await repoCreateProduct(store.id, data)

  if (data.variants && data.variants.length > 0) {
    for (let i = 0; i < data.variants.length; i++) {
      const v = data.variants[i]
      const generatedSku = v.sku ?? `${product.id.slice(0, 8)}-${Date.now()}-${i}`
      await repoCreateVariant(product.id, { ...v, generatedSku })
    }
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
  const store = await findStoreByUserId(user.id)
  if (!store) throw new StoreNotFoundError()

  const product = await findProductByIdAndStoreId(productId, store.id)
  if (!product) throw new ProductNotFoundError()
  assertSellerOwnsProduct(product, store.id)

  const updated = await repoUpdateProduct(productId, data)
  return toSellerProductDto(updated)
}

export async function submitForReview(
  user: SessionUser,
  productId: string,
): Promise<SellerProductDto> {
  requireSeller(user)
  const store = await findStoreByUserId(user.id)
  if (!store) throw new StoreNotFoundError()

  const product = await findProductByIdAndStoreId(productId, store.id)
  if (!product) throw new ProductNotFoundError()
  assertSellerOwnsProduct(product, store.id)

  if (product.status !== ProductStatus.DRAFT) {
    throw new InvalidModerationTransitionError(product.status, 'PENDING_REVIEW')
  }

  const updated = await updateProductStatus(productId, ProductStatus.PENDING_REVIEW)
  return toSellerProductDto(updated)
}

export async function archiveProduct(
  user: SessionUser,
  productId: string,
): Promise<SellerProductDto> {
  requireSeller(user)
  const store = await findStoreByUserId(user.id)
  if (!store) throw new StoreNotFoundError()

  const product = await findProductByIdAndStoreId(productId, store.id)
  if (!product) throw new ProductNotFoundError()
  assertSellerOwnsProduct(product, store.id)

  if (
    product.status !== ProductStatus.PUBLISHED &&
    product.status !== ProductStatus.REJECTED
  ) {
    throw new InvalidModerationTransitionError(product.status, 'ARCHIVED')
  }

  const updated = await repoArchiveProduct(productId)
  return toSellerProductDto(updated)
}

export async function addVariant(
  user: SessionUser,
  productId: string,
  data: CreateVariantDto,
): Promise<SellerVariantDto> {
  requireSeller(user)
  const store = await findStoreByUserId(user.id)
  if (!store) throw new StoreNotFoundError()

  const product = await findProductByIdAndStoreId(productId, store.id)
  if (!product) throw new ProductNotFoundError()
  assertSellerOwnsProduct(product, store.id)

  const generatedSku = data.sku ?? `${productId.slice(0, 8)}-${Date.now()}`
  const variant = await repoCreateVariant(productId, { ...data, generatedSku })
  return toSellerVariantDto(variant)
}

export async function updateVariant(
  user: SessionUser,
  variantId: string,
  data: UpdateVariantDto,
): Promise<SellerVariantDto> {
  requireSeller(user)
  const store = await findStoreByUserId(user.id)
  if (!store) throw new StoreNotFoundError()

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: true },
  })
  if (!variant) throw new ProductNotFoundError('Variant not found')
  assertSellerOwnsProduct(variant.product, store.id)

  const updated = await repoUpdateVariant(variantId, data)
  return toSellerVariantDto(updated)
}

export async function removeVariant(user: SessionUser, variantId: string): Promise<void> {
  requireSeller(user)
  const store = await findStoreByUserId(user.id)
  if (!store) throw new StoreNotFoundError()

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: true },
  })
  if (!variant) throw new ProductNotFoundError('Variant not found')
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
  const store = await findStoreByUserId(user.id)
  if (!store) throw new StoreNotFoundError()

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: true },
  })
  if (!variant) throw new ProductNotFoundError('Variant not found')
  assertSellerOwnsProduct(variant.product, store.id)

  const updated = await repoUpdateVariantStock(variantId, stock)
  return toSellerVariantDto(updated)
}
