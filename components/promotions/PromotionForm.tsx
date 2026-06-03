'use client'

import { useMemo, useState } from 'react'
import DashboardCard from '@/components/profile/DashboardCard'
import { useAdminPromotions } from '@/hooks/useAdminPromotions'
import {
  PROMOTION_DISCOUNT_TYPES,
  PROMOTION_TYPES,
  getPromotionDiscountTypeLabel,
  getPromotionTypeLabel,
  type PromotionDetail,
} from '@/types/promotions'

type PromotionFormValues = {
  code: string
  name: string
  description: string
  type: 'COUPON_CODE' | 'AUTOMATIC_DISCOUNT'
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT'
  discountValue: string
  minOrderAmount: string
  maxDiscountAmount: string
  usageLimit: string
  usageLimitPerUser: string
  startsAt: string
  endsAt: string
  isActive: boolean
}

function toDatetimeLocalValue(value?: string | null) {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  const pad = (input: number) => String(input).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function buildInitialValues(initialPromotion?: PromotionDetail): PromotionFormValues {
  if (!initialPromotion) {
    return {
      code: '',
      name: '',
      description: '',
      type: 'COUPON_CODE',
      discountType: 'PERCENTAGE',
      discountValue: '',
      minOrderAmount: '',
      maxDiscountAmount: '',
      usageLimit: '',
      usageLimitPerUser: '',
      startsAt: '',
      endsAt: '',
      isActive: true,
    }
  }

  return {
    code: initialPromotion.code,
    name: initialPromotion.name,
    description: initialPromotion.description ?? '',
    type: initialPromotion.type,
    discountType: initialPromotion.discountType,
    discountValue: initialPromotion.discountValue,
    minOrderAmount: initialPromotion.minOrderAmount ?? '',
    maxDiscountAmount: initialPromotion.maxDiscountAmount ?? '',
    usageLimit: initialPromotion.usageLimit?.toString() ?? '',
    usageLimitPerUser: initialPromotion.usageLimitPerUser?.toString() ?? '',
    startsAt: toDatetimeLocalValue(initialPromotion.startsAt),
    endsAt: toDatetimeLocalValue(initialPromotion.endsAt),
    isActive: initialPromotion.isActive,
  }
}

function toIsoOrNull(value: string) {
  return value ? new Date(value).toISOString() : null
}

function toNullableNumber(value: string) {
  return value ? Number(value) : null
}

export default function PromotionForm({
  mode,
  initialPromotion,
}: {
  mode: 'create' | 'edit'
  initialPromotion?: PromotionDetail
}) {
  const { createPromotion, updatePromotion, updatePromotionStatus, deletePromotion, isPending, errorMessage } =
    useAdminPromotions()
  const [values, setValues] = useState<PromotionFormValues>(() => buildInitialValues(initialPromotion))
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)

  const submitLabel = mode === 'create' ? 'Create promotion' : 'Save changes'
  const title = mode === 'create' ? 'Create promotion' : `Edit ${initialPromotion?.code ?? 'promotion'}`
  const description =
    mode === 'create'
      ? 'Create a marketplace-wide coupon or automatic discount. The backend stays authoritative for all validation and usage tracking.'
      : 'Update the promotion configuration, active window, and limits. Existing order snapshots remain unchanged.'

  const currentDiscountHint = useMemo(() => {
    if (values.discountType === 'PERCENTAGE') {
      return 'Use a percentage value such as 10 or 15.5.'
    }

    return 'Use a fixed amount in UAH, for example 100.00.'
  }, [values.discountType])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const payload = {
      code: values.code.trim(),
      name: values.name.trim(),
      description: values.description.trim() || null,
      type: values.type,
      discountType: values.discountType,
      discountValue: values.discountValue.trim(),
      minOrderAmount: values.minOrderAmount.trim() || null,
      maxDiscountAmount: values.maxDiscountAmount.trim() || null,
      usageLimit: toNullableNumber(values.usageLimit.trim()),
      usageLimitPerUser: toNullableNumber(values.usageLimitPerUser.trim()),
      startsAt: new Date(values.startsAt).toISOString(),
      endsAt: toIsoOrNull(values.endsAt),
      isActive: values.isActive,
    } as const

    if (mode === 'create') {
      const created = await createPromotion(payload)
      if (created) {
        setValues(buildInitialValues())
      }
      return
    }

    if (!initialPromotion) {
      return
    }

    await updatePromotion(initialPromotion.id, payload)
  }

  return (
    <DashboardCard title={title} description={description}>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-2">
            <span className="block text-sm font-medium text-copy-strong">Code</span>
            <input
              required
              value={values.code}
              onChange={(event) => setValues((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
              className="ui-surface-input"
              placeholder="SAVE10"
            />
          </label>

          <label className="space-y-2">
            <span className="block text-sm font-medium text-copy-strong">Name</span>
            <input
              required
              value={values.name}
              onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
              className="ui-surface-input"
              placeholder="Summer launch discount"
            />
          </label>
        </div>

        <label className="space-y-2">
          <span className="block text-sm font-medium text-copy-strong">Description</span>
          <textarea
            value={values.description}
            onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
            rows={3}
            className="ui-surface-input min-h-28"
            placeholder="Optional internal or buyer-facing description."
          />
        </label>

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-2">
            <span className="block text-sm font-medium text-copy-strong">Promotion type</span>
            <select
              value={values.type}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  type: event.target.value as PromotionFormValues['type'],
                }))
              }
              className="ui-surface-input"
            >
              {PROMOTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {getPromotionTypeLabel(type)}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="block text-sm font-medium text-copy-strong">Discount type</span>
            <select
              value={values.discountType}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  discountType: event.target.value as PromotionFormValues['discountType'],
                }))
              }
              className="ui-surface-input"
            >
              {PROMOTION_DISCOUNT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {getPromotionDiscountTypeLabel(type)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <label className="space-y-2">
            <span className="block text-sm font-medium text-copy-strong">Discount value</span>
            <input
              required
              type="number"
              min="0"
              step={values.discountType === 'PERCENTAGE' ? '0.01' : '0.01'}
              max={values.discountType === 'PERCENTAGE' ? '100' : undefined}
              value={values.discountValue}
              onChange={(event) => setValues((current) => ({ ...current, discountValue: event.target.value }))}
              className="ui-surface-input"
            />
            <p className="text-xs text-copy-muted">{currentDiscountHint}</p>
          </label>

          <label className="space-y-2">
            <span className="block text-sm font-medium text-copy-strong">Minimum order amount</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={values.minOrderAmount}
              onChange={(event) => setValues((current) => ({ ...current, minOrderAmount: event.target.value }))}
              className="ui-surface-input"
              placeholder="Optional"
            />
          </label>

          <label className="space-y-2">
            <span className="block text-sm font-medium text-copy-strong">Maximum discount amount</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={values.maxDiscountAmount}
              onChange={(event) => setValues((current) => ({ ...current, maxDiscountAmount: event.target.value }))}
              className="ui-surface-input"
              placeholder="Optional"
            />
          </label>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-2">
            <span className="block text-sm font-medium text-copy-strong">Usage limit</span>
            <input
              type="number"
              min="1"
              step="1"
              value={values.usageLimit}
              onChange={(event) => setValues((current) => ({ ...current, usageLimit: event.target.value }))}
              className="ui-surface-input"
              placeholder="Optional"
            />
          </label>

          <label className="space-y-2">
            <span className="block text-sm font-medium text-copy-strong">Per-user usage limit</span>
            <input
              type="number"
              min="1"
              step="1"
              value={values.usageLimitPerUser}
              onChange={(event) => setValues((current) => ({ ...current, usageLimitPerUser: event.target.value }))}
              className="ui-surface-input"
              placeholder="Optional"
            />
          </label>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-2">
            <span className="block text-sm font-medium text-copy-strong">Starts at</span>
            <input
              required
              type="datetime-local"
              value={values.startsAt}
              onChange={(event) => setValues((current) => ({ ...current, startsAt: event.target.value }))}
              className="ui-surface-input"
            />
          </label>

          <label className="space-y-2">
            <span className="block text-sm font-medium text-copy-strong">Ends at</span>
            <input
              type="datetime-local"
              value={values.endsAt}
              onChange={(event) => setValues((current) => ({ ...current, endsAt: event.target.value }))}
              className="ui-surface-input"
            />
          </label>
        </div>

        <label className="flex items-center gap-3 rounded-2xl border border-panelBorder bg-panel/60 px-4 py-3">
          <input
            type="checkbox"
            checked={values.isActive}
            onChange={(event) => setValues((current) => ({ ...current, isActive: event.target.checked }))}
            className="h-4 w-4 rounded border-panelBorder text-brand-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
          />
          <span className="space-y-1">
            <span className="block text-sm font-medium text-copy-strong">Promotion is active</span>
            <span className="block text-sm text-copy-muted">
              Disable the promotion without deleting its historical usage snapshots.
            </span>
          </span>
        </label>

        {errorMessage ? (
          <p className="rounded-2xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-3 text-sm text-copy-primary" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="ui-primary-button disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? 'Saving...' : submitLabel}
            </button>

            {mode === 'edit' && initialPromotion ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => void updatePromotionStatus(initialPromotion.id, !initialPromotion.isActive)}
                className="ui-secondary-button disabled:cursor-not-allowed disabled:opacity-60"
              >
                {initialPromotion.isActive ? 'Disable promotion' : 'Activate promotion'}
              </button>
            ) : null}
          </div>

          {mode === 'edit' && initialPromotion ? (
            <div className="flex flex-wrap items-center gap-2">
              {!showDeleteConfirmation ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setShowDeleteConfirmation(true)}
                  className="rounded-2xl border border-brand-danger/25 px-4 py-2 text-sm font-medium text-copy-strong transition hover:bg-brand-danger/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Delete promotion
                </button>
              ) : (
                <>
                  <span className="text-sm text-copy-secondary">Delete this promotion?</span>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => void deletePromotion(initialPromotion.id)}
                    className="rounded-2xl border border-brand-danger/25 bg-brand-danger/10 px-4 py-2 text-sm font-medium text-copy-strong transition hover:bg-brand-danger/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Confirm delete
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setShowDeleteConfirmation(false)}
                    className="ui-secondary-button disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          ) : null}
        </div>
      </form>
    </DashboardCard>
  )
}
