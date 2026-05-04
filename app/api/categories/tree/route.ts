import { prisma } from '@/lib/prisma'

interface CategoryTreeNode {
  id: string
  name: string
  slug: string
  image: string | null
  children: CategoryTreeNode[]
}

export async function GET(): Promise<Response> {
  try {
    const data = await prisma.category.findMany({
      where: {
        parentId: null,
        isActive: true,
        isVisible: true,
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        image: true,
        children: {
          where: {
            isActive: true,
            isVisible: true,
          },
          orderBy: [{ order: 'asc' }, { name: 'asc' }],
          select: {
            id: true,
            name: true,
            slug: true,
            image: true,
            children: {
              where: {
                isActive: true,
                isVisible: true,
              },
              orderBy: [{ order: 'asc' }, { name: 'asc' }],
              select: {
                id: true,
                name: true,
                slug: true,
                image: true,
              },
            },
          },
        },
      },
    })

    return Response.json(
      {
        success: true,
        data: data as unknown as CategoryTreeNode[],
      },
      { status: 200 },
    )
  } catch (error) {
    console.error('[GET /api/categories/tree] Unexpected error:', error)

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
