import { beforeEach, describe, expect, it, vi } from 'vitest'

const { categoryFindManyMock, categoryUpdateMock } = vi.hoisted(() => ({
  categoryFindManyMock: vi.fn(),
  categoryUpdateMock: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    category: {
      findMany: categoryFindManyMock,
      update: categoryUpdateMock,
    },
  },
}))

import { listActiveCategoryTraversalNodes, updateCategoryImage } from './category.repository'

describe('listActiveCategoryTraversalNodes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches active categories in one bounded query for subtree traversal', async () => {
    categoryFindManyMock.mockResolvedValue([
      { id: 'cat-root', parentId: null, slug: 'root', isActive: true },
      { id: 'cat-child', parentId: 'cat-root', slug: 'child', isActive: true },
    ])

    const result = await listActiveCategoryTraversalNodes()

    expect(categoryFindManyMock).toHaveBeenCalledWith({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        parentId: true,
        slug: true,
        isActive: true,
      },
    })
    expect(result).toEqual([
      { id: 'cat-root', parentId: null, slug: 'root', isActive: true },
      { id: 'cat-child', parentId: 'cat-root', slug: 'child', isActive: true },
    ])
  })
})

describe('updateCategoryImage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('persists category image URL and storage path using the mapped Prisma fields', async () => {
    categoryUpdateMock.mockResolvedValue({
      id: 'cat-1',
      name: 'Одяг',
      slug: 'clothing',
      parentId: null,
      position: 0,
      level: 0,
      isActive: true,
      isVisible: true,
      image: 'https://cdn.example.com/category-images/categories/cat-1/image.webp',
      imageStoragePath: 'categories/cat-1/image.webp',
      createdAt: new Date('2026-05-25T00:00:00.000Z'),
      updatedAt: new Date('2026-05-26T00:00:00.000Z'),
      _count: { products: 2 },
    })

    const result = await updateCategoryImage('cat-1', {
      imageUrl: 'https://cdn.example.com/category-images/categories/cat-1/image.webp',
      imageStoragePath: 'categories/cat-1/image.webp',
    })

    expect(categoryUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cat-1' },
        data: expect.objectContaining({
          image: 'https://cdn.example.com/category-images/categories/cat-1/image.webp',
          imageStoragePath: 'categories/cat-1/image.webp',
        }),
      }),
    )
    expect(result).toMatchObject({
      imageUrl: 'https://cdn.example.com/category-images/categories/cat-1/image.webp',
      imageStoragePath: 'categories/cat-1/image.webp',
      productCount: 2,
    })
  })
})
