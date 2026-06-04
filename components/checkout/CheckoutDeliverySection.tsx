'use client'

import DashboardCard from '@/components/profile/DashboardCard'
import NovaPoshtaCityCombobox from '@/components/shipping/NovaPoshtaCityCombobox'
import NovaPoshtaWarehouseSelect from '@/components/shipping/NovaPoshtaWarehouseSelect'
import type {
  CheckoutDeliveryMode,
  NovaPoshtaCity,
  NovaPoshtaWarehouse,
} from '@/types/shipping'

export default function CheckoutDeliverySection({
  deliveryMode,
  onDeliveryModeChange,
  recipientName,
  recipientPhone,
  selectedCity,
  selectedWarehouse,
  onRecipientNameChange,
  onRecipientPhoneChange,
  onCityChange,
  onWarehouseChange,
  hasSavedAddresses,
}: {
  deliveryMode: CheckoutDeliveryMode
  onDeliveryModeChange: (mode: CheckoutDeliveryMode) => void
  recipientName: string
  recipientPhone: string
  selectedCity: NovaPoshtaCity | null
  selectedWarehouse: NovaPoshtaWarehouse | null
  onRecipientNameChange: (value: string) => void
  onRecipientPhoneChange: (value: string) => void
  onCityChange: (city: NovaPoshtaCity | null) => void
  onWarehouseChange: (warehouse: NovaPoshtaWarehouse | null) => void
  hasSavedAddresses: boolean
}) {
  return (
    <DashboardCard
      title="Спосіб доставки"
      description="Можна використати збережену адресу або обрати відділення / поштомат Нова Пошта. Дані доставки перевіряються сервером під час оформлення."
    >
      <fieldset className="space-y-4">
        <legend className="sr-only">Спосіб доставки</legend>

        <div className="space-y-3">
          <label
            className={`flex cursor-pointer gap-3 rounded-2xl border px-4 py-4 transition-colors ${
              deliveryMode === 'ADDRESS'
                ? 'border-brand-accent bg-brand-accent/10'
                : 'border-panelBorder bg-panel hover:bg-panel/70'
            } ${!hasSavedAddresses ? 'opacity-70' : ''}`}
          >
            <input
              type="radio"
              name="delivery-mode"
              value="ADDRESS"
              checked={deliveryMode === 'ADDRESS'}
              onChange={() => onDeliveryModeChange('ADDRESS')}
              disabled={!hasSavedAddresses}
              className="mt-1 h-4 w-4"
            />
            <span className="space-y-1">
              <span className="block text-sm font-semibold text-copy-strong">Збережена адреса</span>
              <span className="block text-sm text-copy-muted">
                {hasSavedAddresses
                  ? 'Використайте одну з адрес у вашому профілі.'
                  : 'Наразі немає збережених адрес. Ви все ще можете оформити доставку через Нова Пошта.'}
              </span>
            </span>
          </label>

          <label
            className={`flex cursor-pointer gap-3 rounded-2xl border px-4 py-4 transition-colors ${
              deliveryMode === 'NOVA_POSHTA'
                ? 'border-brand-accent bg-brand-accent/10'
                : 'border-panelBorder bg-panel hover:bg-panel/70'
            }`}
          >
            <input
              type="radio"
              name="delivery-mode"
              value="NOVA_POSHTA"
              checked={deliveryMode === 'NOVA_POSHTA'}
              onChange={() => onDeliveryModeChange('NOVA_POSHTA')}
              className="mt-1 h-4 w-4"
            />
            <span className="space-y-1">
              <span className="block text-sm font-semibold text-copy-strong">
                Нова Пошта: відділення / поштомат
              </span>
              <span className="block text-sm text-copy-muted">
                Окремо збережемо снапшот міста та відділення для кожного магазину в замовленні.
              </span>
            </span>
          </label>
        </div>

        {deliveryMode === 'NOVA_POSHTA' ? (
          <div className="grid gap-4 rounded-2xl border border-panelBorder bg-panel/50 p-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Ім’я отримувача</span>
              <input
                className="ui-surface-input"
                value={recipientName}
                onChange={(event) => onRecipientNameChange(event.target.value)}
                placeholder="Наприклад, Іван Петренко"
              />
            </label>

            <label className="space-y-2">
              <span className="block text-sm font-medium text-copy-strong">Телефон отримувача</span>
              <input
                className="ui-surface-input"
                value={recipientPhone}
                onChange={(event) => onRecipientPhoneChange(event.target.value)}
                placeholder="+380..."
              />
            </label>

            <div className="sm:col-span-2">
              <NovaPoshtaCityCombobox
                key={selectedCity?.ref ?? 'checkout-city'}
                value={selectedCity}
                onChange={(city) => {
                  onCityChange(city)
                  onWarehouseChange(null)
                }}
                label="Місто Нова Пошта"
              />
            </div>

            <div className="sm:col-span-2">
              <NovaPoshtaWarehouseSelect
                key={selectedCity?.ref ?? 'checkout-warehouse'}
                cityRef={selectedCity?.ref ?? null}
                value={selectedWarehouse}
                onChange={onWarehouseChange}
                label="Відділення / поштомат Нова Пошта"
              />
            </div>
          </div>
        ) : null}
      </fieldset>
    </DashboardCard>
  )
}
