import { z } from 'zod'
import {
  getSellerPromotionById,
  getSellerPromotions,
} from '@/features/promotions/promotions.service'
import { promotionQuerySchema } from '@/features/promotions/promotions.schema'
import {
  getMyProducts,
  listSellerProductCategories,
} from '@/features/seller/products/seller-product.service'
import { PromotionNotFoundError } from '@/lib/errors/promotion'
import type { SessionUser } from '@/types/auth'
import { getSellerLayoutData } from './seller-dashboard.data'

type RawSearchParams = Record<string, string | string[] | undefined>

function normalizeSearchParams(searchParams: RawSearchParams) {
  return Object.fromEntries(
    Object.entries(searchParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  )
}

function parseWithSchema<T extends z.ZodTypeAny>(schema: T, searchParams: RawSearchParams): z.infer<T> {
  const parsed = schema.safeParse(normalizeSearchParams(searchParams))
  return parsed.success ? parsed.data : schema.parse({})
}

async function getSellerPromotionBuilderData(user: SessionUser) {
  const layout = await getSellerLayoutData(user)

  if (!layout.store) {
    return {
      ...layout,
      promotionStore: null,
      promotionProducts: [],
      promotionCategories: [],
    }
  }

  const [products, categories] = await Promise.all([
    getMyProducts(user, { page: 1, limit: 100 }),
    listSellerProductCategories(),
  ])

  return {
    ...layout,
    promotionStore: {
      id: layout.store.id,
      name: layout.store.name,
      slug: layout.store.slug,
    },
    promotionProducts: products.map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      status: product.status,
    })),
    promotionCategories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      parentId: category.parentId,
      level: category.level,
    })),
  }
}

export async function getSellerPromotionsPageData(user: SessionUser, searchParams: RawSearchParams) {
  const builderData = await getSellerPromotionBuilderData(user)
  const filters = parseWithSchema(promotionQuerySchema, searchParams)

  if (!builderData.store) {
    return {
      ...builderData,
      filters,
      items: [],
      page: filters.page,
      limit: filters.limit,
      total: 0,
    }
  }

  const data = await getSellerPromotions(user, {
    ...filters,
    storeId: builderData.store.id,
  })

  return {
    ...builderData,
    filters,
    ...data,
  }
}

export async function getSellerPromotionEditorData(user: SessionUser, promotionId?: string) {
  const builderData = await getSellerPromotionBuilderData(user)

  if (!promotionId || !builderData.store) {
    return {
      ...builderData,
      promotion: null,
    }
  }

  try {
    const promotion = await getSellerPromotionById(user, promotionId)

    return {
      ...builderData,
      promotion,
    }
  } catch (error) {
    if (error instanceof PromotionNotFoundError) {
      return {
        ...builderData,
        promotion: null,
      }
    }

    throw error
  }
}
