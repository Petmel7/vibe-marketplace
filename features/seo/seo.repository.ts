import { Prisma } from '@/app/generated/prisma/client'
import { ProductStatus, SeoEntityType } from '@/app/generated/prisma/enums'
import { prisma } from '@/lib/prisma'
import { InvalidSeoMetadataError } from '@/lib/errors/seo'
import type {
  CreateSeoMetadataInputDto,
  SeoListQueryDto,
  UpdateSeoMetadataInputDto,
} from './seo.dto'

const seoSelect = {
  id: true,
  entityType: true,
  entityId: true,
  title: true,
  description: true,
  keywords: true,
  canonicalUrl: true,
  ogTitle: true,
  ogDescription: true,
  ogImageUrl: true,
  noIndex: true,
  noFollow: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SeoMetadataSelect

export type SeoMetadataRecord = Prisma.SeoMetadataGetPayload<{ select: typeof seoSelect }>

export type PublicProductSeoRecord = {
  id: string
  name: string
  description: string | null
  sku: string | null
  price: Prisma.Decimal
  updatedAt: Date
  imageUrl: string | null
  category: { id: string; name: string; slug: string } | null
  store: { id: string; name: string; slug: string; isActive: boolean }
}

export type PublicCategorySeoRecord = {
  id: string
  name: string
  slug: string
  seoTitle: string | null
  seoDescription: string | null
  seoText: string | null
  updatedAt: Date
}

export type PublicStoreSeoRecord = {
  id: string
  name: string
  slug: string
  description: string | null
  seoTitle: string | null
  seoDescription: string | null
  logoUrl: string | null
  updatedAt: Date
}

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

function buildSeoWhere(query: SeoListQueryDto): Prisma.SeoMetadataWhereInput {
  return {
    ...(query.entityType ? { entityType: query.entityType } : {}),
    ...(query.entityId ? { entityId: query.entityId } : {}),
  }
}

export async function findSeoMetadataById(id: string) {
  return prisma.seoMetadata.findUnique({
    where: { id },
    select: seoSelect,
  })
}

export async function findSeoMetadataByEntity(entityType: SeoEntityType, entityId: string | null) {
  if (entityId === null) {
    return prisma.seoMetadata.findFirst({
      where: {
        entityType,
        entityId: null,
      },
      select: seoSelect,
    })
  }

  return prisma.seoMetadata.findUnique({
    where: {
      entityType_entityId: {
        entityType,
        entityId,
      },
    },
    select: seoSelect,
  })
}

export async function listSeoMetadata(query: SeoListQueryDto) {
  return prisma.seoMetadata.findMany({
    where: buildSeoWhere(query),
    select: seoSelect,
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    skip: (query.page - 1) * query.limit,
    take: query.limit,
  })
}

export async function countSeoMetadata(query: SeoListQueryDto) {
  return prisma.seoMetadata.count({
    where: buildSeoWhere(query),
  })
}

export async function createSeoMetadata(data: CreateSeoMetadataInputDto) {
  try {
    return await prisma.seoMetadata.create({
      data: {
        entityType: data.entityType,
        entityId: data.entityId ?? null,
        title: data.title,
        description: data.description ?? null,
        keywords: data.keywords ?? null,
        canonicalUrl: data.canonicalUrl ?? null,
        ogTitle: data.ogTitle ?? null,
        ogDescription: data.ogDescription ?? null,
        ogImageUrl: data.ogImageUrl ?? null,
        noIndex: data.noIndex ?? false,
        noFollow: data.noFollow ?? false,
      },
      select: seoSelect,
    })
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new InvalidSeoMetadataError('SEO metadata already exists for this entity')
    }

    throw error
  }
}

export async function updateSeoMetadata(id: string, data: UpdateSeoMetadataInputDto) {
  try {
    return await prisma.seoMetadata.update({
      where: { id },
      data: {
        ...(data.entityType !== undefined ? { entityType: data.entityType } : {}),
        ...(data.entityId !== undefined ? { entityId: data.entityId ?? null } : {}),
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description ?? null } : {}),
        ...(data.keywords !== undefined ? { keywords: data.keywords ?? null } : {}),
        ...(data.canonicalUrl !== undefined ? { canonicalUrl: data.canonicalUrl ?? null } : {}),
        ...(data.ogTitle !== undefined ? { ogTitle: data.ogTitle ?? null } : {}),
        ...(data.ogDescription !== undefined ? { ogDescription: data.ogDescription ?? null } : {}),
        ...(data.ogImageUrl !== undefined ? { ogImageUrl: data.ogImageUrl ?? null } : {}),
        ...(data.noIndex !== undefined ? { noIndex: data.noIndex } : {}),
        ...(data.noFollow !== undefined ? { noFollow: data.noFollow } : {}),
      },
      select: seoSelect,
    })
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new InvalidSeoMetadataError('SEO metadata already exists for this entity')
    }

    throw error
  }
}

export async function deleteSeoMetadata(id: string) {
  return prisma.seoMetadata.delete({
    where: { id },
    select: seoSelect,
  })
}

export async function findPublicProductByIdOrSlug(input: { id?: string; slug?: string }) {
  if (!input.id && !input.slug) {
    return null
  }

  return prisma.product.findFirst({
    where: {
      ...(input.id ? { id: input.id } : {}),
      ...(input.slug ? { id: input.slug } : {}),
      status: ProductStatus.PUBLISHED,
      isActive: true,
      store: {
        isActive: true,
      },
    },
    select: {
      id: true,
      name: true,
      description: true,
      sku: true,
      price: true,
      updatedAt: true,
      imageUrl: true,
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      store: {
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
        },
      },
    },
  })
}

export async function findPublicCategoryByIdOrSlug(input: { id?: string; slug?: string }) {
  if (!input.id && !input.slug) {
    return null
  }

  return prisma.category.findFirst({
    where: {
      ...(input.id ? { id: input.id } : {}),
      ...(input.slug ? { slug: input.slug } : {}),
      isActive: true,
      isVisible: true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      seoTitle: true,
      seoDescription: true,
      seoText: true,
      updatedAt: true,
    },
  })
}

export async function findPublicStoreByIdOrSlug(input: { id?: string; slug?: string }) {
  if (!input.id && !input.slug) {
    return null
  }

  return prisma.store.findFirst({
    where: {
      ...(input.id ? { id: input.id } : {}),
      ...(input.slug ? { slug: input.slug } : {}),
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      seoTitle: true,
      seoDescription: true,
      logoUrl: true,
      updatedAt: true,
    },
  })
}

export async function listPublicCategoriesForSitemap() {
  return prisma.category.findMany({
    where: {
      isActive: true,
      isVisible: true,
    },
    select: {
      slug: true,
      updatedAt: true,
    },
    orderBy: [{ updatedAt: 'desc' }, { slug: 'asc' }],
  })
}

export async function listPublicProductsForSitemap() {
  return prisma.product.findMany({
    where: {
      status: ProductStatus.PUBLISHED,
      isActive: true,
      store: {
        isActive: true,
      },
    },
    select: {
      id: true,
      updatedAt: true,
    },
    orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
  })
}
