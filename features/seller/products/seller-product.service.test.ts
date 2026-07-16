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
  addVariant,
  archiveProduct,
  createProduct,
  getMyProductById,
  setPrimaryProductImage,
  submitForReview,
  updateProduct,
  updateVariant,
  updateInventory,
  uploadProductImage,
} from '@/features/seller/products/seller-product.service'
import {
  CategoryNotFoundError,
  InvalidInventoryError,
  InvalidModerationTransitionError,
  InvalidSkuError,
  InvalidVariantConfigurationError,
  ProductImageLimitExceededError,
  ProductNotFoundError,
  SellerProductValidationError,
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

const mockSellerCategories = [
  {
    id: 'cat-root-clothing-shoes',
    name: 'Одяг та взуття',
    slug: 'clothing-shoes',
    parentId: null,
    level: 0,
  },
  {
    id: 'cat-leaf-womens-dresses',
    name: 'Жіночі сукні',
    slug: 'womens-dresses',
    parentId: 'cat-root-clothing-shoes',
    level: 1,
  },
  {
    id: 'cat-root-accessories',
    name: 'Аксесуари',
    slug: 'accessories',
    parentId: null,
    level: 0,
  },
  {
    id: 'cat-leaf-backpacks',
    name: 'Рюкзаки',
    slug: 'backpacks',
    parentId: 'cat-root-accessories',
    level: 1,
  },
]

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

function makeModerationReadyProduct(overrides: Record<string, unknown> = {}) {
  return makeProduct({
    name: 'Validated seller product',
    description: 'Дуже детальний опис товару для перевірки модераційної готовності.',
    price: new Decimal('1299.00'),
    categoryId: 'cat-leaf-womens-dresses',
    imageUrl: 'https://cdn.example.com/product.png',
    images: [makeImage()],
    variants: [
      {
        id: 'variant-uuid-001',
        productId: 'product-uuid-001',
        sku: 'VAR-READY-001',
        size: 'M',
        color: 'Black',
        price: new Decimal('1299.00'),
        stock: 3,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ],
    ...overrides,
  })
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
  mockProductRepo.listActiveCategories.mockResolvedValue(mockSellerCategories as never)
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

  it('accepts only canonical predefined variant sizes at the validation boundary', () => {
    const invalidResult = createSellerProductSchema.safeParse({
      name: 'Test Product',
      price: '29.99',
      variants: [{ size: 'Medium', stock: 1 }],
    })
    const validResult = createSellerProductSchema.safeParse({
      name: 'Test Product',
      price: '29.99',
      variants: [{ size: 'M', stock: 1 }],
    })

    expect(invalidResult.success).toBe(false)
    expect(validResult.success).toBe(true)
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

  it('generates an automatic product SKU when the payload omits sku', async () => {
    const randomUuidSpy = vi.spyOn(globalThis.crypto, 'randomUUID')
      .mockReturnValue('11111111-1111-1111-1111-111111111111')
    const product = makeProduct({ sku: 'PRD-TEST-PRODUCT-11111111' })
    mockProductRepo.createProduct.mockResolvedValue(product)
    mockProductRepo.findProductByIdAndStoreId.mockResolvedValue(product)

    await createProduct(mockUser, {
      name: 'Test Product',
      price: '29.99',
    })

    expect(mockProductRepo.createProduct).toHaveBeenCalledWith(
      mockStore.id,
      expect.objectContaining({ sku: 'PRD-TEST-PRODUCT-11111111' }),
    )

    randomUuidSpy.mockRestore()
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

  it('returns a safe domain error when product SKU hits a unique constraint during create', async () => {
    mockProductRepo.createProduct.mockRejectedValue({ code: 'P2002' })

    await expect(
      createProduct(mockUser, {
        name: 'Test Product',
        price: '29.99',
        sku: 'shared-global-sku',
      }),
    ).rejects.toThrow(InvalidSkuError)
  })

  it('validates that category exists before creating a product', async () => {
    mockProductRepo.listActiveCategories.mockResolvedValue([] as never)

    await expect(
      createProduct(mockUser, {
        name: 'Test Product',
        price: '29.99',
        categoryId: 'missing-category',
      }),
    ).rejects.toThrow(CategoryNotFoundError)

    expect(mockProductRepo.createProduct).not.toHaveBeenCalled()
  })

  it('rejects non-leaf categories during draft creation when category is provided', async () => {
    await expect(
      createProduct(mockUser, {
        name: 'Test Product',
        price: '29.99',
        categoryId: 'cat-root-clothing-shoes',
      }),
    ).rejects.toThrow(SellerProductValidationError)

    expect(mockProductRepo.createProduct).not.toHaveBeenCalled()
  })

  it('rejects duplicate size and color combinations when creating a product', async () => {
    await expect(
      createProduct(mockUser, {
        name: 'Test Product',
        price: '29.99',
        variants: [
          { size: 'M', color: 'Black', stock: 1 },
          { size: 'M', color: 'black', stock: 2 },
        ],
      }),
    ).rejects.toThrow(InvalidVariantConfigurationError)

    expect(mockProductRepo.createProduct).not.toHaveBeenCalled()
  })

  it('creates new seller products in DRAFT state', async () => {
    const draftProduct = makeProduct({ status: ProductStatus.DRAFT })
    mockProductRepo.createProduct.mockResolvedValue(draftProduct)
    mockProductRepo.findProductByIdAndStoreId.mockResolvedValue(draftProduct)

    const result = await createProduct(mockUser, {
      name: 'Test Product',
      price: '29.99',
    })

    expect(mockNotifications.createAdminNotification).not.toHaveBeenCalled()
    expect(result.status).toBe(ProductStatus.DRAFT)
  })

  it('generates an automatic variant SKU when the variant payload omits sku', async () => {
    const randomUuidSpy = vi.spyOn(globalThis.crypto, 'randomUUID')
      .mockReturnValueOnce('11111111-1111-1111-1111-111111111111')
      .mockReturnValueOnce('22222222-2222-2222-2222-222222222222')
    const draftProduct = makeProduct({ status: ProductStatus.DRAFT, sku: 'PRD-TEST-PRODUCT-11111111' })
    mockProductRepo.createProduct.mockResolvedValue(draftProduct)
    mockProductRepo.findProductByIdAndStoreId.mockResolvedValue(draftProduct)
    mockProductRepo.createVariant.mockResolvedValue({
      id: 'variant-uuid-001',
      productId: draftProduct.id,
      sku: 'VAR-TEST-PRODUCT-M-22222222',
      size: 'M',
      color: null,
      price: null,
      stock: 3,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    } as never)

    await createProduct(mockUser, {
      name: 'Test Product',
      price: '29.99',
      variants: [{ size: 'M', stock: 3 }],
    })

    expect(mockProductRepo.createVariant).toHaveBeenCalledWith(
      draftProduct.id,
      expect.objectContaining({ generatedSku: 'VAR-TEST-PRODUCT-M-22222222' }),
    )

    randomUuidSpy.mockRestore()
  })

  it('uses explicit store context when creating a product for one of multiple owned stores', async () => {
    const draftProduct = makeProduct({ status: ProductStatus.DRAFT, storeId: 'store-uuid-002' })
    mockStoreService.resolveSellerStoreContext.mockResolvedValueOnce({
      ...mockStore,
      id: 'store-uuid-002',
      slug: 'second-store',
    } as never)
    mockProductRepo.createProduct.mockResolvedValue(draftProduct)
    mockProductRepo.findProductByIdAndStoreId.mockResolvedValue(draftProduct)

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
})

describe('submitForReview', () => {
  it('transitions a complete DRAFT product to PENDING_REVIEW', async () => {
    const draftProduct = makeModerationReadyProduct({ status: ProductStatus.DRAFT })
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

  it('fails when category is missing', async () => {
    mockProductRepo.findProductById.mockResolvedValue(
      makeModerationReadyProduct({ status: ProductStatus.DRAFT, categoryId: null }) as never,
    )

    await expect(submitForReview(mockUser, 'product-uuid-001')).rejects.toThrow(
      SellerProductValidationError,
    )

    expect(mockProductRepo.updateProductStatus).not.toHaveBeenCalled()
    expect(mockNotifications.createAdminNotification).not.toHaveBeenCalled()
  })

  it('fails for a non-leaf category', async () => {
    mockProductRepo.findProductById.mockResolvedValue(
      makeModerationReadyProduct({ status: ProductStatus.DRAFT, categoryId: 'cat-root-clothing-shoes' }) as never,
    )

    await expect(submitForReview(mockUser, 'product-uuid-001')).rejects.toThrow(
      SellerProductValidationError,
    )

    expect(mockProductRepo.updateProductStatus).not.toHaveBeenCalled()
  })

  it('fails without description', async () => {
    mockProductRepo.findProductById.mockResolvedValue(
      makeModerationReadyProduct({ status: ProductStatus.DRAFT, description: null }) as never,
    )

    await expect(submitForReview(mockUser, 'product-uuid-001')).rejects.toThrow(
      SellerProductValidationError,
    )
  })

  it('fails without images', async () => {
    mockProductRepo.findProductById.mockResolvedValue(
      makeModerationReadyProduct({
        status: ProductStatus.DRAFT,
        images: [],
        imageUrl: null,
      }) as never,
    )

    await expect(submitForReview(mockUser, 'product-uuid-001')).rejects.toThrow(
      SellerProductValidationError,
    )
  })

  it('fails without a resolved primary image', async () => {
    mockProductRepo.findProductById.mockResolvedValue(
      makeModerationReadyProduct({
        status: ProductStatus.DRAFT,
        imageUrl: 'https://cdn.example.com/other.png',
        images: [makeImage({ isPrimary: true })],
      }) as never,
    )

    await expect(submitForReview(mockUser, 'product-uuid-001')).rejects.toThrow(
      SellerProductValidationError,
    )
  })

  it('fails without variants', async () => {
    mockProductRepo.findProductById.mockResolvedValue(
      makeModerationReadyProduct({ status: ProductStatus.DRAFT, variants: [] }) as never,
    )

    await expect(submitForReview(mockUser, 'product-uuid-001')).rejects.toThrow(
      SellerProductValidationError,
    )
  })

  it('fails when all variants have zero stock', async () => {
    mockProductRepo.findProductById.mockResolvedValue(
      makeModerationReadyProduct({
        status: ProductStatus.DRAFT,
        variants: [
          {
            id: 'variant-uuid-001',
            productId: 'product-uuid-001',
            sku: 'VAR-READY-001',
            size: 'M',
            color: 'Black',
            price: new Decimal('1299.00'),
            stock: 0,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
          },
        ],
      }) as never,
    )

    await expect(submitForReview(mockUser, 'product-uuid-001')).rejects.toThrow(
      SellerProductValidationError,
    )
  })

  it('fails when a required-size category has a variant without size', async () => {
    mockProductRepo.findProductById.mockResolvedValue(
      makeModerationReadyProduct({
        status: ProductStatus.DRAFT,
        variants: [
          {
            id: 'variant-uuid-001',
            productId: 'product-uuid-001',
            sku: 'VAR-READY-001',
            size: null,
            color: 'Black',
            price: new Decimal('1299.00'),
            stock: 2,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
          },
        ],
      }) as never,
    )

    await expect(submitForReview(mockUser, 'product-uuid-001')).rejects.toThrow(
      SellerProductValidationError,
    )
  })

  it('keeps the product in DRAFT when readiness validation fails', async () => {
    const draftProduct = makeModerationReadyProduct({
      status: ProductStatus.DRAFT,
      description: 'Коротко',
    })
    mockProductRepo.findProductById.mockResolvedValue(draftProduct as never)

    await expect(submitForReview(mockUser, draftProduct.id)).rejects.toThrow(
      SellerProductValidationError,
    )

    expect(mockProductRepo.updateProductStatus).not.toHaveBeenCalled()
  })

  it('throws InvalidModerationTransitionError for PUBLISHED product', async () => {
    const publishedProduct = makeProduct({ status: ProductStatus.PUBLISHED })
    mockProductRepo.findProductById.mockResolvedValue(publishedProduct)

    await expect(submitForReview(mockUser, 'product-uuid-001')).rejects.toThrow(
      InvalidModerationTransitionError,
    )
  })

  it('does not fail submitForReview when admin notification creation fails', async () => {
    const draftProduct = makeModerationReadyProduct({ status: ProductStatus.DRAFT })
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

describe('updateProduct', () => {
  it('allows updating a product while keeping its own SKU unchanged', async () => {
    const existingProduct = makeProduct({ sku: 'PRD-LOCKED-ABC12345' })
    const updatedProduct = makeProduct({ sku: 'PRD-LOCKED-ABC12345', price: new Decimal('31.99') })
    mockProductRepo.findProductById.mockResolvedValue(existingProduct)
    mockProductRepo.updateProduct.mockResolvedValue(updatedProduct)

    await expect(
      updateProduct(mockUser, existingProduct.id, {
        sku: 'PRD-LOCKED-ABC12345',
        price: '31.99',
      }),
    ).resolves.toMatchObject({
      id: existingProduct.id,
      sku: 'PRD-LOCKED-ABC12345',
    })

    expect(mockProductRepo.findProductBySkuInStore).toHaveBeenCalledWith(
      mockStore.id,
      'PRD-LOCKED-ABC12345',
      existingProduct.id,
    )
  })

  it('does not regenerate an existing SKU when the product name changes', async () => {
    const existingProduct = makeProduct({ sku: 'PRD-LOCKED-ABC12345', name: 'Old product name' })
    const updatedProduct = makeProduct({ sku: 'PRD-LOCKED-ABC12345', name: 'New product name' })
    mockProductRepo.findProductById.mockResolvedValue(existingProduct)
    mockProductRepo.updateProduct.mockResolvedValue(updatedProduct)

    await updateProduct(mockUser, existingProduct.id, {
      name: 'New product name',
    })

    const updatePayload = mockProductRepo.updateProduct.mock.calls[0]?.[1]
    expect(updatePayload).toBeDefined()
    expect('sku' in (updatePayload ?? {})).toBe(false)
  })

  it('does not regenerate an existing SKU when the store slug changes', async () => {
    const existingProduct = makeProduct({ sku: 'PRD-LOCKED-ABC12345' })
    const updatedProduct = makeProduct({ sku: 'PRD-LOCKED-ABC12345' })
    mockProductRepo.findProductById.mockResolvedValue(existingProduct)
    mockProductRepo.updateProduct.mockResolvedValue(updatedProduct)
    mockStoreService.assertStoreOwnership.mockResolvedValueOnce({
      ...mockStore,
      slug: 'renamed-store',
    } as never)

    await updateProduct(mockUser, existingProduct.id, {
      price: '31.99',
    })

    const updatePayload = mockProductRepo.updateProduct.mock.calls[0]?.[1]
    expect(updatePayload).toBeDefined()
    expect('sku' in (updatePayload ?? {})).toBe(false)
  })

  it('returns a safe domain error when product SKU hits a unique constraint during update', async () => {
    const existingProduct = makeProduct({ sku: 'PRD-LOCKED-ABC12345' })
    mockProductRepo.findProductById.mockResolvedValue(existingProduct)
    mockProductRepo.updateProduct.mockRejectedValue({ code: 'P2002' })

    await expect(
      updateProduct(mockUser, existingProduct.id, {
        sku: 'MANUAL-DUPLICATE-SKU',
      }),
    ).rejects.toThrow(InvalidSkuError)
  })
})

describe('updateInventory', () => {
  it('throws InvalidInventoryError for negative stock', async () => {
    await expect(updateInventory(mockUser, 'variant-uuid-001', -1)).rejects.toThrow(
      InvalidInventoryError,
    )
  })
})

describe('variant combination protection', () => {
  it('rejects adding a duplicate size and color combination to an existing product', async () => {
    mockProductRepo.findProductById.mockResolvedValue(makeProduct({
      variants: [
        {
          id: 'variant-uuid-001',
          productId: 'product-uuid-001',
          sku: 'SKU-001',
          size: 'M',
          color: 'Black',
          price: null,
          stock: 2,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ],
    }) as never)

    await expect(
      addVariant(mockUser, 'product-uuid-001', {
        size: 'M',
        color: 'black',
        stock: 1,
      }),
    ).rejects.toThrow(InvalidVariantConfigurationError)

    expect(mockProductRepo.createVariant).not.toHaveBeenCalled()
  })

  it('rejects updating a variant into a duplicate size and color combination', async () => {
    mockProductRepo.findVariantByIdWithProduct.mockResolvedValue({
      id: 'variant-uuid-002',
      productId: 'product-uuid-001',
      sku: 'SKU-002',
      size: 'L',
      color: 'Blue',
      price: null,
      stock: 1,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      product: makeProduct(),
    } as never)
    mockProductRepo.findProductById.mockResolvedValue(makeProduct({
      variants: [
        {
          id: 'variant-uuid-001',
          productId: 'product-uuid-001',
          sku: 'SKU-001',
          size: 'M',
          color: 'Black',
          price: null,
          stock: 2,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        {
          id: 'variant-uuid-002',
          productId: 'product-uuid-001',
          sku: 'SKU-002',
          size: 'L',
          color: 'Blue',
          price: null,
          stock: 1,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ],
    }) as never)

    await expect(
      updateVariant(mockUser, 'variant-uuid-002', {
        size: 'M',
        color: 'black',
      }),
    ).rejects.toThrow(InvalidVariantConfigurationError)

    expect(mockProductRepo.updateVariant).not.toHaveBeenCalled()
  })

  it('returns a safe domain error when a variant SKU hits a unique constraint during write', async () => {
    mockProductRepo.findProductById.mockResolvedValue(makeProduct() as never)
    mockProductRepo.createVariant.mockRejectedValue({ code: 'P2002' })

    await expect(
      addVariant(mockUser, 'product-uuid-001', {
        size: 'M',
        stock: 1,
      }),
    ).rejects.toThrow(InvalidSkuError)
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
