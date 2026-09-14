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
        isActive: true,
        isVisible: true,
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

  it('adds canonical catalog hrefs to flat public categories using the active visible tree', async () => {
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
        id: 'child',
        name: 'Футболки',
        slug: 't-shirts',
        image: null,
        parentId: 'root',
        position: 0,
      },
    ])

    const { fetchCategories } = await import('./category.server')
    const result = await fetchCategories()

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
        isActive: true,
        isVisible: true,
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

  it('excludes inactive categories from the flat public category list', async () => {
    categoryFindManyMock.mockResolvedValue([
      {
        id: 'active-root',
        name: 'Активна категорія',
        slug: 'active',
        image: null,
        parentId: null,
        position: 0,
        isActive: true,
        isVisible: true,
      },
      {
        id: 'inactive-root',
        name: 'Неактивна категорія',
        slug: 'inactive',
        image: null,
        parentId: null,
        position: 1,
        isActive: false,
        isVisible: true,
      },
    ])

    const { fetchCategories } = await import('./category.server')
    const result = await fetchCategories()

    expect(result).toEqual([
      {
        id: 'active-root',
        name: 'Активна категорія',
        slug: 'active',
        imageUrl: null,
        href: '/catalog/active',
        pathSegments: ['active'],
      },
    ])
    expect(categoryFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isActive: true,
          isVisible: true,
        },
      }),
    )
  })

  it('excludes invisible categories from the flat public category list', async () => {
    categoryFindManyMock.mockResolvedValue([
      {
        id: 'visible-root',
        name: 'Видима категорія',
        slug: 'visible',
        image: null,
        parentId: null,
        position: 0,
        isActive: true,
        isVisible: true,
      },
      {
        id: 'hidden-root',
        name: 'Прихована категорія',
        slug: 'hidden',
        image: null,
        parentId: null,
        position: 1,
        isActive: true,
        isVisible: false,
      },
    ])

    const { fetchCategories } = await import('./category.server')
    const result = await fetchCategories()

    expect(result).toEqual([
      {
        id: 'visible-root',
        name: 'Видима категорія',
        slug: 'visible',
        imageUrl: null,
        href: '/catalog/visible',
        pathSegments: ['visible'],
      },
    ])
    expect(categoryFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isActive: true,
          isVisible: true,
        },
      }),
    )
  })

  it('queries only categories that are routable by the public catalog tree', async () => {
    categoryFindManyMock.mockResolvedValue([])

    const { fetchCategories } = await import('./category.server')
    const result = await fetchCategories()

    expect(result).toEqual([])
    expect(categoryFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isActive: true,
          isVisible: true,
        },
      }),
    )
  })

  it('excludes categories whose active visible parent is missing from the public tree', async () => {
    categoryFindManyMock.mockResolvedValue([
      {
        id: 'root',
        name: 'Одяг',
        slug: 'clothing',
        image: null,
        parentId: null,
        position: 0,
      },
      {
        id: 'orphan',
        name: 'Осиротіла категорія',
        slug: 'orphan',
        image: null,
        parentId: 'missing-parent',
        position: 0,
      },
    ])

    const { fetchCategories, fetchCategoryTree } = await import('./category.server')
    const [categories, tree] = await Promise.all([fetchCategories(), fetchCategoryTree()])

    expect(categories).toEqual([
      {
        id: 'root',
        name: 'Одяг',
        slug: 'clothing',
        imageUrl: null,
        href: '/catalog/clothing',
        pathSegments: ['clothing'],
      },
    ])
    expect(tree).toEqual([
      {
        id: 'root',
        name: 'Одяг',
        slug: 'clothing',
        imageUrl: null,
        href: '/catalog/clothing',
        pathSegments: ['clothing'],
        children: [],
      },
    ])
  })
})
