import { prisma } from '@/lib/prisma'
import type { CreateStoreInput, UpdateStoreSettingsInput } from './storefront.schema'

// Internal Prisma row shape — matches the Store model fields we need
type StoreRow = {
  id: string
  ownerId: string
  name: string
  slug: string
  description: string | null
  logoUrl: string | null
  bannerUrl: string | null
  isActive: boolean
  isPrimary: boolean
  createdAt: Date
  updatedAt: Date
}

export async function findStoreByUserId(userId: string): Promise<StoreRow | null> {
  return prisma.store.findFirst({ where: { ownerId: userId } })
}

export async function findPrimaryStoreByUserId(userId: string): Promise<StoreRow | null> {
  return prisma.store.findFirst({ where: { ownerId: userId, isPrimary: true } })
}

export async function findStoreBySlug(slug: string): Promise<StoreRow | null> {
  return prisma.store.findUnique({ where: { slug } })
}

export async function createStore(
  userId: string,
  data: CreateStoreInput & { slug: string; isPrimary?: boolean },
): Promise<StoreRow> {
  return prisma.store.create({
    data: {
      ownerId: userId,
      name: data.name,
      slug: data.slug,
      description: data.description ?? null,
      logoUrl: data.logoUrl ?? null,
      bannerUrl: data.bannerUrl ?? null,
      isPrimary: data.isPrimary ?? true,
      updatedAt: new Date(),
    },
  })
}

export async function updateStoreSettings(
  id: string,
  data: UpdateStoreSettingsInput,
): Promise<StoreRow> {
  return prisma.store.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
      ...(data.bannerUrl !== undefined && { bannerUrl: data.bannerUrl }),
      updatedAt: new Date(),
    },
  })
}

export async function checkSlugAvailable(slug: string): Promise<boolean> {
  const existing = await prisma.store.findUnique({ where: { slug }, select: { id: true } })
  return existing === null
}
