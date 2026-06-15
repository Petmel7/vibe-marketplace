import { beforeEach, describe, expect, it, vi } from 'vitest'

const { queryRawMock, categoryFindManyMock } = vi.hoisted(() => ({
  queryRawMock: vi.fn(),
  categoryFindManyMock: vi.fn(),
}))

vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: queryRawMock,
    category: {
      findMany: categoryFindManyMock,
    },
  },
}))

describe('category server loaders', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('builds the active public category tree from one bounded query', async () => {
    categoryFindManyMock.mockResolvedValue([
      {
        id: 'root',
        name: 'Одяг',
        slug: 'clothing',
        image: null,
        parentId: null,
        position: 1,
      },
      {
        id: 'child-b',
        name: 'Штани',
        slug: 'pants',
        image: null,
        parentId: 'root',
        position: 1,
      },
      {
        id: 'child-a',
        name: 'Футболки',
        slug: 't-shirts',
        image: null,
        parentId: 'root',
        position: 0,
      },
    ])

    const { fetchCategoryTree } = await import('./category.server')
    const result = await fetchCategoryTree()

    expect(categoryFindManyMock).toHaveBeenCalledTimes(1)
    expect(categoryFindManyMock).toHaveBeenCalledWith({
      where: {
        isActive: true,
        isVisible: true,
      },
      orderBy: [{ position: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        image: true,
        parentId: true,
        position: true,
      },
    })
    expect(result).toEqual([
      {
        id: 'root',
        name: 'Одяг',
        slug: 'clothing',
        image: null,
        href: '/catalog/clothing',
        pathSegments: ['clothing'],
        children: [
          {
            id: 'child-a',
            name: 'Футболки',
            slug: 't-shirts',
            image: null,
            href: '/catalog/clothing/t-shirts',
            pathSegments: ['clothing', 't-shirts'],
            children: [],
          },
          {
            id: 'child-b',
            name: 'Штани',
            slug: 'pants',
            image: null,
            href: '/catalog/clothing/pants',
            pathSegments: ['clothing', 'pants'],
            children: [],
          },
        ],
      },
    ])
  })
})
