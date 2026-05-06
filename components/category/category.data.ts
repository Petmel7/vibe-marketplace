export interface CategoryListItem {
  id: string
  name: string
  slug: string
  imageUrl: string | null
}

export interface CategoryTreeApiNode {
  id: string
  name: string
  slug: string
  image: string | null
  children: CategoryTreeApiNode[]
}

export interface CategoryTreeNode extends CategoryTreeApiNode {
  href: string
  pathSegments: string[]
  children: CategoryTreeNode[]
}

export function decorateCategoryTree(
  nodes: CategoryTreeApiNode[] = [],
  fullAncestors: string[] = [],
  hrefAncestors: string[] = [],
): CategoryTreeNode[] {
  return nodes.map((node) => {
    const nextFullAncestors = [...fullAncestors, node.slug]
    const pathSegments =
      fullAncestors.length === 0 ? [node.slug] : [...hrefAncestors, node.slug]

    return {
      ...node,
      href: `/catalog/${pathSegments.join('/')}`,
      pathSegments,
      children: decorateCategoryTree(
        node.children ?? [],
        nextFullAncestors,
        fullAncestors.length === 0 ? [node.slug] : pathSegments,
      ),
    }
  })
}

export function findCategoryTreeNodeBySlugPath(
  nodes: CategoryTreeNode[],
  slugPath: string[],
): CategoryTreeNode | null {
  for (const node of nodes) {
    if (
      node.pathSegments.length === slugPath.length &&
      node.pathSegments.every((segment, index) => segment === slugPath[index])
    ) {
      return node
    }

    const childMatch = findCategoryTreeNodeBySlugPath(node.children, slugPath)

    if (childMatch) {
      return childMatch
    }
  }

  return null
}
