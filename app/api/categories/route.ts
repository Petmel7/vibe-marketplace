import { getPublicCategorySummaries } from '@/features/categories/category.service'
import { toErrorResponse } from '@/lib/errors/handleError'

export async function GET(): Promise<Response> {
  try {
    const data = await getPublicCategorySummaries()

    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    return toErrorResponse('GET /api/categories', error)
  }
}
