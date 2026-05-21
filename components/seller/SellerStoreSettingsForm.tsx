'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import ImageUploadField from '@/components/seller/ImageUploadField'
import UploadProgress from '@/components/seller/UploadProgress'
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
        message: 'Your storefront URL is locked after provisioning to keep links stable.',
      }
    }

    if (!slugValue) {
      return {
        tone: 'text-copy-muted',
        message: 'Choose a public storefront URL for your marketplace presence.',
      }
    }

    if (!parsedSlug.success) {
      return {
        tone: 'text-brand-danger',
        message: parsedSlug.error.issues[0]?.message ?? 'Enter a valid slug.',
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
        message: `${slugAvailability.message}${slugAvailability.suggestion ? ` Try ${slugAvailability.suggestion}.` : ''}`,
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
      label: 'Uploading store assets...',
    })

    const resolvedStore = {
      logoUrl: storeState.logoUrl || null,
      bannerUrl: storeState.bannerUrl || null,
    }

    for (let index = 0; index < assets.length; index += 1) {
      const asset = assets[index]
      const result = await uploadAsset(asset.kind, asset.file)

      if (!result) {
        setErrorMessage('Store asset upload failed. Please try again.')
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
        label: 'Uploading store assets...',
      })
    }

    setAssetProgress({
      active: false,
      current: assets.length,
      total: assets.length,
      label: 'Store assets uploaded.',
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
          <h2 className="text-lg font-semibold text-copy-strong">Complete seller onboarding</h2>
          <p className="text-sm text-copy-muted">
            {setupHint === 'profile'
              ? 'Before the seller workspace can open fully, we need the core business profile details below.'
              : 'Your seller role is present, but the seller profile record has not been initialized yet.'}
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
              setErrorMessage(parsed.error.issues[0]?.message ?? 'Please review the onboarding fields.')
              return
            }

            await execute({
              url: '/api/profile/seller/onboard',
              method: 'POST',
              body: parsed.data,
              successMessage: 'Seller profile created.',
            })
          }}
        >
          <label className="space-y-2 sm:col-span-2">
            <span className="block text-sm font-medium text-copy-strong">Business name</span>
            <input
              className="ui-surface-input"
              value={onboardingState.businessName}
              onChange={(event) =>
                setOnboardingState((current) => ({ ...current, businessName: event.target.value }))
              }
              required
            />
          </label>
          <label className="space-y-2 sm:col-span-2">
            <span className="block text-sm font-medium text-copy-strong">Tax ID</span>
            <input
              className="ui-surface-input"
              value={onboardingState.taxId}
              onChange={(event) =>
                setOnboardingState((current) => ({ ...current, taxId: event.target.value }))
              }
            />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className="ui-primary-button" disabled={isBusy}>
              {isBusy ? 'Saving...' : 'Create seller profile'}
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
          <h2 className="text-lg font-semibold text-copy-strong">Provision storefront</h2>
          <p className="text-sm text-copy-muted">
            {setupHint === 'storefront'
              ? 'Your seller verification is complete. Finish the storefront identity below to unlock the full seller workspace.'
              : 'Your seller profile is verified. Complete storefront setup to unlock products, orders, inventory, and analytics.'}
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
              setErrorMessage(parsed.error.issues[0]?.message ?? 'Please review the storefront fields.')
              return
            }

            if (!canSubmitProvisioning) {
              setErrorMessage('Choose an available storefront slug before continuing.')
              return
            }

            const data = await execute<{ id: string }>({
              url: '/api/seller/storefront/provision',
              method: 'POST',
              body: parsed.data,
              successMessage: 'Storefront provisioned.',
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
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Store name</span>
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
            </label>
            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Store slug</span>
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
            </label>
          </div>

          <div className="rounded-2xl border border-panelBorder bg-panel px-4 py-3 text-sm text-copy-secondary">
            <p className="font-medium text-copy-strong">Storefront URL preview</p>
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
                Use suggestion
              </button>
            ) : null}
          </div>

          <label className="space-y-2">
            <span className="block text-sm font-medium text-copy-strong">Description</span>
            <textarea
              className="ui-surface-input min-h-32 resize-y"
              value={storeState.description}
              onChange={(event) =>
                setStoreState((current) => ({ ...current, description: event.target.value }))
              }
            />
          </label>

          <div className="grid gap-4 lg:grid-cols-2">
            <ImageUploadField
              label="Store logo"
              description="Optional square brand asset. JPG, PNG, WEBP, or SVG up to 5MB."
              file={logoAsset.file}
              imageUrl={null}
              alt="Store logo preview"
              accept=".jpg,.jpeg,.png,.webp,.svg"
              errorMessage={logoAsset.errorMessage}
              onFileSelect={(file) => handleAssetSelection(file, 'logo')}
              onClear={() => setLogoAsset(createPendingAssetState())}
            />
            <ImageUploadField
              label="Store banner"
              description="Optional wide storefront cover image. JPG, PNG, WEBP, or SVG up to 5MB."
              file={bannerAsset.file}
              imageUrl={null}
              alt="Store banner preview"
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
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button type="submit" className="ui-primary-button" disabled={isBusy || !canSubmitProvisioning}>
              {isBusy ? 'Provisioning...' : 'Provision storefront'}
            </button>
            <p className="text-sm text-copy-muted">
              Store assets will upload automatically right after the storefront is created.
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
          <h2 className="text-lg font-semibold text-copy-strong">Store settings</h2>
          <p className="text-sm text-copy-muted">
            Manage storefront presentation, public slug, and readiness for activation.
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
              setErrorMessage(parsed.error.issues[0]?.message ?? 'Please review the store fields.')
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
              successMessage: 'Store settings saved.',
              refresh: false,
            })

            if (!saved) {
              return
            }

            applyStoreState(saved)
            router.refresh()
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Store name</span>
              <input
                className="ui-surface-input"
                value={storeState.name}
                onChange={(event) => setStoreState((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </label>
            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Store slug</span>
              <input
                className="ui-surface-input"
                value={storeState.slug}
                readOnly
                disabled
                aria-describedby="store-settings-slug-note"
              />
              <p id="store-settings-slug-note" className="text-sm text-copy-muted">
                Your storefront URL is locked after provisioning to keep links stable.
              </p>
            </label>
          </div>

          <label className="space-y-2">
            <span className="block text-sm font-medium text-copy-strong">Description</span>
            <textarea
              className="ui-surface-input min-h-32 resize-y"
              value={storeState.description}
              onChange={(event) =>
                setStoreState((current) => ({ ...current, description: event.target.value }))
              }
            />
          </label>

          <div className="grid gap-4 lg:grid-cols-2">
            <ImageUploadField
              label="Store logo"
              description="Replace your uploaded store logo. JPG, PNG, WEBP, or SVG up to 5MB."
              file={logoAsset.file}
              imageUrl={storeState.logoUrl || null}
              alt="Store logo preview"
              accept=".jpg,.jpeg,.png,.webp,.svg"
              errorMessage={logoAsset.errorMessage}
              statusLabel={logoAsset.file ? 'Ready to upload' : storeState.logoUrl ? 'Uploaded' : undefined}
              disabled={isBusy}
              onFileSelect={(file) => handleAssetSelection(file, 'logo')}
              onClear={() => setLogoAsset(createPendingAssetState())}
            />
            <ImageUploadField
              label="Store banner"
              description="Replace your uploaded store banner. JPG, PNG, WEBP, or SVG up to 5MB."
              file={bannerAsset.file}
              imageUrl={storeState.bannerUrl || null}
              alt="Store banner preview"
              accept=".jpg,.jpeg,.png,.webp,.svg"
              errorMessage={bannerAsset.errorMessage}
              statusLabel={bannerAsset.file ? 'Ready to upload' : storeState.bannerUrl ? 'Uploaded' : undefined}
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
          />

          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="submit" className="ui-primary-button" disabled={isBusy}>
              {isBusy ? 'Saving...' : 'Save store'}
            </button>
            <button
              type="button"
              className="ui-secondary-button"
              disabled={isBusy || !isVerified || store.isActive}
              onClick={() =>
                execute({
                  url: '/api/seller/store/activate',
                  successMessage: 'Store activated.',
                })
              }
            >
              Activate store
            </button>
            <button
              type="button"
              className="ui-secondary-button"
              disabled={isBusy || !store.isActive}
              onClick={() =>
                execute({
                  url: '/api/seller/store/deactivate',
                  successMessage: 'Store deactivated.',
                })
              }
            >
              Deactivate store
            </button>
          </div>
        </form>

        {errorMessage ? <p className="mt-4 text-sm text-brand-danger" role="alert">{errorMessage}</p> : null}
      </section>
    </div>
  )
}
