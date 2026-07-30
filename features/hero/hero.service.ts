import {
  HeroBannerDestinationType,
  HeroBannerStatus,
  Prisma,
} from '@/app/generated/prisma/client'
import type { SessionUser } from '@/features/auth/auth.dto'
import { requireAdmin } from '@/lib/auth/guards'
import {
  HeroBannerNotFoundError,
  InvalidHeroBannerDestinationError,
  InvalidHeroBannerError,
} from '@/lib/errors/hero'
import type {
  HeroBannerDto,
  HeroBannerListDto,
  HeroBannerQueryDto,
  HeroBannerUpdateDto,
  HeroBannerWriteDto,
  PublicHeroBannerListDto,
  PublicHeroBannerQueryDto,
  ReorderHeroBannersDto,
} from './hero.dto'
import {
  categoryExists,
  countAdminHeroBanners,
  createHeroBanner,
  deleteHeroBanner,
  findHeroBannerById,
  findHeroBannersByIds,
  listActiveHeroBanners,
  listAdminHeroBanners,
  productExists,
  promotionExists,
  storeExists,
  updateHeroBanner,
  updateHeroBannerSortOrders,
  type HeroBannerRecord,
} from './hero.repository'

type HeroBannerState = {
  eyebrow: string | null
  title: string
  subtitle: string | null
  description: string | null
  desktopImageUrl: string | null
  desktopImageStoragePath: string | null
  tabletImageUrl: string | null
  tabletImageStoragePath: string | null
  mobileImageUrl: string | null
  mobileImageStoragePath: string | null
  imageAlt: string | null
  backgroundColor: string | null
  textColor: string | null
  overlayOpacity: number
  ctaText: string | null
  destinationType: HeroBannerDestinationType
  categoryId: string | null
  productId: string | null
  storeId: string | null
  promotionId: string | null
  searchQuery: string | null
  customUrl: string | null
  sortOrder: number
  status: HeroBannerStatus
  autoplay: boolean
  autoplayDelay: number | null
  openInNewTab: boolean
  publishStartAt: Date
  publishEndAt: Date | null
}

const DEFAULT_OVERLAY_OPACITY = 0.35
const DEFAULT_AUTOPLAY_DELAY = 5000

function normalizeOptionalString(value: string | null | undefined) {
  if (value == null) {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeRequiredString(value: string) {
  return value.trim()
}

function isBlank(value: string | null | undefined) {
  return value == null || value.trim() === ''
}

function toDate(value: string | Date | null | undefined, fallback?: Date) {
  if (value == null) {
    return fallback ?? null
  }

  return value instanceof Date ? value : new Date(value)
}

function toHeroBannerDto(banner: HeroBannerRecord): HeroBannerDto {
  return {
    id: banner.id,
    eyebrow: banner.eyebrow ?? null,
    title: banner.title,
    subtitle: banner.subtitle ?? null,
    description: banner.description ?? null,
    desktopImageUrl: banner.desktopImageUrl ?? null,
    desktopImageStoragePath: banner.desktopImageStoragePath ?? null,
    tabletImageUrl: banner.tabletImageUrl ?? null,
    tabletImageStoragePath: banner.tabletImageStoragePath ?? null,
    mobileImageUrl: banner.mobileImageUrl ?? null,
    mobileImageStoragePath: banner.mobileImageStoragePath ?? null,
    imageAlt: banner.imageAlt ?? null,
    backgroundColor: banner.backgroundColor ?? null,
    textColor: banner.textColor ?? null,
    overlayOpacity: banner.overlayOpacity.toString(),
    ctaText: banner.ctaText ?? null,
    destination: {
      type: banner.destinationType,
      categoryId: banner.categoryId ?? null,
      categorySlug: banner.category?.slug ?? null,
      productId: banner.productId ?? null,
      storeId: banner.storeId ?? null,
      storeSlug: banner.store?.slug ?? null,
      promotionId: banner.promotionId ?? null,
      promotionCode: banner.promotion?.code ?? null,
      searchQuery: banner.searchQuery ?? null,
      customUrl: banner.customUrl ?? null,
    },
    sortOrder: banner.sortOrder,
    status: banner.status,
    autoplay: banner.autoplay,
    autoplayDelay: banner.autoplayDelay ?? null,
    openInNewTab: banner.openInNewTab,
    publishStartAt: banner.publishStartAt.toISOString(),
    publishEndAt: banner.publishEndAt?.toISOString() ?? null,
    createdById: banner.createdById,
    updatedById: banner.updatedById ?? null,
    createdAt: banner.createdAt.toISOString(),
    updatedAt: banner.updatedAt.toISOString(),
  }
}

function stateFromRecord(banner: HeroBannerRecord): HeroBannerState {
  return {
    eyebrow: banner.eyebrow ?? null,
    title: banner.title,
    subtitle: banner.subtitle ?? null,
    description: banner.description ?? null,
    desktopImageUrl: banner.desktopImageUrl ?? null,
    desktopImageStoragePath: banner.desktopImageStoragePath ?? null,
    tabletImageUrl: banner.tabletImageUrl ?? null,
    tabletImageStoragePath: banner.tabletImageStoragePath ?? null,
    mobileImageUrl: banner.mobileImageUrl ?? null,
    mobileImageStoragePath: banner.mobileImageStoragePath ?? null,
    imageAlt: banner.imageAlt ?? null,
    backgroundColor: banner.backgroundColor ?? null,
    textColor: banner.textColor ?? null,
    overlayOpacity: Number(banner.overlayOpacity.toString()),
    ctaText: banner.ctaText ?? null,
    destinationType: banner.destinationType,
    categoryId: banner.categoryId ?? null,
    productId: banner.productId ?? null,
    storeId: banner.storeId ?? null,
    promotionId: banner.promotionId ?? null,
    searchQuery: banner.searchQuery ?? null,
    customUrl: banner.customUrl ?? null,
    sortOrder: banner.sortOrder,
    status: banner.status,
    autoplay: banner.autoplay,
    autoplayDelay: banner.autoplayDelay ?? null,
    openInNewTab: banner.openInNewTab,
    publishStartAt: banner.publishStartAt,
    publishEndAt: banner.publishEndAt ?? null,
  }
}

function createStateFromInput(input: HeroBannerWriteDto): HeroBannerState {
  const autoplay = input.autoplay ?? false

  return normalizeDestinationState({
    eyebrow: normalizeOptionalString(input.eyebrow),
    title: normalizeRequiredString(input.title),
    subtitle: normalizeOptionalString(input.subtitle),
    description: normalizeOptionalString(input.description),
    desktopImageUrl: normalizeOptionalString(input.desktopImageUrl),
    desktopImageStoragePath: normalizeOptionalString(input.desktopImageStoragePath),
    tabletImageUrl: normalizeOptionalString(input.tabletImageUrl),
    tabletImageStoragePath: normalizeOptionalString(input.tabletImageStoragePath),
    mobileImageUrl: normalizeOptionalString(input.mobileImageUrl),
    mobileImageStoragePath: normalizeOptionalString(input.mobileImageStoragePath),
    imageAlt: normalizeOptionalString(input.imageAlt),
    backgroundColor: normalizeOptionalString(input.backgroundColor),
    textColor: normalizeOptionalString(input.textColor),
    overlayOpacity: input.overlayOpacity ?? DEFAULT_OVERLAY_OPACITY,
    ctaText: normalizeOptionalString(input.ctaText),
    destinationType: input.destinationType ?? HeroBannerDestinationType.NONE,
    categoryId: normalizeOptionalString(input.categoryId),
    productId: normalizeOptionalString(input.productId),
    storeId: normalizeOptionalString(input.storeId),
    promotionId: normalizeOptionalString(input.promotionId),
    searchQuery: normalizeOptionalString(input.searchQuery),
    customUrl: normalizeOptionalString(input.customUrl),
    sortOrder: input.sortOrder ?? 0,
    status: input.status ?? HeroBannerStatus.DRAFT,
    autoplay,
    autoplayDelay: autoplay ? input.autoplayDelay ?? DEFAULT_AUTOPLAY_DELAY : null,
    openInNewTab: input.openInNewTab ?? false,
    publishStartAt: toDate(input.publishStartAt, new Date()) as Date,
    publishEndAt: toDate(input.publishEndAt) as Date | null,
  })
}

function mergeState(current: HeroBannerRecord, input: HeroBannerUpdateDto): HeroBannerState {
  const state = stateFromRecord(current)
  const merged: HeroBannerState = {
    ...state,
    ...(input.eyebrow !== undefined ? { eyebrow: normalizeOptionalString(input.eyebrow) } : {}),
    ...(input.title !== undefined ? { title: normalizeRequiredString(input.title) } : {}),
    ...(input.subtitle !== undefined ? { subtitle: normalizeOptionalString(input.subtitle) } : {}),
    ...(input.description !== undefined
      ? { description: normalizeOptionalString(input.description) }
      : {}),
    ...(input.desktopImageUrl !== undefined
      ? { desktopImageUrl: normalizeOptionalString(input.desktopImageUrl) }
      : {}),
    ...(input.desktopImageStoragePath !== undefined
      ? { desktopImageStoragePath: normalizeOptionalString(input.desktopImageStoragePath) }
      : {}),
    ...(input.tabletImageUrl !== undefined
      ? { tabletImageUrl: normalizeOptionalString(input.tabletImageUrl) }
      : {}),
    ...(input.tabletImageStoragePath !== undefined
      ? { tabletImageStoragePath: normalizeOptionalString(input.tabletImageStoragePath) }
      : {}),
    ...(input.mobileImageUrl !== undefined
      ? { mobileImageUrl: normalizeOptionalString(input.mobileImageUrl) }
      : {}),
    ...(input.mobileImageStoragePath !== undefined
      ? { mobileImageStoragePath: normalizeOptionalString(input.mobileImageStoragePath) }
      : {}),
    ...(input.imageAlt !== undefined ? { imageAlt: normalizeOptionalString(input.imageAlt) } : {}),
    ...(input.backgroundColor !== undefined
      ? { backgroundColor: normalizeOptionalString(input.backgroundColor) }
      : {}),
    ...(input.textColor !== undefined ? { textColor: normalizeOptionalString(input.textColor) } : {}),
    ...(input.overlayOpacity !== undefined ? { overlayOpacity: input.overlayOpacity } : {}),
    ...(input.ctaText !== undefined ? { ctaText: normalizeOptionalString(input.ctaText) } : {}),
    ...(input.destinationType !== undefined ? { destinationType: input.destinationType } : {}),
    ...(input.categoryId !== undefined ? { categoryId: normalizeOptionalString(input.categoryId) } : {}),
    ...(input.productId !== undefined ? { productId: normalizeOptionalString(input.productId) } : {}),
    ...(input.storeId !== undefined ? { storeId: normalizeOptionalString(input.storeId) } : {}),
    ...(input.promotionId !== undefined
      ? { promotionId: normalizeOptionalString(input.promotionId) }
      : {}),
    ...(input.searchQuery !== undefined
      ? { searchQuery: normalizeOptionalString(input.searchQuery) }
      : {}),
    ...(input.customUrl !== undefined ? { customUrl: normalizeOptionalString(input.customUrl) } : {}),
    ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.autoplay !== undefined ? { autoplay: input.autoplay } : {}),
    ...(input.openInNewTab !== undefined ? { openInNewTab: input.openInNewTab } : {}),
    ...(input.publishStartAt !== undefined
      ? { publishStartAt: toDate(input.publishStartAt, state.publishStartAt) as Date }
      : {}),
    ...(input.publishEndAt !== undefined
      ? { publishEndAt: toDate(input.publishEndAt) as Date | null }
      : {}),
  }

  if (input.autoplayDelay !== undefined) {
    merged.autoplayDelay = merged.autoplay ? input.autoplayDelay ?? DEFAULT_AUTOPLAY_DELAY : null
  } else if (!merged.autoplay) {
    merged.autoplayDelay = null
  } else if (merged.autoplayDelay == null) {
    merged.autoplayDelay = DEFAULT_AUTOPLAY_DELAY
  }

  return normalizeDestinationState(merged)
}

function normalizeDestinationState(state: HeroBannerState): HeroBannerState {
  const normalized: HeroBannerState = {
    ...state,
    categoryId: null,
    productId: null,
    storeId: null,
    promotionId: null,
    searchQuery: null,
    customUrl: null,
  }

  switch (state.destinationType) {
    case HeroBannerDestinationType.CATEGORY:
      normalized.categoryId = state.categoryId
      break
    case HeroBannerDestinationType.PRODUCT:
      normalized.productId = state.productId
      break
    case HeroBannerDestinationType.STORE:
      normalized.storeId = state.storeId
      break
    case HeroBannerDestinationType.PROMOTION:
      normalized.promotionId = state.promotionId
      break
    case HeroBannerDestinationType.SEARCH:
      normalized.searchQuery = state.searchQuery
      break
    case HeroBannerDestinationType.CUSTOM_URL:
      normalized.customUrl = state.customUrl
      break
    case HeroBannerDestinationType.NONE:
      normalized.ctaText = null
      normalized.openInNewTab = false
      break
  }

  return normalized
}

function assertValidHeroBannerState(state: HeroBannerState) {
  if (state.publishEndAt != null && state.publishEndAt <= state.publishStartAt) {
    throw new InvalidHeroBannerError('Publish end date must be later than publish start date')
  }

  if (state.sortOrder < 0) {
    throw new InvalidHeroBannerError('Sort order cannot be negative')
  }

  if (state.overlayOpacity < 0 || state.overlayOpacity > 1) {
    throw new InvalidHeroBannerError('Overlay opacity must be between 0 and 1')
  }

  if (!state.autoplay && state.autoplayDelay != null) {
    throw new InvalidHeroBannerError('Autoplay delay must be empty when autoplay is disabled')
  }

  if (state.autoplay && (state.autoplayDelay == null || state.autoplayDelay < 1000)) {
    throw new InvalidHeroBannerError('Autoplay delay must be at least 1000ms')
  }

  if (state.destinationType === HeroBannerDestinationType.NONE) {
    if (!isBlank(state.ctaText) || state.openInNewTab) {
      throw new InvalidHeroBannerDestinationError(
        'Empty destinations cannot include CTA settings',
      )
    }
  } else if (isBlank(state.ctaText)) {
    throw new InvalidHeroBannerDestinationError(
      'CTA text is required when a destination is configured',
    )
  }

  const destinationTargets = [
    state.categoryId,
    state.productId,
    state.storeId,
    state.promotionId,
    state.searchQuery,
    state.customUrl,
  ].filter((value) => !isBlank(value))

  if (state.destinationType !== HeroBannerDestinationType.NONE && destinationTargets.length !== 1) {
    throw new InvalidHeroBannerDestinationError(
      'Hero banner must include exactly one destination target',
    )
  }

  if (
    state.status === HeroBannerStatus.PUBLISHED &&
    (isBlank(state.title) || isBlank(state.desktopImageUrl) || isBlank(state.imageAlt))
  ) {
    throw new InvalidHeroBannerError(
      'Published hero banners require title, desktop image, and image alt text',
    )
  }
}

async function assertDestinationTargetExists(state: HeroBannerState) {
  switch (state.destinationType) {
    case HeroBannerDestinationType.CATEGORY:
      if (!state.categoryId || !(await categoryExists(state.categoryId))) {
        throw new InvalidHeroBannerDestinationError('Selected category was not found')
      }
      return
    case HeroBannerDestinationType.PRODUCT:
      if (!state.productId || !(await productExists(state.productId))) {
        throw new InvalidHeroBannerDestinationError('Selected product was not found')
      }
      return
    case HeroBannerDestinationType.STORE:
      if (!state.storeId || !(await storeExists(state.storeId))) {
        throw new InvalidHeroBannerDestinationError('Selected store was not found')
      }
      return
    case HeroBannerDestinationType.PROMOTION:
      if (!state.promotionId || !(await promotionExists(state.promotionId))) {
        throw new InvalidHeroBannerDestinationError('Selected promotion was not found')
      }
      return
    case HeroBannerDestinationType.CUSTOM_URL:
      if (
        !state.customUrl?.startsWith('/') ||
        state.customUrl.startsWith('//') ||
        state.customUrl.includes('://') ||
        /[\u0000-\u001F]/.test(state.customUrl)
      ) {
        throw new InvalidHeroBannerDestinationError(
          'Custom URL must be an internal relative path',
        )
      }
      return
    default:
      return
  }
}

async function validateHeroBannerState(state: HeroBannerState) {
  assertValidHeroBannerState(state)
  await assertDestinationTargetExists(state)
}

function toPrismaData(
  state: HeroBannerState,
  userId: string,
  mode: 'create' | 'update',
): Prisma.HeroBannerUncheckedCreateInput | Prisma.HeroBannerUncheckedUpdateInput {
  const data = {
    eyebrow: state.eyebrow,
    title: state.title,
    subtitle: state.subtitle,
    description: state.description,
    desktopImageUrl: state.desktopImageUrl,
    desktopImageStoragePath: state.desktopImageStoragePath,
    tabletImageUrl: state.tabletImageUrl,
    tabletImageStoragePath: state.tabletImageStoragePath,
    mobileImageUrl: state.mobileImageUrl,
    mobileImageStoragePath: state.mobileImageStoragePath,
    imageAlt: state.imageAlt,
    backgroundColor: state.backgroundColor,
    textColor: state.textColor,
    overlayOpacity: state.overlayOpacity.toFixed(2),
    ctaText: state.ctaText,
    destinationType: state.destinationType,
    categoryId: state.categoryId,
    productId: state.productId,
    storeId: state.storeId,
    promotionId: state.promotionId,
    searchQuery: state.searchQuery,
    customUrl: state.customUrl,
    sortOrder: state.sortOrder,
    status: state.status,
    autoplay: state.autoplay,
    autoplayDelay: state.autoplayDelay,
    openInNewTab: state.openInNewTab,
    publishStartAt: state.publishStartAt,
    publishEndAt: state.publishEndAt,
    updatedById: userId,
  }

  if (mode === 'create') {
    return {
      ...data,
      createdById: userId,
    } satisfies Prisma.HeroBannerUncheckedCreateInput
  }

  return data satisfies Prisma.HeroBannerUncheckedUpdateInput
}

async function getRequiredHeroBanner(id: string) {
  const banner = await findHeroBannerById(id)
  if (!banner) {
    throw new HeroBannerNotFoundError()
  }

  return banner
}

export async function getPublicHeroBanners(
  query: PublicHeroBannerQueryDto,
  now = new Date(),
): Promise<PublicHeroBannerListDto> {
  const banners = await listActiveHeroBanners({ now, limit: query.limit })
  return {
    items: banners.map(toHeroBannerDto),
  }
}

export async function getAdminHeroBanners(
  user: SessionUser,
  query: HeroBannerQueryDto,
): Promise<HeroBannerListDto> {
  requireAdmin(user)

  const [items, total] = await Promise.all([
    listAdminHeroBanners(query),
    countAdminHeroBanners(query),
  ])

  return {
    items: items.map(toHeroBannerDto),
    total,
    page: query.page,
    limit: query.limit,
  }
}

export async function getAdminHeroBanner(user: SessionUser, id: string): Promise<HeroBannerDto> {
  requireAdmin(user)
  const banner = await getRequiredHeroBanner(id)
  return toHeroBannerDto(banner)
}

export async function createAdminHeroBanner(
  user: SessionUser,
  input: HeroBannerWriteDto,
): Promise<HeroBannerDto> {
  requireAdmin(user)
  const state = createStateFromInput(input)
  await validateHeroBannerState(state)
  const banner = await createHeroBanner(
    toPrismaData(state, user.id, 'create') as Prisma.HeroBannerUncheckedCreateInput,
  )
  return toHeroBannerDto(banner)
}

export async function updateAdminHeroBanner(
  user: SessionUser,
  id: string,
  input: HeroBannerUpdateDto,
): Promise<HeroBannerDto> {
  requireAdmin(user)
  const current = await getRequiredHeroBanner(id)
  const state = mergeState(current, input)
  await validateHeroBannerState(state)
  const banner = await updateHeroBanner(id, toPrismaData(state, user.id, 'update'))
  return toHeroBannerDto(banner)
}

export async function publishAdminHeroBanner(user: SessionUser, id: string) {
  return updateAdminHeroBanner(user, id, { status: HeroBannerStatus.PUBLISHED })
}

export async function pauseAdminHeroBanner(user: SessionUser, id: string) {
  return updateAdminHeroBanner(user, id, { status: HeroBannerStatus.PAUSED })
}

export async function archiveAdminHeroBanner(user: SessionUser, id: string) {
  return updateAdminHeroBanner(user, id, { status: HeroBannerStatus.ARCHIVED })
}

export async function deleteAdminHeroBanner(user: SessionUser, id: string): Promise<void> {
  requireAdmin(user)
  await getRequiredHeroBanner(id)
  await deleteHeroBanner(id)
}

export async function reorderAdminHeroBanners(
  user: SessionUser,
  input: ReorderHeroBannersDto,
): Promise<HeroBannerListDto> {
  requireAdmin(user)

  const ids = input.items.map((item) => item.id)
  const existing = await findHeroBannersByIds(ids)
  if (existing.length !== ids.length) {
    throw new HeroBannerNotFoundError('One or more hero banners were not found')
  }

  await updateHeroBannerSortOrders(input.items)

  return getAdminHeroBanners(user, {
    page: 1,
    limit: Math.max(input.items.length, 1),
  })
}
