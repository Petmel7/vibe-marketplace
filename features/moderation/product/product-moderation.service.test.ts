import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('@/features/moderation/product/product-moderation.repository')
vi.mock('@/lib/auth/adminGuards')
vi.mock('@/features/products/product-badge.service', () => ({
  syncSystemNewBadgeForProduct: vi.fn(),
}))
vi.mock('@/features/email/events/email.events', () => ({
  emitProductApprovedEmailEvent: vi.fn(),
  emitProductRejectedEmailEvent: vi.fn(),
}))
vi.mock('@/features/notifications/events/notification.events', () => ({
  emitProductApprovedNotificationEvent: vi.fn(),
  emitProductRejectedNotificationEvent: vi.fn(),
}))
vi.mock('@/features/risk/risk.service', () => ({
  recordProductRejectedRiskSignal: vi.fn(),
}))

import * as repo from '@/features/moderation/product/product-moderation.repository'
import * as adminGuards from '@/lib/auth/adminGuards'
import * as productBadgeService from '@/features/products/product-badge.service'
import {
  emitProductApprovedEmailEvent,
  emitProductRejectedEmailEvent,
} from '@/features/email/events/email.events'
import {
  emitProductApprovedNotificationEvent,
  emitProductRejectedNotificationEvent,
} from '@/features/notifications/events/notification.events'
import * as riskService from '@/features/risk/risk.service'
import {
  getPendingProductQueue,
  approveProduct,
  rejectProduct,
  archiveProduct,
  restoreProduct,
} from '@/features/moderation/product/product-moderation.service'
import { InvalidModerationTransitionError } from '@/lib/errors/admin'
import { ProductNotFoundError } from '@/lib/errors/seller'
import type { SessionUser } from '@/features/auth/auth.dto'
import type { Product, ProductStatus, Store } from '@/app/generated/prisma/client'

const mockRepo = vi.mocked(repo)
const mockGuards = vi.mocked(adminGuards)
const mockBadgeService = vi.mocked(productBadgeService)
const mockEmitProductApprovedEmailEvent = vi.mocked(emitProductApprovedEmailEvent)
const mockEmitProductRejectedEmailEvent = vi.mocked(emitProductRejectedEmailEvent)
const mockEmitProductApprovedNotificationEvent = vi.mocked(emitProductApprovedNotificationEvent)
const mockEmitProductRejectedNotificationEvent = vi.mocked(emitProductRejectedNotificationEvent)
const mockRiskService = vi.mocked(riskService)

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ADMIN_ID = 'admin-uuid-0001'
const PRODUCT_ID = 'product-uuid-0001'
const STORE_ID = 'store-uuid-0001'

const mockAdmin: SessionUser = { id: ADMIN_ID, email: 'admin@test.com', roles: [] }

const mockStore: Store = {
  id: STORE_ID,
  ownerId: 'user-uuid-seller-001',
  name: 'Test Store',
  slug: 'test-store',
  description: null,
  logoUrl: null,
  bannerUrl: null,
  isActive: true,
  isPrimary: false,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

function makeProduct(overrides: Partial<Product & { store: Store }> = {}): Product & {
  store: Store
} {
  return {
    id: PRODUCT_ID,
    storeId: STORE_ID,
    categoryId: null,
    name: 'Test Product',
    description: null,
    price: { toString: () => '99.99' } as unknown as Product['price'],
    imageUrl: null,
    isActive: true,
    sku: null,
    isHit: false,
    isNew: false,
    status: 'PENDING_REVIEW' as ProductStatus,
    rejectionReason: null,
    publishedAt: null,
    moderationReason: null,
    moderatedAt: null,
    moderatedBy: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    store: mockStore,
    ...overrides,
  }
}

function makeUpdatedProduct(overrides: Partial<Product & { store: Store }> = {}) {
  return makeProduct({ moderatedAt: new Date(), moderatedBy: ADMIN_ID, ...overrides })
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.resetAllMocks()
  mockGuards.assertAdminAccess.mockReturnValue(undefined)
  mockGuards.assertNotSelfModeration.mockReturnValue(undefined)
  mockEmitProductApprovedEmailEvent.mockResolvedValue(null)
  mockEmitProductRejectedEmailEvent.mockResolvedValue(null)
  mockEmitProductApprovedNotificationEvent.mockResolvedValue({} as never)
  mockEmitProductRejectedNotificationEvent.mockResolvedValue({} as never)
  mockRiskService.recordProductRejectedRiskSignal.mockResolvedValue(null as never)
})

describe('getPendingProductQueue', () => {
  it('returns only products already prepared by the PENDING_REVIEW repository query', async () => {
    const pendingProduct = makeProduct({ status: 'PENDING_REVIEW' as ProductStatus })
    mockRepo.findPendingProductApprovals.mockResolvedValue({
      items: [pendingProduct],
      total: 1,
    })

    const result = await getPendingProductQueue(mockAdmin, { page: 1, limit: 20 })

    expect(mockRepo.findPendingProductApprovals).toHaveBeenCalledWith({ page: 1, limit: 20 })
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.status).toBe('PENDING_REVIEW')
  })
})

// ---------------------------------------------------------------------------
// approveProduct
// ---------------------------------------------------------------------------

describe('approveProduct', () => {
  it('PENDING_REVIEW → PUBLISHED succeeds and returns ProductModerationDto', async () => {
    const product = makeProduct({ status: 'PENDING_REVIEW' as ProductStatus })
    const publishedAt = new Date('2026-05-22T08:00:00.000Z')
    const updated = makeUpdatedProduct({
      status: 'PUBLISHED' as ProductStatus,
      publishedAt,
    })

    mockRepo.findProductByIdWithStore.mockResolvedValue(product)
    mockRepo.updateProductModerationStatus.mockResolvedValue(updated)

    const result = await approveProduct(mockAdmin, PRODUCT_ID)

    expect(mockGuards.assertAdminAccess).toHaveBeenCalledWith(mockAdmin)
    expect(mockRepo.updateProductModerationStatus).toHaveBeenCalledWith(
      PRODUCT_ID,
      'PUBLISHED',
      ADMIN_ID,
    )
    expect(result.id).toBe(PRODUCT_ID)
    expect(result.status).toBe('PUBLISHED')
    expect(result.publishedAt).toBe(publishedAt)
    expect(result.storeName).toBe('Test Store')
    expect(result.moderatedBy).toBe(ADMIN_ID)
    expect(mockBadgeService.syncSystemNewBadgeForProduct).toHaveBeenCalledWith(updated)
    expect(mockEmitProductApprovedNotificationEvent).toHaveBeenCalledWith({ productId: PRODUCT_ID })
  })

  it('throws InvalidModerationTransitionError on wrong state', async () => {
    const product = makeProduct({ status: 'DRAFT' as ProductStatus })
    mockRepo.findProductByIdWithStore.mockResolvedValue(product)

    await expect(approveProduct(mockAdmin, PRODUCT_ID)).rejects.toThrow(
      InvalidModerationTransitionError,
    )
    expect(mockRepo.updateProductModerationStatus).not.toHaveBeenCalled()
  })

  it('throws ProductNotFoundError when product does not exist', async () => {
    mockRepo.findProductByIdWithStore.mockResolvedValue(null)

    await expect(approveProduct(mockAdmin, PRODUCT_ID)).rejects.toThrow(ProductNotFoundError)
  })
})

// ---------------------------------------------------------------------------
// rejectProduct
// ---------------------------------------------------------------------------

describe('rejectProduct', () => {
  it('PENDING_REVIEW → REJECTED with reason succeeds', async () => {
    const product = makeProduct({ status: 'PENDING_REVIEW' as ProductStatus })
    const updated = makeUpdatedProduct({
      status: 'REJECTED' as ProductStatus,
      moderationReason: 'Violates content policy',
      rejectionReason: 'Violates content policy',
    })

    mockRepo.findProductByIdWithStore.mockResolvedValue(product)
    mockRepo.updateProductModerationStatus.mockResolvedValue(updated)

    const result = await rejectProduct(mockAdmin, PRODUCT_ID, 'Violates content policy')

    expect(mockRepo.updateProductModerationStatus).toHaveBeenCalledWith(
      PRODUCT_ID,
      'REJECTED',
      ADMIN_ID,
      'Violates content policy',
    )
    expect(result.status).toBe('REJECTED')
    expect(result.moderationReason).toBe('Violates content policy')
    expect(result.rejectionReason).toBe('Violates content policy')
    expect(mockBadgeService.syncSystemNewBadgeForProduct).toHaveBeenCalledWith(updated)
    expect(mockEmitProductRejectedNotificationEvent).toHaveBeenCalledWith({
      productId: PRODUCT_ID,
      reason: 'Violates content policy',
    })
    expect(mockRiskService.recordProductRejectedRiskSignal).toHaveBeenCalledWith({
      productId: PRODUCT_ID,
      ownerUserId: 'user-uuid-seller-001',
      storeId: STORE_ID,
      reason: 'Violates content policy',
    })
  })

  it('throws InvalidModerationTransitionError when product is not PENDING_REVIEW', async () => {
    const product = makeProduct({ status: 'PUBLISHED' as ProductStatus })
    mockRepo.findProductByIdWithStore.mockResolvedValue(product)

    await expect(rejectProduct(mockAdmin, PRODUCT_ID, 'Some reason')).rejects.toThrow(
      InvalidModerationTransitionError,
    )
    expect(mockRepo.updateProductModerationStatus).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// archiveProduct
// ---------------------------------------------------------------------------

describe('archiveProduct', () => {
  it('PUBLISHED → ARCHIVED succeeds', async () => {
    const product = makeProduct({ status: 'PUBLISHED' as ProductStatus })
    const updated = makeUpdatedProduct({ status: 'ARCHIVED' as ProductStatus })

    mockRepo.findProductByIdWithStore.mockResolvedValue(product)
    mockRepo.updateProductModerationStatus.mockResolvedValue(updated)

    const result = await archiveProduct(mockAdmin, PRODUCT_ID)

    expect(mockRepo.updateProductModerationStatus).toHaveBeenCalledWith(
      PRODUCT_ID,
      'ARCHIVED',
      ADMIN_ID,
      undefined,
    )
    expect(result.status).toBe('ARCHIVED')
  })

  it('REJECTED → ARCHIVED succeeds', async () => {
    const product = makeProduct({ status: 'REJECTED' as ProductStatus })
    const updated = makeUpdatedProduct({ status: 'ARCHIVED' as ProductStatus })

    mockRepo.findProductByIdWithStore.mockResolvedValue(product)
    mockRepo.updateProductModerationStatus.mockResolvedValue(updated)

    const result = await archiveProduct(mockAdmin, PRODUCT_ID, 'Archiving rejected product')

    expect(result.status).toBe('ARCHIVED')
  })

  it('throws InvalidModerationTransitionError on invalid source state', async () => {
    const product = makeProduct({ status: 'PENDING_REVIEW' as ProductStatus })
    mockRepo.findProductByIdWithStore.mockResolvedValue(product)

    await expect(archiveProduct(mockAdmin, PRODUCT_ID)).rejects.toThrow(
      InvalidModerationTransitionError,
    )
    expect(mockRepo.updateProductModerationStatus).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// restoreProduct
// ---------------------------------------------------------------------------

describe('restoreProduct', () => {
  it('ARCHIVED → DRAFT succeeds', async () => {
    const product = makeProduct({ status: 'ARCHIVED' as ProductStatus })
    const updated = makeUpdatedProduct({ status: 'DRAFT' as ProductStatus })

    mockRepo.findProductByIdWithStore.mockResolvedValue(product)
    mockRepo.updateProductModerationStatus.mockResolvedValue(updated)

    const result = await restoreProduct(mockAdmin, PRODUCT_ID)

    expect(mockRepo.updateProductModerationStatus).toHaveBeenCalledWith(
      PRODUCT_ID,
      'DRAFT',
      ADMIN_ID,
    )
    expect(result.status).toBe('DRAFT')
  })

  it('throws InvalidModerationTransitionError when product is not ARCHIVED', async () => {
    const product = makeProduct({ status: 'PUBLISHED' as ProductStatus })
    mockRepo.findProductByIdWithStore.mockResolvedValue(product)

    await expect(restoreProduct(mockAdmin, PRODUCT_ID)).rejects.toThrow(
      InvalidModerationTransitionError,
    )
    expect(mockRepo.updateProductModerationStatus).not.toHaveBeenCalled()
  })
})
