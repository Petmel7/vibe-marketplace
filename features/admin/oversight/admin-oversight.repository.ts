import { prisma } from '@/lib/prisma'
import { Prisma } from '@/app/generated/prisma/client'
import type { OrderStatus, ProductStatus, UserRole } from '@/app/generated/prisma/client'
import type {
  UserOversightFilters,
  OrderOversightFilters,
  SellerOversightFilters,
  ProductOversightFilters,
  StoreOptionFilters,
} from './admin-oversight.dto'
import { measureServerOperation } from '@/lib/observability/server-timing'

type AdminUserBaseRow = {
  id: string
  email: string
  createdAt: Date
}

type AdminUserRoleRow = {
  userId: string
  role: string
}

type AdminUserProfileRow = {
  userId: string
  displayName: string | null
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function findAllUsers(filters: UserOversightFilters) {
  const { page, limit, search, role } = filters
  const normalizedSearch = search?.trim()

  const where: Prisma.UserWhereInput = {
    ...(normalizedSearch
      ? {
          OR: [
            { email: { contains: normalizedSearch, mode: 'insensitive' } },
            { name: { contains: normalizedSearch, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(role
      ? {
          roles: {
            some: { role: role as UserRole },
          },
        }
      : {}),
  }

  const skip = (page - 1) * limit

  const [baseUsers, total] = await Promise.all([
    measureServerOperation(
      'adminUsers.findBaseUsers',
      {
        repository: 'features/admin/oversight/admin-oversight.repository',
        route: '/admin/users',
        sql: 'prisma.user.findMany(select id,email,createdAt)',
        page,
        limit,
        role: role ?? null,
        hasSearch: Boolean(normalizedSearch),
      },
      () =>
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            createdAt: true,
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip,
          take: limit,
        }),
    ),
    measureServerOperation(
      'adminUsers.countUsers',
      {
        repository: 'features/admin/oversight/admin-oversight.repository',
        route: '/admin/users',
        sql: 'prisma.user.count',
        role: role ?? null,
        hasSearch: Boolean(normalizedSearch),
      },
      () => prisma.user.count({ where }),
    ),
  ])

  if (baseUsers.length === 0) {
    return { items: [], total }
  }

  const userIds = baseUsers.map((user) => user.id)

  const [roleRows, profileRows] = await Promise.all([
    measureServerOperation(
      'adminUsers.findUserRoles',
      {
        repository: 'features/admin/oversight/admin-oversight.repository',
        route: '/admin/users',
        sql: 'prisma.userRoleAssignment.findMany(by user ids)',
        page,
        limit,
      },
      () =>
        prisma.userRoleAssignment.findMany({
          where: {
            userId: { in: userIds },
          },
          select: {
            userId: true,
            role: true,
          },
        }),
    ),
    measureServerOperation(
      'adminUsers.findUserProfiles',
      {
        repository: 'features/admin/oversight/admin-oversight.repository',
        route: '/admin/users',
        sql: 'prisma.userProfile.findMany(by user ids)',
        page,
        limit,
      },
      () =>
        prisma.userProfile.findMany({
          where: {
            userId: { in: userIds },
          },
          select: {
            userId: true,
            displayName: true,
          },
        }),
    ),
  ])

  const rolesByUserId = new Map<string, Array<{ role: string }>>()
  for (const roleRow of roleRows as AdminUserRoleRow[]) {
    const bucket = rolesByUserId.get(roleRow.userId) ?? []
    bucket.push({ role: roleRow.role })
    rolesByUserId.set(roleRow.userId, bucket)
  }

  const profileByUserId = new Map(
    (profileRows as AdminUserProfileRow[]).map((profile) => [
      profile.userId,
      { displayName: profile.displayName },
    ]),
  )

  const items = (baseUsers as AdminUserBaseRow[]).map((user) => ({
    ...user,
    roles: rolesByUserId.get(user.id) ?? [],
    profile: profileByUserId.get(user.id) ?? null,
  }))

  return { items, total }
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export async function findAllOrdersOversight(filters: OrderOversightFilters) {
  const { page, limit, status, dateFrom, dateTo } = filters

  const where = {
    ...(status ? { status: status as OrderStatus } : {}),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          },
        }
      : {}),
  }

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        user: { select: { id: true, email: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
  ])

  return { items, total }
}

// ---------------------------------------------------------------------------
// Sellers
// ---------------------------------------------------------------------------

export async function findAllSellersOversight(filters: SellerOversightFilters) {
  const { page, limit, status } = filters

  const where = status
    ? { verificationStatus: status as import('@/app/generated/prisma/client').SellerVerificationStatus }
    : {}

  const [items, total] = await Promise.all([
    prisma.sellerProfile.findMany({
      where,
      include: {
        user: {
          include: {
            stores: { select: { id: true, isActive: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.sellerProfile.count({ where }),
  ])

  return { items, total }
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export async function findAllProductsOversight(filters: ProductOversightFilters) {
  const { page, limit, status, search } = filters

  const where = {
    ...(status ? { status: status as ProductStatus } : {}),
    ...(search
      ? {
          name: { contains: search, mode: 'insensitive' as const },
        }
      : {}),
  }

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        store: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ])

  return { items, total }
}

// ---------------------------------------------------------------------------
// Store options
// ---------------------------------------------------------------------------

export async function findAdminStoreOptions(filters: StoreOptionFilters) {
  const { page, limit, q } = filters

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: 'insensitive' as const } },
          { slug: { contains: q, mode: 'insensitive' as const } },
          { owner: { email: { contains: q, mode: 'insensitive' as const } } },
        ],
      }
    : {}

  const [items, total] = await Promise.all([
    prisma.store.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        ownerId: true,
        isActive: true,
        owner: {
          select: {
            email: true,
          },
        },
      },
      orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.store.count({ where }),
  ])

  return { items, total }
}
