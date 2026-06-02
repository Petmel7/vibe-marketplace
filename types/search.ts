import type {
  ProductSearchDto,
  ProductSearchSort,
} from '@/features/products/product.dto'
import type {
  CategoryListItem,
  CategoryTreeNode,
} from '@/components/category/category.data'
export interface SearchPageUrlState {
  q: string
  category: string | null
  minPrice: string
  maxPrice: string
  inStock: boolean
  rating: string | null
  badge: string | null
  store: string | null
  sort: ProductSearchSort
  page: number
  limit: number
}

export interface SearchPageViewModel {
  title: string
  subtitle?: string | null
  pathname: string
  results: ProductSearchDto
  state: SearchPageUrlState
  categoryTree: CategoryTreeNode[]
  flatCategories: CategoryListItem[]
  lockedCategory?: {
    slug: string
    name: string
  } | null
}

export interface SearchSortOption {
  value: ProductSearchSort
  label: string
}
