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
    return `${label} має бути цілим числом, не меншим за 0.`
  }

  return null
}

function validateMoney(value: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) {
    return 'Мінімальний виторг має бути коректною сумою, наприклад 0 або 25.50.'
  }

  return null
}

function validateFormState(formState: FormState) {
  return (
    validateNonNegativeInteger(formState.minViews, 'Мінімум переглядів') ||
    validateNonNegativeInteger(formState.minWishlists, 'Мінімум додавань у вибране') ||
    validateNonNegativeInteger(formState.minSoldCount, 'Мінімум проданих одиниць') ||
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
          title="Правила бейджів недоступні"
          description={errorMessage}
          actionHref="/admin"
          actionLabel="Назад до огляду"
        />
        <div className="mt-4">
          <button type="button" className="ui-secondary-button" onClick={() => void reloadRules()}>
            Спробувати ще раз
          </button>
        </div>
      </section>
    )
  }

  if (!hitRule) {
    return (
      <section className="ui-elevated-panel p-5 sm:p-6">
        <AdminEmptyState
          title="Правило HIT-бейджа не знайдено"
          description="Маркетплейс ще не має активного запису правила HIT-бейджа. Ініціалізуйте або відновіть це правило, щоб керувати порогами тут."
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
      successMessage: 'Правило HIT-бейджа маркетплейсу оновлено.',
      fallbackErrorMessage: 'Зараз не вдалося оновити правило HIT-бейджа. Спробуйте ще раз.',
      onSuccess: async (data) => {
        setRules((current) =>
          current.map((rule) => (rule.badgeType === 'HIT' ? data : rule)),
        )
        setFormState(toFormState(data))
        setSuccessMessage('Нові пороги збережено. HIT-бейджі товарів надалі визначатимуться цим правилом на backend.')
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
            <h2 className="text-lg font-semibold text-copy-strong">Правило HIT маркетплейсу</h2>
            <p className="max-w-3xl text-sm text-copy-secondary">
              Товар отримує <strong>HIT</strong>, коли досягає <strong>будь-якого</strong> з увімкнених порогів нижче.
              Призначення та зняття бейджа повністю визначається на backend.
            </p>
          </div>
          <AdminStatusBadge
            label={formState.enabled ? 'Правило увімкнено' : 'Правило вимкнено'}
            tone={formState.enabled ? 'success' : 'neutral'}
          />
        </div>

        <div className="mt-5 rounded-2xl border border-panelBorder bg-panel px-4 py-4 text-sm text-copy-secondary">
          Перегляди власником товару чи магазину, додавання у вибране самим продавцем і власні замовлення продавця
          не впливають на HIT-метрики. Товар отримує бейдж лише тоді, коли надійні сигнали маркетплейсу відповідають цьому правилу.
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Мінімум переглядів</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                className="ui-surface-input"
                value={formState.minViews}
                onChange={(event) => handleChange('minViews', event.target.value)}
                aria-invalid={validationError?.includes('переглядів') ? true : undefined}
              />
            </label>

            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Мінімум додавань у вибране</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                className="ui-surface-input"
                value={formState.minWishlists}
                onChange={(event) => handleChange('minWishlists', event.target.value)}
                aria-invalid={validationError?.includes('вибране') ? true : undefined}
              />
            </label>

            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Мінімум проданих одиниць</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                className="ui-surface-input"
                value={formState.minSoldCount}
                onChange={(event) => handleChange('minSoldCount', event.target.value)}
                aria-invalid={validationError?.includes('проданих одиниць') ? true : undefined}
              />
            </label>

            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Мінімальна сума виторгу</span>
              <input
                type="text"
                inputMode="decimal"
                className="ui-surface-input"
                value={formState.minRevenueAmount}
                onChange={(event) => handleChange('minRevenueAmount', event.target.value)}
                aria-invalid={validationError?.includes('виторг') ? true : undefined}
              />
              <span className="text-xs text-copy-muted">Використайте `0`, щоб вимкнути виторг як кваліфікаційний поріг.</span>
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
              <span className="block font-medium text-copy-strong">Увімкнути правило HIT-бейджа</span>
              <span className="block text-copy-secondary">
                Вимкніть це, якщо маркетплейс має припинити призначати системні HIT-бейджі, зберігши наявні метрики без змін.
              </span>
            </span>
          </label>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button type="submit" className="ui-primary-button" disabled={isPending}>
              {isPending ? 'Зберігаємо правило...' : 'Зберегти правило HIT'}
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
              Скинути зміни
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
        <h3 className="text-base font-semibold text-copy-strong">Поточний знімок правила</h3>
        <dl className="mt-4 grid gap-3 text-sm text-copy-secondary sm:grid-cols-2">
          <div>
            <dt className="text-copy-muted">Тип бейджа</dt>
            <dd className="mt-1 text-copy-primary">{hitRule.badgeType}</dd>
          </div>
          <div>
            <dt className="text-copy-muted">Оновлено</dt>
            <dd className="mt-1 text-copy-primary">{new Date(hitRule.updatedAt).toLocaleString('uk-UA')}</dd>
          </div>
          <div>
            <dt className="text-copy-muted">Поріг переглядів</dt>
            <dd className="mt-1 text-copy-primary">{hitRule.minViews}</dd>
          </div>
          <div>
            <dt className="text-copy-muted">Поріг додавань у вибране</dt>
            <dd className="mt-1 text-copy-primary">{hitRule.minWishlists}</dd>
          </div>
          <div>
            <dt className="text-copy-muted">Поріг проданих одиниць</dt>
            <dd className="mt-1 text-copy-primary">{hitRule.minSoldCount}</dd>
          </div>
          <div>
            <dt className="text-copy-muted">Поріг виторгу</dt>
            <dd className="mt-1 text-copy-primary">{hitRule.minRevenueAmount}</dd>
          </div>
        </dl>
      </section>
    </div>
  )
}
