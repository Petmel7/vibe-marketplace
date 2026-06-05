import { z } from 'zod'
import { getAdminCategoryTree } from '@/features/categories/category.service'
import {
  getAdminCommissionRuleById,
  getAdminCommissionRules,
} from '@/features/commissions/commissions.service'
import { commissionRuleQuerySchema } from '@/features/commissions/commissions.schema'
import { getAdminSellerBalances } from '@/features/payouts/payouts.service'
import { getAdminStoreRiskProfiles } from '@/features/risk/risk.service'
import { CommissionRuleNotFoundError } from '@/lib/errors/commission'
import { flattenCategoryTree } from '@/types/categories'
import type { SessionUser } from '@/types/auth'
import type { CommissionRuleCategoryOption, CommissionRuleStoreOption } from '@/types/commissions'

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

async function getCommissionRuleFormOptions(user: SessionUser, currentRule?: {
  storeId: string | null
  storeName: string | null
  categoryId: string | null
  categoryName: string | null
}) {
  const [categoryTree, sellerBalances, riskStores] = await Promise.all([
    getAdminCategoryTree(user),
    getAdminSellerBalances(user, { page: 1, limit: 200 }),
    getAdminStoreRiskProfiles(user, { page: 1, limit: 200 }),
  ])

  const storeMap = new Map<string, CommissionRuleStoreOption>()
  for (const balance of sellerBalances.items) {
    storeMap.set(balance.storeId, {
      id: balance.storeId,
      name: balance.storeName,
    })
  }

  for (const profile of riskStores.items) {
    if (profile.store) {
      storeMap.set(profile.store.id, {
        id: profile.store.id,
        name: profile.store.name,
      })
    }
  }

  if (currentRule?.storeId && currentRule.storeName) {
    storeMap.set(currentRule.storeId, {
      id: currentRule.storeId,
      name: currentRule.storeName,
    })
  }

  const categoryMap = new Map<string, CommissionRuleCategoryOption>()
  for (const category of flattenCategoryTree(categoryTree)) {
    categoryMap.set(category.id, {
      id: category.id,
      name: category.name,
      parentId: category.parentId,
      level: category.level,
      isActive: category.isActive,
    })
  }

  if (currentRule?.categoryId && currentRule.categoryName && !categoryMap.has(currentRule.categoryId)) {
    categoryMap.set(currentRule.categoryId, {
      id: currentRule.categoryId,
      name: currentRule.categoryName,
      parentId: null,
      level: 0,
      isActive: false,
    })
  }

  return {
    stores: [...storeMap.values()].sort((left, right) => left.name.localeCompare(right.name, 'uk-UA')),
    categories: [...categoryMap.values()].sort((left, right) =>
      left.level === right.level ? left.name.localeCompare(right.name, 'uk-UA') : left.level - right.level,
    ),
  }
}

export async function getAdminCommissionRulesPageData(user: SessionUser, searchParams: RawSearchParams) {
  const filters = parseWithSchema(commissionRuleQuerySchema, searchParams)
  const [data, formOptions] = await Promise.all([
    getAdminCommissionRules(user, filters),
    getCommissionRuleFormOptions(user),
  ])

  return {
    filters,
    ...data,
    ...formOptions,
  }
}

export async function getAdminCommissionRuleCreatePageData(user: SessionUser) {
  return getCommissionRuleFormOptions(user)
}

export async function getAdminCommissionRuleDetailPageData(user: SessionUser, id: string) {
  try {
    const rule = await getAdminCommissionRuleById(user, id)
    const formOptions = await getCommissionRuleFormOptions(user, rule)

    return {
      rule,
      ...formOptions,
    }
  } catch (error) {
    if (error instanceof CommissionRuleNotFoundError) {
      return null
    }

    throw error
  }
}
