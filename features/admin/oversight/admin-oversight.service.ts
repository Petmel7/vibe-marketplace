import { assertAdminAccess } from '@/lib/auth/adminGuards'
import type { SessionUser } from '@/features/auth/auth.dto'
import type {
  AdminUserDto,
  AdminOrderDto,
  AdminSellerDto,
  AdminProductDto,
  AdminStoreOptionDto,
  UserOversightFilters,
  OrderOversightFilters,
  SellerOversightFilters,
  ProductOversightFilters,
  StoreOptionFilters,
} from './admin-oversight.dto'
import {
  findAllUsers,
  findAllOrdersOversight,
  findAllSellersOversight,
  findAllProductsOversight,
  findAdminStoreOptions,
} from './admin-oversight.repository'
import { measureServerOperation } from '@/lib/observability/server-timing'

// ---------------------------------------------------------------------------
// DTO mappers
// ---------------------------------------------------------------------------

function toAdminUserDto(user: {
  id: string
  email: string
  createdAt: Date
  roles: { role: string }[]
  profile: { displayName: string | null } | null
}): AdminUserDto {
  return {
    id: user.id,
    email: user.email,
    roles: user.roles.map((r) => r.role),
    createdAt: user.createdAt,
    profileName: user.profile?.displayName ?? null,
  }
}

function toAdminOrderDto(order: {
  id: string
  status: string
  totalAmount: { toString(): string }
  createdAt: Date
  user: { id: string; email: string }
  items: Array<{
    id: string
    productNameSnapshot: string
    variantSnapshot: string | null
    storeNameSnapshot: string
    unitPriceSnapshot: { toString(): string }
    quantity: number
  }>
}): AdminOrderDto {
  const storeNames = [...new Set(order.items.map((i) => i.storeNameSnapshot))]
  const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0)

  return {
    id: order.id,
    status: order.status,
    totalAmount: order.totalAmount.toString(),
    buyerEmail: order.user.email,
    buyerId: order.user.id,
    storeNames,
    itemCount,
    createdAt: order.createdAt,
    items: order.items.map((item) => ({
      id: item.id,
      productNameSnapshot: item.productNameSnapshot,
      variantSnapshot: item.variantSnapshot,
      storeNameSnapshot: item.storeNameSnapshot,
      unitPriceSnapshot: item.unitPriceSnapshot.toString(),
      quantity: item.quantity,
    })),
  }
}

function toAdminSellerDto(seller: {
  id: string
  userId: string
  businessName: string | null
  verificationStatus: string
  createdAt: Date
  user: { stores: { id: string }[] }
}): AdminSellerDto {
  return {
    id: seller.id,
    userId: seller.userId,
    businessName: seller.businessName,
    verificationStatus: seller.verificationStatus,
    storeCount: seller.user.stores.length,
    createdAt: seller.createdAt,
  }
}

function toAdminProductDto(product: {
  id: string
  name: string
  storeId: string
  status: string
  price: { toString(): string }
  moderationReason: string | null
  moderatedAt: Date | null
  createdAt: Date
  store: { id: string; name: string }
}): AdminProductDto {
  return {
    id: product.id,
    name: product.name,
    storeId: product.storeId,
    storeName: product.store.name,
    status: product.status,
    price: product.price.toString(),
    moderationReason: product.moderationReason,
    moderatedAt: product.moderatedAt,
    createdAt: product.createdAt,
  }
}

function toAdminStoreOptionDto(store: {
  id: string
  name: string
  slug: string
  ownerId: string
  isActive: boolean
  owner: { email: string | null }
}): AdminStoreOptionDto {
  return {
    id: store.id,
    name: store.name,
    slug: store.slug,
    ownerId: store.ownerId,
    ownerEmail: store.owner.email ?? null,
    isActive: store.isActive,
  }
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function getAllUsers(
  admin: SessionUser,
  filters: UserOversightFilters,
): Promise<{ items: AdminUserDto[]; total: number; page: number; limit: number }> {
  assertAdminAccess(admin)
  const { items, total } = await measureServerOperation(
    'getAllUsers',
    {
      service: 'features/admin/oversight/admin-oversight.service',
      route: '/admin/users',
      page: filters.page,
      limit: filters.limit,
      role: filters.role ?? null,
      hasSearch: Boolean(filters.search?.trim()),
    },
    () => findAllUsers(filters),
  )
  return {
    items: items.map(toAdminUserDto),
    total,
    page: filters.page,
    limit: filters.limit,
  }
}

export async function getAllOrders(
  admin: SessionUser,
  filters: OrderOversightFilters,
): Promise<{ items: AdminOrderDto[]; total: number; page: number; limit: number }> {
  assertAdminAccess(admin)
  const { items, total } = await findAllOrdersOversight(filters)
  return {
    items: items.map(toAdminOrderDto),
    total,
    page: filters.page,
    limit: filters.limit,
  }
}

export async function getAllSellers(
  admin: SessionUser,
  filters: SellerOversightFilters,
): Promise<{ items: AdminSellerDto[]; total: number; page: number; limit: number }> {
  assertAdminAccess(admin)
  const { items, total } = await findAllSellersOversight(filters)
  return {
    items: items.map(toAdminSellerDto),
    total,
    page: filters.page,
    limit: filters.limit,
  }
}

export async function getAllProducts(
  admin: SessionUser,
  filters: ProductOversightFilters,
): Promise<{ items: AdminProductDto[]; total: number; page: number; limit: number }> {
  assertAdminAccess(admin)
  const { items, total } = await findAllProductsOversight(filters)
  return {
    items: items.map(toAdminProductDto),
    total,
    page: filters.page,
    limit: filters.limit,
  }
}

export async function getAdminStoreOptions(
  admin: SessionUser,
  filters: StoreOptionFilters,
): Promise<{ items: AdminStoreOptionDto[]; total: number; page: number; limit: number }> {
  assertAdminAccess(admin)
  const { items, total } = await findAdminStoreOptions(filters)
  return {
    items: items.map(toAdminStoreOptionDto),
    total,
    page: filters.page,
    limit: filters.limit,
  }
}
