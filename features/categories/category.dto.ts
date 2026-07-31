export type CategoryTreeNodeDto = {
  id: string
  name: string
  slug: string
  imageUrl: string | null
  parentId: string | null
  position: number
  level: number
  children: CategoryTreeNodeDto[]
}

export type AdminCategoryNodeDto = Omit<CategoryTreeNodeDto, 'children'> & {
  isActive: boolean
  isVisible: boolean
  createdAt: Date
  updatedAt: Date
  productCount: number
  imageStoragePath: string | null
  children: AdminCategoryNodeDto[]
}

export type CreateAdminCategoryDto = {
  name: string
  slug?: string | null
  parentId?: string | null
  position?: number
  isActive?: boolean
  imageUrl?: string | null
  imageStoragePath?: string | null
}

export type UpdateAdminCategoryDto = {
  name?: string
  slug?: string | null
  parentId?: string | null
  position?: number
  isActive?: boolean
  imageUrl?: string | null
  imageStoragePath?: string | null
}

export type CategoryImageDto = {
  imageUrl: string | null
  imageStoragePath: string | null
}

export type ReorderAdminCategoriesDto = {
  items: Array<{
    id: string
    position: number
  }>
}
