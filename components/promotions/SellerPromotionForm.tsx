'use client'

import { useMemo, useState } from 'react'
import DashboardCard from '@/components/profile/DashboardCard'
import PromotionTargetSelector from './PromotionTargetSelector'
import { useSellerPromotions } from '@/hooks/useSellerPromotions'
import {
  PROMOTION_DISCOUNT_TYPES,
  PROMOTION_TYPES,
  getPromotionDiscountTypeLabel,
  getPromotionTargetTypeLabel,
  getPromotionTypeLabel,
  type PromotionDetail,
  type PromotionTargetType,
  type SellerPromotionCategoryOption,
  type SellerPromotionProductOption,
  type SellerPromotionStoreContext,
} from '@/types/promotions'

type SellerPromotionFormValues = {
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

function getInitialScope(promotion?: PromotionDetail): PromotionTargetType {
  return promotion?.targets[0]?.targetType ?? 'STORE'
}

function getInitialTargetIds(promotion: PromotionDetail | undefined, storeId: string, scope: PromotionTargetType) {
  if (!promotion) {
    return scope === 'STORE' ? [storeId] : []
  }

  const targetIds = promotion.targets.map((target) => target.targetId)
  return targetIds.length > 0 ? targetIds : scope === 'STORE' ? [storeId] : []
}

function buildInitialValues(initialPromotion?: PromotionDetail): SellerPromotionFormValues {
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

export default function SellerPromotionForm({
  mode,
  store,
  products,
  categories,
  initialPromotion,
}: {
  mode: 'create' | 'edit'
  store: SellerPromotionStoreContext
  products: SellerPromotionProductOption[]
  categories: SellerPromotionCategoryOption[]
  initialPromotion?: PromotionDetail
}) {
  const { createPromotion, updatePromotion, updatePromotionStatus, deletePromotion, isPending, errorMessage } =
    useSellerPromotions()

  const initialScope = getInitialScope(initialPromotion)
  const [values, setValues] = useState<SellerPromotionFormValues>(() => buildInitialValues(initialPromotion))
  const [targetScope, setTargetScope] = useState<PromotionTargetType>(initialScope)
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>(() =>
    getInitialTargetIds(initialPromotion, store.id, initialScope),
  )
  const [targetError, setTargetError] = useState<string | null>(null)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)

  const submitLabel = mode === 'create' ? 'Create promotion' : 'Save changes'
  const title = mode === 'create' ? 'Create seller promotion' : `Edit ${initialPromotion?.code ?? 'promotion'}`
  const description =
    mode === 'create'
      ? 'Create a store-scoped coupon without exposing discount logic to the client. Checkout totals always come from the backend.'
      : 'Update the promotion configuration, scope, and active window. Past order snapshots stay immutable.'

  const currentDiscountHint = useMemo(() => {
    if (values.discountType === 'PERCENTAGE') {
      return 'Use a percentage value such as 10 or 15.5.'
    }

    return 'Use a fixed amount in UAH, for example 100.00.'
  }, [values.discountType])

  const selectedScopeSummary = useMemo(() => {
    if (targetScope === 'STORE') {
      return `${getPromotionTargetTypeLabel(targetScope)} · ${store.name}`
    }

    return `${getPromotionTargetTypeLabel(targetScope)} · ${selectedTargetIds.length} selected`
  }, [selectedTargetIds.length, store.name, targetScope])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedTargetIds =
      targetScope === 'STORE' ? [store.id] : selectedTargetIds.filter((targetId) => targetId.trim().length > 0)

    if (normalizedTargetIds.length === 0) {
      setTargetError('Select at least one target for this promotion.')
      return
    }

    setTargetError(null)

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
      storeId: store.id,
      targets: normalizedTargetIds.map((targetId) => ({
        targetType: targetScope,
        targetId,
      })),
    } as const

    if (mode === 'create') {
      const created = await createPromotion(payload)
      if (created) {
        setValues(buildInitialValues())
        setTargetScope('STORE')
        setSelectedTargetIds([store.id])
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
        <div className="rounded-2xl border border-panelBorder bg-panel/60 px-4 py-4">
          <p className="text-sm font-medium text-copy-strong">Store context</p>
          <p className="mt-1 text-sm text-copy-secondary">
            {store.name} · /{store.slug}
          </p>
          <p className="mt-2 text-sm text-copy-muted">{selectedScopeSummary}</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-2">
            <span className="block text-sm font-medium text-copy-strong">Code</span>
            <input
              required
              value={values.code}
              onChange={(event) => setValues((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
              className="ui-surface-input"
              placeholder="STORE10"
            />
          </label>

          <label className="space-y-2">
            <span className="block text-sm font-medium text-copy-strong">Name</span>
            <input
              required
              value={values.name}
              onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
              className="ui-surface-input"
              placeholder="Store launch coupon"
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
            placeholder="Optional context for your team or buyers."
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
                  type: event.target.value as SellerPromotionFormValues['type'],
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
                  discountType: event.target.value as SellerPromotionFormValues['discountType'],
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

        <PromotionTargetSelector
          store={store}
          products={products}
          categories={categories}
          scope={targetScope}
          selectedTargetIds={selectedTargetIds}
          onScopeChange={setTargetScope}
          onSelectedTargetIdsChange={setSelectedTargetIds}
          errorMessage={targetError}
        />

        <div className="grid gap-4 lg:grid-cols-3">
          <label className="space-y-2">
            <span className="block text-sm font-medium text-copy-strong">Discount value</span>
            <input
              required
              type="number"
              min="0"
              step="0.01"
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
              Disable the coupon without deleting its historical usage snapshots.
            </span>
          </span>
        </label>

        <div className="rounded-2xl border border-panelBorder bg-panel/60 px-4 py-4 text-sm text-copy-secondary">
          <p className="font-medium text-copy-strong">Checkout behavior</p>
          <p className="mt-1">
            Checkout always revalidates this coupon on the server. Only one coupon can apply to an order in the current MVP.
          </p>
        </div>

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
