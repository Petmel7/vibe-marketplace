import type {
  ProductSearchDto,
  ProductSearchSort,
} from '@/features/products/product.dto'
import { productSearchQuerySchema } from '@/features/products/product.schema'
import { searchProducts } from '@/features/products/product.service'
import {
  fetchCategories,
  fetchCategoryTree,
} from '@/components/category/category.server'
import type {
  CategoryListItem,
  CategoryTreeNode,
} from '@/components/category/category.data'
import { measureServerOperation } from '@/lib/observability/server-timing'
import { logInfo } from '@/utils/logger'
import type { SearchPageUrlState } from '@/types/search'

export type SearchPageSearchParams = Record<
  string,
  string | string[] | undefined
>

export interface SearchPageData {
  results: ProductSearchDto
  categoryTree: CategoryTreeNode[]
  flatCategories: CategoryListItem[]
  state: SearchPageUrlState
}

type SearchPageDataOptions = {
  preloadedCategoryTree?: CategoryTreeNode[]
  preloadedFlatCategories?: CategoryListItem[]
  traceContext?: {
    requestId: string
    route: string
  }
}

const DEFAULT_LIMIT = 12
const DEFAULT_SORT: ProductSearchSort = 'newest'
const SEARCH_SORT_VALUES: ProductSearchSort[] = [
  'relevance',
  'newest',
  'price_asc',
  'price_desc',
  'rating',
  'popular',
]

function getFirstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? ''
  }

  return value ?? ''
}

function toPositiveInteger(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10)

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback
  }

  return parsed
}

function normalizeSort(value: string): ProductSearchSort {
  if (SEARCH_SORT_VALUES.includes(value as ProductSearchSort)) {
    return value as ProductSearchSort
  }

  return DEFAULT_SORT
}

function normalizeBoolean(value: string) {
  return value === 'true' || value === '1'
}

export function normalizeSearchPageState(
  searchParams: SearchPageSearchParams,
  overrides: Partial<SearchPageUrlState> = {},
): SearchPageUrlState {
  const rawQ = getFirstValue(searchParams.q).trim()
  const rawCategory = getFirstValue(searchParams.category).trim()
  const rawMinPrice = getFirstValue(searchParams.minPrice).trim()
  const rawMaxPrice = getFirstValue(searchParams.maxPrice).trim()
  const rawRating = getFirstValue(searchParams.rating).trim()
  const rawBadge = getFirstValue(searchParams.badge).trim()
  const rawStore = getFirstValue(searchParams.store).trim()
  const rawSort = getFirstValue(searchParams.sort).trim()
  const rawInStock = getFirstValue(searchParams.inStock).trim()

  return {
    q: rawQ,
    category: rawCategory || null,
    minPrice: rawMinPrice,
    maxPrice: rawMaxPrice,
    inStock: normalizeBoolean(rawInStock),
    rating: rawRating || null,
    badge: rawBadge || null,
    store: rawStore || null,
    sort: normalizeSort(rawSort),
    page: toPositiveInteger(getFirstValue(searchParams.page), 1),
    limit: toPositiveInteger(getFirstValue(searchParams.limit), DEFAULT_LIMIT),
    ...overrides,
  }
}

export function buildSearchParamsFromState(state: SearchPageUrlState) {
  const params = new URLSearchParams()

  if (state.q) params.set('q', state.q)
  if (state.category) params.set('category', state.category)
  if (state.minPrice) params.set('minPrice', state.minPrice)
  if (state.maxPrice) params.set('maxPrice', state.maxPrice)
  if (state.inStock) params.set('inStock', 'true')
  if (state.rating) params.set('rating', state.rating)
  if (state.badge) params.set('badge', state.badge)
  if (state.store) params.set('store', state.store)
  if (state.sort !== DEFAULT_SORT) params.set('sort', state.sort)
  if (state.page > 1) params.set('page', String(state.page))
  if (state.limit !== DEFAULT_LIMIT) params.set('limit', String(state.limit))

  return params
}

async function fetchSearchResults(
  state: SearchPageUrlState,
  traceContext?: SearchPageDataOptions['traceContext'],
): Promise<ProductSearchDto> {
  const query = productSearchQuerySchema.parse({
    q: state.q || undefined,
    category: state.category ?? undefined,
    minPrice: state.minPrice || undefined,
    maxPrice: state.maxPrice || undefined,
    inStock: state.inStock ? 'true' : undefined,
    rating: state.rating ?? undefined,
    badge: state.badge ?? undefined,
    store: state.store ?? undefined,
    sort: state.sort,
    page: state.page,
    limit: state.limit,
  })

  return measureServerOperation(
    'search-page-products',
    {
      route: traceContext?.route ?? '/catalog',
      service: 'searchProducts',
      requestId: traceContext?.requestId,
    },
    () => searchProducts(query, traceContext),
  )
}

export async function getSearchPageData(
  searchParams: SearchPageSearchParams,
  overrides: Partial<SearchPageUrlState> = {},
  options: SearchPageDataOptions = {},
): Promise<SearchPageData> {
  const state = normalizeSearchPageState(searchParams, overrides)
  const traceContext = options.traceContext ?? {
    requestId: crypto.randomUUID(),
    route: '/catalog',
  }
  const shouldLoadFlatCategories = Boolean(options.preloadedFlatCategories || state.category)

  return measureServerOperation(
    'search-page-data',
    {
      route: traceContext.route,
      component: 'app/search/_lib/search-page.data',
      requestId: traceContext.requestId,
    },
    async () => {
      logInfo('search-page-data:before-results', {
        domain: 'search',
        route: traceContext.route,
        requestId: traceContext.requestId,
        page: state.page,
        limit: state.limit,
        hasQuery: Boolean(state.q),
        hasCategory: Boolean(state.category),
      })
      const resultsPromise = fetchSearchResults(state, traceContext)
      const categoryTreePromise = options.preloadedCategoryTree
        ? Promise.resolve(options.preloadedCategoryTree)
        : measureServerOperation(
            'search-page-category-tree',
            {
              route: traceContext.route,
              categoryTree: 'fetchCategoryTree',
              requestId: traceContext.requestId,
            },
            () => fetchCategoryTree(),
          )
      const flatCategoriesPromise = options.preloadedFlatCategories
        ? Promise.resolve(options.preloadedFlatCategories)
        : shouldLoadFlatCategories
          ? measureServerOperation(
            'search-page-flat-categories',
            {
              route: traceContext.route,
              categoryTree: 'fetchCategories',
              requestId: traceContext.requestId,
            },
            () => fetchCategories(),
          )
          : Promise.resolve([])

      const [results, categoryTreeResult, flatCategoriesResult] = await Promise.allSettled([
        resultsPromise,
        categoryTreePromise,
        flatCategoriesPromise,
      ])

      if (results.status !== 'fulfilled') {
        throw results.reason
      }

      logInfo('search-page-data:before-return', {
        domain: 'search',
        route: traceContext.route,
        requestId: traceContext.requestId,
        itemsCount: results.value.items.length,
        total: results.value.pagination.total,
        categoryTreeCount:
          categoryTreeResult.status === 'fulfilled' ? categoryTreeResult.value.length : 0,
        flatCategoriesCount:
          flatCategoriesResult.status === 'fulfilled' ? flatCategoriesResult.value.length : 0,
        loadedFlatCategories: shouldLoadFlatCategories,
      })

      return {
        results: results.value,
        categoryTree:
          categoryTreeResult.status === 'fulfilled' ? categoryTreeResult.value : [],
        flatCategories:
          flatCategoriesResult.status === 'fulfilled' ? flatCategoriesResult.value : [],
        state,
      }
    },
  )
}
