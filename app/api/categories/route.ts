import { prisma } from '@/lib/prisma'

interface CategoryRow {
  id: string
  name: string
  slug: string
  imageUrl: string | null
}

export async function GET(): Promise<Response> {
  try {
    const data = await prisma.$queryRaw<CategoryRow[]>`
      SELECT
        id,
        name,
        slug,
        image_url AS "imageUrl"
      FROM categories
      ORDER BY created_at ASC, id ASC
    `

    return Response.json({ success: true, data }, { status: 200 })
  } catch (error) {
    console.error('[GET /api/categories] Unexpected error:', error)

    return Response.json(
      {
        success: false,
        error: {
          message: 'An unexpected error occurred',
          code: 'INTERNAL_ERROR',
        },
      },
      { status: 500 },
    )
  }
}
