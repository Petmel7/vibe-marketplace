'use client'

import {
  getPromotionTargetTypeLabel,
  type PromotionTargetType,
  type SellerPromotionCategoryOption,
  type SellerPromotionProductOption,
  type SellerPromotionStoreContext,
} from '@/types/promotions'
import { formatPrice } from '@/utils/formatters/price'

type SellerPromotionScope = PromotionTargetType

function sortCategories(categories: SellerPromotionCategoryOption[]) {
  return [...categories].sort((left, right) => {
    if (left.level !== right.level) {
      return left.level - right.level
    }

    return left.name.localeCompare(right.name, 'uk-UA')
  })
}

export default function PromotionTargetSelector({
  store,
  products,
  categories,
  scope,
  selectedTargetIds,
  onScopeChange,
  onSelectedTargetIdsChange,
  errorMessage,
}: {
  store: SellerPromotionStoreContext
  products: SellerPromotionProductOption[]
  categories: SellerPromotionCategoryOption[]
  scope: SellerPromotionScope
  selectedTargetIds: string[]
  onScopeChange: (scope: SellerPromotionScope) => void
  onSelectedTargetIdsChange: (ids: string[]) => void
  errorMessage?: string | null
}) {
  const sortedCategories = sortCategories(categories)

  const toggleTargetId = (targetId: string) => {
    const nextIds = selectedTargetIds.includes(targetId)
      ? selectedTargetIds.filter((id) => id !== targetId)
      : [...selectedTargetIds, targetId]

    onSelectedTargetIdsChange(nextIds)
  }

  const canSelectProducts = products.length > 0
  const canSelectCategories = sortedCategories.length > 0

  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-medium text-copy-strong">Область дії акції</legend>
      <p className="text-sm text-copy-muted">
        Купони продавця можуть застосовуватися до всього магазину, окремих товарів або категорій, які використовуються у вашому каталозі.
      </p>

      <div className="grid gap-3 lg:grid-cols-3">
        {(['STORE', 'PRODUCT', 'CATEGORY'] as const).map((targetType) => {
          const disabled =
            (targetType === 'PRODUCT' && !canSelectProducts) ||
            (targetType === 'CATEGORY' && !canSelectCategories)

          return (
            <label
              key={targetType}
              className={`rounded-2xl border px-4 py-4 transition ${
                scope === targetType
                  ? 'border-brand-accent bg-brand-accent/10'
                  : 'border-panelBorder bg-panel/60'
              } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-panelAlt'}`}
            >
              <input
                type="radio"
                name="promotion-scope"
                value={targetType}
                checked={scope === targetType}
                onChange={() => {
                  onScopeChange(targetType)
                  if (targetType === 'STORE') {
                    onSelectedTargetIdsChange([store.id])
                    return
                  }

                  onSelectedTargetIdsChange([])
                }}
                className="sr-only"
                disabled={disabled}
              />
              <span className="block text-sm font-semibold text-copy-strong">
                {getPromotionTargetTypeLabel(targetType)}
              </span>
              <span className="mt-1 block text-sm text-copy-muted">
                {targetType === 'STORE'
                  ? `Застосовується до всіх доступних товарів магазину ${store.name}.`
                  : targetType === 'PRODUCT'
                    ? 'Виберіть окремі товари з вашого каталогу.'
                    : 'Виберіть категорії, які вже використовує ваш магазин.'}
              </span>
            </label>
          )
        })}
      </div>

      {scope === 'STORE' ? (
        <div className="rounded-2xl border border-panelBorder bg-panel/60 px-4 py-4">
          <p className="text-sm font-medium text-copy-strong">{store.name}</p>
          <p className="mt-1 text-sm text-copy-muted">Купон застосовується до кожного доступного товару цього магазину.</p>
        </div>
      ) : null}

      {scope === 'PRODUCT' ? (
        <div className="space-y-3">
          <p className="text-sm text-copy-secondary">Виберіть один або кілька товарів зі своєї вітрини.</p>
          {canSelectProducts ? (
            <div className="max-h-80 space-y-2 overflow-y-auto rounded-2xl border border-panelBorder bg-panel/40 p-3">
              {products.map((product) => {
                const checked = selectedTargetIds.includes(product.id)

                return (
                  <label
                    key={product.id}
                    className={`flex items-start gap-3 rounded-2xl border px-4 py-3 transition ${
                      checked ? 'border-brand-accent bg-brand-accent/10' : 'border-panelBorder bg-panel'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTargetId(product.id)}
                      className="mt-1 h-4 w-4 rounded border-panelBorder text-brand-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-copy-strong">{product.name}</span>
                      <span className="mt-1 block text-sm text-copy-muted">
                        {formatPrice(product.price)} · {product.status.replaceAll('_', ' ')}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-panelBorder bg-panel/60 px-4 py-4 text-sm text-copy-muted">
              Додайте товари до каталогу, перш ніж створювати купон для окремих товарів.
            </div>
          )}
        </div>
      ) : null}

      {scope === 'CATEGORY' ? (
        <div className="space-y-3">
          <p className="text-sm text-copy-secondary">
            Виберіть одну або кілька категорій. Бекенд однаково перевірить, що вибрані категорії відповідають каталогу вашого магазину.
          </p>
          {canSelectCategories ? (
            <div className="max-h-80 space-y-2 overflow-y-auto rounded-2xl border border-panelBorder bg-panel/40 p-3">
              {sortedCategories.map((category) => {
                const checked = selectedTargetIds.includes(category.id)

                return (
                  <label
                    key={category.id}
                    className={`flex items-start gap-3 rounded-2xl border px-4 py-3 transition ${
                      checked ? 'border-brand-accent bg-brand-accent/10' : 'border-panelBorder bg-panel'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTargetId(category.id)}
                      className="mt-1 h-4 w-4 rounded border-panelBorder text-brand-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-copy-strong">
                        {'> '.repeat(Math.max(category.level - 1, 0))}
                        {category.name}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-panelBorder bg-panel/60 px-4 py-4 text-sm text-copy-muted">
              Зараз немає активних категорій, доступних для акцій на рівні категорій.
            </div>
          )}
        </div>
      ) : null}

      {errorMessage ? (
        <p
          className="rounded-2xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-3 text-sm text-copy-primary"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}
    </fieldset>
  )
}
