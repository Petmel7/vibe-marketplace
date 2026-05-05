import { prisma } from '@/lib/prisma'
import {
  decorateCategoryTree,
  type CategoryListItem,
  type CategoryTreeApiNode,
  type CategoryTreeNode,
} from '@/components/category/category.data'

export async function fetchCategories(): Promise<CategoryListItem[]> {
  try {
    const data = await prisma.$queryRaw<CategoryListItem[]>`
      SELECT
        id,
        name,
        slug,
        image_url AS "imageUrl"
      FROM categories
      ORDER BY created_at ASC, id ASC
    `
    return data
  } catch (error) {
    console.error('[fetchCategories] Unexpected error:', error)
    return []
  }
}

export async function fetchCategoryTree(): Promise<CategoryTreeNode[]> {
  try {
    const data = await prisma.category.findMany({
      where: {
        parentId: null,
        isActive: true,
        isVisible: true,
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        image: true,
        children: {
          where: {
            isActive: true,
            isVisible: true,
          },
          orderBy: [{ order: 'asc' }, { name: 'asc' }],
          select: {
            id: true,
            name: true,
            slug: true,
            image: true,
            children: {
              where: {
                isActive: true,
                isVisible: true,
              },
              orderBy: [{ order: 'asc' }, { name: 'asc' }],
              select: {
                id: true,
                name: true,
                slug: true,
                image: true,
              },
            },
          },
        },
      },
    })

    return decorateCategoryTree(data as unknown as CategoryTreeApiNode[])
  } catch (error) {
    console.error('[fetchCategoryTree] Unexpected error:', error)
    return []
  }
}
