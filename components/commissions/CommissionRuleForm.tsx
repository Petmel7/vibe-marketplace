'use client'

import { useMemo, useState } from 'react'
import DashboardCard from '@/components/profile/DashboardCard'
import CommissionScopeSelector from '@/components/commissions/CommissionScopeSelector'
import CommissionStoreSelector from '@/components/commissions/CommissionStoreSelector'
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

  const sortedCategories = useMemo(
    () =>
      [...categories].sort((left, right) =>
        left.level === right.level ? left.name.localeCompare(right.name, 'uk-UA') : left.level - right.level,
      ),
    [categories],
  )

  const title = mode === 'create' ? 'Створити правило комісії' : initialRule?.name ?? 'Редагувати правило комісії'
  const description =
    mode === 'create'
      ? 'Налаштуйте глобальне правило або правило для магазину чи категорії. Backend і надалі сам визначає пріоритет і специфічність.'
      : 'Оновіть часове вікно, пріоритет або активність правила. Історичні знімки комісій залишаються без змін.'

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
            <span className="block text-sm font-medium text-copy-strong">Назва правила</span>
            <input
              required
              value={values.name}
              onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
              className="ui-surface-input"
              placeholder="Стандартна комісія маркетплейсу"
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
          <CommissionStoreSelector
            required
            value={values.storeId}
            onChange={(storeId) => setValues((current) => ({ ...current, storeId }))}
            initialOptions={stores}
          />
        ) : null}

        {values.scope === 'CATEGORY' ? (
          <label className="space-y-2">
            <span className="block text-sm font-medium text-copy-strong">Категорія</span>
            <select
              required
              value={values.categoryId}
              onChange={(event) => setValues((current) => ({ ...current, categoryId: event.target.value }))}
              className="ui-surface-input"
            >
              <option value="">Оберіть категорію</option>
              {sortedCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {'— '.repeat(category.level)}
                  {category.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-copy-muted">Правила категорії мають перевагу над глобальним правилом, але поступаються правилам конкретного магазину.</p>
          </label>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-3">
          <label className="space-y-2">
            <span className="block text-sm font-medium text-copy-strong">Ставка</span>
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
            <p className="text-xs text-copy-muted">Використовуйте десятковий формат, наприклад `0.10` для 10%.</p>
          </label>

          <label className="space-y-2">
            <span className="block text-sm font-medium text-copy-strong">Пріоритет</span>
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
            <span className="text-sm font-medium text-copy-strong">Правило активне</span>
          </label>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-2">
            <span className="block text-sm font-medium text-copy-strong">Початок дії</span>
            <input
              required
              type="datetime-local"
              value={values.startsAt}
              onChange={(event) => setValues((current) => ({ ...current, startsAt: event.target.value }))}
              className="ui-surface-input"
            />
          </label>

          <label className="space-y-2">
            <span className="block text-sm font-medium text-copy-strong">Кінець дії</span>
            <input
              type="datetime-local"
              value={values.endsAt}
              onChange={(event) => setValues((current) => ({ ...current, endsAt: event.target.value }))}
              className="ui-surface-input"
            />
          </label>
        </div>

        <div className="rounded-3xl border border-panelBorder bg-panel/60 p-4 text-sm text-copy-secondary">
          <p className="font-medium text-copy-strong">Пріоритет і специфічність</p>
          <p className="mt-1">
            Спочатку перемагає вищий пріоритет. Якщо пріоритет однаковий, backend визначає специфічність у такому порядку:
            магазин, потім категорія, потім глобальне правило.
          </p>
        </div>

        {errorMessage ? <p className="text-sm text-brand-danger">{errorMessage}</p> : null}

        <div className="flex flex-wrap gap-3">
          <button type="submit" className="ui-primary-button" disabled={isPending}>
            {isPending ? 'Зберігаємо...' : mode === 'create' ? 'Створити правило' : 'Зберегти зміни'}
          </button>

          {mode === 'edit' && initialRule ? (
            <button
              type="button"
              className="ui-secondary-button"
              disabled={isPending}
              onClick={() => void updateRuleStatus(initialRule.id, !initialRule.isActive)}
            >
              {initialRule.isActive ? 'Деактивувати правило' : 'Активувати правило'}
            </button>
          ) : null}

          {mode === 'edit' && initialRule ? (
            <button
              type="button"
              className="rounded-2xl border border-brand-danger/30 px-4 py-2 text-sm font-medium text-brand-danger transition hover:bg-brand-danger/10"
              onClick={() => setShowArchiveConfirmation((current) => !current)}
            >
              {showArchiveConfirmation ? 'Залишити правило' : 'Архівувати правило'}
            </button>
          ) : null}
        </div>

        {mode === 'edit' && initialRule && showArchiveConfirmation ? (
          <div className="rounded-3xl border border-brand-danger/30 bg-brand-danger/5 p-4">
            <p className="text-sm text-copy-strong">
              Архівація вимикає це правило для майбутнього застосування, не змінюючи історичні знімки комісій.
            </p>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                className="rounded-2xl bg-brand-danger px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                disabled={isPending}
                onClick={() => void archiveRule(initialRule.id)}
              >
                Підтвердити архівацію
              </button>
              <button
                type="button"
                className="ui-secondary-button"
                onClick={() => setShowArchiveConfirmation(false)}
              >
                Скасувати
              </button>
            </div>
          </div>
        ) : null}
      </form>
    </DashboardCard>
  )
}
