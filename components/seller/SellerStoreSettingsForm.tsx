'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { sellerOnboardingSchema } from '@/features/seller/seller.schema'
import {
  createStoreSchema,
  slugSchema,
  updateStoreSettingsSchema,
} from '@/features/storefront/storefront.schema'
import { useSellerMutation } from '@/hooks/useSellerMutation'
import type { SellerVerificationStatus } from '@/types/seller'

type SlugAvailabilityState =
  | { status: 'idle'; message: string | null; suggestion: null }
  | { status: 'checking'; message: string; suggestion: null }
  | { status: 'available'; message: string; suggestion: null }
  | { status: 'invalid'; message: string; suggestion: null }
  | { status: 'unavailable'; message: string; suggestion: string | null }

type SlugLookupState = {
  slug: string
  status: 'idle' | 'checking' | 'available' | 'unavailable' | 'error'
  suggestion: string | null
}

function toOptionalString(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
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
  const [onboardingState, setOnboardingState] = useState({
    businessName: sellerProfile?.businessName ?? '',
    taxId: sellerProfile?.taxId ?? '',
  })
  const [storeState, setStoreState] = useState({
    name: store?.name ?? '',
    slug: store?.slug ?? '',
    description: store?.description ?? '',
    logoUrl: store?.logoUrl ?? '',
    bannerUrl: store?.bannerUrl ?? '',
  })
  const [slugLookupState, setSlugLookupState] = useState<SlugLookupState>({
    slug: '',
    status: 'idle',
    suggestion: null,
  })
  const slugValue = storeState.slug.trim()
  const parsedSlug = slugSchema.safeParse(slugValue)

  useEffect(() => {
    if (store || !slugValue || !parsedSlug.success) {
      return
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setSlugLookupState({ slug: slugValue, status: 'checking', suggestion: null })

      try {
        const response = await fetch(`/api/seller/storefront/slug?slug=${encodeURIComponent(slugValue)}`, {
          signal: controller.signal,
        })
        const json = (await response.json()) as
          | { success: true; data: { available: boolean; suggestion: string | null } }
          | { success: false; error?: { message?: string } }

        if (!response.ok || !json.success) {
          setSlugLookupState({ slug: slugValue, status: 'error', suggestion: null })
          return
        }

        if (json.data.available) {
          setSlugLookupState({ slug: slugValue, status: 'available', suggestion: null })
          return
        }

        setSlugLookupState({
          slug: slugValue,
          status: 'unavailable',
          suggestion: json.data.suggestion,
        })
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        setSlugLookupState({ slug: slugValue, status: 'error', suggestion: null })
      }
    }, 350)

    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [parsedSlug.success, slugValue, store])

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
            <button type="submit" className="ui-primary-button" disabled={isPending}>
              {isPending ? 'Saving...' : 'Create seller profile'}
            </button>
          </div>
        </form>

        {errorMessage ? <p className="mt-4 text-sm text-brand-danger">{errorMessage}</p> : null}
      </section>
    )
  }

  if (!store) {
    const slugPreview = slugValue ? `/${slugValue}` : '/your-store'
    const slugAvailability: SlugAvailabilityState = !slugValue
      ? {
          status: 'idle',
          message: 'Choose a public storefront URL for your marketplace presence.',
          suggestion: null,
        }
      : !parsedSlug.success
        ? {
            status: 'invalid',
            message: parsedSlug.error.issues[0]?.message ?? 'Enter a valid slug.',
            suggestion: null,
          }
        : slugLookupState.slug !== slugValue || slugLookupState.status === 'checking'
          ? {
              status: 'checking',
              message: 'Checking availability...',
              suggestion: null,
            }
          : slugLookupState.status === 'available'
            ? {
                status: 'available',
                message: 'This storefront URL is available.',
                suggestion: null,
              }
            : slugLookupState.status === 'unavailable'
              ? {
                  status: 'unavailable',
                  message: 'This storefront URL is already in use.',
                  suggestion: slugLookupState.suggestion,
                }
              : {
                  status: 'invalid',
                  message: 'Unable to validate slug right now.',
                  suggestion: null,
                }
    const canSubmitProvisioning =
      slugAvailability.status !== 'checking' &&
      slugAvailability.status !== 'invalid' &&
      slugAvailability.status !== 'unavailable'

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
              logoUrl: toOptionalString(storeState.logoUrl),
              bannerUrl: toOptionalString(storeState.bannerUrl),
            })

            if (!parsed.success) {
              setErrorMessage(parsed.error.issues[0]?.message ?? 'Please review the storefront fields.')
              return
            }

            if (!canSubmitProvisioning) {
              setErrorMessage('Choose an available storefront slug before continuing.')
              return
            }

            await execute({
              url: '/api/seller/storefront/provision',
              method: 'POST',
              body: parsed.data,
              successMessage: 'Storefront provisioned.',
              refresh: false,
              onSuccess: async () => {
                router.push('/seller')
              },
            })
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
                onChange={(event) =>
                  setStoreState((current) => ({
                    ...current,
                    slug: event.target.value.trim().toLowerCase().replace(/\s+/g, '-'),
                  }))
                }
                required
                aria-invalid={slugAvailability.status === 'invalid' || slugAvailability.status === 'unavailable'}
                aria-describedby="storefront-slug-hint"
              />
            </label>
          </div>

          <div className="rounded-2xl border border-panelBorder bg-panel px-4 py-3 text-sm text-copy-secondary">
            <p className="font-medium text-copy-strong">Storefront URL preview</p>
            <p className="mt-1">{slugPreview}</p>
            <p
              id="storefront-slug-hint"
              className={`mt-2 ${
                slugAvailability.status === 'available'
                  ? 'text-emerald-300'
                  : slugAvailability.status === 'invalid' || slugAvailability.status === 'unavailable'
                    ? 'text-brand-danger'
                    : 'text-copy-muted'
              }`}
            >
              {slugAvailability.message}
              {slugAvailability.status === 'unavailable' && slugAvailability.suggestion
                ? ` Try ${slugAvailability.suggestion}.`
                : ''}
            </p>
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
            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Logo URL</span>
              <input
                className="ui-surface-input"
                value={storeState.logoUrl}
                onChange={(event) => setStoreState((current) => ({ ...current, logoUrl: event.target.value }))}
                placeholder="https://example.com/logo.png"
              />
            </label>
            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Banner URL</span>
              <input
                className="ui-surface-input"
                value={storeState.bannerUrl}
                onChange={(event) =>
                  setStoreState((current) => ({ ...current, bannerUrl: event.target.value }))
                }
                placeholder="https://example.com/banner.png"
              />
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Logo preview</span>
              <div className="relative h-32 overflow-hidden rounded-3xl border border-dashed border-panelBorder bg-panel">
                {storeState.logoUrl ? (
                  <Image src={storeState.logoUrl} alt="Store logo preview" fill className="object-contain p-4" sizes="320px" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-copy-muted">
                    Logo upload integration placeholder
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Banner preview</span>
              <div className="relative h-32 overflow-hidden rounded-3xl border border-dashed border-panelBorder bg-panel">
                {storeState.bannerUrl ? (
                  <Image src={storeState.bannerUrl} alt="Store banner preview" fill className="object-cover" sizes="640px" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-copy-muted">
                    Banner upload integration placeholder
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button type="submit" className="ui-primary-button" disabled={isPending || !canSubmitProvisioning}>
              {isPending ? 'Provisioning...' : 'Provision storefront'}
            </button>
            <p className="text-sm text-copy-muted">
              Store activation controls will appear after provisioning completes.
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

            const parsed = updateStoreSettingsSchema.safeParse({
              name: storeState.name.trim(),
              description: toOptionalString(storeState.description),
              logoUrl: toOptionalString(storeState.logoUrl),
              bannerUrl: toOptionalString(storeState.bannerUrl),
            })

            if (!parsed.success) {
              setErrorMessage(parsed.error.issues[0]?.message ?? 'Please review the store fields.')
              return
            }

            await execute({
              url: '/api/seller/storefront/settings',
              method: 'PATCH',
              body: parsed.data,
              successMessage: 'Store settings saved.',
            })
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
            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Logo URL</span>
              <input
                className="ui-surface-input"
                value={storeState.logoUrl}
                onChange={(event) => setStoreState((current) => ({ ...current, logoUrl: event.target.value }))}
                placeholder="https://example.com/logo.png"
              />
            </label>
            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Banner URL</span>
              <input
                className="ui-surface-input"
                value={storeState.bannerUrl}
                onChange={(event) =>
                  setStoreState((current) => ({ ...current, bannerUrl: event.target.value }))
                }
                placeholder="https://example.com/banner.png"
              />
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Logo preview</span>
              <div className="relative h-32 overflow-hidden rounded-3xl border border-dashed border-panelBorder bg-panel">
                {storeState.logoUrl ? (
                  <Image src={storeState.logoUrl} alt="Store logo preview" fill className="object-contain p-4" sizes="320px" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-copy-muted">
                    Logo upload integration placeholder
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Banner preview</span>
              <div className="relative h-32 overflow-hidden rounded-3xl border border-dashed border-panelBorder bg-panel">
                {storeState.bannerUrl ? (
                  <Image src={storeState.bannerUrl} alt="Store banner preview" fill className="object-cover" sizes="640px" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-copy-muted">
                    Banner upload integration placeholder
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="submit" className="ui-primary-button" disabled={isPending}>
              {isPending ? 'Saving...' : 'Save store'}
            </button>
            <button
              type="button"
              className="ui-secondary-button"
              disabled={isPending || !isVerified || store.isActive}
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
              disabled={isPending || !store.isActive}
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
