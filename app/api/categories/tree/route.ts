import { getPublicCategoryTree } from '@/features/categories/category.service'
import { handleApiRoute } from '@/lib/http/route'

export async function GET(): Promise<Response> {
  return handleApiRoute('GET /api/categories/tree', () => getPublicCategoryTree())
}
