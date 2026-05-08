export interface ProductModerationDto {
  id: string
  name: string
  storeId: string
  storeName: string
  status: string
  moderationReason: string | null
  moderatedAt: Date | null
  moderatedBy: string | null
  createdAt: Date
}

export interface ProductModerationQueueDto {
  items: ProductModerationDto[]
  total: number
  page: number
  limit: number
}

export interface ProductModerationFilters {
  page: number
  limit: number
}
