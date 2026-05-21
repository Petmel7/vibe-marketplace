import Decimal from 'decimal.js'
import { prisma } from '@/lib/prisma'
import { ProductStatus } from '@/app/generated/prisma/client'
import type {
  CreateSellerProductDto,
  UpdateSellerProductDto,
  CreateVariantDto,
  ProductImageDto,
  UpdateVariantDto,
  SellerCategoryOptionDto,
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
    include: {
      images: { orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] },
      variants: true,
    },
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
      categoryId: data.categoryId ?? null,
      status: ProductStatus.DRAFT,
      updatedAt: new Date(),
    },
    include: {
      images: { orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] },
      variants: true,
    },
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
      ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
      updatedAt: new Date(),
    },
    include: {
      images: { orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] },
      variants: true,
    },
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
    include: {
      images: { orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] },
      variants: true,
    },
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
    include: {
      images: { orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] },
      variants: true,
    },
  })
}

export async function findCategoryById(id: string) {
  return prisma.category.findFirst({
    where: {
      id,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      level: true,
    },
  })
}

export async function listActiveCategories(): Promise<SellerCategoryOptionDto[]> {
  return prisma.category.findMany({
    where: {
      isActive: true,
      isVisible: true,
    },
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      level: true,
    },
  })
}

export async function findProductBySkuInStore(storeId: string, sku: string, excludeProductId?: string) {
  return prisma.product.findFirst({
    where: {
      storeId,
      sku,
      ...(excludeProductId ? { id: { not: excludeProductId } } : {}),
    },
    select: { id: true },
  })
}

export async function findVariantBySku(sku: string, excludeVariantId?: string) {
  return prisma.productVariant.findFirst({
    where: {
      sku,
      ...(excludeVariantId ? { id: { not: excludeVariantId } } : {}),
    },
    select: { id: true },
  })
}

export async function findVariantByIdWithProduct(variantId: string) {
  return prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: true },
  })
}

export async function createProductImages(productId: string, images: Array<Omit<ProductImageDto, 'id' | 'createdAt' | 'updatedAt' | 'productId'>>) {
  const created = await prisma.$transaction(
    images.map((image) =>
      prisma.productImage.create({
        data: {
          productId,
          url: image.url,
          storagePath: image.storagePath,
          altText: image.altText,
          position: image.position,
          isPrimary: image.isPrimary,
          updatedAt: new Date(),
        },
      }),
    ),
  )

  return created
}

export async function listProductImages(productId: string) {
  return prisma.productImage.findMany({
    where: { productId },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
  })
}

export async function countProductImages(productId: string) {
  return prisma.productImage.count({ where: { productId } })
}

export async function findProductImageById(productId: string, imageId: string) {
  return prisma.productImage.findFirst({
    where: {
      id: imageId,
      productId,
    },
  })
}

export async function deleteProductImage(imageId: string) {
  return prisma.productImage.delete({
    where: { id: imageId },
  })
}

export async function updateProductPrimaryImage(productId: string, imageUrl: string | null) {
  return prisma.product.update({
    where: { id: productId },
    data: {
      imageUrl,
      updatedAt: new Date(),
    },
  })
}

export async function reorderProductImages(
  productId: string,
  positions: Array<{ id: string; position: number }>,
) {
  await prisma.$transaction(
    positions.map((item) =>
      prisma.productImage.update({
        where: { id: item.id },
        data: {
          productId,
          position: item.position,
          updatedAt: new Date(),
        },
      }),
    ),
  )
}

export async function setPrimaryProductImage(productId: string, imageId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.productImage.updateMany({
      where: { productId, isPrimary: true },
      data: { isPrimary: false, updatedAt: new Date() },
    })

    await tx.productImage.update({
      where: { id: imageId },
      data: { isPrimary: true, updatedAt: new Date() },
    })
  })
}
