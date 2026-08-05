import type { HeroBanner, HeroBannerDestinationType, HeroBannerPayload } from '@/types/hero-banners'
import type { HeroBannerFormErrors, HeroBannerFormValues } from './types'

export const destinationTargetFieldByType = {
  NONE: null,
  CATEGORY: 'categoryId',
  PRODUCT: 'productId',
  STORE: 'storeId',
  PROMOTION: 'promotionId',
  SEARCH: 'searchQuery',
  CUSTOM_URL: 'customUrl',
} as const

export const destinationTargetLabelByType: Record<HeroBannerDestinationType, string> = {
  NONE: 'Ціль не потрібна',
  CATEGORY: 'ID категорії',
  PRODUCT: 'ID товару',
  STORE: 'ID магазину',
  PROMOTION: 'ID акції',
  SEARCH: 'Пошуковий запит',
  CUSTOM_URL: 'Внутрішній URL',
}

function toDatetimeLocalValue(value?: string | null) {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  const pad = (input: number) => String(input).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function defaultPublishStart() {
  return toDatetimeLocalValue(new Date().toISOString())
}

export function buildInitialValues(initialBanner?: HeroBanner): HeroBannerFormValues {
  if (!initialBanner) {
    return {
      eyebrow: '',
      title: '',
      subtitle: '',
      description: '',
      desktopImageUrl: '',
      desktopImageStoragePath: '',
      tabletImageUrl: '',
      tabletImageStoragePath: '',
      mobileImageUrl: '',
      mobileImageStoragePath: '',
      imageAlt: '',
      backgroundColor: '#101827',
      textColor: '#ffffff',
      overlayOpacity: '0.35',
      ctaText: '',
      destinationType: 'NONE',
      destinationTarget: '',
      openInNewTab: false,
      autoplay: true,
      autoplayDelay: '5000',
      sortOrder: '0',
      status: 'DRAFT',
      publishStartAt: defaultPublishStart(),
      publishEndAt: '',
    }
  }

  const targetField = destinationTargetFieldByType[initialBanner.destination.type]

  return {
    eyebrow: initialBanner.eyebrow ?? '',
    title: initialBanner.title,
    subtitle: initialBanner.subtitle ?? '',
    description: initialBanner.description ?? '',
    desktopImageUrl: initialBanner.desktopImageUrl ?? '',
    desktopImageStoragePath: initialBanner.desktopImageStoragePath ?? '',
    tabletImageUrl: initialBanner.tabletImageUrl ?? '',
    tabletImageStoragePath: initialBanner.tabletImageStoragePath ?? '',
    mobileImageUrl: initialBanner.mobileImageUrl ?? '',
    mobileImageStoragePath: initialBanner.mobileImageStoragePath ?? '',
    imageAlt: initialBanner.imageAlt ?? '',
    backgroundColor: initialBanner.backgroundColor ?? '#101827',
    textColor: initialBanner.textColor ?? '#ffffff',
    overlayOpacity: initialBanner.overlayOpacity,
    ctaText: initialBanner.ctaText ?? '',
    destinationType: initialBanner.destination.type,
    destinationTarget: targetField ? initialBanner.destination[targetField] ?? '' : '',
    openInNewTab: initialBanner.openInNewTab,
    autoplay: initialBanner.autoplay,
    autoplayDelay: initialBanner.autoplayDelay?.toString() ?? '',
    sortOrder: initialBanner.sortOrder.toString(),
    status: initialBanner.status,
    publishStartAt: toDatetimeLocalValue(initialBanner.publishStartAt),
    publishEndAt: toDatetimeLocalValue(initialBanner.publishEndAt),
  }
}

function trimOrNull(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function toIso(value: string) {
  return new Date(value).toISOString()
}

function toIsoOrNull(value: string) {
  return value ? new Date(value).toISOString() : null
}

export function validateValues(values: HeroBannerFormValues): HeroBannerFormErrors {
  const errors: HeroBannerFormErrors = {}
  const overlayOpacity = Number(values.overlayOpacity)
  const sortOrder = Number(values.sortOrder)

  if (!values.title.trim()) {
    errors.title = 'Вкажіть назву Hero-банера.'
  }

  if (!values.desktopImageUrl.trim()) {
    errors.desktopImageUrl = 'Завантажте desktop-зображення.'
  }

  if (!values.imageAlt.trim()) {
    errors.imageAlt = 'Додайте alt-текст для зображення.'
  }

  if (!/^#[0-9A-Fa-f]{6}$/.test(values.backgroundColor)) {
    errors.backgroundColor = 'Вкажіть колір у форматі HEX.'
  }

  if (!/^#[0-9A-Fa-f]{6}$/.test(values.textColor)) {
    errors.textColor = 'Вкажіть колір у форматі HEX.'
  }

  if (!Number.isFinite(overlayOpacity) || overlayOpacity < 0 || overlayOpacity > 1) {
    errors.overlayOpacity = 'Прозорість має бути від 0 до 1.'
  }

  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    errors.sortOrder = 'Порядок має бути невід’ємним цілим числом.'
  }

  if (!values.publishStartAt) {
    errors.publishStartAt = 'Вкажіть дату початку публікації.'
  }

  if (values.publishStartAt && values.publishEndAt && new Date(values.publishEndAt) <= new Date(values.publishStartAt)) {
    errors.publishEndAt = 'Дата завершення має бути пізніше дати початку.'
  }

  if (values.autoplay) {
    const autoplayDelay = Number(values.autoplayDelay)
    if (!Number.isInteger(autoplayDelay) || autoplayDelay < 1000 || autoplayDelay > 60000) {
      errors.autoplayDelay = 'Затримка має бути від 1000 до 60000 мс.'
    }
  }

  if (values.destinationType === 'NONE') {
    if (values.ctaText.trim() || values.destinationTarget.trim() || values.openInNewTab) {
      errors.destinationType = 'Для банера без посилання не задавайте CTA або ціль.'
    }
  } else {
    if (!values.ctaText.trim()) {
      errors.ctaText = 'CTA-текст потрібен для вибраної цілі.'
    }
    if (!values.destinationTarget.trim()) {
      errors.destinationTarget = 'Вкажіть ціль для вибраного типу переходу.'
    }
  }

  if (values.destinationType === 'CUSTOM_URL') {
    const target = values.destinationTarget.trim()
    if (!target.startsWith('/') || target.startsWith('//') || target.includes('://')) {
      errors.destinationTarget = 'Використовуйте безпечний внутрішній шлях, наприклад /catalog.'
    }
  }

  return errors
}

export function buildPayload(values: HeroBannerFormValues): HeroBannerPayload {
  const destinationField = destinationTargetFieldByType[values.destinationType]
  const payload: HeroBannerPayload = {
    eyebrow: trimOrNull(values.eyebrow),
    title: values.title.trim(),
    subtitle: trimOrNull(values.subtitle),
    description: trimOrNull(values.description),
    desktopImageUrl: trimOrNull(values.desktopImageUrl),
    desktopImageStoragePath: trimOrNull(values.desktopImageStoragePath),
    tabletImageUrl: trimOrNull(values.tabletImageUrl),
    tabletImageStoragePath: trimOrNull(values.tabletImageStoragePath),
    mobileImageUrl: trimOrNull(values.mobileImageUrl),
    mobileImageStoragePath: trimOrNull(values.mobileImageStoragePath),
    imageAlt: trimOrNull(values.imageAlt),
    backgroundColor: values.backgroundColor,
    textColor: values.textColor,
    overlayOpacity: Number(values.overlayOpacity),
    ctaText: values.destinationType === 'NONE' ? null : trimOrNull(values.ctaText),
    destinationType: values.destinationType,
    categoryId: null,
    productId: null,
    storeId: null,
    promotionId: null,
    searchQuery: null,
    customUrl: null,
    sortOrder: Number(values.sortOrder),
    status: values.status,
    autoplay: values.autoplay,
    autoplayDelay: values.autoplay ? Number(values.autoplayDelay) : null,
    openInNewTab: values.destinationType === 'CUSTOM_URL' ? values.openInNewTab : false,
    publishStartAt: toIso(values.publishStartAt),
    publishEndAt: toIsoOrNull(values.publishEndAt),
  }

  if (destinationField) {
    payload[destinationField] = trimOrNull(values.destinationTarget)
  }

  return payload
}
