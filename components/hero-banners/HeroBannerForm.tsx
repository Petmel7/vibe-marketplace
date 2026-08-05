'use client'

import Link from 'next/link'
import { useState } from 'react'
import DashboardCard from '@/components/ui/dashboard/DashboardCard'
import { FormField, FormGrid } from '@/components/ui/form'
import { useAdminHeroBanners } from '@/hooks/useAdminHeroBanners'
import type { HeroBannerImageSlot } from '@/features/media/media.dto'
import {
  HERO_BANNER_DESTINATION_TYPES,
  HERO_BANNER_STATUSES,
  getHeroBannerDestinationTypeLabel,
  getHeroBannerStatusLabel,
  type HeroBanner,
  type HeroBannerDestinationType,
  type HeroBannerStatus,
} from '@/types/hero-banners'
import {
  buildInitialValues,
  buildPayload,
  destinationTargetLabelByType,
  validateValues,
} from './HeroBannerForm/heroBannerForm.helpers'
import HeroBannerImageField from './HeroBannerForm/sections/HeroBannerImageField'
import HeroBannerPreview from './HeroBannerForm/sections/HeroBannerPreview'
import type { HeroBannerFormErrors, HeroBannerFormValues, PreviewMode } from './HeroBannerForm/types'

function ErrorMessage({ message }: { message?: string }) {
  return message ? (
    <p className="text-sm text-brand-danger" role="alert">
      {message}
    </p>
  ) : null
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
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)] xl:items-start">
      <DashboardCard
        title={title}
        description="Керуйте контентом, переходами, періодом публікації та порядком показу Hero-банера."
      >
        <form className="space-y-6" onSubmit={handleSubmit}>
          <FormGrid>
            <FormField label="Надзаголовок">
              <input
                value={values.eyebrow}
                onChange={(event) => setValue('eyebrow', event.target.value)}
                className="ui-surface-input"
                placeholder="Наприклад, Новий сезон"
              />
            </FormField>
            <FormField label="Назва" error={errors.title}>
              <input
                value={values.title}
                onChange={(event) => setValue('title', event.target.value)}
                className="ui-surface-input"
                placeholder="Головна пропозиція банера"
                aria-invalid={Boolean(errors.title)}
              />
            </FormField>
          </FormGrid>

          <FormGrid>
            <FormField label="Підзаголовок">
              <input
                value={values.subtitle}
                onChange={(event) => setValue('subtitle', event.target.value)}
                className="ui-surface-input"
                placeholder="Коротке уточнення"
              />
            </FormField>
            <FormField label="Alt-текст" error={errors.imageAlt}>
              <input
                value={values.imageAlt}
                onChange={(event) => setValue('imageAlt', event.target.value)}
                className="ui-surface-input"
                placeholder="Опишіть зображення для доступності"
                aria-invalid={Boolean(errors.imageAlt)}
              />
            </FormField>
          </FormGrid>

          <FormField label="Опис">
            <textarea
              value={values.description}
              onChange={(event) => setValue('description', event.target.value)}
              rows={4}
              className="ui-surface-input min-h-28"
              placeholder="Додатковий текст, який пояснює пропозицію."
            />
          </FormField>

          <div className="space-y-5 pt-4">
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

          <FormGrid columns={3} at="xl" className="lg:grid-cols-2">
            <FormField label="Колір фону" error={errors.backgroundColor}>
              <input
                type="color"
                value={values.backgroundColor}
                onChange={(event) => setValue('backgroundColor', event.target.value)}
                className="h-12 w-full rounded-2xl border border-panelBorder bg-panel p-1"
                aria-invalid={Boolean(errors.backgroundColor)}
              />
            </FormField>
            <FormField label="Колір тексту" error={errors.textColor}>
              <input
                type="color"
                value={values.textColor}
                onChange={(event) => setValue('textColor', event.target.value)}
                className="h-12 w-full rounded-2xl border border-panelBorder bg-panel p-1"
                aria-invalid={Boolean(errors.textColor)}
              />
            </FormField>

            <FormField label="Прозорість оверлею" error={errors.overlayOpacity}>
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
            </FormField>

            <FormField label="Тип переходу" error={errors.destinationType}>
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
            </FormField>

            <FormField label={destinationTargetLabelByType[values.destinationType]} error={errors.destinationTarget}>
              <input
                value={values.destinationTarget}
                disabled={values.destinationType === 'NONE'}
                onChange={(event) => setValue('destinationTarget', event.target.value)}
                className="ui-surface-input disabled:cursor-not-allowed disabled:opacity-60"
                placeholder={values.destinationType === 'CUSTOM_URL' ? '/catalog' : 'ID або запит'}
                aria-invalid={Boolean(errors.destinationTarget)}
              />
            </FormField>
            <FormField label="CTA-текст" error={errors.ctaText}>
              <input
                value={values.ctaText}
                disabled={values.destinationType === 'NONE'}
                onChange={(event) => setValue('ctaText', event.target.value)}
                className="ui-surface-input disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="Перейти"
                aria-invalid={Boolean(errors.ctaText)}
              />
            </FormField>

            <FormField label="Статус">
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
            </FormField>
            <FormField label="Порядок сортування" error={errors.sortOrder}>
              <input
                type="number"
                min="0"
                step="1"
                value={values.sortOrder}
                onChange={(event) => setValue('sortOrder', event.target.value)}
                className="ui-surface-input"
                aria-invalid={Boolean(errors.sortOrder)}
              />
            </FormField>
          </FormGrid>

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

          <div className="flex flex-col items-center gap-4">
            <div className="flex w-full flex-col items-center justify-center gap-3 min-[501px]:w-auto min-[501px]:flex-row">
              <button
                type="submit"
                disabled={isBusy}
                className="ui-primary-button w-full disabled:cursor-not-allowed disabled:opacity-60 min-[501px]:w-56 max-[500px]:w-full"
              >
                {isBusy ? 'Збереження...' : mode === 'create' ? 'Створити Hero-банер' : 'Зберегти зміни'}
              </button>
              <Link href="/admin/hero-banners" className="ui-secondary-button w-full min-[501px]:w-56 max-[500px]:w-full">
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

      <div className="xl:sticky xl:top-6 xl:self-start">
        <HeroBannerPreview values={values} mode={previewMode} onModeChange={setPreviewMode} />
      </div>
    </div>
  )
}
