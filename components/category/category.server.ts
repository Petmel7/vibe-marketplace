import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'
import {
  decorateCategoryTree,
  type CategoryListItem,
  type CategoryTreeApiNode,
  type CategoryTreeNode,
} from '@/components/category/category.data'
import { SEO_CACHE_TAGS } from '@/features/seo/seo.cache'

const fetchCategoriesCached = unstable_cache(
  async (): Promise<CategoryListItem[]> => {
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
  },
  ['public-categories-list'],
  {
    revalidate: 60 * 60,
    tags: [SEO_CACHE_TAGS.categories],
  },
)

const fetchCategoryTreeCached = unstable_cache(
  async (): Promise<CategoryTreeNode[]> => {
    try {
      const data = await prisma.category.findMany({
        where: {
          parentId: null,
          isActive: true,
          isVisible: true,
        },
        orderBy: [{ position: 'asc' }, { name: 'asc' }],
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
            orderBy: [{ position: 'asc' }, { name: 'asc' }],
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
                orderBy: [{ position: 'asc' }, { name: 'asc' }],
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
  },
  ['public-category-tree'],
  {
    revalidate: 60 * 60,
    tags: [SEO_CACHE_TAGS.categories],
  },
)

export async function fetchCategories(): Promise<CategoryListItem[]> {
  return fetchCategoriesCached()
}

export async function fetchCategoryTree(): Promise<CategoryTreeNode[]> {
  return fetchCategoryTreeCached()
}
