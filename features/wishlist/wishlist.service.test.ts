import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))

import * as repo from '@/features/wishlist/wishlist.repository'
import * as productExistsLib from '@/lib/db/productExists'
import * as productMetricsJobs from '@/features/products/product-metrics.jobs'
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  ProductNotFoundError,
} from '@/features/wishlist/wishlist.service'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/features/wishlist/wishlist.repository')
vi.mock('@/lib/db/productExists')
vi.mock('@/features/products/product-metrics.jobs', () => ({
  scheduleProductMetricsRecalculation: vi.fn(),
}))

const mockRepo = vi.mocked(repo)
const mockProductExists = vi.mocked(productExistsLib.productExists)
const mockProductMetricsJobs = vi.mocked(productMetricsJobs)

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER_ID    = 'aaaaaaaa-0000-0000-0000-000000000001'
const WISHLIST_ID = 'bbbbbbbb-0000-0000-0000-000000000002'
const PRODUCT_ID  = 'cccccccc-0000-0000-0000-000000000003'
const ITEM_ID     = 'dddddddd-0000-0000-0000-000000000004'

function makeProduct() {
  return {
    id: PRODUCT_ID,
    name: 'Test Jacket',
    price: { toString: () => '99.99' },
    imageUrl: 'https://example.com/img.jpg',
    isActive: true,
    storeId: 'store-01',
    description: null,
    sku: null,
    isHit: false,
    isNew: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

function makeWishlistItem() {
  return {
    id: ITEM_ID,
    wishlistId: WISHLIST_ID,
    productId: PRODUCT_ID,
    createdAt: new Date(),
    product: makeProduct(),
  }
}

function makeWishlist(items = [makeWishlistItem()]) {
  return {
    id: WISHLIST_ID,
    userId: USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    items,
  }
}

// ---------------------------------------------------------------------------
// getWishlist
// ---------------------------------------------------------------------------

describe('getWishlist', () => {
  beforeEach(() => vi.resetAllMocks())

  it('returns wishlist DTO for the user', async () => {
    mockRepo.findWishlistByUserId.mockResolvedValue(makeWishlist() as never)

    const result = await getWishlist(USER_ID)

    expect(result.id).toBe(WISHLIST_ID)
    expect(result.userId).toBe(USER_ID)
    expect(result.items).toHaveLength(1)
    expect(result.items[0].productId).toBe(PRODUCT_ID)
    expect(result.items[0].price).toBe('99.99')
  })

  it('returns an empty wishlist when no items exist', async () => {
    mockRepo.findWishlistByUserId.mockResolvedValue(makeWishlist([]) as never)

    const result = await getWishlist(USER_ID)

    expect(result.items).toHaveLength(0)
  })

  it('creates an empty wishlist lazily when the user has none yet', async () => {
    mockRepo.findWishlistByUserId.mockResolvedValue(null)
    mockRepo.createWishlist.mockResolvedValue({
      id: WISHLIST_ID,
      userId: USER_ID,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never)

    const result = await getWishlist(USER_ID)

    expect(mockRepo.createWishlist).toHaveBeenCalledWith(USER_ID)
    expect(result).toEqual({
      id: WISHLIST_ID,
      userId: USER_ID,
      items: [],
    })
  })
})

// ---------------------------------------------------------------------------
// addToWishlist
// ---------------------------------------------------------------------------

describe('addToWishlist', () => {
  beforeEach(() => vi.resetAllMocks())

  it('adds a product and returns the updated wishlist', async () => {
    mockProductExists.mockResolvedValue(true)
    mockRepo.findWishlistByUserId.mockResolvedValue(makeWishlist([]) as never)
    mockRepo.findWishlistItem.mockResolvedValue(null)
    mockRepo.addWishlistItem.mockResolvedValue(makeWishlist() as never)

    const result = await addToWishlist(USER_ID, PRODUCT_ID)

    expect(mockRepo.addWishlistItem).toHaveBeenCalledWith(WISHLIST_ID, PRODUCT_ID)
    expect(mockProductMetricsJobs.scheduleProductMetricsRecalculation).toHaveBeenCalledWith({
      reason: 'wishlist-added',
      dedupeKey: `product-metrics:wishlist-added:${ITEM_ID}`,
    })
    expect(result.items).toHaveLength(1)
  })

  it('throws ProductNotFoundError when product does not exist', async () => {
    mockProductExists.mockResolvedValue(false)

    await expect(addToWishlist(USER_ID, PRODUCT_ID))
      .rejects.toThrow(ProductNotFoundError)
  })

  it('returns the current wishlist when product is already in wishlist', async () => {
    mockProductExists.mockResolvedValue(true)
    const existingWishlist = makeWishlist()

    mockRepo.findWishlistByUserId.mockResolvedValue(existingWishlist as never)
    mockRepo.findWishlistItem.mockResolvedValue(makeWishlistItem() as never)

    const result = await addToWishlist(USER_ID, PRODUCT_ID)

    expect(result.items).toHaveLength(1)
    expect(result.items[0].productId).toBe(PRODUCT_ID)
  })

  it('does not call addWishlistItem when product is already present', async () => {
    mockProductExists.mockResolvedValue(true)
    mockRepo.findWishlistByUserId.mockResolvedValue(makeWishlist() as never)
    mockRepo.findWishlistItem.mockResolvedValue(makeWishlistItem() as never)

    await expect(addToWishlist(USER_ID, PRODUCT_ID)).resolves.toMatchObject({
      id: WISHLIST_ID,
    })
    expect(mockRepo.addWishlistItem).not.toHaveBeenCalled()
    expect(mockProductMetricsJobs.scheduleProductMetricsRecalculation).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// removeFromWishlist
// ---------------------------------------------------------------------------

describe('removeFromWishlist', () => {
  beforeEach(() => vi.resetAllMocks())

  it('removes a product and returns the updated wishlist', async () => {
    mockRepo.findWishlistByUserId.mockResolvedValue(makeWishlist() as never)
    mockRepo.findWishlistItem.mockResolvedValue(makeWishlistItem() as never)
    mockRepo.removeWishlistItem.mockResolvedValue(makeWishlist([]) as never)

    const result = await removeFromWishlist(USER_ID, PRODUCT_ID)

    expect(mockRepo.removeWishlistItem).toHaveBeenCalledWith(WISHLIST_ID, PRODUCT_ID)
    expect(mockProductMetricsJobs.scheduleProductMetricsRecalculation).toHaveBeenCalledWith({
      reason: 'wishlist-removed',
      dedupeKey: `product-metrics:wishlist-removed:${ITEM_ID}`,
    })
    expect(result.items).toHaveLength(0)
  })

  it('returns the current wishlist when product is not in wishlist', async () => {
    mockRepo.findWishlistByUserId.mockResolvedValue(makeWishlist([]) as never)
    mockRepo.findWishlistItem.mockResolvedValue(null)

    const result = await removeFromWishlist(USER_ID, PRODUCT_ID)

    expect(result.items).toHaveLength(0)
  })

  it('does not call removeWishlistItem when item is not present', async () => {
    mockRepo.findWishlistByUserId.mockResolvedValue(makeWishlist([]) as never)
    mockRepo.findWishlistItem.mockResolvedValue(null)

    await expect(removeFromWishlist(USER_ID, PRODUCT_ID)).resolves.toMatchObject({
      id: WISHLIST_ID,
    })
    expect(mockRepo.removeWishlistItem).not.toHaveBeenCalled()
    expect(mockProductMetricsJobs.scheduleProductMetricsRecalculation).not.toHaveBeenCalled()
  })
})
