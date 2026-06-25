import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'
import {
  decorateCategoryTree,
  type CategoryListItem,
  type CategoryTreeNode,
} from '@/components/category/category.data'
import { SEO_CACHE_TAGS } from '@/features/seo/seo.cache'
import { measureServerOperation } from '@/lib/observability/server-timing'

type PublicCategoryTreeRecord = {
  id: string
  name: string
  slug: string
  image: string | null
  parentId: string | null
  position: number
}

type PublicCategoryTreeApiNode = {
  id: string
  name: string
  slug: string
  image: string | null
  children: PublicCategoryTreeApiNode[]
}

function buildCategoryTree(records: PublicCategoryTreeRecord[]): CategoryTreeNode[] {
  const byParent = new Map<string | null, PublicCategoryTreeRecord[]>()

  for (const record of records) {
    const bucket = byParent.get(record.parentId) ?? []
    bucket.push(record)
    byParent.set(record.parentId, bucket)
  }

  const sortRecords = (items: PublicCategoryTreeRecord[]) =>
    [...items].sort(
      (left, right) =>
        left.position - right.position ||
        left.name.localeCompare(right.name, 'uk') ||
        left.id.localeCompare(right.id),
    )

  const visit = (parentId: string | null): PublicCategoryTreeApiNode[] =>
    sortRecords(byParent.get(parentId) ?? []).map((record) => ({
      id: record.id,
      name: record.name,
      slug: record.slug,
      image: record.image,
      children: visit(record.id),
    }))

  return decorateCategoryTree(visit(null))
}

const fetchCategoriesCached = unstable_cache(
  async (): Promise<CategoryListItem[]> => {
    try {
      return await measureServerOperation(
        'fetchCategories',
        {
          component: 'components/category/category.server',
          repository: 'fetchCategoriesCached',
          sql: 'SELECT categories list ORDER BY created_at, id',
          categoryTree: 'categories-list',
          cache: 'unstable_cache:public-categories-list',
        },
        async () =>
          prisma.$queryRaw<CategoryListItem[]>`
            SELECT
              id,
              name,
              slug,
              image_url AS "imageUrl"
            FROM categories
            ORDER BY created_at ASC, id ASC
          `,
      )
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
      const data = await measureServerOperation(
        'fetchCategoryTree',
        {
          component: 'components/category/category.server',
          repository: 'fetchCategoryTreeCached',
          sql: 'prisma.category.findMany(active visible tree)',
          categoryTree: 'active-tree',
          cache: 'unstable_cache:public-category-tree',
        },
        () =>
          prisma.category.findMany({
            where: {
              isActive: true,
              isVisible: true,
            },
            orderBy: [{ position: 'asc' }, { name: 'asc' }, { id: 'asc' }],
            select: {
              id: true,
              name: true,
              slug: true,
              image: true,
              parentId: true,
              position: true,
            },
          }),
      )

      return buildCategoryTree(data)
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
