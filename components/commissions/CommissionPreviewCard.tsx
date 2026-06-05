'use client'

import { useMemo, useState } from 'react'
import DashboardCard from '@/components/profile/DashboardCard'
import { useAdminCommissionRules } from '@/hooks/useAdminCommissionRules'
import {
  getCommissionRuleScopeLabel,
  type CommissionRuleCategoryOption,
  type CommissionRulePreview,
  type CommissionRuleScope,
  type CommissionRuleStoreOption,
} from '@/types/commissions'
import { formatPrice } from '@/utils/formatters/price'

export default function CommissionPreviewCard({
  stores,
  categories,
}: {
  stores: CommissionRuleStoreOption[]
  categories: CommissionRuleCategoryOption[]
}) {
  const { previewRule, isPreviewPending, previewErrorMessage } = useAdminCommissionRules()
  const [grossAmount, setGrossAmount] = useState('1000')
  const [storeId, setStoreId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [result, setResult] = useState<CommissionRulePreview | null>(null)

  const sortedCategories = useMemo(
    () =>
      [...categories].sort((left, right) =>
        left.level === right.level ? left.name.localeCompare(right.name, 'uk-UA') : left.level - right.level,
      ),
    [categories],
  )

  async function handlePreview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = await previewRule({
      grossAmount: grossAmount.trim(),
      storeId: storeId || null,
      categoryId: categoryId || null,
    })

    if (data) {
      setResult(data)
    }
  }

  const matchedScopeLabel = result?.matchedRule?.scope
    ? getCommissionRuleScopeLabel(result.matchedRule.scope as CommissionRuleScope)
    : 'Fallback default'

  return (
    <DashboardCard
      title="Commission preview"
      description="Run a server-side preview to confirm which rule wins before publishing a rate change."
    >
      <form className="space-y-4" onSubmit={handlePreview}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="block text-sm font-medium text-copy-strong">Gross amount</span>
            <input
              required
              min="0"
              step="0.01"
              type="number"
              value={grossAmount}
              onChange={(event) => setGrossAmount(event.target.value)}
              className="ui-surface-input"
            />
          </label>

          <label className="space-y-2">
            <span className="block text-sm font-medium text-copy-strong">Store</span>
            <select
              value={storeId}
              onChange={(event) => setStoreId(event.target.value)}
              className="ui-surface-input"
            >
              <option value="">Any store</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="space-y-2">
          <span className="block text-sm font-medium text-copy-strong">Category</span>
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="ui-surface-input"
          >
            <option value="">Any category</option>
            {sortedCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {'— '.repeat(category.level)}
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <button type="submit" className="ui-primary-button" disabled={isPreviewPending}>
          {isPreviewPending ? 'Previewing...' : 'Preview commission'}
        </button>

        {previewErrorMessage ? <p className="text-sm text-brand-danger">{previewErrorMessage}</p> : null}
      </form>

      {result ? (
        <div className="mt-6 rounded-3xl border border-panelBorder bg-panel/60 p-4">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <dt className="text-xs uppercase tracking-[0.14em] text-copy-muted">Matched rule</dt>
              <dd className="text-sm font-medium text-copy-strong">
                {result.matchedRule?.name ?? 'Fallback marketplace rate'}
              </dd>
              <p className="text-sm text-copy-muted">{matchedScopeLabel}</p>
            </div>
            <div className="space-y-1">
              <dt className="text-xs uppercase tracking-[0.14em] text-copy-muted">Rate</dt>
              <dd className="text-sm font-medium text-copy-strong">
                {result.matchedRule?.rate ?? '0.0000'}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs uppercase tracking-[0.14em] text-copy-muted">Commission amount</dt>
              <dd className="text-sm text-copy-secondary">{formatPrice(result.commissionAmount)}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs uppercase tracking-[0.14em] text-copy-muted">Seller net amount</dt>
              <dd className="text-sm text-copy-secondary">{formatPrice(result.sellerNetAmount)}</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </DashboardCard>
  )
}
