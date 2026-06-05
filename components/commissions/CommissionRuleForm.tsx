'use client'

import { useMemo, useState } from 'react'
import DashboardCard from '@/components/profile/DashboardCard'
import CommissionScopeSelector from '@/components/commissions/CommissionScopeSelector'
import { useAdminCommissionRules } from '@/hooks/useAdminCommissionRules'
import type {
  CommissionRuleCategoryOption,
  CommissionRuleDetail,
  CommissionRuleScope,
  CommissionRuleStoreOption,
} from '@/types/commissions'

type CommissionRuleFormValues = {
  name: string
  scope: CommissionRuleScope
  storeId: string
  categoryId: string
  rate: string
  startsAt: string
  endsAt: string
  priority: string
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

function buildInitialValues(initialRule?: CommissionRuleDetail): CommissionRuleFormValues {
  if (!initialRule) {
    return {
      name: '',
      scope: 'GLOBAL',
      storeId: '',
      categoryId: '',
      rate: '',
      startsAt: '',
      endsAt: '',
      priority: '0',
      isActive: true,
    }
  }

  return {
    name: initialRule.name,
    scope: initialRule.scope,
    storeId: initialRule.storeId ?? '',
    categoryId: initialRule.categoryId ?? '',
    rate: initialRule.rate,
    startsAt: toDatetimeLocalValue(initialRule.startsAt),
    endsAt: toDatetimeLocalValue(initialRule.endsAt),
    priority: String(initialRule.priority),
    isActive: initialRule.isActive,
  }
}

function toIsoOrNull(value: string) {
  return value ? new Date(value).toISOString() : null
}

export default function CommissionRuleForm({
  mode,
  initialRule,
  stores,
  categories,
}: {
  mode: 'create' | 'edit'
  initialRule?: CommissionRuleDetail
  stores: CommissionRuleStoreOption[]
  categories: CommissionRuleCategoryOption[]
}) {
  const {
    createRule,
    updateRule,
    updateRuleStatus,
    archiveRule,
    isPending,
    errorMessage,
  } = useAdminCommissionRules()
  const [values, setValues] = useState<CommissionRuleFormValues>(() => buildInitialValues(initialRule))
  const [showArchiveConfirmation, setShowArchiveConfirmation] = useState(false)

  const sortedStores = useMemo(
    () => [...stores].sort((left, right) => left.name.localeCompare(right.name, 'uk-UA')),
    [stores],
  )
  const sortedCategories = useMemo(
    () =>
      [...categories].sort((left, right) =>
        left.level === right.level ? left.name.localeCompare(right.name, 'uk-UA') : left.level - right.level,
      ),
    [categories],
  )

  const title = mode === 'create' ? 'Create commission rule' : initialRule?.name ?? 'Edit commission rule'
  const description =
    mode === 'create'
      ? 'Configure a global, store, or category-specific commission rule. The backend still resolves priority and specificity.'
      : 'Update the rule window, priority, or activity. Historical commission snapshots remain unchanged.'

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const payload = {
      name: values.name.trim(),
      scope: values.scope,
      storeId: values.scope === 'STORE' ? values.storeId || null : null,
      categoryId: values.scope === 'CATEGORY' ? values.categoryId || null : null,
      rate: values.rate.trim(),
      startsAt: new Date(values.startsAt).toISOString(),
      endsAt: toIsoOrNull(values.endsAt),
      priority: Number(values.priority || 0),
      isActive: values.isActive,
    } as const

    if (mode === 'create') {
      const created = await createRule(payload)
      if (created) {
        setValues(buildInitialValues())
      }
      return
    }

    if (!initialRule) {
      return
    }

    await updateRule(initialRule.id, payload)
  }

  return (
    <DashboardCard title={title} description={description}>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-2">
            <span className="block text-sm font-medium text-copy-strong">Rule name</span>
            <input
              required
              value={values.name}
              onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
              className="ui-surface-input"
              placeholder="Default marketplace commission"
            />
          </label>

          <CommissionScopeSelector
            value={values.scope}
            onChange={(scope) =>
              setValues((current) => ({
                ...current,
                scope,
                storeId: scope === 'STORE' ? current.storeId : '',
                categoryId: scope === 'CATEGORY' ? current.categoryId : '',
              }))
            }
          />
        </div>

        {values.scope === 'STORE' ? (
          <label className="space-y-2">
            <span className="block text-sm font-medium text-copy-strong">Store</span>
            <select
              required
              value={values.storeId}
              onChange={(event) => setValues((current) => ({ ...current, storeId: event.target.value }))}
              className="ui-surface-input"
            >
              <option value="">Select a store</option>
              {sortedStores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-copy-muted">Store-specific rules win over category and global rules at the same priority.</p>
          </label>
        ) : null}

        {values.scope === 'CATEGORY' ? (
          <label className="space-y-2">
            <span className="block text-sm font-medium text-copy-strong">Category</span>
            <select
              required
              value={values.categoryId}
              onChange={(event) => setValues((current) => ({ ...current, categoryId: event.target.value }))}
              className="ui-surface-input"
            >
              <option value="">Select a category</option>
              {sortedCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {'— '.repeat(category.level)}
                  {category.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-copy-muted">Category rules override the global rule but still lose to store-specific rules.</p>
          </label>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-3">
          <label className="space-y-2">
            <span className="block text-sm font-medium text-copy-strong">Rate</span>
            <input
              required
              type="number"
              min="0"
              max="1"
              step="0.0001"
              value={values.rate}
              onChange={(event) => setValues((current) => ({ ...current, rate: event.target.value }))}
              className="ui-surface-input"
              placeholder="0.1000"
            />
            <p className="text-xs text-copy-muted">Use decimal format, for example `0.10` for 10%.</p>
          </label>

          <label className="space-y-2">
            <span className="block text-sm font-medium text-copy-strong">Priority</span>
            <input
              required
              type="number"
              min="0"
              step="1"
              value={values.priority}
              onChange={(event) => setValues((current) => ({ ...current, priority: event.target.value }))}
              className="ui-surface-input"
            />
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-panelBorder bg-panel/60 px-4 py-3 lg:mt-7">
            <input
              type="checkbox"
              checked={values.isActive}
              onChange={(event) => setValues((current) => ({ ...current, isActive: event.target.checked }))}
              className="h-4 w-4 rounded border-panelBorder text-brand focus:ring-brand"
            />
            <span className="text-sm font-medium text-copy-strong">Rule is active</span>
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

        <div className="rounded-3xl border border-panelBorder bg-panel/60 p-4 text-sm text-copy-secondary">
          <p className="font-medium text-copy-strong">Priority and specificity</p>
          <p className="mt-1">
            Higher priority wins first. If priorities match, the backend resolves specificity in this order:
            store, then category, then global.
          </p>
        </div>

        {errorMessage ? <p className="text-sm text-brand-danger">{errorMessage}</p> : null}

        <div className="flex flex-wrap gap-3">
          <button type="submit" className="ui-primary-button" disabled={isPending}>
            {isPending ? 'Saving...' : mode === 'create' ? 'Create rule' : 'Save changes'}
          </button>

          {mode === 'edit' && initialRule ? (
            <button
              type="button"
              className="ui-secondary-button"
              disabled={isPending}
              onClick={() => void updateRuleStatus(initialRule.id, !initialRule.isActive)}
            >
              {initialRule.isActive ? 'Deactivate rule' : 'Activate rule'}
            </button>
          ) : null}

          {mode === 'edit' && initialRule ? (
            <button
              type="button"
              className="rounded-2xl border border-brand-danger/30 px-4 py-2 text-sm font-medium text-brand-danger transition hover:bg-brand-danger/10"
              onClick={() => setShowArchiveConfirmation((current) => !current)}
            >
              {showArchiveConfirmation ? 'Keep rule' : 'Archive rule'}
            </button>
          ) : null}
        </div>

        {mode === 'edit' && initialRule && showArchiveConfirmation ? (
          <div className="rounded-3xl border border-brand-danger/30 bg-brand-danger/5 p-4">
            <p className="text-sm text-copy-strong">
              Archiving disables this rule for future resolution without changing historical commission snapshots.
            </p>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                className="rounded-2xl bg-brand-danger px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                disabled={isPending}
                onClick={() => void archiveRule(initialRule.id)}
              >
                Confirm archive
              </button>
              <button
                type="button"
                className="ui-secondary-button"
                onClick={() => setShowArchiveConfirmation(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </form>
    </DashboardCard>
  )
}
