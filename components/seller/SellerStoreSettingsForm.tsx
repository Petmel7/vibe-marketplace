'use client'

import { useEffect, useId, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ImagePreview,
  UploadActions,
  UploadCard,
  UploadDropzone,
  UploadError,
  UploadProgress,
} from '@/components/ui/upload'
import { FormField, FormGrid } from '@/components/ui/form'
import { sellerOnboardingSchema } from '@/features/seller/seller.schema'
import {
  createStoreSchema,
  slugSchema,
  updateStoreSettingsSchema,
} from '@/features/storefront/storefront.schema'
import { useSellerMutation } from '@/hooks/useSellerMutation'
import { useSlugAvailability } from '@/hooks/useSlugAvailability'
import { useStoreAssetUpload } from '@/hooks/useStoreAssetUpload'
import { generateStoreSlugDraft, validateStoreAssetFile } from '@/lib/utils/sellerForm'
import type { SellerVerificationStatus } from '@/types/seller'

type PendingAssetState = {
  file: File | null
  errorMessage: string | null
}

type AssetProgressState = {
  active: boolean
  current: number
  total: number
  label: string
}

type StoreState = {
  name: string
  slug: string
  description: string
  logoUrl: string
  bannerUrl: string
}

function toOptionalString(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function createPendingAssetState(): PendingAssetState {
  return {
    file: null,
    errorMessage: null,
  }
}

function createStoreState(store: {
  name: string
  slug: string
  description: string | null
  logoUrl: string | null
  bannerUrl: string | null
} | null): StoreState {
  return {
    name: store?.name ?? '',
    slug: store?.slug ?? '',
    description: store?.description ?? '',
    logoUrl: store?.logoUrl ?? '',
    bannerUrl: store?.bannerUrl ?? '',
  }
}

function useStablePreviewUrl(file: File | null) {
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  return previewUrl
}

function StoreAssetUploadField({
  label,
  description,
  file,
  imageUrl,
  alt,
  accept,
  errorMessage,
  statusLabel,
  disabled = false,
  onFileSelect,
  onClear,
}: {
  label: string
  description: string
  file: File | null
  imageUrl?: string | null
  alt: string
  accept: string
  errorMessage?: string | null
  statusLabel?: string
  disabled?: boolean
  onFileSelect: (file: File | null) => void
  onClear?: () => void
}) {
  const inputId = useId()
  const descriptionId = `${inputId}-description`
  const errorId = `${inputId}-error`
  const previewUrl = useStablePreviewUrl(file)

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label htmlFor={inputId} className="block text-sm font-medium text-copy-strong">
          {label}
        </label>
        <p id={descriptionId} className="text-sm text-copy-muted">
          {description}
        </p>
        <UploadDropzone
          id={inputId}
          accept={accept}
          disabled={disabled}
          describedBy={errorMessage ? `${descriptionId} ${errorId}` : descriptionId}
          invalid={Boolean(errorMessage)}
          onFilesSelected={(files) => onFileSelect(files?.[0] ?? null)}
        />
        <UploadError id={errorId}>{errorMessage}</UploadError>
      </div>

      <UploadCard className="bg-panel">
        <ImagePreview
          src={previewUrl ?? imageUrl}
          alt={alt}
          emptyLabel="No image selected"
          sizes="(max-width: 768px) 100vw, 320px"
        />

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-copy-strong">{label}</p>
            <p className="mt-1 text-sm text-copy-muted">
              {file ? file.name : imageUrl ? 'Current uploaded asset' : 'Select an image to preview it here.'}
            </p>
          </div>
          {statusLabel ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-panelBorder px-3 py-1 text-xs text-copy-secondary">
                {statusLabel}
              </span>
            </div>
          ) : null}
        </div>

        {onClear ? (
          <UploadActions compact className="!items-start">
            <button
              type="button"
              className="ui-secondary-button h-10 px-4 py-2 text-sm"
              disabled={disabled || (!file && !imageUrl)}
              onClick={onClear}
            >
              Remove
            </button>
          </UploadActions>
        ) : null}
      </UploadCard>
    </div>
  )
}

export default function SellerStoreSettingsForm({
  sellerProfile,
  store,
  setupHint,
}: {
  sellerProfile: {
    businessName: string | null
    taxId: string | null
    verificationStatus: SellerVerificationStatus
  } | null
  store: {
    id: string
    name: string
    slug: string
    description: string | null
    logoUrl: string | null
    bannerUrl: string | null
    isActive: boolean
  } | null
  setupHint?: string
}) {
  const router = useRouter()
  const { execute, isPending, errorMessage, setErrorMessage } = useSellerMutation()
  const { uploadAsset, isUploading } = useStoreAssetUpload()
  const [onboardingState, setOnboardingState] = useState({
    businessName: sellerProfile?.businessName ?? '',
    taxId: sellerProfile?.taxId ?? '',
  })
  const [storeState, setStoreState] = useState<StoreState>(() => createStoreState(store))
  const [logoAsset, setLogoAsset] = useState<PendingAssetState>(createPendingAssetState())
  const [bannerAsset, setBannerAsset] = useState<PendingAssetState>(createPendingAssetState())
  const [isSlugManual, setIsSlugManual] = useState(Boolean(store))
  const [assetProgress, setAssetProgress] = useState<AssetProgressState>({
    active: false,
    current: 0,
    total: 0,
    label: '',
  })

  const slugValue = storeState.slug.trim()
  const parsedSlug = slugSchema.safeParse(slugValue)
  const slugAvailability = useSlugAvailability(
    slugValue,
    !store && Boolean(slugValue) && parsedSlug.success,
  )

  const slugStatus = useMemo(() => {
    if (store) {
      return {
        tone: 'text-copy-muted',
        message: 'URL вашої вітрини фіксується після створення, щоб посилання залишалися стабільними.',
      }
    }

    if (!slugValue) {
      return {
        tone: 'text-copy-muted',
        message: 'Оберіть публічну адресу вітрини для вашої присутності на маркетплейсі.',
      }
    }

    if (!parsedSlug.success) {
      return {
        tone: 'text-brand-danger',
        message: parsedSlug.error.issues[0]?.message ?? 'Введіть коректний slug.',
      }
    }

    if (slugAvailability.status === 'available') {
      return {
        tone: 'text-emerald-300',
        message: slugAvailability.message,
      }
    }

    if (slugAvailability.status === 'unavailable') {
      return {
        tone: 'text-brand-danger',
        message: `${slugAvailability.message}${slugAvailability.suggestion ? ` Спробуйте ${slugAvailability.suggestion}.` : ''}`,
      }
    }

    if (slugAvailability.status === 'error') {
      return {
        tone: 'text-brand-danger',
        message: slugAvailability.message,
      }
    }

    return {
      tone: 'text-copy-muted',
      message: slugAvailability.message,
    }
  }, [parsedSlug, slugAvailability, slugValue, store])

  const canSubmitProvisioning =
    Boolean(storeState.name.trim()) &&
    parsedSlug.success &&
    slugAvailability.status !== 'checking' &&
    slugAvailability.status !== 'unavailable' &&
    slugAvailability.status !== 'error'

  const isBusy = isPending || isUploading || assetProgress.active

  function applyStoreState(partialStore: {
    name?: string
    slug?: string
    description?: string | null
    logoUrl?: string | null
    bannerUrl?: string | null
  }) {
    setStoreState((current) => ({
      ...current,
      ...(partialStore.name !== undefined ? { name: partialStore.name } : {}),
      ...(partialStore.slug !== undefined ? { slug: partialStore.slug } : {}),
      ...(partialStore.description !== undefined ? { description: partialStore.description ?? '' } : {}),
      ...(partialStore.logoUrl !== undefined ? { logoUrl: partialStore.logoUrl ?? '' } : {}),
      ...(partialStore.bannerUrl !== undefined ? { bannerUrl: partialStore.bannerUrl ?? '' } : {}),
    }))
  }

  async function uploadSelectedAssets() {
    const assets = [
      logoAsset.file ? { kind: 'logo' as const, file: logoAsset.file } : null,
      bannerAsset.file ? { kind: 'banner' as const, file: bannerAsset.file } : null,
    ].filter((asset): asset is { kind: 'logo' | 'banner'; file: File } => asset !== null)

    if (assets.length === 0) {
      return {
        logoUrl: undefined,
        bannerUrl: undefined,
      }
    }

    setAssetProgress({
      active: true,
      current: 0,
      total: assets.length,
      label: 'Завантажуємо файли магазину...',
    })

    const resolvedStore = {
      logoUrl: storeState.logoUrl || null,
      bannerUrl: storeState.bannerUrl || null,
    }

    for (let index = 0; index < assets.length; index += 1) {
      const asset = assets[index]
      const result = await uploadAsset(asset.kind, asset.file)

      if (!result) {
        setErrorMessage('Не вдалося завантажити файли магазину. Спробуйте ще раз.')
        setAssetProgress({
          active: false,
          current: 0,
          total: 0,
          label: '',
        })
        return null
      }

      applyStoreState(result.store)
      resolvedStore.logoUrl = result.store.logoUrl
      resolvedStore.bannerUrl = result.store.bannerUrl

      if (asset.kind === 'logo') {
        setLogoAsset(createPendingAssetState())
      } else {
        setBannerAsset(createPendingAssetState())
      }

      setAssetProgress({
        active: true,
        current: index + 1,
        total: assets.length,
        label: 'Завантажуємо файли магазину...',
      })
    }

    setAssetProgress({
      active: false,
      current: assets.length,
      total: assets.length,
      label: 'Файли магазину завантажено.',
    })

    return {
      logoUrl: assets.some((asset) => asset.kind === 'logo') ? resolvedStore.logoUrl ?? undefined : undefined,
      bannerUrl: assets.some((asset) => asset.kind === 'banner') ? resolvedStore.bannerUrl ?? undefined : undefined,
    }
  }

  function handleAssetSelection(
    file: File | null,
    kind: 'logo' | 'banner',
  ) {
    const setter = kind === 'logo' ? setLogoAsset : setBannerAsset

    if (!file) {
      setter(createPendingAssetState())
      return
    }

    const validationError = validateStoreAssetFile(file)
    if (validationError) {
      setter({
        file: null,
        errorMessage: validationError,
      })
      return
    }

    setter({
      file,
      errorMessage: null,
    })
  }

  if (!sellerProfile) {
    return (
      <section className="ui-elevated-panel p-5 sm:p-6">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-copy-strong">Завершіть підключення продавця</h2>
          <p className="text-sm text-copy-muted">
            {setupHint === 'profile'
              ? 'Перш ніж робочий простір продавця повністю відкриється, нам потрібні базові дані бізнес-профілю нижче.'
              : 'Роль продавця вже є, але запис профілю продавця ще не ініціалізовано.'}
          </p>
        </div>

        <form
          className="mt-6 grid gap-4 sm:grid-cols-2"
          onSubmit={async (event) => {
            event.preventDefault()
            setErrorMessage(null)

            const parsed = sellerOnboardingSchema.safeParse({
              businessName: onboardingState.businessName,
              taxId: onboardingState.taxId || null,
            })

            if (!parsed.success) {
              setErrorMessage(parsed.error.issues[0]?.message ?? 'Перевірте поля підключення.')
              return
            }

            await execute({
              url: '/api/profile/seller/onboard',
              method: 'POST',
              body: parsed.data,
              successMessage: 'Профіль продавця створено.',
            })
          }}
        >
          <FormField label="Назва бізнесу" className="sm:col-span-2">
            <input
              className="ui-surface-input"
              value={onboardingState.businessName}
              onChange={(event) =>
                setOnboardingState((current) => ({ ...current, businessName: event.target.value }))
              }
              required
            />
          </FormField>
          <FormField label="ІПН / податковий номер" className="sm:col-span-2">
            <input
              className="ui-surface-input"
              value={onboardingState.taxId}
              onChange={(event) =>
                setOnboardingState((current) => ({ ...current, taxId: event.target.value }))
              }
            />
          </FormField>
          <div className="sm:col-span-2">
            <button type="submit" className="ui-primary-button" disabled={isBusy}>
              {isBusy ? 'Зберігаємо...' : 'Створити профіль продавця'}
            </button>
          </div>
        </form>

        {errorMessage ? <p className="mt-4 text-sm text-brand-danger">{errorMessage}</p> : null}
      </section>
    )
  }

  if (!store) {
    const slugPreview = slugValue ? `/${slugValue}` : '/your-store'

    return (
      <section className="ui-elevated-panel p-5 sm:p-6">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-copy-strong">Створіть вітрину магазину</h2>
          <p className="text-sm text-copy-muted">
            {setupHint === 'storefront'
              ? 'Верифікацію продавця завершено. Заповніть дані вітрини нижче, щоб відкрити повний робочий простір продавця.'
              : 'Ваш профіль продавця верифіковано. Завершіть налаштування вітрини, щоб відкрити товари, замовлення, склад і аналітику.'}
          </p>
        </div>

        <form
          className="mt-6 grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault()
            setErrorMessage(null)

            const parsed = createStoreSchema.safeParse({
              name: storeState.name.trim(),
              slug: toOptionalString(storeState.slug),
              description: toOptionalString(storeState.description),
            })

            if (!parsed.success) {
              setErrorMessage(parsed.error.issues[0]?.message ?? 'Перевірте поля вітрини.')
              return
            }

            if (!canSubmitProvisioning) {
              setErrorMessage('Оберіть доступний slug вітрини перед продовженням.')
              return
            }

            const data = await execute<{ id: string }>({
              url: '/api/seller/storefront/provision',
              method: 'POST',
              body: parsed.data,
              successMessage: 'Вітрину магазину створено.',
              refresh: false,
            })

            if (!data) {
              return
            }

            const uploadedAssets = await uploadSelectedAssets()
            if (uploadedAssets === null) {
              return
            }

            router.push('/seller')
          }}
        >
          <FormGrid at="sm">
            <FormField label="Назва магазину">
              <input
                className="ui-surface-input"
                value={storeState.name}
                onChange={(event) => {
                  const nextName = event.target.value
                  setStoreState((current) => ({
                    ...current,
                    name: nextName,
                    slug: !store && !isSlugManual ? generateStoreSlugDraft(nextName) : current.slug,
                  }))
                }}
                required
              />
            </FormField>
            <FormField label="Slug магазину">
              <input
                className="ui-surface-input"
                value={storeState.slug}
                onChange={(event) => {
                  setIsSlugManual(true)
                  setStoreState((current) => ({
                    ...current,
                    slug: event.target.value,
                  }))
                }}
                required
                aria-invalid={!parsedSlug.success || slugAvailability.status === 'unavailable' || slugAvailability.status === 'error'}
                aria-describedby="storefront-slug-hint"
              />
            </FormField>
          </FormGrid>

          <div className="rounded-2xl border border-panelBorder bg-panel px-4 py-3 text-sm text-copy-secondary">
            <p className="font-medium text-copy-strong">Попередній перегляд URL вітрини</p>
            <p className="mt-1">{slugPreview}</p>
            <p id="storefront-slug-hint" className={`mt-2 ${slugStatus.tone}`}>
              {slugStatus.message}
            </p>
            {!store && slugAvailability.status === 'unavailable' && slugAvailability.suggestion ? (
              <button
                type="button"
                className="mt-3 ui-secondary-button h-10 px-4 py-2 text-sm"
                onClick={() => {
                  setIsSlugManual(true)
                  setStoreState((current) => ({ ...current, slug: slugAvailability.suggestion ?? current.slug }))
                }}
              >
                Використати підказку
              </button>
            ) : null}
          </div>

          <FormField label="Опис">
            <textarea
              className="ui-surface-input min-h-32 resize-y"
              value={storeState.description}
              onChange={(event) =>
                setStoreState((current) => ({ ...current, description: event.target.value }))
              }
            />
          </FormField>

          <div className="grid gap-4 lg:grid-cols-2">
            <StoreAssetUploadField
              label="Логотип магазину"
              description="Необов’язковий квадратний бренд-актив. JPG, PNG, WEBP або SVG до 5MB."
              file={logoAsset.file}
              imageUrl={null}
              alt="Попередній перегляд логотипа магазину"
              accept=".jpg,.jpeg,.png,.webp,.svg"
              errorMessage={logoAsset.errorMessage}
              onFileSelect={(file) => handleAssetSelection(file, 'logo')}
              onClear={() => setLogoAsset(createPendingAssetState())}
            />
            <StoreAssetUploadField
              label="Банер магазину"
              description="Необов’язкове широке зображення для вітрини. JPG, PNG, WEBP або SVG до 5MB."
              file={bannerAsset.file}
              imageUrl={null}
              alt="Попередній перегляд банера магазину"
              accept=".jpg,.jpeg,.png,.webp,.svg"
              errorMessage={bannerAsset.errorMessage}
              onFileSelect={(file) => handleAssetSelection(file, 'banner')}
              onClear={() => setBannerAsset(createPendingAssetState())}
            />
          </div>

          <UploadProgress
            label={assetProgress.label}
            current={assetProgress.current}
            total={assetProgress.total}
            isActive={assetProgress.active}
            variant="inline"
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button type="submit" className="ui-primary-button" disabled={isBusy || !canSubmitProvisioning}>
              {isBusy ? 'Створюємо...' : 'Створити вітрину'}
            </button>
            <p className="text-sm text-copy-muted">
              Файли магазину завантажаться автоматично одразу після створення вітрини.
            </p>
          </div>
        </form>

        {errorMessage ? <p className="mt-4 text-sm text-brand-danger" role="alert">{errorMessage}</p> : null}
      </section>
    )
  }

  const isVerified = sellerProfile.verificationStatus === 'VERIFIED'

  return (
    <div className="space-y-6">
      <section className="ui-elevated-panel p-5 sm:p-6">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-copy-strong">Налаштування магазину</h2>
          <p className="text-sm text-copy-muted">
            Керуйте виглядом вітрини, публічним slug і готовністю до активації.
          </p>
        </div>

        <form
          className="mt-6 grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault()
            setErrorMessage(null)

            const uploadedAssets = await uploadSelectedAssets()
            if (uploadedAssets === null) {
              return
            }

            const payload = {
              name: storeState.name.trim(),
              description: toOptionalString(storeState.description),
              logoUrl: toOptionalString(uploadedAssets.logoUrl ?? storeState.logoUrl),
              bannerUrl: toOptionalString(uploadedAssets.bannerUrl ?? storeState.bannerUrl),
            }

            const parsed = updateStoreSettingsSchema.safeParse(payload)

            if (!parsed.success) {
              setErrorMessage(parsed.error.issues[0]?.message ?? 'Перевірте поля магазину.')
              return
            }

            const saved = await execute<{
              name: string
              slug: string
              description: string | null
              logoUrl: string | null
              bannerUrl: string | null
            }>({
              url: '/api/seller/storefront/settings',
              method: 'PATCH',
              body: parsed.data,
              successMessage: 'Налаштування магазину збережено.',
              refresh: false,
            })

            if (!saved) {
              return
            }

            applyStoreState(saved)
            router.refresh()
          }}
        >
          <FormGrid at="sm">
            <FormField label="Назва магазину">
              <input
                className="ui-surface-input"
                value={storeState.name}
                onChange={(event) => setStoreState((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </FormField>
            <FormField
              label="Slug магазину"
              helperId="store-settings-slug-note"
              helperText="URL вашої вітрини фіксується після створення, щоб посилання залишалися стабільними."
            >
              <input
                className="ui-surface-input"
                value={storeState.slug}
                readOnly
                disabled
                aria-describedby="store-settings-slug-note"
              />
            </FormField>
          </FormGrid>

          <FormField label="Опис">
            <textarea
              className="ui-surface-input min-h-32 resize-y"
              value={storeState.description}
              onChange={(event) =>
                setStoreState((current) => ({ ...current, description: event.target.value }))
              }
            />
          </FormField>

          <div className="grid gap-4 lg:grid-cols-2">
            <StoreAssetUploadField
              label="Логотип магазину"
              description="Замініть завантажений логотип магазину. JPG, PNG, WEBP або SVG до 5MB."
              file={logoAsset.file}
              imageUrl={storeState.logoUrl || null}
              alt="Попередній перегляд логотипа магазину"
              accept=".jpg,.jpeg,.png,.webp,.svg"
              errorMessage={logoAsset.errorMessage}
              statusLabel={logoAsset.file ? 'Готово до завантаження' : storeState.logoUrl ? 'Завантажено' : undefined}
              disabled={isBusy}
              onFileSelect={(file) => handleAssetSelection(file, 'logo')}
              onClear={() => setLogoAsset(createPendingAssetState())}
            />
            <StoreAssetUploadField
              label="Банер магазину"
              description="Замініть завантажений банер магазину. JPG, PNG, WEBP або SVG до 5MB."
              file={bannerAsset.file}
              imageUrl={storeState.bannerUrl || null}
              alt="Попередній перегляд банера магазину"
              accept=".jpg,.jpeg,.png,.webp,.svg"
              errorMessage={bannerAsset.errorMessage}
              statusLabel={bannerAsset.file ? 'Готово до завантаження' : storeState.bannerUrl ? 'Завантажено' : undefined}
              disabled={isBusy}
              onFileSelect={(file) => handleAssetSelection(file, 'banner')}
              onClear={() => setBannerAsset(createPendingAssetState())}
            />
          </div>

          <UploadProgress
            label={assetProgress.label}
            current={assetProgress.current}
            total={assetProgress.total}
            isActive={assetProgress.active}
            variant="inline"
          />

          <div className="flex w-full flex-col items-stretch justify-center gap-3 min-[501px]:items-center min-[501px]:max-[859px]:flex-col min-[860px]:flex-row min-[860px]:flex-wrap min-[860px]:justify-center">
            <button type="submit" className="ui-primary-button w-full min-[501px]:w-64" disabled={isBusy}>
              {isBusy ? 'Зберігаємо...' : 'Зберегти магазин'}
            </button>
            <button
              type="button"
              className="ui-secondary-button w-full min-[501px]:w-64"
              disabled={isBusy || !isVerified || store.isActive}
              onClick={() =>
                execute({
                  url: '/api/seller/store/activate',
                  successMessage: 'Магазин активовано.',
                })
              }
            >
              Активувати магазин
            </button>
            <button
              type="button"
              className="ui-secondary-button w-full min-[501px]:w-64"
              disabled={isBusy || !store.isActive}
              onClick={() =>
                execute({
                  url: '/api/seller/store/deactivate',
                  successMessage: 'Магазин деактивовано.',
                })
              }
            >
              Деактивувати магазин
            </button>
          </div>
        </form>

        {errorMessage ? <p className="mt-4 text-sm text-brand-danger" role="alert">{errorMessage}</p> : null}
      </section>
    </div>
  )
}
