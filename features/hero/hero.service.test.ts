import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SessionUser } from '@/features/auth/auth.dto'
import { ForbiddenError } from '@/lib/errors/auth'
import {
  HeroBannerNotFoundError,
  InvalidHeroBannerDestinationError,
  InvalidHeroBannerError,
} from '@/lib/errors/hero'

vi.mock('./hero.repository', () => ({
  categoryExists: vi.fn(),
  countAdminHeroBanners: vi.fn(),
  createHeroBanner: vi.fn(),
  deleteHeroBanner: vi.fn(),
  findHeroBannerById: vi.fn(),
  findHeroBannersByIds: vi.fn(),
  listActiveHeroBanners: vi.fn(),
  listAdminHeroBanners: vi.fn(),
  productExists: vi.fn(),
  promotionExists: vi.fn(),
  storeExists: vi.fn(),
  updateHeroBanner: vi.fn(),
  updateHeroBannerSortOrders: vi.fn(),
}))

vi.mock('@/lib/auth/guards', () => ({
  requireAdmin: vi.fn(),
}))

vi.mock('@/lib/repository/context', () => ({
  runServiceTransaction: vi.fn((callback: (db: unknown) => unknown) => callback({})),
}))

import * as repository from './hero.repository'
import * as guards from '@/lib/auth/guards'
import {
  createAdminHeroBanner,
  getAdminHeroBanners,
  getPublicHeroBanners,
  publishAdminHeroBanner,
  reorderAdminHeroBanners,
} from './hero.service'

const mockedRepository = vi.mocked(repository)
const mockedGuards = vi.mocked(guards)

const adminUser: SessionUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'admin@example.com',
  roles: ['ADMIN'],
}

function decimal(value: string) {
  return { toString: () => value }
}

function makeBanner(overrides: Record<string, unknown> = {}) {
  return {
    id: '33333333-3333-4333-8333-333333333333',
    eyebrow: 'Sale',
    title: 'Summer drop',
    subtitle: null,
    description: null,
    desktopImageUrl: 'https://example.com/desktop.jpg',
    desktopImageStoragePath: 'hero/desktop.jpg',
    tabletImageUrl: null,
    tabletImageStoragePath: null,
    mobileImageUrl: null,
    mobileImageStoragePath: null,
    imageAlt: 'Summer collection',
    backgroundColor: '#1d2533',
    textColor: '#ffffff',
    overlayOpacity: decimal('0.35'),
    ctaText: null,
    destinationType: 'NONE',
    categoryId: null,
    productId: null,
    storeId: null,
    promotionId: null,
    searchQuery: null,
    customUrl: null,
    sortOrder: 0,
    status: 'DRAFT',
    autoplay: false,
    autoplayDelay: null,
    openInNewTab: false,
    publishStartAt: new Date('2026-07-29T00:00:00.000Z'),
    publishEndAt: null,
    createdById: adminUser.id,
    updatedById: null,
    createdAt: new Date('2026-07-29T00:00:00.000Z'),
    updatedAt: new Date('2026-07-29T00:00:00.000Z'),
    category: null,
    product: null,
    store: null,
    promotion: null,
    ...overrides,
  } as never
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedGuards.requireAdmin.mockReturnValue(undefined)
  mockedRepository.categoryExists.mockResolvedValue(true)
  mockedRepository.productExists.mockResolvedValue(true)
  mockedRepository.storeExists.mockResolvedValue(true)
  mockedRepository.promotionExists.mockResolvedValue(true)
  mockedRepository.listAdminHeroBanners.mockResolvedValue([])
  mockedRepository.countAdminHeroBanners.mockResolvedValue(0)
})

describe('getPublicHeroBanners', () => {
  it('uses the active banner repository query and maps DTOs', async () => {
    const now = new Date('2026-07-29T12:00:00.000Z')
    mockedRepository.listActiveHeroBanners.mockResolvedValue([
      makeBanner({ id: 'banner-active', status: 'PUBLISHED' }),
    ])

    const result = await getPublicHeroBanners({ limit: 4 }, now)

    expect(mockedRepository.listActiveHeroBanners).toHaveBeenCalledWith({ now, limit: 4 })
    expect(result.items).toEqual([
      expect.objectContaining({
        id: 'banner-active',
        status: 'PUBLISHED',
        overlayOpacity: '0.35',
      }),
    ])
  })
})

describe('admin hero banners', () => {
  it('requires admin access for admin listing', async () => {
    mockedGuards.requireAdmin.mockImplementationOnce(() => {
      throw new ForbiddenError()
    })

    await expect(
      getAdminHeroBanners(adminUser, {
        page: 1,
        limit: 20,
      }),
    ).rejects.toBeInstanceOf(ForbiddenError)

    expect(mockedRepository.listAdminHeroBanners).not.toHaveBeenCalled()
  })

  it('creates category destination banners with exactly one target', async () => {
    mockedRepository.createHeroBanner.mockImplementation(async (data) =>
      makeBanner({
        ...data,
        destinationType: 'CATEGORY',
        categoryId: 'cat-1',
        ctaText: 'Переглянути',
      }),
    )

    await createAdminHeroBanner(adminUser, {
      title: 'Category hero',
      ctaText: 'Переглянути',
      destinationType: 'CATEGORY',
      categoryId: 'cat-1',
    })

    expect(mockedRepository.categoryExists).toHaveBeenCalledWith('cat-1')
    expect(mockedRepository.createHeroBanner).toHaveBeenCalledWith(
      expect.objectContaining({
        destinationType: 'CATEGORY',
        categoryId: 'cat-1',
        productId: null,
        storeId: null,
        promotionId: null,
        searchQuery: null,
        customUrl: null,
        createdById: adminUser.id,
        updatedById: adminUser.id,
      }),
    )
  })

  it('rejects destination targets that do not exist', async () => {
    mockedRepository.productExists.mockResolvedValue(false)

    await expect(
      createAdminHeroBanner(adminUser, {
        title: 'Product hero',
        ctaText: 'Переглянути',
        destinationType: 'PRODUCT',
        productId: '22222222-2222-4222-8222-222222222222',
      }),
    ).rejects.toBeInstanceOf(InvalidHeroBannerDestinationError)

    expect(mockedRepository.createHeroBanner).not.toHaveBeenCalled()
  })

  it('rejects external custom URLs', async () => {
    await expect(
      createAdminHeroBanner(adminUser, {
        title: 'Custom hero',
        ctaText: 'Переглянути',
        destinationType: 'CUSTOM_URL',
        customUrl: 'https://example.com',
      }),
    ).rejects.toBeInstanceOf(InvalidHeroBannerDestinationError)
  })

  it('publishes only banners with required public content', async () => {
    mockedRepository.findHeroBannerById.mockResolvedValue(makeBanner())
    mockedRepository.updateHeroBanner.mockResolvedValue(
      makeBanner({
        status: 'PUBLISHED',
        updatedById: adminUser.id,
      }),
    )

    const result = await publishAdminHeroBanner(
      adminUser,
      '33333333-3333-4333-8333-333333333333',
    )

    expect(mockedRepository.updateHeroBanner).toHaveBeenCalledWith(
      '33333333-3333-4333-8333-333333333333',
      expect.objectContaining({
        status: 'PUBLISHED',
      }),
    )
    expect(result.status).toBe('PUBLISHED')
  })

  it('blocks publishing incomplete banners', async () => {
    mockedRepository.findHeroBannerById.mockResolvedValue(
      makeBanner({
        desktopImageUrl: null,
      }),
    )

    await expect(
      publishAdminHeroBanner(adminUser, '33333333-3333-4333-8333-333333333333'),
    ).rejects.toBeInstanceOf(InvalidHeroBannerError)

    expect(mockedRepository.updateHeroBanner).not.toHaveBeenCalled()
  })

  it('rejects reorder requests containing unknown banners', async () => {
    mockedRepository.findHeroBannersByIds.mockResolvedValue([{ id: 'banner-1' }])

    await expect(
      reorderAdminHeroBanners(adminUser, {
        items: [
          { id: 'banner-1', sortOrder: 0 },
          { id: 'banner-2', sortOrder: 1 },
        ],
      }),
    ).rejects.toBeInstanceOf(HeroBannerNotFoundError)

    expect(mockedRepository.updateHeroBannerSortOrders).not.toHaveBeenCalled()
  })
})
