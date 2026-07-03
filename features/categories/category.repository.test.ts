import { beforeEach, describe, expect, it, vi } from 'vitest'

const { categoryFindManyMock } = vi.hoisted(() => ({
  categoryFindManyMock: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    category: {
      findMany: categoryFindManyMock,
    },
  },
}))

import { listActiveCategoryTraversalNodes } from './category.repository'

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
