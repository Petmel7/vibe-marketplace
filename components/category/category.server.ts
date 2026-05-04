import { headers } from 'next/headers'
import {
  decorateCategoryTree,
  type CategoryListItem,
  type CategoryTreeApiNode,
  type CategoryTreeNode,
} from '@/components/category/category.data'

interface CategoriesApiResponse {
  success: boolean
  data: CategoryListItem[]
}

interface CategoryTreeApiResponse {
  success: boolean
  data: CategoryTreeApiNode[]
}

async function getApiBaseUrl(): Promise<string | null> {
  const headerStore = await headers()
  const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host')

  if (!host) {
    return null
  }

  const protocol = headerStore.get('x-forwarded-proto') ?? 'http'
  return `${protocol}://${host}`
}

export async function fetchCategories(): Promise<CategoryListItem[]> {
  const baseUrl = await getApiBaseUrl()

  if (!baseUrl) {
    return []
  }

  const response = await fetch(`${baseUrl}/api/categories`, {
    next: { revalidate: 60 },
  })

  if (!response.ok) {
    return []
  }

  const json = (await response.json()) as CategoriesApiResponse
  return json.success ? json.data : []
}

export async function fetchCategoryTree(): Promise<CategoryTreeNode[]> {
  const baseUrl = await getApiBaseUrl()
  console.log('BASE URL:', baseUrl)

  if (!baseUrl) {
    return []
  }

  const response = await fetch(`${baseUrl}/api/categories/tree`, {
    next: { revalidate: 60 },
  })

  if (!response.ok) {
    return []
  }

  const json = (await response.json()) as CategoryTreeApiResponse

  if (!json.success) {
    return []
  }

  return decorateCategoryTree(json.data)
}
