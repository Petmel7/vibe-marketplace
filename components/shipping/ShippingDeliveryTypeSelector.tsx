'use client'

import type { ShippingDeliveryType } from '@/types/shipping'
import { getShippingDeliveryTypeLabel } from '@/types/shipping'

const OPTIONS: ShippingDeliveryType[] = [
  'NOVA_POSHTA_WAREHOUSE',
  'NOVA_POSHTA_COURIER',
]

export default function ShippingDeliveryTypeSelector({
  value,
  onChange,
}: {
  value: ShippingDeliveryType
  onChange: (value: ShippingDeliveryType) => void
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-copy-strong">Тип доставки Nova Poshta</legend>
      <div className="grid gap-3">
        {OPTIONS.map((option) => {
          const isActive = value === option

          return (
            <label
              key={option}
              className={`flex cursor-pointer gap-3 rounded-2xl border px-4 py-4 transition-colors ${
                isActive
                  ? 'border-brand-accent bg-brand-accent/10'
                  : 'border-panelBorder bg-panel hover:bg-panel/70'
              }`}
            >
              <input
                type="radio"
                name="nova-poshta-delivery-type"
                value={option}
                checked={isActive}
                onChange={() => onChange(option)}
                className="mt-1 h-4 w-4"
              />
              <span className="space-y-1">
                <span className="block text-sm font-semibold text-copy-strong">
                  {getShippingDeliveryTypeLabel(option)}
                </span>
                <span className="block text-sm text-copy-muted">
                  {option === 'NOVA_POSHTA_WAREHOUSE'
                    ? 'Покупець самостійно забирає замовлення у відділенні або поштоматі.'
                    : 'Кур’єрська доставка на вказану адресу в межах обраного міста.'}
                </span>
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
