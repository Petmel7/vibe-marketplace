import { AddressNotFoundError, AddressOwnershipError } from '@/lib/errors/profile'
import {
  findAddressesByUserId,
  findAddressById,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress as repoSetDefaultAddress,
} from './address.repository'
import type { SessionUser } from '@/features/auth/auth.dto'
import type { ShippingAddressDto, CreateAddressDto, UpdateAddressDto } from './address.dto'

function assertOwnership(address: ShippingAddressDto, userId: string): void {
  if (address.userId !== userId) throw new AddressOwnershipError()
}

export async function getMyAddresses(user: SessionUser): Promise<ShippingAddressDto[]> {
  return findAddressesByUserId(user.id)
}

export async function addAddress(
  user: SessionUser,
  data: CreateAddressDto,
): Promise<ShippingAddressDto> {
  return createAddress(user.id, data)
}

export async function updateMyAddress(
  user: SessionUser,
  id: string,
  data: UpdateAddressDto,
): Promise<ShippingAddressDto> {
  const address = await findAddressById(id)
  if (!address) throw new AddressNotFoundError()
  assertOwnership(address, user.id)
  return updateAddress(id, data)
}

export async function deleteMyAddress(user: SessionUser, id: string): Promise<void> {
  const address = await findAddressById(id)
  if (!address) throw new AddressNotFoundError()
  assertOwnership(address, user.id)
  await deleteAddress(id)
}

export async function setDefaultAddress(user: SessionUser, id: string): Promise<void> {
  const address = await findAddressById(id)
  if (!address) throw new AddressNotFoundError()
  assertOwnership(address, user.id)
  await repoSetDefaultAddress(user.id, id)
}
