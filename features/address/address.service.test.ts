import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('@/features/address/address.repository')

import * as repo from '@/features/address/address.repository'
import {
  addAddress,
  updateMyAddress,
  deleteMyAddress,
  setDefaultAddress,
} from '@/features/address/address.service'
import { AddressOwnershipError, AddressNotFoundError } from '@/lib/errors/profile'
import type { SessionUser } from '@/features/auth/auth.dto'
import type { ShippingAddressDto, CreateAddressDto } from '@/features/address/address.dto'

const mockRepo = vi.mocked(repo)

const mockUser: SessionUser = {
  id: 'user-uuid-001',
  email: 'test@example.com',
  roles: [],
}

const otherUserId = 'user-uuid-999'

function makeAddress(overrides: Partial<ShippingAddressDto> = {}): ShippingAddressDto {
  return {
    id: 'addr-uuid-001',
    userId: mockUser.id,
    label: 'Home',
    fullName: 'John Doe',
    phone: '+1234567890',
    country: 'UA',
    city: 'Kyiv',
    region: null,
    street: 'Main St',
    building: '1',
    apartment: null,
    zipCode: '01001',
    isDefault: false,
    createdAt: new Date('2024-01-01'),
    ...overrides,
  }
}

const createInput: CreateAddressDto = {
  fullName: 'John Doe',
  phone: '+1234567890',
  country: 'UA',
  city: 'Kyiv',
  street: 'Main St',
  building: '1',
}

beforeEach(() => vi.clearAllMocks())

describe('addAddress', () => {
  it('calls createAddress with the user id and returns the DTO', async () => {
    const created = makeAddress()
    mockRepo.createAddress.mockResolvedValue(created)

    const result = await addAddress(mockUser, createInput)

    expect(mockRepo.createAddress).toHaveBeenCalledWith(mockUser.id, createInput)
    expect(result).toEqual(created)
  })
})

describe('updateMyAddress', () => {
  it('throws AddressOwnershipError when address belongs to a different user', async () => {
    const address = makeAddress({ userId: otherUserId })
    mockRepo.findAddressById.mockResolvedValue(address)

    await expect(updateMyAddress(mockUser, address.id, { city: 'Lviv' })).rejects.toThrow(
      AddressOwnershipError,
    )
    expect(mockRepo.updateAddress).not.toHaveBeenCalled()
  })

  it('throws AddressNotFoundError when address does not exist', async () => {
    mockRepo.findAddressById.mockResolvedValue(null)

    await expect(updateMyAddress(mockUser, 'nonexistent-id', { city: 'Lviv' })).rejects.toThrow(
      AddressNotFoundError,
    )
  })
})

describe('deleteMyAddress', () => {
  it('throws AddressOwnershipError when address belongs to a different user', async () => {
    const address = makeAddress({ userId: otherUserId })
    mockRepo.findAddressById.mockResolvedValue(address)

    await expect(deleteMyAddress(mockUser, address.id)).rejects.toThrow(AddressOwnershipError)
    expect(mockRepo.deleteAddress).not.toHaveBeenCalled()
  })
})

describe('setDefaultAddress', () => {
  it('calls setDefaultAddress repository function when ownership is valid', async () => {
    const address = makeAddress()
    mockRepo.findAddressById.mockResolvedValue(address)
    mockRepo.setDefaultAddress.mockResolvedValue(undefined)

    await setDefaultAddress(mockUser, address.id)

    expect(mockRepo.setDefaultAddress).toHaveBeenCalledWith(mockUser.id, address.id)
  })
})
