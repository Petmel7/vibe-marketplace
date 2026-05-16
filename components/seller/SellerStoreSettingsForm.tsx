'use client'

import Image from 'next/image'
import { useState } from 'react'
import { sellerOnboardingSchema } from '@/features/seller/seller.schema'
import { updateStoreSchema } from '@/features/store/store.schema'
import { useSellerMutation } from '@/hooks/useSellerMutation'
import type { SellerVerificationStatus } from '@/types/seller'

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
    return (
      <section className="ui-elevated-panel p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-copy-strong">Store provisioning in progress</h2>
        <p className="mt-2 text-sm text-copy-muted">
          Your seller profile is ready, but a storefront record has not been provisioned yet. Once that backend setup is available, store settings, product publishing, and fulfillment activation will appear here automatically.
        </p>
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

            const parsed = updateStoreSchema.safeParse({
              name: storeState.name,
              slug: storeState.slug,
              description: storeState.description || null,
              logoUrl: storeState.logoUrl || null,
              bannerUrl: storeState.bannerUrl || null,
            })

            if (!parsed.success) {
              setErrorMessage(parsed.error.issues[0]?.message ?? 'Please review the store fields.')
              return
            }

            await execute({
              url: '/api/seller/store',
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
                onChange={(event) => setStoreState((current) => ({ ...current, slug: event.target.value }))}
                required
              />
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

        {errorMessage ? <p className="mt-4 text-sm text-brand-danger">{errorMessage}</p> : null}
      </section>
    </div>
  )
}
