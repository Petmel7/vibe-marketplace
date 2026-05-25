import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UserRole } from '@/app/generated/prisma/client'
import type { SessionUser } from '@/features/auth/auth.dto'
import {
  createAdminCategory,
  deleteAdminCategory,
  getAdminCategoryTree,
  getPublicCategoryTree,
  reorderAdminCategories,
  updateAdminCategory,
} from './category.service'
import * as repository from './category.repository'
import { CategoryNotFoundError } from '@/lib/errors/seller'
import {
  CategoryCircularReferenceError,
  CategoryHasProductsError,
  CategorySlugConflictError,
} from '@/lib/errors/category'

vi.mock('./category.repository', () => ({
  listPublicCategories: vi.fn(),
  listAllCategories: vi.fn(),
  findCategoryById: vi.fn(),
  findCategoryBySlug: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  updateCategoryPositions: vi.fn(),
  updateCategoryLevels: vi.fn(),
  countProductsByCategoryIds: vi.fn(),
  deleteCategoriesByIdsInOrder: vi.fn(),
}))

const mockedRepository = vi.mocked(repository)

const adminUser: SessionUser = {
  id: 'admin-1',
  email: 'admin@example.com',
  roles: [UserRole.ADMIN],
}

function makeCategory(overrides: Partial<repository.CategoryRecord> = {}): repository.CategoryRecord {
  return {
    id: 'cat-root',
    name: 'Одяг та взуття',
    slug: 'clothing-shoes',
    parentId: null,
    position: 0,
    level: 0,
    isActive: true,
    isVisible: true,
    createdAt: new Date('2026-05-25T00:00:00.000Z'),
    updatedAt: new Date('2026-05-25T00:00:00.000Z'),
    productCount: 0,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getPublicCategoryTree', () => {
  it('returns a nested active tree ordered by position then name', async () => {
    mockedRepository.listPublicCategories.mockResolvedValue([
      makeCategory({ id: 'child-b', name: 'Б', slug: 'b', parentId: 'cat-root', position: 1, level: 1 }),
      makeCategory({ id: 'cat-root', name: 'Root', slug: 'root', parentId: null, position: 1, level: 0 }),
      makeCategory({ id: 'child-a', name: 'А', slug: 'a', parentId: 'cat-root', position: 0, level: 1 }),
      makeCategory({ id: 'root-a', name: 'Accessories', slug: 'accessories', parentId: null, position: 0, level: 0 }),
      makeCategory({ id: 'hidden', name: 'Hidden', slug: 'hidden', parentId: null, position: 2, level: 0, isActive: false }),
    ])

    const result = await getPublicCategoryTree()

    expect(result.map((item) => item.slug)).toEqual(['accessories', 'root'])
    expect(result[1]?.children.map((child) => child.slug)).toEqual(['a', 'b'])
  })
})

describe('getAdminCategoryTree', () => {
  it('includes inactive categories for admin management', async () => {
    mockedRepository.listAllCategories.mockResolvedValue([
      makeCategory({ id: 'cat-root', name: 'Root', slug: 'root' }),
      makeCategory({ id: 'inactive-child', name: 'Hidden', slug: 'hidden', parentId: 'cat-root', level: 1, isActive: false }),
    ])

    const result = await getAdminCategoryTree(adminUser)

    expect(result[0]?.children[0]).toMatchObject({ slug: 'hidden', isActive: false })
  })
})

describe('createAdminCategory', () => {
  it('creates a child category and reorders siblings deterministically', async () => {
    mockedRepository.listAllCategories.mockResolvedValue([
      makeCategory({ id: 'root', name: 'Root', slug: 'root' }),
      makeCategory({ id: 'sibling-a', name: 'A', slug: 'a', parentId: 'root', level: 1, position: 0 }),
      makeCategory({ id: 'sibling-b', name: 'B', slug: 'b', parentId: 'root', level: 1, position: 1 }),
    ])
    mockedRepository.findCategoryBySlug.mockResolvedValue(null)
    mockedRepository.createCategory.mockResolvedValue(
      makeCategory({ id: 'new-child', name: 'New child', slug: 'new-child', parentId: 'root', level: 1, position: 2 }),
    )
    mockedRepository.listAllCategories.mockResolvedValueOnce([
      makeCategory({ id: 'root', name: 'Root', slug: 'root' }),
      makeCategory({ id: 'sibling-a', name: 'A', slug: 'a', parentId: 'root', level: 1, position: 0 }),
      makeCategory({ id: 'sibling-b', name: 'B', slug: 'b', parentId: 'root', level: 1, position: 1 }),
    ]).mockResolvedValueOnce([
      makeCategory({ id: 'root', name: 'Root', slug: 'root' }),
      makeCategory({ id: 'sibling-a', name: 'A', slug: 'a', parentId: 'root', level: 1, position: 0 }),
      makeCategory({ id: 'new-child', name: 'New child', slug: 'new-child', parentId: 'root', level: 1, position: 1 }),
      makeCategory({ id: 'sibling-b', name: 'B', slug: 'b', parentId: 'root', level: 1, position: 2 }),
    ])

    const result = await createAdminCategory(adminUser, {
      name: 'New child',
      parentId: 'root',
      position: 1,
    })

    expect(mockedRepository.updateCategoryPositions).toHaveBeenCalledWith([
      { id: 'sibling-a', position: 0 },
      { id: 'new-child', position: 1 },
      { id: 'sibling-b', position: 2 },
    ])
    expect(result).toMatchObject({ id: 'new-child', parentId: 'root', level: 1 })
  })
})

describe('updateAdminCategory', () => {
  it('blocks circular parent moves', async () => {
    mockedRepository.listAllCategories.mockResolvedValue([
      makeCategory({ id: 'root', name: 'Root', slug: 'root', level: 0 }),
      makeCategory({ id: 'child', name: 'Child', slug: 'child', parentId: 'root', level: 1 }),
      makeCategory({ id: 'grandchild', name: 'Grandchild', slug: 'grandchild', parentId: 'child', level: 2 }),
    ])

    await expect(
      updateAdminCategory(adminUser, 'root', { parentId: 'grandchild' }),
    ).rejects.toThrow(CategoryCircularReferenceError)
  })

  it('updates levels and sibling positions when moving a category', async () => {
    mockedRepository.listAllCategories.mockResolvedValue([
      makeCategory({ id: 'root-a', name: 'Root A', slug: 'root-a', level: 0 }),
      makeCategory({ id: 'root-b', name: 'Root B', slug: 'root-b', level: 0, position: 1 }),
      makeCategory({ id: 'child', name: 'Child', slug: 'child', parentId: 'root-a', level: 1, position: 0 }),
      makeCategory({ id: 'grandchild', name: 'Grandchild', slug: 'grandchild', parentId: 'child', level: 2, position: 0 }),
    ])
    mockedRepository.findCategoryBySlug.mockResolvedValue(null)
    mockedRepository.listAllCategories.mockResolvedValueOnce([
      makeCategory({ id: 'root-a', name: 'Root A', slug: 'root-a', level: 0 }),
      makeCategory({ id: 'root-b', name: 'Root B', slug: 'root-b', level: 0, position: 1 }),
      makeCategory({ id: 'child', name: 'Child', slug: 'child', parentId: 'root-a', level: 1, position: 0 }),
      makeCategory({ id: 'grandchild', name: 'Grandchild', slug: 'grandchild', parentId: 'child', level: 2, position: 0 }),
    ]).mockResolvedValueOnce([
      makeCategory({ id: 'root-a', name: 'Root A', slug: 'root-a', level: 0 }),
      makeCategory({ id: 'root-b', name: 'Root B', slug: 'root-b', level: 0, position: 1 }),
      makeCategory({ id: 'child', name: 'Child', slug: 'child', parentId: 'root-b', level: 1, position: 0 }),
      makeCategory({ id: 'grandchild', name: 'Grandchild', slug: 'grandchild', parentId: 'child', level: 2, position: 0 }),
    ])

    await updateAdminCategory(adminUser, 'child', { parentId: 'root-b', position: 0 })

    expect(mockedRepository.updateCategory).toHaveBeenCalledWith(
      'child',
      expect.objectContaining({ parentId: 'root-b', level: 1 }),
    )
    expect(mockedRepository.updateCategoryLevels).not.toHaveBeenCalled()
  })

  it('rejects duplicate slugs', async () => {
    mockedRepository.listAllCategories.mockResolvedValue([makeCategory({ id: 'cat-1', slug: 'cat-1', name: 'Cat 1' })])
    mockedRepository.findCategoryBySlug.mockResolvedValue(makeCategory({ id: 'other', slug: 'taken', name: 'Taken' }))

    await expect(
      updateAdminCategory(adminUser, 'cat-1', { slug: 'taken' }),
    ).rejects.toThrow(CategorySlugConflictError)
  })
})

describe('reorderAdminCategories', () => {
  it('reorders siblings deterministically', async () => {
    mockedRepository.listAllCategories
      .mockResolvedValueOnce([
        makeCategory({ id: 'a', slug: 'a', name: 'A', parentId: null, position: 0 }),
        makeCategory({ id: 'b', slug: 'b', name: 'B', parentId: null, position: 1 }),
      ])
      .mockResolvedValueOnce([
        makeCategory({ id: 'b', slug: 'b', name: 'B', parentId: null, position: 0 }),
        makeCategory({ id: 'a', slug: 'a', name: 'A', parentId: null, position: 1 }),
      ])

    const result = await reorderAdminCategories(adminUser, {
      items: [
        { id: 'b', position: 0 },
        { id: 'a', position: 1 },
      ],
    })

    expect(mockedRepository.updateCategoryPositions).toHaveBeenCalledWith([
      { id: 'b', position: 0 },
      { id: 'a', position: 1 },
    ])
    expect(result.map((item) => item.id)).toEqual(['b', 'a'])
  })
})

describe('deleteAdminCategory', () => {
  it('throws when the category subtree still has products', async () => {
    mockedRepository.listAllCategories.mockResolvedValue([
      makeCategory({ id: 'root', slug: 'root', name: 'Root' }),
      makeCategory({ id: 'child', slug: 'child', name: 'Child', parentId: 'root', level: 1 }),
    ])
    mockedRepository.countProductsByCategoryIds.mockResolvedValue(1)

    await expect(deleteAdminCategory(adminUser, 'root')).rejects.toThrow(CategoryHasProductsError)
  })

  it('hard deletes a leaf category without products', async () => {
    mockedRepository.listAllCategories.mockResolvedValue([
      makeCategory({ id: 'leaf', slug: 'leaf', name: 'Leaf' }),
    ])
    mockedRepository.countProductsByCategoryIds.mockResolvedValue(0)

    const result = await deleteAdminCategory(adminUser, 'leaf')

    expect(mockedRepository.deleteCategoriesByIdsInOrder).toHaveBeenCalledWith(['leaf'])
    expect(result).toEqual({ deleted: true })
  })

  it('throws when the category is missing', async () => {
    mockedRepository.listAllCategories.mockResolvedValue([])

    await expect(deleteAdminCategory(adminUser, 'missing')).rejects.toThrow(CategoryNotFoundError)
  })
})
