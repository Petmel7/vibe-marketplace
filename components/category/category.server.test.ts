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
        image: 'https://cdn.example.com/category-images/categories/root/image.webp',
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
        imageUrl: 'https://cdn.example.com/category-images/categories/root/image.webp',
        href: '/catalog/clothing',
        pathSegments: ['clothing'],
        children: [
          {
            id: 'child-a',
            name: 'Футболки',
            slug: 't-shirts',
            imageUrl: null,
            href: '/catalog/clothing/t-shirts',
            pathSegments: ['clothing', 't-shirts'],
            children: [],
          },
          {
            id: 'child-b',
            name: 'Штани',
            slug: 'pants',
            imageUrl: null,
            href: '/catalog/clothing/pants',
            pathSegments: ['clothing', 'pants'],
            children: [],
          },
        ],
      },
    ])
  })

  it('adds canonical catalog hrefs to flat public categories using hierarchy paths', async () => {
    categoryFindManyMock.mockResolvedValue([
      {
        id: 'root',
        name: 'Одяг',
        slug: 'clothing',
        image: 'https://cdn.example.com/category-images/categories/root/image.webp',
        parentId: null,
        position: 1,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      {
        id: 'child',
        name: 'Футболки',
        slug: 't-shirts',
        image: null,
        parentId: 'root',
        position: 0,
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
      },
    ])

    const { fetchCategories } = await import('./category.server')
    const result = await fetchCategories()

    expect(categoryFindManyMock).toHaveBeenCalledTimes(1)
    expect(categoryFindManyMock).toHaveBeenCalledWith({
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        image: true,
        parentId: true,
        position: true,
        createdAt: true,
      },
    })
    expect(result).toEqual([
      {
        id: 'root',
        name: 'Одяг',
        slug: 'clothing',
        imageUrl: 'https://cdn.example.com/category-images/categories/root/image.webp',
        href: '/catalog/clothing',
        pathSegments: ['clothing'],
      },
      {
        id: 'child',
        name: 'Футболки',
        slug: 't-shirts',
        imageUrl: null,
        href: '/catalog/clothing/t-shirts',
        pathSegments: ['clothing', 't-shirts'],
      },
    ])
  })
})
