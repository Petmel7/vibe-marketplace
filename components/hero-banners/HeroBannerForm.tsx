'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import DashboardCard from '@/components/profile/DashboardCard'
import { useAdminHeroBanners } from '@/hooks/useAdminHeroBanners'
import type { HeroBannerImageSlot } from '@/features/media/media.dto'
import {
  HERO_BANNER_DESTINATION_TYPES,
  HERO_BANNER_STATUSES,
  getHeroBannerDestinationTypeLabel,
  getHeroBannerStatusLabel,
  type HeroBanner,
  type HeroBannerDestinationType,
  type HeroBannerPayload,
  type HeroBannerStatus,
} from '@/types/hero-banners'

type PreviewMode = 'desktop' | 'tablet' | 'mobile'

type HeroBannerFormValues = {
  eyebrow: string
  title: string
  subtitle: string
  description: string
  desktopImageUrl: string
  desktopImageStoragePath: string
  tabletImageUrl: string
  tabletImageStoragePath: string
  mobileImageUrl: string
  mobileImageStoragePath: string
  imageAlt: string
  backgroundColor: string
  textColor: string
  overlayOpacity: string
  ctaText: string
  destinationType: HeroBannerDestinationType
  destinationTarget: string
  openInNewTab: boolean
  autoplay: boolean
  autoplayDelay: string
  sortOrder: string
  status: HeroBannerStatus
  publishStartAt: string
  publishEndAt: string
}

type HeroBannerFormErrors = Partial<Record<keyof HeroBannerFormValues | 'form', string>>

const destinationTargetFieldByType = {
  NONE: null,
  CATEGORY: 'categoryId',
  PRODUCT: 'productId',
  STORE: 'storeId',
  PROMOTION: 'promotionId',
  SEARCH: 'searchQuery',
  CUSTOM_URL: 'customUrl',
} as const

const destinationTargetLabelByType: Record<HeroBannerDestinationType, string> = {
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

function buildInitialValues(initialBanner?: HeroBanner): HeroBannerFormValues {
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

function validateValues(values: HeroBannerFormValues): HeroBannerFormErrors {
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

function buildPayload(values: HeroBannerFormValues): HeroBannerPayload {
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

function ErrorMessage({ message }: { message?: string }) {
  return message ? (
    <p className="text-sm text-brand-danger" role="alert">
      {message}
    </p>
  ) : null
}

function HeroBannerImageField({
  slot,
  label,
  description,
  imageUrl,
  imageAlt,
  disabled,
  errorMessage,
  onUpload,
  onRemove,
}: {
  slot: HeroBannerImageSlot
  label: string
  description: string
  imageUrl: string
  imageAlt: string
  disabled: boolean
  errorMessage?: string
  onUpload: (slot: HeroBannerImageSlot, file: File) => Promise<void>
  onRemove: (slot: HeroBannerImageSlot) => Promise<void>
}) {
  return (
    <div className="space-y-3 rounded-3xl border border-panelBorder bg-panel/60 p-4">
      <div className="space-y-1">
        <label className="block text-sm font-medium text-copy-strong">
          {label}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={disabled}
            className="mt-3 block w-full rounded-2xl border border-panelBorder bg-panel px-4 py-3 text-sm text-copy-secondary file:mr-4 file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.currentTarget.value = ''
              if (file) {
                void onUpload(slot, file)
              }
            }}
          />
        </label>
        <p className="text-sm text-copy-muted">{description}</p>
        <ErrorMessage message={errorMessage} />
      </div>
      <div className="relative flex h-36 items-center justify-center overflow-hidden rounded-2xl border border-panelBorder bg-panelAlt">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={imageAlt || label}
            fill
            unoptimized
            sizes="(max-width: 768px) 100vw, 360px"
            className="object-cover"
          />
        ) : (
          <span className="text-sm text-copy-muted">Зображення ще не завантажено</span>
        )}
      </div>
      <button
        type="button"
        className="ui-secondary-button h-10 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled || !imageUrl}
        onClick={() => void onRemove(slot)}
      >
        Видалити зображення
      </button>
    </div>
  )
}

function HeroBannerPreview({
  values,
  mode,
  onModeChange,
}: {
  values: HeroBannerFormValues
  mode: PreviewMode
  onModeChange: (mode: PreviewMode) => void
}) {
  const previewImage =
    mode === 'mobile'
      ? values.mobileImageUrl || values.tabletImageUrl || values.desktopImageUrl
      : mode === 'tablet'
        ? values.tabletImageUrl || values.desktopImageUrl
        : values.desktopImageUrl
  const previewWidth = mode === 'mobile' ? 'max-w-sm' : mode === 'tablet' ? 'max-w-2xl' : 'max-w-5xl'

  return (
    <DashboardCard
      title="Живе прев’ю"
      description="Адмін-прев’ю оновлюється одразу і не є публічним Hero-компонентом головної сторінки."
    >
      <div className="mb-4 flex flex-wrap justify-center gap-2">
        {(['desktop', 'tablet', 'mobile'] as const).map((previewMode) => (
          <button
            key={previewMode}
            type="button"
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              mode === previewMode
                ? 'border-brand-accent bg-brand-accent text-white'
                : 'border-panelBorder bg-panel text-copy-secondary hover:text-copy-strong'
            }`}
            onClick={() => onModeChange(previewMode)}
          >
            {previewMode === 'desktop' ? 'Десктоп' : previewMode === 'tablet' ? 'Планшет' : 'Мобільний'}
          </button>
        ))}
      </div>
      <div
        className={`relative mx-auto min-h-72 overflow-hidden rounded-[2rem] border border-panelBorder ${previewWidth}`}
        style={{ backgroundColor: values.backgroundColor }}
      >
        {previewImage ? (
          <Image
            src={previewImage}
            alt={values.imageAlt || values.title || 'Hero preview'}
            fill
            unoptimized
            sizes="(max-width: 768px) 100vw, 960px"
            className="object-cover"
          />
        ) : null}
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: Math.min(1, Math.max(0, Number(values.overlayOpacity) || 0)) }}
        />
        <div className="relative z-10 flex min-h-72 flex-col justify-center p-6 sm:p-10" style={{ color: values.textColor }}>
          {values.eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-80">{values.eyebrow}</p>
          ) : null}
          <h3 className="mt-3 max-w-2xl text-3xl font-semibold sm:text-5xl">
            {values.title || 'Назва Hero-банера'}
          </h3>
          {values.subtitle ? <p className="mt-3 max-w-xl text-lg font-medium">{values.subtitle}</p> : null}
          {values.description ? <p className="mt-3 max-w-xl text-sm opacity-85">{values.description}</p> : null}
          {values.destinationType !== 'NONE' && values.ctaText ? (
            <span className="mt-6 inline-flex w-fit rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950">
              {values.ctaText}
            </span>
          ) : null}
        </div>
      </div>
    </DashboardCard>
  )
}

export default function HeroBannerForm({
  mode,
  initialBanner,
}: {
  mode: 'create' | 'edit'
  initialBanner?: HeroBanner
}) {
  const {
    createHeroBanner,
    updateHeroBanner,
    deleteHeroBanner,
    uploadHeroBannerImage,
    removeHeroBannerImage,
    isPending,
    isUploading,
    errorMessage,
  } = useAdminHeroBanners()
  const [values, setValues] = useState<HeroBannerFormValues>(() => buildInitialValues(initialBanner))
  const [errors, setErrors] = useState<HeroBannerFormErrors>({})
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isBusy = isPending || isUploading
  const title = mode === 'create' ? 'Створити Hero-банер' : `Редагувати ${initialBanner?.title ?? 'Hero-банер'}`

  const setValue = <K extends keyof HeroBannerFormValues>(key: K, value: HeroBannerFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined, form: undefined }))
  }

  const handleImageUpload = async (slot: HeroBannerImageSlot, file: File) => {
    const uploaded = await uploadHeroBannerImage(slot, file)
    if (!uploaded) {
      return
    }

    const prefix = `${slot}Image` as const
    setValues((current) => ({
      ...current,
      [`${prefix}Url`]: uploaded.url,
      [`${prefix}StoragePath`]: uploaded.storagePath,
    }))
    setErrors((current) => ({
      ...current,
      [`${prefix}Url`]: undefined,
      form: undefined,
    }))
  }

  const handleImageRemove = async (slot: HeroBannerImageSlot) => {
    const prefix = `${slot}Image` as const
    const storagePath = values[`${prefix}StoragePath`]
    if (storagePath) {
      const removed = await removeHeroBannerImage(storagePath)
      if (!removed) {
        return
      }
    }

    setValues((current) => ({
      ...current,
      [`${prefix}Url`]: '',
      [`${prefix}StoragePath`]: '',
    }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validateValues(values)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    const payload = buildPayload(values)
    if (mode === 'create') {
      await createHeroBanner(payload)
      return
    }

    if (!initialBanner) {
      return
    }

    await updateHeroBanner(initialBanner.id, payload)
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
      <DashboardCard
        title={title}
        description="Керуйте контентом, переходами, періодом публікації та порядком показу Hero-банера."
      >
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Надзаголовок</span>
              <input
                value={values.eyebrow}
                onChange={(event) => setValue('eyebrow', event.target.value)}
                className="ui-surface-input"
                placeholder="Наприклад, Новий сезон"
              />
            </label>
            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Назва</span>
              <input
                value={values.title}
                onChange={(event) => setValue('title', event.target.value)}
                className="ui-surface-input"
                placeholder="Головна пропозиція банера"
                aria-invalid={Boolean(errors.title)}
              />
              <ErrorMessage message={errors.title} />
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Підзаголовок</span>
              <input
                value={values.subtitle}
                onChange={(event) => setValue('subtitle', event.target.value)}
                className="ui-surface-input"
                placeholder="Коротке уточнення"
              />
            </label>
            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Alt-текст</span>
              <input
                value={values.imageAlt}
                onChange={(event) => setValue('imageAlt', event.target.value)}
                className="ui-surface-input"
                placeholder="Опишіть зображення для доступності"
                aria-invalid={Boolean(errors.imageAlt)}
              />
              <ErrorMessage message={errors.imageAlt} />
            </label>
          </div>

          <label className="space-y-2">
            <span className="block text-sm font-medium text-copy-strong">Опис</span>
            <textarea
              value={values.description}
              onChange={(event) => setValue('description', event.target.value)}
              rows={4}
              className="ui-surface-input min-h-28"
              placeholder="Додатковий текст, який пояснює пропозицію."
            />
          </label>

          <div className="grid gap-4 lg:grid-cols-3">
            <HeroBannerImageField
              slot="desktop"
              label="Desktop-зображення"
              description="Обов’язкове основне зображення для великого екрана."
              imageUrl={values.desktopImageUrl}
              imageAlt={values.imageAlt}
              disabled={isBusy}
              errorMessage={errors.desktopImageUrl}
              onUpload={handleImageUpload}
              onRemove={handleImageRemove}
            />
            <HeroBannerImageField
              slot="tablet"
              label="Tablet-зображення"
              description="Необов’язкова адаптація для планшетів."
              imageUrl={values.tabletImageUrl}
              imageAlt={values.imageAlt}
              disabled={isBusy}
              onUpload={handleImageUpload}
              onRemove={handleImageRemove}
            />
            <HeroBannerImageField
              slot="mobile"
              label="Mobile-зображення"
              description="Необов’язкова адаптація для вузьких екранів."
              imageUrl={values.mobileImageUrl}
              imageAlt={values.imageAlt}
              disabled={isBusy}
              onUpload={handleImageUpload}
              onRemove={handleImageRemove}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Колір фону</span>
              <input
                type="color"
                value={values.backgroundColor}
                onChange={(event) => setValue('backgroundColor', event.target.value)}
                className="h-12 w-full rounded-2xl border border-panelBorder bg-panel p-1"
                aria-invalid={Boolean(errors.backgroundColor)}
              />
              <ErrorMessage message={errors.backgroundColor} />
            </label>
            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Колір тексту</span>
              <input
                type="color"
                value={values.textColor}
                onChange={(event) => setValue('textColor', event.target.value)}
                className="h-12 w-full rounded-2xl border border-panelBorder bg-panel p-1"
                aria-invalid={Boolean(errors.textColor)}
              />
              <ErrorMessage message={errors.textColor} />
            </label>
            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Прозорість оверлею</span>
              <input
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={values.overlayOpacity}
                onChange={(event) => setValue('overlayOpacity', event.target.value)}
                className="ui-surface-input"
                aria-invalid={Boolean(errors.overlayOpacity)}
              />
              <ErrorMessage message={errors.overlayOpacity} />
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Тип переходу</span>
              <select
                value={values.destinationType}
                onChange={(event) => {
                  const destinationType = event.target.value as HeroBannerDestinationType
                  setValues((current) => ({
                    ...current,
                    destinationType,
                    destinationTarget: '',
                    ctaText: destinationType === 'NONE' ? '' : current.ctaText,
                    openInNewTab: destinationType === 'CUSTOM_URL' ? current.openInNewTab : false,
                  }))
                  setErrors((current) => ({ ...current, destinationType: undefined, destinationTarget: undefined }))
                }}
                className="ui-surface-input"
                aria-invalid={Boolean(errors.destinationType)}
              >
                {HERO_BANNER_DESTINATION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {getHeroBannerDestinationTypeLabel(type)}
                  </option>
                ))}
              </select>
              <ErrorMessage message={errors.destinationType} />
            </label>
            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">
                {destinationTargetLabelByType[values.destinationType]}
              </span>
              <input
                value={values.destinationTarget}
                disabled={values.destinationType === 'NONE'}
                onChange={(event) => setValue('destinationTarget', event.target.value)}
                className="ui-surface-input disabled:cursor-not-allowed disabled:opacity-60"
                placeholder={values.destinationType === 'CUSTOM_URL' ? '/catalog' : 'ID або запит'}
                aria-invalid={Boolean(errors.destinationTarget)}
              />
              <ErrorMessage message={errors.destinationTarget} />
            </label>
            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">CTA-текст</span>
              <input
                value={values.ctaText}
                disabled={values.destinationType === 'NONE'}
                onChange={(event) => setValue('ctaText', event.target.value)}
                className="ui-surface-input disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="Перейти"
                aria-invalid={Boolean(errors.ctaText)}
              />
              <ErrorMessage message={errors.ctaText} />
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Статус</span>
              <select
                value={values.status}
                onChange={(event) => setValue('status', event.target.value as HeroBannerStatus)}
                className="ui-surface-input"
              >
                {HERO_BANNER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {getHeroBannerStatusLabel(status)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Порядок сортування</span>
              <input
                type="number"
                min="0"
                step="1"
                value={values.sortOrder}
                onChange={(event) => setValue('sortOrder', event.target.value)}
                className="ui-surface-input"
                aria-invalid={Boolean(errors.sortOrder)}
              />
              <ErrorMessage message={errors.sortOrder} />
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-panelBorder bg-panel/60 px-4 py-3">
              <input
                type="checkbox"
                checked={values.openInNewTab}
                disabled={values.destinationType !== 'CUSTOM_URL'}
                onChange={(event) => setValue('openInNewTab', event.target.checked)}
                className="h-4 w-4 rounded border-panelBorder text-brand-accent disabled:opacity-50"
              />
              <span className="text-sm text-copy-secondary">Відкривати у новій вкладці</span>
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Початок публікації</span>
              <input
                type="datetime-local"
                value={values.publishStartAt}
                onChange={(event) => setValue('publishStartAt', event.target.value)}
                className="ui-surface-input"
                aria-invalid={Boolean(errors.publishStartAt)}
              />
              <ErrorMessage message={errors.publishStartAt} />
            </label>
            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Завершення публікації</span>
              <input
                type="datetime-local"
                value={values.publishEndAt}
                onChange={(event) => setValue('publishEndAt', event.target.value)}
                className="ui-surface-input"
                aria-invalid={Boolean(errors.publishEndAt)}
              />
              <ErrorMessage message={errors.publishEndAt} />
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="flex items-center gap-3 rounded-2xl border border-panelBorder bg-panel/60 px-4 py-3">
              <input
                type="checkbox"
                checked={values.autoplay}
                onChange={(event) => setValue('autoplay', event.target.checked)}
                className="h-4 w-4 rounded border-panelBorder text-brand-accent"
              />
              <span className="text-sm text-copy-secondary">Автопрокрутка увімкнена</span>
            </label>
            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Затримка автопрокрутки, мс</span>
              <input
                type="number"
                min="1000"
                max="60000"
                step="500"
                value={values.autoplayDelay}
                disabled={!values.autoplay}
                onChange={(event) => setValue('autoplayDelay', event.target.value)}
                className="ui-surface-input disabled:cursor-not-allowed disabled:opacity-60"
                aria-invalid={Boolean(errors.autoplayDelay)}
              />
              <ErrorMessage message={errors.autoplayDelay} />
            </label>
          </div>

          {errorMessage || errors.form ? (
            <p className="rounded-2xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-3 text-sm text-copy-primary" role="alert">
              {errors.form ?? errorMessage}
            </p>
          ) : null}

          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="flex flex-wrap justify-center gap-3 max-[500px]:w-full">
              <button
                type="submit"
                disabled={isBusy}
                className="ui-primary-button min-w-48 disabled:cursor-not-allowed disabled:opacity-60 max-[500px]:w-full"
              >
                {isBusy ? 'Збереження...' : mode === 'create' ? 'Створити Hero-банер' : 'Зберегти зміни'}
              </button>
              <Link href="/admin/hero-banners" className="ui-secondary-button min-w-48 max-[500px]:w-full">
                До списку
              </Link>
            </div>

            {mode === 'edit' && initialBanner ? (
              <div className="flex flex-wrap justify-center gap-2 max-[500px]:w-full">
                {!confirmDelete ? (
                  <button
                    type="button"
                    disabled={isBusy}
                    className="rounded-2xl border border-brand-danger/25 px-4 py-2 text-sm font-medium text-copy-strong transition hover:bg-brand-danger/10 disabled:cursor-not-allowed disabled:opacity-60 max-[500px]:w-full"
                    onClick={() => setConfirmDelete(true)}
                  >
                    Видалити Hero-банер
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isBusy}
                    className="rounded-2xl border border-brand-danger/25 bg-brand-danger/10 px-4 py-2 text-sm font-medium text-copy-strong transition hover:bg-brand-danger/20 disabled:cursor-not-allowed disabled:opacity-60 max-[500px]:w-full"
                    onClick={() => void deleteHeroBanner(initialBanner.id)}
                  >
                    Підтвердити видалення
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </form>
      </DashboardCard>

      <HeroBannerPreview values={values} mode={previewMode} onModeChange={setPreviewMode} />
    </div>
  )
}
