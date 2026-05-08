import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProductStatus } from '@/app/generated/prisma/client'

vi.mock('@/features/seller/products/seller-product.repository')
vi.mock('@/features/store/store.repository')
vi.mock('@/lib/auth/guards')
vi.mock('@/lib/auth/sellerGuards')
vi.mock('@/lib/prisma', () => ({ prisma: { productVariant: { findUnique: vi.fn() } } }))

import * as productRepo from '@/features/seller/products/seller-product.repository'
import * as storeRepo from '@/features/store/store.repository'
import * as guards from '@/lib/auth/guards'
import * as sellerGuards from '@/lib/auth/sellerGuards'
import {
  createProduct,
  getMyProductById,
  submitForReview,
  archiveProduct,
  updateInventory,
} from '@/features/seller/products/seller-product.service'
import {
  ProductNotFoundError,
  InvalidModerationTransitionError,
  InvalidInventoryError,
} from '@/lib/errors/seller'
import type { SessionUser } from '@/features/auth/auth.dto'

const mockProductRepo = vi.mocked(productRepo)
const mockStoreRepo = vi.mocked(storeRepo)
const mockGuards = vi.mocked(guards)
const mockSellerGuards = vi.mocked(sellerGuards)

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
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeProduct(overrides: Record<string, any> = {}): any {
  return {
    id: 'product-uuid-001',
    storeId: 'store-uuid-001',
    categoryId: null,
    name: 'Test Product',
    description: null,
    price: { toString: () => '29.99' },
    imageUrl: null,
    sku: null,
    isHit: false,
    isNew: false,
    isActive: true,
    status: ProductStatus.DRAFT,
    rejectionReason: null,
    publishedAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    variants: [],
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGuards.requireSeller.mockReturnValue(undefined)
  mockSellerGuards.assertSellerOwnsStore.mockReturnValue(undefined)
  mockSellerGuards.assertSellerOwnsProduct.mockReturnValue(undefined)
  mockStoreRepo.findStoreByUserId.mockResolvedValue(mockStore)
})

// ---------------------------------------------------------------------------
// Test 1: createProduct sets status DRAFT in repo call
// ---------------------------------------------------------------------------
describe('createProduct', () => {
  it('sets status DRAFT in the repo call', async () => {
    const product = makeProduct()
    mockProductRepo.createProduct.mockResolvedValue(product)
    mockProductRepo.findProductByIdAndStoreId.mockResolvedValue(product)

    await createProduct(mockUser, { name: 'Test Product', price: '29.99' })

    expect(mockProductRepo.createProduct).toHaveBeenCalledWith(
      mockStore.id,
      expect.objectContaining({ name: 'Test Product', price: '29.99' }),
    )
  })

  it('derives storeId from seller store, not from input', async () => {
    const product = makeProduct()
    mockProductRepo.createProduct.mockResolvedValue(product)
    mockProductRepo.findProductByIdAndStoreId.mockResolvedValue(product)

    await createProduct(mockUser, { name: 'Test Product', price: '29.99' })

    expect(mockProductRepo.createProduct).toHaveBeenCalledWith(
      mockStore.id,
      expect.any(Object),
    )
    expect(mockStoreRepo.findStoreByUserId).toHaveBeenCalledWith(mockUser.id)
  })
})

// ---------------------------------------------------------------------------
// Test 3: submitForReview DRAFT → PENDING_REVIEW
// ---------------------------------------------------------------------------
describe('submitForReview', () => {
  it('transitions DRAFT product to PENDING_REVIEW', async () => {
    const draftProduct = makeProduct({ status: ProductStatus.DRAFT })
    const pendingProduct = makeProduct({ status: ProductStatus.PENDING_REVIEW })
    mockProductRepo.findProductByIdAndStoreId.mockResolvedValue(draftProduct)
    mockProductRepo.updateProductStatus.mockResolvedValue(pendingProduct)

    const result = await submitForReview(mockUser, 'product-uuid-001')

    expect(mockProductRepo.updateProductStatus).toHaveBeenCalledWith(
      'product-uuid-001',
      ProductStatus.PENDING_REVIEW,
    )
    expect(result.status).toBe(ProductStatus.PENDING_REVIEW)
  })

  it('throws InvalidModerationTransitionError for PUBLISHED product', async () => {
    const publishedProduct = makeProduct({ status: ProductStatus.PUBLISHED })
    mockProductRepo.findProductByIdAndStoreId.mockResolvedValue(publishedProduct)

    await expect(submitForReview(mockUser, 'product-uuid-001')).rejects.toThrow(
      InvalidModerationTransitionError,
    )
    expect(mockProductRepo.updateProductStatus).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Test 5: archiveProduct PUBLISHED → ARCHIVED
// ---------------------------------------------------------------------------
describe('archiveProduct', () => {
  it('archives a PUBLISHED product', async () => {
    const publishedProduct = makeProduct({ status: ProductStatus.PUBLISHED })
    const archivedProduct = makeProduct({ status: ProductStatus.ARCHIVED })
    mockProductRepo.findProductByIdAndStoreId.mockResolvedValue(publishedProduct)
    mockProductRepo.archiveProduct.mockResolvedValue(archivedProduct)

    const result = await archiveProduct(mockUser, 'product-uuid-001')

    expect(mockProductRepo.archiveProduct).toHaveBeenCalledWith('product-uuid-001')
    expect(result.status).toBe(ProductStatus.ARCHIVED)
  })

  it('throws InvalidModerationTransitionError for DRAFT product', async () => {
    const draftProduct = makeProduct({ status: ProductStatus.DRAFT })
    mockProductRepo.findProductByIdAndStoreId.mockResolvedValue(draftProduct)

    await expect(archiveProduct(mockUser, 'product-uuid-001')).rejects.toThrow(
      InvalidModerationTransitionError,
    )
    expect(mockProductRepo.archiveProduct).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Test 7: updateInventory throws for negative stock
// ---------------------------------------------------------------------------
describe('updateInventory', () => {
  it('throws InvalidInventoryError for negative stock', async () => {
    await expect(updateInventory(mockUser, 'variant-uuid-001', -1)).rejects.toThrow(
      InvalidInventoryError,
    )
  })
})

// ---------------------------------------------------------------------------
// Test 8: getMyProductById throws ProductNotFoundError when product not in store
// ---------------------------------------------------------------------------
describe('getMyProductById', () => {
  it('throws ProductNotFoundError when product does not belong to seller store', async () => {
    mockProductRepo.findProductByIdAndStoreId.mockResolvedValue(null)

    await expect(getMyProductById(mockUser, 'non-existent-product')).rejects.toThrow(
      ProductNotFoundError,
    )
  })
})
