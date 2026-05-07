import { prisma } from '@/lib/prisma'
import type { ShippingAddressDto, CreateAddressDto, UpdateAddressDto } from './address.dto'

export async function findAddressesByUserId(userId: string): Promise<ShippingAddressDto[]> {
  return prisma.shippingAddress.findMany({ where: { userId } })
}

export async function findAddressById(id: string): Promise<ShippingAddressDto | null> {
  return prisma.shippingAddress.findUnique({ where: { id } })
}

export async function createAddress(
  userId: string,
  data: CreateAddressDto,
): Promise<ShippingAddressDto> {
  return prisma.shippingAddress.create({
    data: {
      userId,
      fullName: data.fullName,
      phone: data.phone,
      country: data.country,
      city: data.city,
      street: data.street,
      building: data.building,
      label: data.label ?? null,
      region: data.region ?? null,
      apartment: data.apartment ?? null,
      zipCode: data.zipCode ?? null,
      isDefault: data.isDefault ?? false,
    },
  })
}

export async function updateAddress(
  id: string,
  data: UpdateAddressDto,
): Promise<ShippingAddressDto> {
  return prisma.shippingAddress.update({ where: { id }, data })
}

export async function deleteAddress(id: string): Promise<void> {
  await prisma.shippingAddress.delete({ where: { id } })
}

export async function setDefaultAddress(userId: string, addressId: string): Promise<void> {
  // Step 1: clear all defaults for this user
  await prisma.shippingAddress.updateMany({
    where: { userId },
    data: { isDefault: false },
  })
  // Step 2: set the chosen address as default
  await prisma.shippingAddress.update({
    where: { id: addressId },
    data: { isDefault: true },
  })
}
