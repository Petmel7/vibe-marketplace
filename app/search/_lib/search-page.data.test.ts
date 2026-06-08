import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/products/product.service', () => ({
  searchProducts: vi.fn(),
}))

vi.mock('@/components/category/category.server', () => ({
  fetchCategoryTree: vi.fn(),
  fetchCategories: vi.fn(),
}))

import * as productService from '@/features/products/product.service'
import * as categoryServer from '@/components/category/category.server'
import { getSearchPageData } from './search-page.data'

const mockProductService = vi.mocked(productService)
const mockCategoryServer = vi.mocked(categoryServer)

describe('getSearchPageData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
    mockProductService.searchProducts.mockResolvedValue({
      items: [],
      pagination: {
        page: 1,
        limit: 12,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
      },
      facets: {
        categories: [],
        stores: [],
        availability: {
          inStock: 0,
          outOfStock: 0,
        },
        ratings: [],
        badges: [],
        priceRange: {
          min: null,
          max: null,
        },
      },
      appliedFilters: {
        q: 'jacket',
        category: null,
        minPrice: null,
        maxPrice: null,
        inStock: null,
        rating: null,
        badge: null,
        store: null,
      },
      sort: 'relevance',
    })
    mockCategoryServer.fetchCategoryTree.mockResolvedValue([])
    mockCategoryServer.fetchCategories.mockResolvedValue([])
  })

  it('uses the product service directly instead of fetching the search API route', async () => {
    const data = await getSearchPageData({
      q: 'jacket',
      sort: 'relevance',
      page: '1',
      limit: '12',
    })

    expect(mockProductService.searchProducts).toHaveBeenCalledWith({
      q: 'jacket',
      category: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      inStock: undefined,
      rating: undefined,
      badge: undefined,
      store: undefined,
      sort: 'relevance',
      page: 1,
      limit: 12,
    })
    expect(global.fetch).not.toHaveBeenCalled()
    expect(data.results.sort).toBe('relevance')
  })
})
