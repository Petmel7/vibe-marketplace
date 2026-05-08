import Decimal from 'decimal.js'
import { prisma } from '@/lib/prisma'
import { ProductStatus } from '@/app/generated/prisma/client'
import type {
  CreateSellerProductDto,
  UpdateSellerProductDto,
  CreateVariantDto,
  UpdateVariantDto,
} from './seller-product.dto'

export interface ProductFilters {
  status?: string
  page?: number
  limit?: number
}

export async function findProductsByStoreId(storeId: string, filters: ProductFilters) {
  const { status, page = 1, limit = 20 } = filters
  return prisma.product.findMany({
    where: {
      storeId,
      ...(status ? { status: status as ProductStatus } : {}),
    },
    include: { variants: true },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  })
}

export async function findProductByIdAndStoreId(id: string, storeId: string) {
  return prisma.product.findFirst({
    where: { id, storeId },
    include: { variants: true },
  })
}

export async function createProduct(storeId: string, data: CreateSellerProductDto) {
  return prisma.product.create({
    data: {
      storeId,
      name: data.name,
      description: data.description ?? null,
      price: new Decimal(data.price),
      imageUrl: data.imageUrl ?? null,
      sku: data.sku ?? null,
      isHit: data.isHit ?? false,
      isNew: data.isNew ?? false,
      categoryId: data.categoryId ?? null,
      status: ProductStatus.DRAFT,
      updatedAt: new Date(),
    },
    include: { variants: true },
  })
}

export async function createVariant(
  productId: string,
  data: CreateVariantDto & { generatedSku: string },
) {
  return prisma.productVariant.create({
    data: {
      productId,
      sku: data.generatedSku,
      size: data.size ?? null,
      color: data.color ?? null,
      price: data.price ? new Decimal(data.price) : null,
      stock: data.stock ?? 0,
      updatedAt: new Date(),
    },
  })
}

export async function updateProduct(id: string, data: UpdateSellerProductDto) {
  return prisma.product.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.price !== undefined ? { price: new Decimal(data.price) } : {}),
      ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
      ...(data.sku !== undefined ? { sku: data.sku } : {}),
      ...(data.isHit !== undefined ? { isHit: data.isHit } : {}),
      ...(data.isNew !== undefined ? { isNew: data.isNew } : {}),
      ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
      updatedAt: new Date(),
    },
    include: { variants: true },
  })
}

export async function updateProductStatus(
  id: string,
  status: ProductStatus,
  extra?: { publishedAt?: Date | null; rejectionReason?: string | null },
) {
  return prisma.product.update({
    where: { id },
    data: {
      status,
      ...(extra?.publishedAt !== undefined ? { publishedAt: extra.publishedAt } : {}),
      ...(extra?.rejectionReason !== undefined
        ? { rejectionReason: extra.rejectionReason }
        : {}),
      updatedAt: new Date(),
    },
    include: { variants: true },
  })
}

export async function updateVariant(id: string, data: UpdateVariantDto) {
  return prisma.productVariant.update({
    where: { id },
    data: {
      ...(data.sku !== undefined ? { sku: data.sku } : {}),
      ...(data.size !== undefined ? { size: data.size } : {}),
      ...(data.color !== undefined ? { color: data.color } : {}),
      ...(data.price !== undefined
        ? { price: data.price !== null ? new Decimal(data.price) : null }
        : {}),
      ...(data.stock !== undefined ? { stock: data.stock } : {}),
      updatedAt: new Date(),
    },
  })
}

export async function deleteVariant(id: string): Promise<void> {
  await prisma.productVariant.delete({ where: { id } })
}

export async function updateVariantStock(variantId: string, stock: number) {
  return prisma.productVariant.update({
    where: { id: variantId },
    data: { stock, updatedAt: new Date() },
  })
}

export async function archiveProduct(id: string) {
  return prisma.product.update({
    where: { id },
    data: { status: ProductStatus.ARCHIVED, updatedAt: new Date() },
    include: { variants: true },
  })
}
