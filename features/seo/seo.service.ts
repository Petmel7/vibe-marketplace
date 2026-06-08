import { SeoEntityType } from '@/app/generated/prisma/enums'
import { requireAdmin } from '@/lib/auth/guards'
import type { SessionUser } from '@/features/auth/auth.dto'
import { InvalidSeoMetadataError, SeoEntityNotFoundError, SeoMetadataNotFoundError } from '@/lib/errors/seo'
import {
  buildBreadcrumbJsonLd,
  buildCanonicalUrl,
  buildDefaultRobotsConfig,
  buildProductJsonLd,
  buildStaticSitemapEntries,
  buildWebsiteSearchActionJsonLd,
  getSeoBaseUrl,
} from './seo.helpers'
import type {
  BreadcrumbJsonLdItemDto,
  CategorySeoDto,
  CreateSeoMetadataInputDto,
  PageSeoDto,
  ProductSeoDto,
  ResolvedSeoMetadataDto,
  RobotsConfigDto,
  SeoListDto,
  SeoListQueryDto,
  SeoMetadataDto,
  SitemapEntryDto,
  StoreSeoDto,
  UpdateSeoMetadataInputDto,
  WebSiteSearchActionJsonLdDto,
} from './seo.dto'
import {
  countSeoMetadata,
  createSeoMetadata,
  deleteSeoMetadata,
  findPublicCategoryByIdOrSlug,
  findPublicProductByIdOrSlug,
  findPublicStoreByIdOrSlug,
  findSeoMetadataByEntity,
  findSeoMetadataById,
  listPublicCategoriesForSitemap,
  listPublicProductsForSitemap,
  listSeoMetadata,
  updateSeoMetadata,
  type SeoMetadataRecord,
} from './seo.repository'

function toSeoMetadataDto(record: SeoMetadataRecord): SeoMetadataDto {
  return {
    id: record.id,
    entityType: record.entityType,
    entityId: record.entityId,
    title: record.title,
    description: record.description,
    keywords: record.keywords,
    canonicalUrl: record.canonicalUrl,
    ogTitle: record.ogTitle,
    ogDescription: record.ogDescription,
    ogImageUrl: record.ogImageUrl,
    noIndex: record.noIndex,
    noFollow: record.noFollow,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

function resolveValue<T>(
  overrideValue: T | null | undefined,
  entityValue: T | null | undefined,
  fallbackValue: T | null | undefined,
) {
  return overrideValue ?? entityValue ?? fallbackValue ?? null
}

function inferSource(input: {
  override?: SeoMetadataRecord | null
  usedEntityField: boolean
}): ResolvedSeoMetadataDto['source'] {
  if (input.override) {
    return 'override'
  }

  if (input.usedEntityField) {
    return 'entity'
  }

  return 'generated'
}

function resolveRobotsFlags(override?: SeoMetadataRecord | null) {
  return {
    noIndex: override?.noIndex ?? false,
    noFollow: override?.noFollow ?? false,
  }
}

function assertPublicIdentifier(input: { id?: string; slug?: string }) {
  if (!input.id && !input.slug) {
    throw new InvalidSeoMetadataError('SEO entity lookup requires id or slug')
  }
}

export async function getGlobalSeo(): Promise<PageSeoDto> {
  const override = await findSeoMetadataByEntity(SeoEntityType.GLOBAL, null)
  const title = override?.title ?? 'Marketplace'
  const description = override?.description ?? 'Marketplace одягу, взуття та аксесуарів з доставкою по Україні.'
  const canonicalUrl = override?.canonicalUrl ?? buildCanonicalUrl('/')
  const source = inferSource({ override, usedEntityField: false })
  const robots = resolveRobotsFlags(override)

  return {
    entityType: SeoEntityType.GLOBAL,
    entityId: null,
    pageKey: 'global',
    title,
    description,
    keywords: override?.keywords ?? null,
    canonicalUrl,
    ogTitle: override?.ogTitle ?? title,
    ogDescription: override?.ogDescription ?? description,
    ogImageUrl: override?.ogImageUrl ?? null,
    noIndex: robots.noIndex,
    noFollow: robots.noFollow,
    source,
  }
}

export async function getPageSeo(pageKey: string): Promise<PageSeoDto> {
  const override = await findSeoMetadataByEntity(SeoEntityType.PAGE, pageKey)
  const defaultTitle = pageKey === 'catalog' ? 'Каталог товарів | Marketplace' : 'Marketplace'
  const defaultDescription =
    pageKey === 'catalog'
      ? 'Каталог одягу, взуття та аксесуарів з доставкою по Україні.'
      : 'Marketplace одягу, взуття та аксесуарів.'
  const canonicalPath = pageKey === 'home' ? '/' : `/${pageKey}`
  const source = inferSource({ override, usedEntityField: false })
  const robots = resolveRobotsFlags(override)

  return {
    entityType: SeoEntityType.PAGE,
    entityId: pageKey,
    pageKey,
    title: override?.title ?? defaultTitle,
    description: override?.description ?? defaultDescription,
    keywords: override?.keywords ?? null,
    canonicalUrl: override?.canonicalUrl ?? buildCanonicalUrl(canonicalPath),
    ogTitle: override?.ogTitle ?? override?.title ?? defaultTitle,
    ogDescription: override?.ogDescription ?? override?.description ?? defaultDescription,
    ogImageUrl: override?.ogImageUrl ?? null,
    noIndex: robots.noIndex,
    noFollow: robots.noFollow,
    source,
  }
}

export async function getProductSeo(input: { id?: string; slug?: string }): Promise<ProductSeoDto> {
  assertPublicIdentifier(input)

  const product = await findPublicProductByIdOrSlug(input)
  if (!product) {
    throw new SeoEntityNotFoundError('Public product SEO is unavailable for this entity')
  }

  const override = await findSeoMetadataByEntity(SeoEntityType.PRODUCT, product.id)
  const fallbackTitle = `${product.name} купити онлайн | ${product.store.name}`
  const fallbackDescription = `${product.name}. Ціна, відгуки та доставка по Україні.`
  const canonicalUrl = override?.canonicalUrl ?? buildCanonicalUrl(`/products/${product.id}`)
  const source = inferSource({ override, usedEntityField: false })
  const robots = resolveRobotsFlags(override)

  const breadcrumbItems: BreadcrumbJsonLdItemDto[] = [
    { name: 'Головна', item: buildCanonicalUrl('/') },
    { name: 'Каталог', item: buildCanonicalUrl('/catalog') },
  ]

  if (product.category) {
    breadcrumbItems.push({
      name: product.category.name,
      item: buildCanonicalUrl(`/products/category/${product.category.slug}`),
    })
  }

  breadcrumbItems.push({
    name: product.name,
    item: canonicalUrl,
  })

  return {
    entityType: SeoEntityType.PRODUCT,
    entityId: product.id,
    productId: product.id,
    productName: product.name,
    storeName: product.store.name,
    storeSlug: product.store.slug,
    categoryName: product.category?.name ?? null,
    categorySlug: product.category?.slug ?? null,
    title: override?.title ?? fallbackTitle,
    description: override?.description ?? fallbackDescription,
    keywords: override?.keywords ?? null,
    canonicalUrl,
    ogTitle: override?.ogTitle ?? override?.title ?? fallbackTitle,
    ogDescription: override?.ogDescription ?? override?.description ?? fallbackDescription,
    ogImageUrl: override?.ogImageUrl ?? product.imageUrl,
    noIndex: robots.noIndex,
    noFollow: robots.noFollow,
    source,
    productJsonLd: buildProductJsonLd({
      name: product.name,
      description: product.description?.trim() || fallbackDescription,
      imageUrls: product.imageUrl ? [product.imageUrl] : [],
      sku: product.sku,
      category: product.category?.name ?? null,
      storeName: product.store.name,
      url: canonicalUrl,
      price: product.price.toString(),
    }),
    breadcrumbJsonLd: buildBreadcrumbJsonLd(breadcrumbItems),
  }
}

export async function getCategorySeo(input: { id?: string; slug?: string }): Promise<CategorySeoDto> {
  assertPublicIdentifier(input)

  const category = await findPublicCategoryByIdOrSlug(input)
  if (!category) {
    throw new SeoEntityNotFoundError('Public category SEO is unavailable for this entity')
  }

  const override = await findSeoMetadataByEntity(SeoEntityType.CATEGORY, category.id)
  const fallbackTitle = `${category.name} купити онлайн | Marketplace`
  const fallbackDescription =
    category.seoText?.trim() || `${category.name}. Добірка товарів з доставкою по Україні.`
  const canonicalUrl = override?.canonicalUrl ?? buildCanonicalUrl(`/products/category/${category.slug}`)
  const usedEntityField = Boolean(category.seoTitle || category.seoDescription || category.seoText)
  const source = inferSource({ override, usedEntityField })
  const robots = resolveRobotsFlags(override)

  return {
    entityType: SeoEntityType.CATEGORY,
    entityId: category.id,
    categoryId: category.id,
    categoryName: category.name,
    categorySlug: category.slug,
    title: resolveValue(override?.title, category.seoTitle, fallbackTitle) as string,
    description: resolveValue(override?.description, category.seoDescription, fallbackDescription),
    keywords: override?.keywords ?? null,
    canonicalUrl,
    ogTitle: resolveValue(override?.ogTitle, category.seoTitle, fallbackTitle) as string,
    ogDescription: resolveValue(override?.ogDescription, category.seoDescription, fallbackDescription),
    ogImageUrl: override?.ogImageUrl ?? null,
    noIndex: robots.noIndex,
    noFollow: robots.noFollow,
    source,
    breadcrumbJsonLd: buildBreadcrumbJsonLd([
      { name: 'Головна', item: buildCanonicalUrl('/') },
      { name: 'Каталог', item: buildCanonicalUrl('/catalog') },
      { name: category.name, item: canonicalUrl },
    ]),
  }
}

export async function getStoreSeo(input: { id?: string; slug?: string }): Promise<StoreSeoDto> {
  assertPublicIdentifier(input)

  const store = await findPublicStoreByIdOrSlug(input)
  if (!store) {
    throw new SeoEntityNotFoundError('Public store SEO is unavailable for this entity')
  }

  const override = await findSeoMetadataByEntity(SeoEntityType.STORE, store.id)
  const fallbackTitle = `${store.name} | Marketplace`
  const fallbackDescription = store.description?.trim() || `${store.name}. Магазин маркетплейсу з доставкою по Україні.`
  const canonicalUrl = override?.canonicalUrl ?? buildCanonicalUrl(`/stores/${store.slug}`)
  const usedEntityField = Boolean(store.seoTitle || store.seoDescription)
  const source = inferSource({ override, usedEntityField })
  const robots = resolveRobotsFlags(override)

  return {
    entityType: SeoEntityType.STORE,
    entityId: store.id,
    storeId: store.id,
    storeName: store.name,
    storeSlug: store.slug,
    title: resolveValue(override?.title, store.seoTitle, fallbackTitle) as string,
    description: resolveValue(override?.description, store.seoDescription, fallbackDescription),
    keywords: override?.keywords ?? null,
    canonicalUrl,
    ogTitle: resolveValue(override?.ogTitle, store.seoTitle, fallbackTitle) as string,
    ogDescription: resolveValue(override?.ogDescription, store.seoDescription, fallbackDescription),
    ogImageUrl: override?.ogImageUrl ?? store.logoUrl,
    noIndex: robots.noIndex,
    noFollow: robots.noFollow,
    source,
  }
}

export async function getSitemapEntries(): Promise<SitemapEntryDto[]> {
  const [staticEntries, categories, products] = await Promise.all([
    Promise.resolve(buildStaticSitemapEntries()),
    listPublicCategoriesForSitemap(),
    listPublicProductsForSitemap(),
  ])

  const categoryEntries = categories.map((category) => ({
    loc: buildCanonicalUrl(`/products/category/${category.slug}`),
    lastModified: category.updatedAt.toISOString(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  const productEntries = products.map((product) => ({
    loc: buildCanonicalUrl(`/products/${product.id}`),
    lastModified: product.updatedAt.toISOString(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  return [...staticEntries, ...categoryEntries, ...productEntries]
}

export async function getRobotsConfig(): Promise<RobotsConfigDto> {
  return buildDefaultRobotsConfig()
}

export function getWebsiteSearchActionJsonLd(): WebSiteSearchActionJsonLdDto {
  return buildWebsiteSearchActionJsonLd({
    siteName: 'Marketplace',
    searchUrlTemplate: `${getSeoBaseUrl()}/search?q={q}`,
  })
}

export async function getAdminSeoMetadata(user: SessionUser, query: SeoListQueryDto): Promise<SeoListDto> {
  requireAdmin(user)
  const [items, total] = await Promise.all([
    listSeoMetadata(query),
    countSeoMetadata(query),
  ])

  return {
    items: items.map(toSeoMetadataDto),
    page: query.page,
    limit: query.limit,
    total,
  }
}

export async function getAdminSeoMetadataById(user: SessionUser, id: string): Promise<SeoMetadataDto> {
  requireAdmin(user)
  const item = await findSeoMetadataById(id)
  if (!item) {
    throw new SeoMetadataNotFoundError()
  }

  return toSeoMetadataDto(item)
}

function validateEntityInput(input: { entityType: SeoEntityType; entityId?: string | null }) {
  if (input.entityType === SeoEntityType.GLOBAL && input.entityId) {
    throw new InvalidSeoMetadataError('GLOBAL SEO metadata cannot include entityId')
  }

  if (input.entityType !== SeoEntityType.GLOBAL && !input.entityId) {
    throw new InvalidSeoMetadataError('entityId is required for PAGE, PRODUCT, CATEGORY, and STORE SEO metadata')
  }
}

export async function createAdminSeoMetadata(user: SessionUser, input: CreateSeoMetadataInputDto): Promise<SeoMetadataDto> {
  requireAdmin(user)
  validateEntityInput(input)
  const item = await createSeoMetadata(input)
  return toSeoMetadataDto(item)
}

export async function updateAdminSeoMetadata(
  user: SessionUser,
  id: string,
  input: UpdateSeoMetadataInputDto,
): Promise<SeoMetadataDto> {
  requireAdmin(user)
  const existing = await findSeoMetadataById(id)
  if (!existing) {
    throw new SeoMetadataNotFoundError()
  }

  const nextEntityType = input.entityType ?? existing.entityType
  const nextEntityId = input.entityId !== undefined ? input.entityId : existing.entityId
  validateEntityInput({ entityType: nextEntityType, entityId: nextEntityId })

  const item = await updateSeoMetadata(id, input)
  return toSeoMetadataDto(item)
}

export async function deleteAdminSeoMetadata(user: SessionUser, id: string): Promise<void> {
  requireAdmin(user)
  const existing = await findSeoMetadataById(id)
  if (!existing) {
    throw new SeoMetadataNotFoundError()
  }

  await deleteSeoMetadata(id)
}
