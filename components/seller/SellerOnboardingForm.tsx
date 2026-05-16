'use client'

import { useMemo, useRef, useState } from 'react'
import { sellerOnboardingSchema } from '@/features/seller/seller.schema'
import { updateProfileSchema } from '@/features/profile/profile.schema'
import { useSellerOnboardingMutation } from '@/hooks/useSellerOnboardingMutation'

type FormErrors = Partial<Record<'storeName' | 'storeSlug' | 'bio' | 'taxId' | 'terms', string>>

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

function getSlugError(slug: string) {
  if (!slug) {
    return 'Add a storefront slug so buyers can preview your future shop URL.'
  }

  if (slug.length < 3) {
    return 'Use at least 3 characters for the planned storefront slug.'
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return 'Use lowercase letters, numbers, and single hyphens only.'
  }

  return null
}

export default function SellerOnboardingForm({
  defaultStoreName,
  defaultBio,
}: {
  defaultStoreName: string
  defaultBio: string
}) {
  const { submit, isPending, errorMessage, setErrorMessage } = useSellerOnboardingMutation()
  const [storeName, setStoreName] = useState(defaultStoreName)
  const [storeSlug, setStoreSlug] = useState(slugify(defaultStoreName))
  const [bio, setBio] = useState(defaultBio)
  const [taxId, setTaxId] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({})
  const [hasCustomSlug, setHasCustomSlug] = useState(false)
  const storeNameRef = useRef<HTMLInputElement>(null)
  const storeSlugRef = useRef<HTMLInputElement>(null)
  const bioRef = useRef<HTMLTextAreaElement>(null)
  const taxIdRef = useRef<HTMLInputElement>(null)
  const termsRef = useRef<HTMLInputElement>(null)

  const slugPreview = useMemo(() => `/shop/${storeSlug || 'your-store'}`, [storeSlug])

  return (
    <section className="ui-elevated-panel p-5 sm:p-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-copy-strong">Seller application</h2>
        <p className="text-sm text-copy-muted">
          Share the basics for your marketplace review. Your storefront visuals and payouts can be completed in later onboarding steps once verification and provisioning are ready.
        </p>
      </div>

      <form
        className="mt-6 grid gap-5"
        noValidate
        onSubmit={async (event) => {
          event.preventDefault()
          setErrorMessage(null)

          const nextErrors: FormErrors = {}
          const onboardingResult = sellerOnboardingSchema.safeParse({
            businessName: storeName.trim(),
            taxId: taxId.trim() || null,
          })

          if (!onboardingResult.success) {
            for (const issue of onboardingResult.error.issues) {
              if (issue.path[0] === 'businessName') {
                nextErrors.storeName = issue.message
              }

              if (issue.path[0] === 'taxId') {
                nextErrors.taxId = issue.message
              }
            }
          }

          const profileResult = updateProfileSchema.safeParse({
            bio: bio.trim() || null,
          })

          if (!profileResult.success) {
            nextErrors.bio = profileResult.error.issues[0]?.message ?? 'Please review your seller description.'
          }

          const slugError = getSlugError(storeSlug)
          if (slugError) {
            nextErrors.storeSlug = slugError
          }

          if (!acceptedTerms) {
            nextErrors.terms = 'You need to accept the marketplace terms before applying.'
          }

          setFieldErrors(nextErrors)

          const firstErrorKey = (Object.keys(nextErrors)[0] ?? null) as keyof FormErrors | null
          if (firstErrorKey) {
            if (firstErrorKey === 'storeName') storeNameRef.current?.focus()
            if (firstErrorKey === 'storeSlug') storeSlugRef.current?.focus()
            if (firstErrorKey === 'bio') bioRef.current?.focus()
            if (firstErrorKey === 'taxId') taxIdRef.current?.focus()
            if (firstErrorKey === 'terms') termsRef.current?.focus()
            return
          }

          await submit({
            businessName: onboardingResult.success ? onboardingResult.data.businessName : storeName.trim(),
            taxId: onboardingResult.success ? onboardingResult.data.taxId ?? null : taxId.trim() || null,
            bio: profileResult.success ? profileResult.data.bio ?? null : bio.trim() || null,
          })
        }}
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)]">
          <div className="space-y-5">
            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Store name</span>
              <input
                ref={storeNameRef}
                className="ui-surface-input"
                value={storeName}
                onChange={(event) => {
                  const nextValue = event.target.value
                  setStoreName(nextValue)
                  if (!hasCustomSlug) {
                    setStoreSlug(slugify(nextValue))
                  }
                }}
                aria-invalid={fieldErrors.storeName ? 'true' : 'false'}
                aria-describedby={fieldErrors.storeName ? 'seller-store-name-error' : undefined}
                placeholder="Studio North"
                required
              />
              <p className="text-xs text-copy-muted">
                This becomes your initial seller identity during review and storefront setup.
              </p>
              {fieldErrors.storeName ? (
                <p id="seller-store-name-error" className="text-sm text-brand-danger">
                  {fieldErrors.storeName}
                </p>
              ) : null}
            </label>

            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Planned storefront slug</span>
              <input
                ref={storeSlugRef}
                className="ui-surface-input"
                value={storeSlug}
                onChange={(event) => {
                  setHasCustomSlug(true)
                  setStoreSlug(slugify(event.target.value))
                }}
                aria-invalid={fieldErrors.storeSlug ? 'true' : 'false'}
                aria-describedby={fieldErrors.storeSlug ? 'seller-store-slug-error' : 'seller-store-slug-hint'}
                placeholder="studio-north"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              <p id="seller-store-slug-hint" className="text-xs text-copy-muted">
                Preview URL: <span className="font-medium text-copy-primary">{slugPreview}</span>. We will finalize availability when storefront provisioning opens.
              </p>
              {fieldErrors.storeSlug ? (
                <p id="seller-store-slug-error" className="text-sm text-brand-danger">
                  {fieldErrors.storeSlug}
                </p>
              ) : null}
            </label>

            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Seller bio</span>
              <textarea
                ref={bioRef}
                className="ui-surface-input min-h-32 resize-y"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                aria-invalid={fieldErrors.bio ? 'true' : 'false'}
                aria-describedby={fieldErrors.bio ? 'seller-bio-error' : 'seller-bio-hint'}
                placeholder="Tell buyers about your design style, materials, or brand story."
              />
              <p id="seller-bio-hint" className="text-xs text-copy-muted">
                This description can power future storefront summaries and seller trust signals.
              </p>
              {fieldErrors.bio ? (
                <p id="seller-bio-error" className="text-sm text-brand-danger">
                  {fieldErrors.bio}
                </p>
              ) : null}
            </label>

            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Tax ID</span>
              <input
                ref={taxIdRef}
                className="ui-surface-input"
                value={taxId}
                onChange={(event) => setTaxId(event.target.value)}
                aria-invalid={fieldErrors.taxId ? 'true' : 'false'}
                aria-describedby={fieldErrors.taxId ? 'seller-tax-id-error' : 'seller-tax-id-hint'}
                placeholder="Optional for now"
              />
              <p id="seller-tax-id-hint" className="text-xs text-copy-muted">
                Optional today. You can expand business and payout details in future verification steps.
              </p>
              {fieldErrors.taxId ? (
                <p id="seller-tax-id-error" className="text-sm text-brand-danger">
                  {fieldErrors.taxId}
                </p>
              ) : null}
            </label>
          </div>

          <div className="space-y-5">
            <section className="rounded-3xl border border-panelBorder bg-panel p-4">
              <h3 className="text-sm font-semibold text-copy-strong">Brand assets</h3>
              <p className="mt-2 text-sm text-copy-muted">
                Logo and banner uploads are reserved for the next onboarding phase once your seller profile moves forward.
              </p>
              <div className="mt-4 grid gap-4">
                <div className="rounded-2xl border border-dashed border-panelBorder bg-background px-4 py-8 text-center text-sm text-copy-muted">
                  Store logo placeholder
                </div>
                <div className="rounded-2xl border border-dashed border-panelBorder bg-background px-4 py-8 text-center text-sm text-copy-muted">
                  Store banner placeholder
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-panelBorder bg-panel p-4">
              <h3 className="text-sm font-semibold text-copy-strong">Before you submit</h3>
              <ul className="mt-3 space-y-2 text-sm text-copy-muted">
                <li>We review seller applications before storefront operations open.</li>
                <li>Catalog, fulfillment, and analytics tools unlock after seller verification.</li>
                <li>Your buyer dashboard stays available throughout the onboarding process.</li>
              </ul>
            </section>
          </div>
        </div>

        <label className="mt-1 flex items-start gap-3 rounded-2xl border border-panelBorder bg-panel px-4 py-4">
          <input
            ref={termsRef}
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-panelBorder"
            checked={acceptedTerms}
            onChange={(event) => setAcceptedTerms(event.target.checked)}
            aria-invalid={fieldErrors.terms ? 'true' : 'false'}
            aria-describedby={fieldErrors.terms ? 'seller-terms-error' : 'seller-terms-hint'}
          />
          <span className="space-y-1 text-sm">
            <span className="block font-medium text-copy-strong">I accept the marketplace seller terms and review process.</span>
            <span id="seller-terms-hint" className="block text-copy-muted">
              This confirms you understand marketplace policies, moderation, and seller verification requirements.
            </span>
          </span>
        </label>
        {fieldErrors.terms ? (
          <p id="seller-terms-error" className="text-sm text-brand-danger">
            {fieldErrors.terms}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button type="submit" className="ui-primary-button" disabled={isPending}>
            {isPending ? 'Submitting application...' : 'Submit seller application'}
          </button>
          <p className="text-sm text-copy-muted">Once approved, we will route you straight into the seller workspace.</p>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-brand-danger/20 bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger" role="alert">
            {errorMessage}
          </div>
        ) : null}
      </form>
    </section>
  )
}
