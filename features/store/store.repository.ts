import { prisma } from '@/lib/prisma'
import type { StoreDto, StoreUpdateDto } from './store.dto'

export async function findStoreByUserId(userId: string): Promise<StoreDto | null> {
  return prisma.store.findFirst({ where: { ownerId: userId } })
}

export async function listStoresByOwnerId(ownerId: string): Promise<StoreDto[]> {
  return prisma.store.findMany({
    where: { ownerId },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })
}

export async function findStoreById(id: string): Promise<StoreDto | null> {
  return prisma.store.findUnique({ where: { id } })
}

export async function findOwnedStoreById(
  ownerId: string,
  storeId: string,
): Promise<StoreDto | null> {
  return prisma.store.findFirst({
    where: {
      id: storeId,
      ownerId,
    },
  })
}

export async function findStoreBySlug(slug: string): Promise<StoreDto | null> {
  return prisma.store.findUnique({ where: { slug } })
}

export async function updateStore(id: string, data: StoreUpdateDto): Promise<StoreDto> {
  return prisma.store.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  })
}

export async function setStoreActive(id: string, isActive: boolean): Promise<StoreDto> {
  return prisma.store.update({
    where: { id },
    data: { isActive, updatedAt: new Date() },
  })
}
