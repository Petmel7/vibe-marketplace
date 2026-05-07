import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('@/features/profile/profile.repository')

import * as repo from '@/features/profile/profile.repository'
import { getMyProfile, updateMyProfile } from '@/features/profile/profile.service'
import { ProfileNotFoundError } from '@/lib/errors/profile'
import type { SessionUser } from '@/features/auth/auth.dto'
import type { UserProfileDto } from '@/features/profile/profile.dto'

const mockRepo = vi.mocked(repo)

const mockUser: SessionUser = {
  id: 'user-uuid-001',
  email: 'test@example.com',
  roles: [],
}

function makeProfile(overrides: Partial<UserProfileDto> = {}): UserProfileDto {
  return {
    id: 'profile-uuid-001',
    userId: mockUser.id,
    displayName: 'Test User',
    avatarUrl: null,
    bio: null,
    phoneNumber: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }
}

beforeEach(() => vi.clearAllMocks())

describe('getMyProfile', () => {
  it('returns the profile DTO when profile exists', async () => {
    const profile = makeProfile()
    mockRepo.findProfileByUserId.mockResolvedValue(profile)

    const result = await getMyProfile(mockUser)

    expect(result).toEqual(profile)
    expect(mockRepo.findProfileByUserId).toHaveBeenCalledWith(mockUser.id)
  })

  it('throws ProfileNotFoundError when profile does not exist', async () => {
    mockRepo.findProfileByUserId.mockResolvedValue(null)

    await expect(getMyProfile(mockUser)).rejects.toThrow(ProfileNotFoundError)
  })
})

describe('updateMyProfile', () => {
  it('returns the updated profile DTO when profile exists', async () => {
    const original = makeProfile()
    const updated = makeProfile({ displayName: 'Updated Name' })
    mockRepo.findProfileByUserId.mockResolvedValue(original)
    mockRepo.updateProfile.mockResolvedValue(updated)

    const result = await updateMyProfile(mockUser, { displayName: 'Updated Name' })

    expect(result.displayName).toBe('Updated Name')
    expect(mockRepo.updateProfile).toHaveBeenCalledWith(mockUser.id, { displayName: 'Updated Name' })
  })
})
