import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/seo/seo.repository', () => ({
  countSeoMetadata: vi.fn(),
  createSeoMetadata: vi.fn(),
  deleteSeoMetadata: vi.fn(),
  findPublicCategoryByIdOrSlug: vi.fn(),
  findPublicProductByIdOrSlug: vi.fn(),
  findPublicStoreByIdOrSlug: vi.fn(),
  findSeoMetadataByEntity: vi.fn(),
  findSeoMetadataById: vi.fn(),
  listPublicCategoriesForSitemap: vi.fn(),
  listPublicProductsForSitemap: vi.fn(),
  listSeoMetadata: vi.fn(),
  updateSeoMetadata: vi.fn(),
}))

vi.mock('@/lib/auth/guards', () => ({
  requireAdmin: vi.fn(),
}))

vi.mock('@/config/env', () => ({
  getServerEnv: vi.fn(() => ({
    APP_URL: 'https://marketplace.example.com',
  })),
}))

import { SeoEntityType } from '@/app/generated/prisma/enums'
import type { SessionUser } from '@/features/auth/auth.dto'
import * as repo from './seo.repository'
import * as guards from '@/lib/auth/guards'
import {
  createAdminSeoMetadata,
  getCategorySeo,
  getProductSeo,
  getRobotsConfig,
  getSitemapEntries,
} from './seo.service'
import { buildCanonicalUrl } from './seo.helpers'
import { InvalidSeoMetadataError, SeoEntityNotFoundError } from '@/lib/errors/seo'

const mockRepo = vi.mocked(repo)
const mockGuards = vi.mocked(guards)

const adminUser: SessionUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'admin@example.com',
  roles: ['ADMIN'],
}

function makeSeoOverride(overrides: Record<string, unknown> = {}) {
  return {
    id: 'seo-1',
    entityType: SeoEntityType.PRODUCT,
    entityId: 'product-1',
    title: 'Override title',
    description: 'Override description',
    keywords: 'dress, evening',
    canonicalUrl: 'https://marketplace.example.com/products/product-1',
    ogTitle: 'Override OG title',
    ogDescription: 'Override OG description',
    ogImageUrl: 'https://cdn.example.com/override.jpg',
    noIndex: false,
    noFollow: false,
    createdAt: new Date('2026-06-08T12:00:00.000Z'),
    updatedAt: new Date('2026-06-08T12:00:00.000Z'),
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  mockGuards.requireAdmin.mockReturnValue(undefined)
  mockRepo.findSeoMetadataByEntity.mockResolvedValue(null as never)
  mockRepo.listPublicCategoriesForSitemap.mockResolvedValue([] as never)
  mockRepo.listPublicProductsForSitemap.mockResolvedValue([] as never)
})

describe('public SEO resolution', () => {
  it('builds product SEO fallback metadata', async () => {
    mockRepo.findPublicProductByIdOrSlug.mockResolvedValue({
      id: 'product-1',
      name: 'Пальто вовняне',
      description: 'Core description',
      sku: 'SKU-1',
      price: { toString: () => '1299.00' },
      updatedAt: new Date('2026-06-08T12:00:00.000Z'),
      imageUrl: 'https://cdn.example.com/product.jpg',
      category: {
        id: 'category-1',
        name: 'Пальта',
        slug: 'palta',
      },
      store: {
        id: 'store-1',
        name: 'Atelier',
        slug: 'atelier',
        isActive: true,
      },
    } as never)

    const result = await getProductSeo({ id: 'product-1' })

    expect(result.title).toBe('Пальто вовняне купити онлайн | Atelier')
    expect(result.description).toBe('Пальто вовняне. Ціна, відгуки та доставка по Україні.')
    expect(result.source).toBe('generated')
    expect(result.canonicalUrl).toBe('https://marketplace.example.com/products/product-1')
  })

  it('builds category SEO fallback metadata', async () => {
    mockRepo.findPublicCategoryByIdOrSlug.mockResolvedValue({
      id: 'category-1',
      name: 'Сукні',
      slug: 'sukni',
      seoTitle: null,
      seoDescription: null,
      seoText: null,
      updatedAt: new Date('2026-06-08T12:00:00.000Z'),
    } as never)

    const result = await getCategorySeo({ slug: 'sukni' })

    expect(result.title).toBe('Сукні купити онлайн | Marketplace')
    expect(result.source).toBe('generated')
  })

  it('lets explicit overrides win over generated fallback', async () => {
    mockRepo.findPublicProductByIdOrSlug.mockResolvedValue({
      id: 'product-1',
      name: 'Пальто вовняне',
      description: 'Core description',
      sku: 'SKU-1',
      price: { toString: () => '1299.00' },
      updatedAt: new Date('2026-06-08T12:00:00.000Z'),
      imageUrl: 'https://cdn.example.com/product.jpg',
      category: null,
      store: {
        id: 'store-1',
        name: 'Atelier',
        slug: 'atelier',
        isActive: true,
      },
    } as never)
    mockRepo.findSeoMetadataByEntity.mockResolvedValue(makeSeoOverride() as never)

    const result = await getProductSeo({ id: 'product-1' })

    expect(result.title).toBe('Override title')
    expect(result.ogTitle).toBe('Override OG title')
    expect(result.source).toBe('override')
  })

  it('rejects unpublished or non-public products', async () => {
    mockRepo.findPublicProductByIdOrSlug.mockResolvedValue(null as never)

    await expect(getProductSeo({ id: 'product-1' })).rejects.toBeInstanceOf(SeoEntityNotFoundError)
  })
})

describe('sitemap and robots', () => {
  it('excludes non-public products from sitemap by only using repository public listings', async () => {
    mockRepo.listPublicCategoriesForSitemap.mockResolvedValue([
      { slug: 'sukni', updatedAt: new Date('2026-06-08T12:00:00.000Z') },
    ] as never)
    mockRepo.listPublicProductsForSitemap.mockResolvedValue([
      { id: 'product-1', updatedAt: new Date('2026-06-08T12:00:00.000Z') },
    ] as never)

    const entries = await getSitemapEntries()

    expect(entries.some((entry) => entry.loc.endsWith('/products/product-1'))).toBe(true)
    expect(entries.some((entry) => entry.loc.endsWith('/products/category/sukni'))).toBe(true)
  })

  it('returns robots rules that disallow private routes', async () => {
    const robots = await getRobotsConfig()

    expect(robots.disallow).toContain('/admin')
    expect(robots.disallow).toContain('/seller')
    expect(robots.disallow).toContain('/profile')
    expect(robots.disallow).toContain('/checkout')
    expect(robots.disallow).toContain('/api')
  })

  it('builds canonical URLs from the app base URL', () => {
    expect(buildCanonicalUrl('/catalog')).toBe('https://marketplace.example.com/catalog')
  })
})

describe('admin SEO metadata', () => {
  it('validates entityType/entityId consistency for admin creates', async () => {
    await expect(
      createAdminSeoMetadata(adminUser, {
        entityType: SeoEntityType.GLOBAL,
        entityId: 'not-allowed',
        title: 'Marketplace',
      }),
    ).rejects.toBeInstanceOf(InvalidSeoMetadataError)
  })
})
