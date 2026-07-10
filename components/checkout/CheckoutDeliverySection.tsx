'use client'

import DashboardCard from '@/components/profile/DashboardCard'
import DeliveryEstimateCard from '@/components/shipping/DeliveryEstimateCard'
import NovaPoshtaCityCombobox from '@/components/shipping/NovaPoshtaCityCombobox'
import NovaPoshtaCourierAddressForm from '@/components/shipping/NovaPoshtaCourierAddressForm'
import NovaPoshtaWarehouseSelect from '@/components/shipping/NovaPoshtaWarehouseSelect'
import ShippingDeliveryTypeSelector from '@/components/shipping/ShippingDeliveryTypeSelector'
import type {
  CheckoutDeliveryMode,
  CheckoutDeliverySelection,
  NovaPoshtaCity,
  NovaPoshtaWarehouse,
  ShippingDeliveryType,
} from '@/types/shipping'

type CheckoutDeliverySectionProps = {
  deliveryMode: CheckoutDeliveryMode
  onDeliveryModeChange: (mode: CheckoutDeliveryMode) => void
  selectedDeliveryType: ShippingDeliveryType
  onDeliveryTypeChange: (value: ShippingDeliveryType) => void
  recipientFirstName: string
  recipientLastName: string
  recipientMiddleName: string
  recipientFirstNameError: string | null
  recipientLastNameError: string | null
  recipientMiddleNameError: string | null
  recipientPhone: string
  selectedCity: NovaPoshtaCity | null
  selectedWarehouse: NovaPoshtaWarehouse | null
  recipientStreet: string
  recipientBuilding: string
  recipientApartment: string
  onRecipientFirstNameChange: (value: string) => void
  onRecipientLastNameChange: (value: string) => void
  onRecipientMiddleNameChange: (value: string) => void
  onRecipientPhoneChange: (value: string) => void
  onCityChange: (city: NovaPoshtaCity | null) => void
  onWarehouseChange: (warehouse: NovaPoshtaWarehouse | null) => void
  onRecipientStreetChange: (value: string) => void
  onRecipientBuildingChange: (value: string) => void
  onRecipientApartmentChange: (value: string) => void
  deliverySelection: CheckoutDeliverySelection
  hasSavedAddresses: boolean
}

export default function CheckoutDeliverySection({
  deliveryMode,
  onDeliveryModeChange,
  selectedDeliveryType,
  onDeliveryTypeChange,
  recipientFirstName,
  recipientLastName,
  recipientMiddleName,
  recipientFirstNameError,
  recipientLastNameError,
  recipientMiddleNameError,
  recipientPhone,
  selectedCity,
  selectedWarehouse,
  recipientStreet,
  recipientBuilding,
  recipientApartment,
  onRecipientFirstNameChange,
  onRecipientLastNameChange,
  onRecipientMiddleNameChange,
  onRecipientPhoneChange,
  onCityChange,
  onWarehouseChange,
  onRecipientStreetChange,
  onRecipientBuildingChange,
  onRecipientApartmentChange,
  deliverySelection,
  hasSavedAddresses,
}: CheckoutDeliverySectionProps) {
  const isCourier = selectedDeliveryType === 'NOVA_POSHTA_COURIER'
  const isEstimateReady =
    Boolean(recipientFirstName.trim()) &&
    Boolean(recipientLastName.trim()) &&
    Boolean(recipientPhone.trim()) &&
    Boolean(selectedCity?.ref) &&
    (isCourier
      ? Boolean(recipientStreet.trim()) && Boolean(recipientBuilding.trim())
      : Boolean(selectedWarehouse?.ref))

  return (
    <DashboardCard
      title="Спосіб доставки"
      description="Можна використати збережену адресу або Нову Пошту. Дані доставки та оцінка вартості перевіряються сервером під час оформлення."
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
                  : 'Наразі немає збережених адрес. Ви все ще можете оформити доставку через Нову Пошту.'}
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
              <span className="block text-sm font-semibold text-copy-strong">Нова Пошта</span>
              <span className="block text-sm text-copy-muted">
                Окремо збережемо снапшот доставки для кожного магазину в multi-vendor замовленні.
              </span>
            </span>
          </label>
        </div>

        {deliveryMode === 'NOVA_POSHTA' ? (
          <div className="space-y-4 rounded-2xl border border-panelBorder bg-panel/50 p-4">
            <ShippingDeliveryTypeSelector
              value={selectedDeliveryType}
              onChange={(nextType) => {
                onDeliveryTypeChange(nextType)
                onWarehouseChange(null)
                onRecipientStreetChange('')
                onRecipientBuildingChange('')
                onRecipientApartmentChange('')
              }}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="block text-sm font-medium text-copy-strong">Ім’я отримувача</span>
                <input
                  className="ui-surface-input"
                  value={recipientFirstName}
                  onChange={(event) => onRecipientFirstNameChange(event.target.value)}
                  placeholder="Наприклад, Іван"
                  aria-invalid={recipientFirstNameError ? true : undefined}
                  aria-describedby={
                    recipientFirstNameError ? 'checkout-recipient-first-name-error' : undefined
                  }
                />
                {recipientFirstNameError ? (
                  <p
                    id="checkout-recipient-first-name-error"
                    className="text-sm text-brand-danger"
                    role="alert"
                  >
                    {recipientFirstNameError}
                  </p>
                ) : null}
              </label>

              <label className="space-y-2">
                <span className="block text-sm font-medium text-copy-strong">Прізвище отримувача</span>
                <input
                  className="ui-surface-input"
                  value={recipientLastName}
                  onChange={(event) => onRecipientLastNameChange(event.target.value)}
                  placeholder="Наприклад, Петренко"
                  aria-invalid={recipientLastNameError ? true : undefined}
                  aria-describedby={
                    recipientLastNameError ? 'checkout-recipient-last-name-error' : undefined
                  }
                />
                {recipientLastNameError ? (
                  <p
                    id="checkout-recipient-last-name-error"
                    className="text-sm text-brand-danger"
                    role="alert"
                  >
                    {recipientLastNameError}
                  </p>
                ) : null}
              </label>

              <label className="space-y-2 sm:col-span-2">
                <span className="block text-sm font-medium text-copy-strong">
                  По батькові (необов’язково)
                </span>
                <input
                  className="ui-surface-input"
                  value={recipientMiddleName}
                  onChange={(event) => onRecipientMiddleNameChange(event.target.value)}
                  placeholder="Наприклад, Іванович"
                  aria-invalid={recipientMiddleNameError ? true : undefined}
                  aria-describedby={
                    recipientMiddleNameError ? 'checkout-recipient-middle-name-error' : undefined
                  }
                />
                {recipientMiddleNameError ? (
                  <p
                    id="checkout-recipient-middle-name-error"
                    className="text-sm text-brand-danger"
                    role="alert"
                  >
                    {recipientMiddleNameError}
                  </p>
                ) : null}
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
                  value={selectedCity}
                  onChange={(city) => {
                    onCityChange(city)
                    onWarehouseChange(null)
                  }}
                  label="Місто Nova Poshta"
                />
              </div>
            </div>

            {isCourier ? (
              <NovaPoshtaCourierAddressForm
                street={recipientStreet}
                building={recipientBuilding}
                apartment={recipientApartment}
                onStreetChange={onRecipientStreetChange}
                onBuildingChange={onRecipientBuildingChange}
                onApartmentChange={onRecipientApartmentChange}
              />
            ) : (
              <NovaPoshtaWarehouseSelect
                cityRef={selectedCity?.ref ?? null}
                value={selectedWarehouse}
                onChange={onWarehouseChange}
                label="Відділення / поштомат Nova Poshta"
              />
            )}

            <div className="pt-2 sm:pt-3">
              <DeliveryEstimateCard
                estimatedCost={deliverySelection.estimatedCost}
                currency={deliverySelection.currency}
                isReady={isEstimateReady}
              />
            </div>
          </div>
        ) : null}
      </fieldset>
    </DashboardCard>
  )
}
