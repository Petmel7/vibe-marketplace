import { prisma } from '@/lib/prisma'
import {
  resolveRepositoryClient,
  type RepositoryContext,
} from '@/lib/repository/context'
import type { CreateAdminCategoryDto, UpdateAdminCategoryDto } from './category.dto'

export type CategorySummaryRecord = {
  id: string
  name: string
  slug: string
  imageUrl: string | null
}

export type ActiveCategoryTraversalNode = {
  id: string
  parentId: string | null
  slug: string
  isActive: boolean
}

export type CategoryRecord = {
  id: string
  name: string
  slug: string
  parentId: string | null
  position: number
  level: number
  isActive: boolean
  isVisible: boolean
  imageUrl: string | null
  imageStoragePath: string | null
  createdAt: Date
  updatedAt: Date
  productCount: number
}

function mapCategoryRecord(category: {
  id: string
  name: string
  slug: string
  parentId: string | null
  position: number
  level: number
  isActive: boolean
  isVisible: boolean
  image: string | null
  imageStoragePath: string | null
  createdAt: Date
  updatedAt: Date
  _count?: { products: number }
}): CategoryRecord {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    parentId: category.parentId,
    position: category.position,
    level: category.level,
    isActive: category.isActive,
    isVisible: category.isVisible,
    imageUrl: category.image,
    imageStoragePath: category.imageStoragePath,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
    productCount: category._count?.products ?? 0,
  }
}

const categorySelect = {
  id: true,
  name: true,
  slug: true,
  parentId: true,
  position: true,
  level: true,
  isActive: true,
  isVisible: true,
  image: true,
  imageStoragePath: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      products: true,
    },
  },
} as const

export async function listPublicCategories(): Promise<CategoryRecord[]> {
  const categories = await prisma.category.findMany({
    where: {
      isActive: true,
      isVisible: true,
    },
    orderBy: [{ position: 'asc' }, { name: 'asc' }, { id: 'asc' }],
    select: categorySelect,
  })

  return categories.map(mapCategoryRecord)
}

export async function listCategorySummaries(): Promise<CategorySummaryRecord[]> {
  const categories = await prisma.category.findMany({
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      image: true,
    },
  })

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    imageUrl: category.image,
  }))
}

export async function listActiveCategoryTraversalNodes(): Promise<ActiveCategoryTraversalNode[]> {
  return prisma.category.findMany({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      parentId: true,
      slug: true,
      isActive: true,
    },
  })
}

export async function listAllCategories(): Promise<CategoryRecord[]> {
  const categories = await prisma.category.findMany({
    orderBy: [{ position: 'asc' }, { name: 'asc' }, { id: 'asc' }],
    select: categorySelect,
  })

  return categories.map(mapCategoryRecord)
}

export async function findCategoryById(id: string): Promise<CategoryRecord | null> {
  const category = await prisma.category.findUnique({
    where: { id },
    select: categorySelect,
  })

  return category ? mapCategoryRecord(category) : null
}

export async function findCategoryBySlug(slug: string): Promise<CategoryRecord | null> {
  const category = await prisma.category.findUnique({
    where: { slug },
    select: categorySelect,
  })

  return category ? mapCategoryRecord(category) : null
}

export async function createCategory(data: CreateAdminCategoryDto & { slug: string; level: number; position: number }) {
  const category = await prisma.category.create({
    data: {
      name: data.name,
      slug: data.slug,
      parentId: data.parentId ?? null,
      position: data.position,
      level: data.level,
      isActive: data.isActive ?? true,
      image: data.imageUrl ?? null,
      imageStoragePath: data.imageStoragePath ?? null,
      updatedAt: new Date(),
    },
    select: categorySelect,
  })

  return mapCategoryRecord(category)
}

export async function updateCategory(
  id: string,
  data: UpdateAdminCategoryDto & { slug?: string; parentId?: string | null; level?: number },
) {
  const category = await prisma.category.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.slug !== undefined ? { slug: data.slug } : {}),
      ...(data.parentId !== undefined ? { parentId: data.parentId } : {}),
      ...(data.level !== undefined ? { level: data.level } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      ...(data.imageUrl !== undefined ? { image: data.imageUrl } : {}),
      ...(data.imageStoragePath !== undefined ? { imageStoragePath: data.imageStoragePath } : {}),
      updatedAt: new Date(),
    },
    select: categorySelect,
  })

  return mapCategoryRecord(category)
}

export async function updateCategoryImage(
  id: string,
  data: { imageUrl: string | null; imageStoragePath: string | null },
) {
  const category = await prisma.category.update({
    where: { id },
    data: {
      image: data.imageUrl,
      imageStoragePath: data.imageStoragePath,
      updatedAt: new Date(),
    },
    select: categorySelect,
  })

  return mapCategoryRecord(category)
}

export async function updateCategoryPositions(
  items: Array<{ id: string; position: number }>,
  context?: RepositoryContext,
): Promise<void> {
  if (items.length === 0) {
    return
  }

  const db = resolveRepositoryClient(context)
  for (const item of items) {
    await db.category.update({
      where: { id: item.id },
      data: {
        position: item.position,
        updatedAt: new Date(),
      },
    })
  }
}

export async function updateCategoryLevels(
  items: Array<{ id: string; level: number }>,
  context?: RepositoryContext,
): Promise<void> {
  if (items.length === 0) {
    return
  }

  const db = resolveRepositoryClient(context)
  for (const item of items) {
    await db.category.update({
      where: { id: item.id },
      data: {
        level: item.level,
        updatedAt: new Date(),
      },
    })
  }
}

export async function countProductsByCategoryIds(categoryIds: string[]): Promise<number> {
  if (categoryIds.length === 0) {
    return 0
  }

  return prisma.product.count({
    where: {
      categoryId: {
        in: categoryIds,
      },
    },
  })
}

export async function deleteCategoriesByIdsInOrder(
  categoryIds: string[],
  context?: RepositoryContext,
): Promise<void> {
  if (categoryIds.length === 0) {
    return
  }

  const db = resolveRepositoryClient(context)
  for (const id of categoryIds) {
    await db.category.delete({
      where: { id },
    })
  }
}
