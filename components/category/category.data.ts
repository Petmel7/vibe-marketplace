import { headers } from 'next/headers'

export interface CategoryListItem {
  id: string
  name: string
  slug: string
  imageUrl: string | null
}

interface CategoriesApiResponse {
  success: boolean
  data: CategoryListItem[]
}

const CATEGORY_IMAGE_BY_SLUG: Record<string, string> = {
  clothes: '/uploads/category1.png',
  accessories: '/uploads/category2.png',
  souvenirs: '/uploads/category3.png',
  stationery: '/uploads/category4.png',
}

export function getCategoryImage(slug: string, imageUrl: string | null) {
  return imageUrl ?? CATEGORY_IMAGE_BY_SLUG[slug] ?? '/placeholder.png'
}

export async function fetchCategories(): Promise<CategoryListItem[]> {
  const headerStore = await headers()
  const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host')

  if (!host) {
    return []
  }

  const protocol = headerStore.get('x-forwarded-proto') ?? 'http'
  const response = await fetch(`${protocol}://${host}/api/categories`, {
    next: { revalidate: 60 },
  })

  if (!response.ok) {
    return []
  }

  const json = (await response.json()) as CategoriesApiResponse
  return json.success ? json.data : []
}
