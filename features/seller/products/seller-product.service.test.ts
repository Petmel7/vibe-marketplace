import { beforeEach, describe, expect, it, vi } from 'vitest'
import Decimal from 'decimal.js'
import { ProductStatus } from '@/app/generated/prisma/client'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('@/features/seller/products/seller-product.repository')
vi.mock('@/features/store/store.service')
vi.mock('@/features/media/media.service')
vi.mock('@/lib/auth/guards')
vi.mock('@/lib/auth/sellerGuards')
vi.mock('@/features/notifications/notifications.service', () => ({
  createAdminNotification: vi.fn(),
}))
vi.mock('@/features/products/product-metrics.jobs', () => ({
  scheduleProductMetricsRecalculation: vi.fn(),
}))
vi.mock('@/utils/logger', () => ({
  logError: vi.fn(),
}))

import * as productRepo from '@/features/seller/products/seller-product.repository'
import * as storeService from '@/features/store/store.service'
import * as mediaService from '@/features/media/media.service'
import * as guards from '@/lib/auth/guards'
import * as sellerGuards from '@/lib/auth/sellerGuards'
import * as notificationsService from '@/features/notifications/notifications.service'
import * as productMetricsJobs from '@/features/products/product-metrics.jobs'
import * as logger from '@/utils/logger'
import {
  archiveProduct,
  createProduct,
  getMyProductById,
  setPrimaryProductImage,
  submitForReview,
  updateInventory,
  uploadProductImage,
} from '@/features/seller/products/seller-product.service'
import {
  CategoryNotFoundError,
  InvalidInventoryError,
  InvalidModerationTransitionError,
  InvalidSkuError,
  ProductImageLimitExceededError,
  ProductNotFoundError,
} from '@/lib/errors/seller'
import type { SessionUser } from '@/features/auth/auth.dto'
import { createSellerProductSchema, updateSellerProductSchema } from './seller-product.schema'

const mockProductRepo = vi.mocked(productRepo)
const mockStoreService = vi.mocked(storeService)
const mockMediaService = vi.mocked(mediaService)
const mockGuards = vi.mocked(guards)
const mockSellerGuards = vi.mocked(sellerGuards)
const mockNotifications = vi.mocked(notificationsService)
const mockProductMetricsJobs = vi.mocked(productMetricsJobs)
const mockLogger = vi.mocked(logger)

const mockUser: SessionUser = {
  id: 'user-uuid-001',
  email: 'seller@example.com',
  roles: ['SELLER' as never],
}

const mockStore = {
  id: 'store-uuid-001',
  ownerId: 'user-uuid-001',
  name: 'Test Store',
  slug: 'test-store',
  description: null,
  logoUrl: null,
  bannerUrl: null,
  isActive: true,
  isPrimary: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

function makeProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: 'product-uuid-001',
    storeId: mockStore.id,
    categoryId: null,
    name: 'Test Product',
    description: null,
    price: new Decimal('29.99'),
    imageUrl: null,
    sku: 'TEST-STORE-TEST-PRODUCT',
    isHit: false,
    isNew: false,
    isActive: true,
    status: ProductStatus.DRAFT,
    rejectionReason: null,
    moderatedAt: null,
    moderatedBy: null,
    moderationReason: null,
    publishedAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    images: [],
    variants: [],
    ...overrides,
  }
}

function makeImage(overrides: Partial<{
  id: string
  productId: string
  url: string
  storagePath: string
  altText: string | null
  position: number
  isPrimary: boolean
  createdAt: Date
  updatedAt: Date
}> = {}) {
  return {
    id: 'image-uuid-001',
    productId: 'product-uuid-001',
    url: 'https://cdn.example.com/product.png',
    storagePath: 'products/product-uuid-001/hash.png',
    altText: 'Primary image',
    position: 0,
    isPrimary: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGuards.requireSeller.mockReturnValue(undefined)
  mockSellerGuards.assertSellerOwnsStore.mockReturnValue(undefined)
  mockSellerGuards.assertSellerOwnsProduct.mockReturnValue(undefined)
  mockStoreService.resolveSellerStoreContext.mockResolvedValue(mockStore as never)
  mockStoreService.assertStoreOwnership.mockResolvedValue(mockStore as never)
  mockProductRepo.findProductBySkuInStore.mockResolvedValue(null)
  mockProductRepo.findVariantBySku.mockResolvedValue(null)
  mockProductRepo.listProductImages.mockResolvedValue([])
  mockProductRepo.findProductById.mockResolvedValue(makeProduct() as never)
  mockNotifications.createAdminNotification.mockResolvedValue([] as never)
})

describe('createProduct', () => {
  it('rejects seller-controlled marketplace badge flags at the validation boundary', () => {
    const createResult = createSellerProductSchema.safeParse({
      name: 'Test Product',
      price: '29.99',
      isHit: true,
    })
    const updateResult = updateSellerProductSchema.safeParse({
      isNew: true,
    })

    expect(createResult.success).toBe(false)
    expect(updateResult.success).toBe(false)
  })

  it('normalizes a manual product SKU before persisting', async () => {
    const product = makeProduct()
    mockProductRepo.createProduct.mockResolvedValue(product)
    mockProductRepo.findProductByIdAndStoreId.mockResolvedValue(product)

    await createProduct(mockUser, {
      name: 'Test Product',
      price: '29.99',
      sku: ' custom sku ',
    })

    expect(mockProductRepo.createProduct).toHaveBeenCalledWith(
      mockStore.id,
      expect.objectContaining({ sku: 'CUSTOM-SKU' }),
    )
  })

  it('rejects duplicate manual product SKUs in the same store', async () => {
    mockProductRepo.findProductBySkuInStore.mockResolvedValue({ id: 'other-product' })

    await expect(
      createProduct(mockUser, {
        name: 'Test Product',
        price: '29.99',
        sku: 'duplicate-sku',
      }),
    ).rejects.toThrow(InvalidSkuError)

    expect(mockProductRepo.createProduct).not.toHaveBeenCalled()
  })

  it('validates that category exists before creating a product', async () => {
    mockProductRepo.findCategoryById.mockResolvedValue(null)

    await expect(
      createProduct(mockUser, {
        name: 'Test Product',
        price: '29.99',
        categoryId: 'missing-category',
      }),
    ).rejects.toThrow(CategoryNotFoundError)

    expect(mockProductRepo.createProduct).not.toHaveBeenCalled()
  })

  it('creates new seller products in PENDING_REVIEW for the MVP moderation flow', async () => {
    const pendingProduct = makeProduct({ status: ProductStatus.PENDING_REVIEW })
    mockProductRepo.createProduct.mockResolvedValue(pendingProduct)
    mockProductRepo.findProductByIdAndStoreId.mockResolvedValue(pendingProduct)

    const result = await createProduct(mockUser, {
      name: 'Test Product',
      price: '29.99',
    })

    expect(mockNotifications.createAdminNotification).toHaveBeenCalledWith({
      title: 'Новий товар очікує модерації',
      message: 'Продавець seller@example.com надіслав товар "Test Product" з магазину "Test Store" на модерацію.',
      actionUrl: '/admin/moderation',
      metadata: {
        productId: 'product-uuid-001',
        productName: 'Test Product',
        storeId: 'store-uuid-001',
        storeName: 'Test Store',
        sellerId: 'user-uuid-001',
        sellerEmail: 'seller@example.com',
        status: ProductStatus.PENDING_REVIEW,
        source: 'create',
        roleTarget: 'admin',
        actorRole: 'SELLER',
      },
    })
    expect(result.status).toBe(ProductStatus.PENDING_REVIEW)
  })

  it('uses explicit store context when creating a product for one of multiple owned stores', async () => {
    const pendingProduct = makeProduct({ status: ProductStatus.PENDING_REVIEW, storeId: 'store-uuid-002' })
    mockStoreService.resolveSellerStoreContext.mockResolvedValueOnce({
      ...mockStore,
      id: 'store-uuid-002',
      slug: 'second-store',
    } as never)
    mockProductRepo.createProduct.mockResolvedValue(pendingProduct)
    mockProductRepo.findProductByIdAndStoreId.mockResolvedValue(pendingProduct)

    await createProduct(mockUser, {
      storeId: 'store-uuid-002',
      name: 'Second Store Product',
      price: '29.99',
    })

    expect(mockStoreService.resolveSellerStoreContext).toHaveBeenCalledWith(
      mockUser,
      'store-uuid-002',
    )
    expect(mockProductRepo.createProduct).toHaveBeenCalledWith(
      'store-uuid-002',
      expect.objectContaining({ name: 'Second Store Product' }),
    )
  })

  it('does not fail product creation when admin notification creation fails', async () => {
    const pendingProduct = makeProduct({ status: ProductStatus.PENDING_REVIEW })
    const notificationError = new Error('admin notify down')
    mockProductRepo.createProduct.mockResolvedValue(pendingProduct)
    mockProductRepo.findProductByIdAndStoreId.mockResolvedValue(pendingProduct)
    mockNotifications.createAdminNotification.mockRejectedValue(notificationError)

    const result = await createProduct(mockUser, {
      name: 'Test Product',
      price: '29.99',
    })
    await Promise.resolve()

    expect(result.status).toBe(ProductStatus.PENDING_REVIEW)
    expect(mockLogger.logError).toHaveBeenCalledWith(
      'seller-product:pending-review:admin-notification',
      notificationError,
      expect.objectContaining({
        productId: 'product-uuid-001',
        sellerId: 'user-uuid-001',
        storeId: 'store-uuid-001',
        source: 'create',
      }),
    )
  })
})

describe('submitForReview', () => {
  it('transitions DRAFT product to PENDING_REVIEW', async () => {
    const draftProduct = makeProduct({ status: ProductStatus.DRAFT })
    const pendingProduct = makeProduct({ status: ProductStatus.PENDING_REVIEW })
    mockProductRepo.findProductById.mockResolvedValue(draftProduct)
    mockProductRepo.updateProductStatus.mockResolvedValue(pendingProduct)

    const result = await submitForReview(mockUser, 'product-uuid-001')

    expect(mockProductRepo.updateProductStatus).toHaveBeenCalledWith(
      'product-uuid-001',
      ProductStatus.PENDING_REVIEW,
    )
    expect(mockNotifications.createAdminNotification).toHaveBeenCalledWith({
      title: 'Новий товар очікує модерації',
      message: 'Продавець seller@example.com надіслав товар "Test Product" з магазину "Test Store" на модерацію.',
      actionUrl: '/admin/moderation',
      metadata: {
        productId: 'product-uuid-001',
        productName: 'Test Product',
        storeId: 'store-uuid-001',
        storeName: 'Test Store',
        sellerId: 'user-uuid-001',
        sellerEmail: 'seller@example.com',
        status: ProductStatus.PENDING_REVIEW,
        source: 'submit',
        roleTarget: 'admin',
        actorRole: 'SELLER',
      },
    })
    expect(result.status).toBe(ProductStatus.PENDING_REVIEW)
  })

  it('throws InvalidModerationTransitionError for PUBLISHED product', async () => {
    const publishedProduct = makeProduct({ status: ProductStatus.PUBLISHED })
    mockProductRepo.findProductById.mockResolvedValue(publishedProduct)

    await expect(submitForReview(mockUser, 'product-uuid-001')).rejects.toThrow(
      InvalidModerationTransitionError,
    )
  })

  it('does not fail submitForReview when admin notification creation fails', async () => {
    const draftProduct = makeProduct({ status: ProductStatus.DRAFT })
    const pendingProduct = makeProduct({ status: ProductStatus.PENDING_REVIEW })
    const notificationError = new Error('admin notify down')
    mockProductRepo.findProductById.mockResolvedValue(draftProduct)
    mockProductRepo.updateProductStatus.mockResolvedValue(pendingProduct)
    mockNotifications.createAdminNotification.mockRejectedValue(notificationError)

    const result = await submitForReview(mockUser, 'product-uuid-001')
    await Promise.resolve()

    expect(result.status).toBe(ProductStatus.PENDING_REVIEW)
    expect(mockLogger.logError).toHaveBeenCalledWith(
      'seller-product:pending-review:admin-notification',
      notificationError,
      expect.objectContaining({
        productId: 'product-uuid-001',
        sellerId: 'user-uuid-001',
        storeId: 'store-uuid-001',
        source: 'submit',
      }),
    )
  })
})

describe('archiveProduct', () => {
  it('archives a PUBLISHED product', async () => {
    const publishedProduct = makeProduct({ status: ProductStatus.PUBLISHED })
    const archivedProduct = makeProduct({ status: ProductStatus.ARCHIVED })
    mockProductRepo.findProductById.mockResolvedValue(publishedProduct)
    mockProductRepo.archiveProduct.mockResolvedValue(archivedProduct)

    const result = await archiveProduct(mockUser, 'product-uuid-001')

    expect(mockProductRepo.archiveProduct).toHaveBeenCalledWith('product-uuid-001')
    expect(mockProductMetricsJobs.scheduleProductMetricsRecalculation).toHaveBeenCalledWith({
      reason: 'seller-product-archived',
      dedupeKey: `product-metrics:seller-product-archived:${archivedProduct.id}:${archivedProduct.updatedAt.toISOString()}`,
    })
    expect(result.status).toBe(ProductStatus.ARCHIVED)
  })
})

describe('updateInventory', () => {
  it('throws InvalidInventoryError for negative stock', async () => {
    await expect(updateInventory(mockUser, 'variant-uuid-001', -1)).rejects.toThrow(
      InvalidInventoryError,
    )
  })
})

describe('getMyProductById', () => {
  it('throws ProductNotFoundError when product does not belong to seller store', async () => {
    mockProductRepo.findProductById.mockResolvedValue(null)

    await expect(getMyProductById(mockUser, 'non-existent-product')).rejects.toThrow(
      ProductNotFoundError,
    )
  })
})

describe('uploadProductImage', () => {
  it('creates a product image, syncs primary state, and updates snapshot URL', async () => {
    const product = makeProduct()
    const createdImage = makeImage({ isPrimary: true })
    const file = new File([Uint8Array.from([0x89, 0x50, 0x4e, 0x47])], 'product.png', { type: 'image/png' })

    mockProductRepo.findProductByIdAndStoreId.mockResolvedValue(product)
    mockProductRepo.countProductImages.mockResolvedValue(0)
    mockMediaService.uploadProductImageBinary.mockResolvedValue({
      bucket: 'product-images',
      url: createdImage.url,
      storagePath: createdImage.storagePath,
      contentType: 'image/png',
      size: 4,
    })
    mockProductRepo.createProductImages.mockResolvedValue([createdImage])
    mockProductRepo.listProductImages.mockResolvedValue([createdImage])
    mockProductRepo.updateProductPrimaryImage.mockResolvedValue(product)

    const result = await uploadProductImage(mockUser, product.id, {
      file,
      altText: 'Primary image',
      isPrimary: true,
    })

    expect(mockMediaService.uploadProductImageBinary).toHaveBeenCalledWith({
      file,
      productId: product.id,
    })
    expect(mockProductRepo.createProductImages).toHaveBeenCalledWith(
      product.id,
      expect.arrayContaining([
        expect.objectContaining({
          url: createdImage.url,
          storagePath: createdImage.storagePath,
        }),
      ]),
    )
    expect(mockProductRepo.updateProductPrimaryImage).toHaveBeenCalledWith(product.id, createdImage.url)
    expect(result.storagePath).toBe(createdImage.storagePath)
  })

  it('rejects uploads when the product image limit has been reached', async () => {
    const product = makeProduct()
    const file = new File([Uint8Array.from([0x89, 0x50, 0x4e, 0x47])], 'product.png', { type: 'image/png' })

    mockProductRepo.findProductByIdAndStoreId.mockResolvedValue(product)
    mockProductRepo.countProductImages.mockResolvedValue(10)

    await expect(uploadProductImage(mockUser, product.id, { file })).rejects.toThrow(
      ProductImageLimitExceededError,
    )
  })
})

describe('setPrimaryProductImage', () => {
  it('reassigns the primary image and refreshes product imageUrl', async () => {
    const product = makeProduct()
    const secondary = makeImage({ id: 'image-uuid-002', isPrimary: false, url: 'https://cdn.example.com/secondary.png' })

    mockProductRepo.findProductByIdAndStoreId.mockResolvedValue(product)
    mockProductRepo.findProductImageById.mockResolvedValue(secondary)
    mockProductRepo.listProductImages.mockResolvedValue([
      { ...secondary, isPrimary: true },
    ])
    mockProductRepo.updateProductPrimaryImage.mockResolvedValue(product)

    const result = await setPrimaryProductImage(mockUser, product.id, secondary.id)

    expect(mockProductRepo.setPrimaryProductImage).toHaveBeenCalledWith(product.id, secondary.id)
    expect(mockProductRepo.updateProductPrimaryImage).toHaveBeenCalledWith(product.id, secondary.url)
    expect(result[0]?.isPrimary).toBe(true)
  })
})
