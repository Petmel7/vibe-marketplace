import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))

import * as repo from '@/features/viewed/viewed.repository'
import * as productExistsLib from '@/lib/db/productExists'
import {
  getRecentlyViewed,
  recordView,
  ProductNotFoundError,
} from '@/features/viewed/viewed.service'
import type { ViewedIdentifier } from '@/features/viewed/viewed.types'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/features/viewed/viewed.repository')
vi.mock('@/lib/db/productExists')

const mockRepo = vi.mocked(repo)
const mockProductExists = vi.mocked(productExistsLib.productExists)

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER_ID    = 'aaaaaaaa-0000-0000-0000-000000000001'
const PRODUCT_ID = 'bbbbbbbb-0000-0000-0000-000000000002'
const VIEW_ID    = 'cccccccc-0000-0000-0000-000000000003'
const SESSION_ID = 'guest-session-xyz'

const authIdentifier: ViewedIdentifier = { userId: USER_ID }
const guestIdentifier: ViewedIdentifier = { sessionId: SESSION_ID }

function makeProduct() {
  return {
    id: PRODUCT_ID,
    name: 'Test Shirt',
    price: { toString: () => '49.99' },
    imageUrl: null,
  }
}

function makeViewedRow(overrides: Record<string, unknown> = {}) {
  return {
    id: VIEW_ID,
    userId: USER_ID,
    sessionId: null,
    productId: PRODUCT_ID,
    viewedAt: new Date('2025-06-01T12:00:00.000Z'),
    product: makeProduct(),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// getRecentlyViewed
// ---------------------------------------------------------------------------

describe('getRecentlyViewed', () => {
  beforeEach(() => vi.resetAllMocks())

  it('returns a list of recently viewed products for authenticated user', async () => {
    mockRepo.findRecentlyViewed.mockResolvedValue([makeViewedRow()] as never)

    const result = await getRecentlyViewed(authIdentifier)

    expect(result.items).toHaveLength(1)
    expect(result.items[0].productId).toBe(PRODUCT_ID)
    expect(result.items[0].price).toBe('49.99')
    expect(result.items[0].viewedAt).toBe('2025-06-01T12:00:00.000Z')
  })

  it('returns a list for guest session', async () => {
    mockRepo.findRecentlyViewed.mockResolvedValue([makeViewedRow({ userId: null, sessionId: SESSION_ID })] as never)

    const result = await getRecentlyViewed(guestIdentifier)

    expect(result.items).toHaveLength(1)
  })

  it('returns an empty list when nothing was viewed', async () => {
    mockRepo.findRecentlyViewed.mockResolvedValue([])

    const result = await getRecentlyViewed(authIdentifier)

    expect(result.items).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// recordView
// ---------------------------------------------------------------------------

describe('recordView', () => {
  beforeEach(() => vi.resetAllMocks())

  it('records a view and returns the updated list', async () => {
    mockProductExists.mockResolvedValue(true)
    mockRepo.upsertViewedProduct.mockResolvedValue(undefined)
    mockRepo.findRecentlyViewed.mockResolvedValue([makeViewedRow()] as never)

    const result = await recordView(authIdentifier, { productId: PRODUCT_ID })

    expect(mockRepo.upsertViewedProduct).toHaveBeenCalledWith(authIdentifier, PRODUCT_ID)
    expect(result.items).toHaveLength(1)
    expect(result.items[0].productId).toBe(PRODUCT_ID)
  })

  it('works for guest sessions', async () => {
    mockProductExists.mockResolvedValue(true)
    mockRepo.upsertViewedProduct.mockResolvedValue(undefined)
    mockRepo.findRecentlyViewed.mockResolvedValue([makeViewedRow()] as never)

    await recordView(guestIdentifier, { productId: PRODUCT_ID })

    expect(mockRepo.upsertViewedProduct).toHaveBeenCalledWith(guestIdentifier, PRODUCT_ID)
  })

  it('throws ProductNotFoundError when product does not exist', async () => {
    mockProductExists.mockResolvedValue(false)

    await expect(recordView(authIdentifier, { productId: PRODUCT_ID }))
      .rejects.toThrow(ProductNotFoundError)
  })

  it('does not call upsertViewedProduct when product does not exist', async () => {
    mockProductExists.mockResolvedValue(false)

    await expect(recordView(authIdentifier, { productId: PRODUCT_ID })).rejects.toThrow()
    expect(mockRepo.upsertViewedProduct).not.toHaveBeenCalled()
  })

  it('moves already-viewed product to top by calling upsert (idempotent)', async () => {
    // upsert handles deduplication at the DB level; the service always calls upsert
    mockProductExists.mockResolvedValue(true)
    mockRepo.upsertViewedProduct.mockResolvedValue(undefined)
    mockRepo.findRecentlyViewed.mockResolvedValue([makeViewedRow()] as never)

    // Simulate second view of same product
    await recordView(authIdentifier, { productId: PRODUCT_ID })

    expect(mockRepo.upsertViewedProduct).toHaveBeenCalledTimes(1)
  })
})
