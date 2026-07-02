export interface AdminUserDto {
  id: string
  email: string
  roles: string[]
  createdAt: Date
  profileName: string | null
}

export interface AdminOrderItemDto {
  id: string
  productNameSnapshot: string
  variantSnapshot: string | null
  storeNameSnapshot: string
  unitPriceSnapshot: string
  quantity: number
}

export interface AdminOrderDto {
  id: string
  status: string
  totalAmount: string
  buyerEmail: string
  buyerId: string
  storeNames: string[]
  itemCount: number
  createdAt: Date
  items: AdminOrderItemDto[]
}

export interface AdminSellerDto {
  id: string
  userId: string
  businessName: string | null
  verificationStatus: string
  storeCount: number
  activeStoreCount: number
  inactiveStoreCount: number
  createdAt: Date
}

export interface AdminProductDto {
  id: string
  name: string
  storeId: string
  storeName: string
  status: string
  price: string
  moderationReason: string | null
  moderatedAt: Date | null
  createdAt: Date
}

export interface AdminStoreOptionDto {
  id: string
  name: string
  slug: string
  ownerId: string
  ownerEmail: string | null
  isActive: boolean
}

export interface PaginationFilters {
  page: number
  limit: number
}

export interface UserOversightFilters extends PaginationFilters {
  search?: string
  role?: string
}

export interface OrderOversightFilters extends PaginationFilters {
  status?: string
  dateFrom?: string
  dateTo?: string
}

export interface SellerOversightFilters extends PaginationFilters {
  status?: string
}

export interface ProductOversightFilters extends PaginationFilters {
  status?: string
  search?: string
}

export interface StoreOptionFilters extends PaginationFilters {
  q?: string
}
