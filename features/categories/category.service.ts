import { requireAdmin } from '@/lib/auth/guards'
import { generateSlug } from '@/lib/utils/slugify'
import type { SessionUser } from '@/features/auth/auth.dto'
import { CategoryNotFoundError } from '@/lib/errors/seller'
import {
  CategoryCircularReferenceError,
  CategoryHasProductsError,
  CategorySlugConflictError,
} from '@/lib/errors/category'
import type {
  AdminCategoryNodeDto,
  CategoryTreeNodeDto,
  CreateAdminCategoryDto,
  ReorderAdminCategoriesDto,
  UpdateAdminCategoryDto,
} from './category.dto'
import {
  createCategory as repoCreateCategory,
  countProductsByCategoryIds,
  deleteCategoriesByIdsInOrder,
  findCategoryBySlug,
  listAllCategories,
  listPublicCategories,
  updateCategory as repoUpdateCategory,
  updateCategoryLevels,
  updateCategoryPositions,
  type CategoryRecord,
} from './category.repository'

function normalizeCategorySlug(value: string): string {
  const slug = generateSlug(value)
  if (!slug || slug.length < 2) {
    throw new CategorySlugConflictError('Category slug is invalid')
  }

  return slug
}

function toCategoryTreeNodeDto(category: CategoryRecord, children: CategoryTreeNodeDto[]): CategoryTreeNodeDto {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    parentId: category.parentId,
    position: category.position,
    level: category.level,
    children,
  }
}

function toAdminCategoryNodeDto(category: CategoryRecord, children: AdminCategoryNodeDto[]): AdminCategoryNodeDto {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    parentId: category.parentId,
    position: category.position,
    level: category.level,
    isActive: category.isActive,
    isVisible: category.isVisible,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
    productCount: category.productCount,
    children,
  }
}

function sortCategories<T extends { position: number; name: string; id: string }>(items: T[]): T[] {
  return [...items].sort(
    (left, right) =>
      left.position - right.position || left.name.localeCompare(right.name, 'uk') || left.id.localeCompare(right.id),
  )
}

function buildCategoryTree(categories: CategoryRecord[]): CategoryTreeNodeDto[] {
  const byParent = new Map<string | null, CategoryRecord[]>()

  for (const category of categories) {
    const bucket = byParent.get(category.parentId) ?? []
    bucket.push(category)
    byParent.set(category.parentId, bucket)
  }

  const visit = (parentId: string | null): CategoryTreeNodeDto[] =>
    sortCategories(byParent.get(parentId) ?? []).map((category) =>
      toCategoryTreeNodeDto(category, visit(category.id)),
    )

  return visit(null)
}

function buildAdminCategoryTree(categories: CategoryRecord[]): AdminCategoryNodeDto[] {
  const byParent = new Map<string | null, CategoryRecord[]>()

  for (const category of categories) {
    const bucket = byParent.get(category.parentId) ?? []
    bucket.push(category)
    byParent.set(category.parentId, bucket)
  }

  const visit = (parentId: string | null): AdminCategoryNodeDto[] =>
    sortCategories(byParent.get(parentId) ?? []).map((category) =>
      toAdminCategoryNodeDto(category, visit(category.id)),
    )

  return visit(null)
}

function clampPosition(position: number | undefined, size: number): number {
  if (position === undefined || Number.isNaN(position)) {
    return size
  }

  return Math.max(0, Math.min(position, size))
}

function collectDescendantIds(categories: CategoryRecord[], categoryId: string): string[] {
  const byParent = new Map<string | null, string[]>()

  for (const category of categories) {
    const bucket = byParent.get(category.parentId) ?? []
    bucket.push(category.id)
    byParent.set(category.parentId, bucket)
  }

  const descendants: string[] = []
  const queue = [...(byParent.get(categoryId) ?? [])]

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) {
      continue
    }

    descendants.push(current)
    queue.push(...(byParent.get(current) ?? []))
  }

  return descendants
}

async function ensureUniqueSlug(slug: string, excludeCategoryId?: string) {
  const existing = await findCategoryBySlug(slug)
  if (existing && existing.id !== excludeCategoryId) {
    throw new CategorySlugConflictError()
  }
}

async function refreshAdminCategory(categoryId: string): Promise<AdminCategoryNodeDto> {
  const categories = await listAllCategories()
  const tree = buildAdminCategoryTree(categories)
  const queue: AdminCategoryNodeDto[] = [...tree]

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) {
      continue
    }

    if (current.id === categoryId) {
      return current
    }

    queue.push(...current.children)
  }

  throw new CategoryNotFoundError()
}

export async function getPublicCategoryTree(): Promise<CategoryTreeNodeDto[]> {
  const categories = await listPublicCategories()
  return buildCategoryTree(categories.filter((category) => category.isActive && category.isVisible))
}

export async function getAdminCategoryTree(user: SessionUser): Promise<AdminCategoryNodeDto[]> {
  requireAdmin(user)
  const categories = await listAllCategories()
  return buildAdminCategoryTree(categories)
}

export async function createAdminCategory(
  user: SessionUser,
  data: CreateAdminCategoryDto,
): Promise<AdminCategoryNodeDto> {
  requireAdmin(user)
  const categories = await listAllCategories()
  const parent = data.parentId ? categories.find((category) => category.id === data.parentId) : null

  if (data.parentId && !parent) {
    throw new CategoryNotFoundError('Parent category not found')
  }

  const slug = normalizeCategorySlug(data.slug ?? data.name)
  await ensureUniqueSlug(slug)

  const siblings = sortCategories(categories.filter((category) => category.parentId === (data.parentId ?? null)))
  const targetPosition = clampPosition(data.position, siblings.length)
  const level = parent ? parent.level + 1 : 0

  const created = await repoCreateCategory({
    ...data,
    slug,
    parentId: data.parentId ?? null,
    level,
    position: siblings.length,
  })

  const orderedIds = [...siblings.map((category) => category.id)]
  orderedIds.splice(targetPosition, 0, created.id)

  await updateCategoryPositions(orderedIds.map((id, index) => ({ id, position: index })))
  return refreshAdminCategory(created.id)
}

export async function updateAdminCategory(
  user: SessionUser,
  categoryId: string,
  data: UpdateAdminCategoryDto,
): Promise<AdminCategoryNodeDto> {
  requireAdmin(user)
  const categories = await listAllCategories()
  const category = categories.find((item) => item.id === categoryId)

  if (!category) {
    throw new CategoryNotFoundError()
  }

  const nextParentId = data.parentId !== undefined ? data.parentId : category.parentId
  const nextParent = nextParentId ? categories.find((item) => item.id === nextParentId) : null

  if (nextParentId && !nextParent) {
    throw new CategoryNotFoundError('Parent category not found')
  }

  const descendants = collectDescendantIds(categories, category.id)
  if (nextParentId === category.id || (nextParentId && descendants.includes(nextParentId))) {
    throw new CategoryCircularReferenceError()
  }

  const nextSlug =
    data.slug !== undefined
      ? normalizeCategorySlug(data.slug ?? category.name)
      : category.slug

  await ensureUniqueSlug(nextSlug, category.id)

  const nextLevel = nextParent ? nextParent.level + 1 : 0
  const levelDelta = nextLevel - category.level

  await repoUpdateCategory(category.id, {
    ...data,
    slug: nextSlug,
    parentId: nextParentId,
    level: nextLevel,
  })

  if (levelDelta !== 0) {
    const descendantLevelUpdates = descendants.map((id) => {
      const descendant = categories.find((item) => item.id === id)
      if (!descendant) {
        return null
      }

      return {
        id,
        level: descendant.level + levelDelta,
      }
    }).filter((item): item is { id: string; level: number } => item !== null)

    await updateCategoryLevels(descendantLevelUpdates)
  }

  const oldParentId = category.parentId
  const positionChanged = data.position !== undefined
  const parentChanged = nextParentId !== oldParentId

  if (parentChanged || positionChanged) {
    const oldSiblings = sortCategories(
      categories.filter((item) => item.parentId === oldParentId && item.id !== category.id),
    )
    const newSiblingBase = parentChanged
      ? sortCategories(categories.filter((item) => item.parentId === nextParentId && item.id !== category.id))
      : sortCategories(categories.filter((item) => item.parentId === nextParentId && item.id !== category.id))

    const targetPosition = clampPosition(data.position, newSiblingBase.length)
    const nextOrderIds = [...newSiblingBase.map((item) => item.id)]
    nextOrderIds.splice(targetPosition, 0, category.id)

    if (parentChanged) {
      await updateCategoryPositions(oldSiblings.map((item, index) => ({ id: item.id, position: index })))
    }

    await updateCategoryPositions(nextOrderIds.map((id, index) => ({ id, position: index })))
  }

  return refreshAdminCategory(category.id)
}

export async function reorderAdminCategories(
  user: SessionUser,
  data: ReorderAdminCategoriesDto,
): Promise<AdminCategoryNodeDto[]> {
  requireAdmin(user)
  const categories = await listAllCategories()
  const requestedIds = new Set(data.items.map((item) => item.id))
  const selected = categories.filter((category) => requestedIds.has(category.id))

  if (selected.length !== data.items.length) {
    throw new CategoryNotFoundError('One or more categories were not found')
  }

  const uniqueParentIds = new Set(selected.map((category) => category.parentId ?? null))
  if (uniqueParentIds.size !== 1) {
    throw new CategoryCircularReferenceError('Only sibling categories can be reordered together')
  }

  const desiredOrder = [...data.items]
    .sort((left, right) => left.position - right.position || left.id.localeCompare(right.id))
    .map((item) => item.id)

  await updateCategoryPositions(desiredOrder.map((id, index) => ({ id, position: index })))
  return getAdminCategoryTree(user)
}

export async function deleteAdminCategory(user: SessionUser, categoryId: string): Promise<{ deleted: true }> {
  requireAdmin(user)
  const categories = await listAllCategories()
  const category = categories.find((item) => item.id === categoryId)

  if (!category) {
    throw new CategoryNotFoundError()
  }

  const descendants = collectDescendantIds(categories, category.id)
  const orderedIds = [category.id, ...descendants]
  const productCount = await countProductsByCategoryIds(orderedIds)

  if (productCount > 0) {
    throw new CategoryHasProductsError('Category with products must be archived instead of deleted')
  }

  const depthById = new Map(categories.map((item) => [item.id, item.level]))
  const deleteOrder = [...orderedIds].sort(
    (left, right) => (depthById.get(right) ?? 0) - (depthById.get(left) ?? 0),
  )

  await deleteCategoriesByIdsInOrder(deleteOrder)
  return { deleted: true }
}
