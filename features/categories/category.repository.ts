import { prisma } from '@/lib/prisma'
import type { CreateAdminCategoryDto, UpdateAdminCategoryDto } from './category.dto'

export type CategoryRecord = {
  id: string
  name: string
  slug: string
  parentId: string | null
  position: number
  level: number
  isActive: boolean
  isVisible: boolean
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
      updatedAt: new Date(),
    },
    select: categorySelect,
  })

  return mapCategoryRecord(category)
}

export async function updateCategoryPositions(items: Array<{ id: string; position: number }>): Promise<void> {
  if (items.length === 0) {
    return
  }

  await prisma.$transaction(
    items.map((item) =>
      prisma.category.update({
        where: { id: item.id },
        data: {
          position: item.position,
          updatedAt: new Date(),
        },
      }),
    ),
  )
}

export async function updateCategoryLevels(items: Array<{ id: string; level: number }>): Promise<void> {
  if (items.length === 0) {
    return
  }

  await prisma.$transaction(
    items.map((item) =>
      prisma.category.update({
        where: { id: item.id },
        data: {
          level: item.level,
          updatedAt: new Date(),
        },
      }),
    ),
  )
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

export async function deleteCategoriesByIdsInOrder(categoryIds: string[]): Promise<void> {
  if (categoryIds.length === 0) {
    return
  }

  await prisma.$transaction(
    categoryIds.map((id) =>
      prisma.category.delete({
        where: { id },
      }),
    ),
  )
}
