export type CategoryTreeNode = {
  id: string
  name: string
  slug: string
  parentId: string | null
  position: number
  level: number
  children: CategoryTreeNode[]
}

export type AdminCategoryTreeNode = Omit<CategoryTreeNode, 'children'> & {
  isActive: boolean
  isVisible: boolean
  createdAt: string
  updatedAt: string
  productCount: number
  children: AdminCategoryTreeNode[]
}

export function isLeafCategoryNode(node: CategoryTreeNode) {
  return node.children.length === 0
}

export function flattenCategoryTree<T extends { children: T[] }>(nodes: T[]): T[] {
  return nodes.flatMap((node) => [node, ...flattenCategoryTree(node.children)])
}

export function findCategoryPathById<T extends { id: string; children: T[] }>(
  nodes: T[],
  id: string | null | undefined,
): T[] {
  if (!id) {
    return []
  }

  for (const node of nodes) {
    if (node.id === id) {
      return [node]
    }

    const childPath = findCategoryPathById(node.children, id)
    if (childPath.length > 0) {
      return [node, ...childPath]
    }
  }

  return []
}

function normalizeCategorySearch(query: string) {
  return query.trim().toLocaleLowerCase('uk-UA')
}

export function filterCategoryTreeByQuery<T extends { name: string; children: T[] }>(
  nodes: T[],
  query: string,
): T[] {
  const normalized = normalizeCategorySearch(query)
  if (!normalized) {
    return nodes
  }

  return nodes.flatMap((node) => {
    const filteredChildren = filterCategoryTreeByQuery(node.children, normalized)
    const matches = node.name.toLocaleLowerCase('uk-UA').includes(normalized)

    if (!matches && filteredChildren.length === 0) {
      return []
    }

    return [{ ...node, children: filteredChildren }]
  })
}

export function collectExpandedCategoryIds<T extends { id: string; children: T[] }>(nodes: T[]): string[] {
  return nodes.flatMap((node) => [node.id, ...collectExpandedCategoryIds(node.children)])
}

export function getSubtreeProductCount(node: AdminCategoryTreeNode): number {
  return node.productCount + node.children.reduce((sum, child) => sum + getSubtreeProductCount(child), 0)
}
