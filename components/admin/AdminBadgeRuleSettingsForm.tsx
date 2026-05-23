'use client'

import { useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import AdminStatusBadge from '@/components/admin/AdminStatusBadge'
import { useAdminBadgeRules } from '@/hooks/useAdminBadgeRules'
import { useAdminMutation } from '@/hooks/useAdminMutation'
import { API_ROUTES } from '@/lib/constants/apiRoutes'
import type { AdminBadgeRule, UpdateHitBadgeRulePayload } from '@/types/admin-badge-rules'

type FormState = {
  minViews: string
  minWishlists: string
  minSoldCount: string
  minRevenueAmount: string
  enabled: boolean
}

function toFormState(rule: AdminBadgeRule): FormState {
  return {
    minViews: String(rule.minViews),
    minWishlists: String(rule.minWishlists),
    minSoldCount: String(rule.minSoldCount),
    minRevenueAmount: rule.minRevenueAmount,
    enabled: rule.enabled,
  }
}

function validateNonNegativeInteger(value: string, label: string) {
  if (!/^\d+$/.test(value.trim())) {
    return `${label} must be a whole number of 0 or greater.`
  }

  return null
}

function validateMoney(value: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) {
    return 'Minimum revenue must be a valid amount like 0 or 25.50.'
  }

  return null
}

function validateFormState(formState: FormState) {
  return (
    validateNonNegativeInteger(formState.minViews, 'Minimum views') ||
    validateNonNegativeInteger(formState.minWishlists, 'Minimum wishlists') ||
    validateNonNegativeInteger(formState.minSoldCount, 'Minimum sold count') ||
    validateMoney(formState.minRevenueAmount)
  )
}

function normalizePayload(formState: FormState): UpdateHitBadgeRulePayload {
  return {
    minViews: Number(formState.minViews),
    minWishlists: Number(formState.minWishlists),
    minSoldCount: Number(formState.minSoldCount),
    minRevenueAmount: formState.minRevenueAmount.trim(),
    enabled: formState.enabled,
  }
}

export default function AdminBadgeRuleSettingsForm() {
  const { rules, isLoading, errorMessage, setRules, reloadRules } = useAdminBadgeRules()
  const hitRule = useMemo(
    () => rules.find((rule) => rule.badgeType === 'HIT') ?? null,
    [rules],
  )

  if (isLoading) {
    return (
      <section className="ui-elevated-panel p-5 sm:p-6" aria-busy="true">
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-40 rounded bg-panelAlt" />
          <div className="h-20 rounded-2xl bg-panelAlt" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-24 rounded-2xl bg-panelAlt" />
            <div className="h-24 rounded-2xl bg-panelAlt" />
            <div className="h-24 rounded-2xl bg-panelAlt" />
            <div className="h-24 rounded-2xl bg-panelAlt" />
          </div>
        </div>
      </section>
    )
  }

  if (errorMessage) {
    return (
      <section className="ui-elevated-panel p-5 sm:p-6">
        <AdminEmptyState
          title="Badge rules are unavailable"
          description={errorMessage}
          actionHref="/admin"
          actionLabel="Back to overview"
        />
        <div className="mt-4">
          <button type="button" className="ui-secondary-button" onClick={() => void reloadRules()}>
            Try again
          </button>
        </div>
      </section>
    )
  }

  if (!hitRule) {
    return (
      <section className="ui-elevated-panel p-5 sm:p-6">
        <AdminEmptyState
          title="HIT badge rule not found"
          description="The marketplace does not have an active HIT badge rule record yet. Seed or restore the rule to manage marketplace thresholds here."
        />
      </section>
    )
  }

  return <AdminBadgeRuleSettingsCard key={`${hitRule.id}:${hitRule.updatedAt}`} hitRule={hitRule} setRules={setRules} />
}

function AdminBadgeRuleSettingsCard({
  hitRule,
  setRules,
}: {
  hitRule: AdminBadgeRule
  setRules: Dispatch<SetStateAction<AdminBadgeRule[]>>
}) {
  const {
    execute,
    isPending,
    errorMessage: mutationErrorMessage,
    setErrorMessage: setMutationErrorMessage,
  } = useAdminMutation()
  const [formState, setFormState] = useState<FormState>(() => toFormState(hitRule))
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setSuccessMessage(null)
    setValidationError(null)
    setMutationErrorMessage(null)
    setFormState((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextValidationError = validateFormState(formState)
    if (nextValidationError) {
      setValidationError(nextValidationError)
      return
    }

    const payload = normalizePayload(formState)
    const updated = await execute<AdminBadgeRule>({
      url: API_ROUTES.adminHitBadgeRule,
      method: 'PATCH',
      body: payload,
      successMessage: 'Marketplace HIT badge rule updated.',
      fallbackErrorMessage: 'We could not update the HIT badge rule right now. Please try again.',
      onSuccess: async (data) => {
        setRules((current) =>
          current.map((rule) => (rule.badgeType === 'HIT' ? data : rule)),
        )
        setFormState(toFormState(data))
        setSuccessMessage('The new thresholds are saved. Product HIT badges will follow this rule on the backend.')
      },
    })

    if (!updated) {
      setSuccessMessage(null)
    }
  }

  const feedbackMessage = validationError || mutationErrorMessage

  return (
    <div className="space-y-6">
      <section className="ui-elevated-panel p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-copy-strong">Marketplace HIT rule</h2>
            <p className="max-w-3xl text-sm text-copy-secondary">
              A product becomes <strong>HIT</strong> when it reaches <strong>any</strong> enabled threshold below. Badge assignment and removal stay fully backend-driven.
            </p>
          </div>
          <AdminStatusBadge
            label={formState.enabled ? 'Rule enabled' : 'Rule disabled'}
            tone={formState.enabled ? 'success' : 'neutral'}
          />
        </div>

        <div className="mt-5 rounded-2xl border border-panelBorder bg-panel px-4 py-4 text-sm text-copy-secondary">
          Seller or store-owner self-views, self-wishlists, and self-orders do not contribute to HIT metrics. Products only receive the badge when trusted marketplace signals satisfy this rule.
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Minimum views</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                className="ui-surface-input"
                value={formState.minViews}
                onChange={(event) => handleChange('minViews', event.target.value)}
                aria-invalid={validationError?.includes('views') ? true : undefined}
              />
            </label>

            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Minimum wishlists</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                className="ui-surface-input"
                value={formState.minWishlists}
                onChange={(event) => handleChange('minWishlists', event.target.value)}
                aria-invalid={validationError?.includes('wishlists') ? true : undefined}
              />
            </label>

            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Minimum sold count</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                className="ui-surface-input"
                value={formState.minSoldCount}
                onChange={(event) => handleChange('minSoldCount', event.target.value)}
                aria-invalid={validationError?.includes('sold count') ? true : undefined}
              />
            </label>

            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Minimum revenue amount</span>
              <input
                type="text"
                inputMode="decimal"
                className="ui-surface-input"
                value={formState.minRevenueAmount}
                onChange={(event) => handleChange('minRevenueAmount', event.target.value)}
                aria-invalid={validationError?.includes('revenue') ? true : undefined}
              />
              <span className="text-xs text-copy-muted">Use `0` to disable revenue as a qualifying threshold.</span>
            </label>
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-panelBorder bg-panel px-4 py-4">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-brand"
              checked={formState.enabled}
              onChange={(event) => handleChange('enabled', event.target.checked)}
            />
            <span className="space-y-1 text-sm">
              <span className="block font-medium text-copy-strong">Enable HIT badge rule</span>
              <span className="block text-copy-secondary">
                Disable this if the marketplace should stop assigning system HIT badges while keeping existing metrics intact.
              </span>
            </span>
          </label>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button type="submit" className="ui-primary-button" disabled={isPending}>
              {isPending ? 'Saving rule...' : 'Save HIT rule'}
            </button>
            <button
              type="button"
              className="ui-secondary-button"
              disabled={isPending}
              onClick={() => {
                setFormState(toFormState(hitRule))
                setSuccessMessage(null)
                setValidationError(null)
                setMutationErrorMessage(null)
              }}
            >
              Reset changes
            </button>
          </div>
        </form>

        {successMessage ? (
          <p className="mt-4 rounded-2xl border border-brand-success/30 bg-brand-success/10 px-4 py-3 text-sm text-copy-primary">
            {successMessage}
          </p>
        ) : null}

        {feedbackMessage ? (
          <p className="mt-4 rounded-2xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-3 text-sm text-copy-primary">
            {feedbackMessage}
          </p>
        ) : null}
      </section>

      <section className="ui-panel p-5 sm:p-6">
        <h3 className="text-base font-semibold text-copy-strong">Current rule snapshot</h3>
        <dl className="mt-4 grid gap-3 text-sm text-copy-secondary sm:grid-cols-2">
          <div>
            <dt className="text-copy-muted">Badge type</dt>
            <dd className="mt-1 text-copy-primary">{hitRule.badgeType}</dd>
          </div>
          <div>
            <dt className="text-copy-muted">Updated</dt>
            <dd className="mt-1 text-copy-primary">{new Date(hitRule.updatedAt).toLocaleString('uk-UA')}</dd>
          </div>
          <div>
            <dt className="text-copy-muted">Views threshold</dt>
            <dd className="mt-1 text-copy-primary">{hitRule.minViews}</dd>
          </div>
          <div>
            <dt className="text-copy-muted">Wishlists threshold</dt>
            <dd className="mt-1 text-copy-primary">{hitRule.minWishlists}</dd>
          </div>
          <div>
            <dt className="text-copy-muted">Sold count threshold</dt>
            <dd className="mt-1 text-copy-primary">{hitRule.minSoldCount}</dd>
          </div>
          <div>
            <dt className="text-copy-muted">Revenue threshold</dt>
            <dd className="mt-1 text-copy-primary">{hitRule.minRevenueAmount}</dd>
          </div>
        </dl>
      </section>
    </div>
  )
}
