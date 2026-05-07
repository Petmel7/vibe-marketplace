import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('@/features/seller/seller.repository')

import * as repo from '@/features/seller/seller.repository'
import { initiateSelling, getMySellerProfile } from '@/features/seller/seller.service'
import {
  SellerAlreadyOnboardedError,
  SellerProfileNotFoundError,
} from '@/lib/errors/profile'
import type { SessionUser } from '@/features/auth/auth.dto'
import type { SellerProfileDto } from '@/features/seller/seller.dto'

const mockRepo = vi.mocked(repo)

const mockUser: SessionUser = {
  id: 'user-uuid-001',
  email: 'seller@example.com',
  roles: [],
}

function makeSellerProfile(overrides: Partial<SellerProfileDto> = {}): SellerProfileDto {
  return {
    id: 'seller-uuid-001',
    userId: mockUser.id,
    verificationStatus: 'PENDING',
    businessName: 'Test Shop',
    taxId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }
}

beforeEach(() => vi.clearAllMocks())

describe('initiateSelling', () => {
  it('creates a seller profile and assigns the SELLER role when no profile exists', async () => {
    const created = makeSellerProfile()
    mockRepo.findSellerByUserId.mockResolvedValue(null)
    mockRepo.createSellerProfile.mockResolvedValue(created)
    mockRepo.assignSellerRole.mockResolvedValue(undefined)

    const result = await initiateSelling(mockUser, { businessName: 'Test Shop' })

    expect(mockRepo.createSellerProfile).toHaveBeenCalledWith(mockUser.id, {
      businessName: 'Test Shop',
    })
    expect(mockRepo.assignSellerRole).toHaveBeenCalledWith(mockUser.id)
    expect(result).toEqual(created)
  })

  it('throws SellerAlreadyOnboardedError when a seller profile already exists', async () => {
    mockRepo.findSellerByUserId.mockResolvedValue(makeSellerProfile())

    await expect(
      initiateSelling(mockUser, { businessName: 'Test Shop' }),
    ).rejects.toThrow(SellerAlreadyOnboardedError)

    expect(mockRepo.createSellerProfile).not.toHaveBeenCalled()
    expect(mockRepo.assignSellerRole).not.toHaveBeenCalled()
  })
})

describe('getMySellerProfile', () => {
  it('throws SellerProfileNotFoundError when no seller profile exists', async () => {
    mockRepo.findSellerByUserId.mockResolvedValue(null)

    await expect(getMySellerProfile(mockUser)).rejects.toThrow(SellerProfileNotFoundError)
  })
})
