'use client'

import { useState } from 'react'
import type { CreateAddressDto } from '@/features/address/address.dto'
import DashboardCard from '@/components/profile/DashboardCard'
import type { CheckoutAddressOption } from '@/types/checkout'

type AddressFormState = {
  label: string
  fullName: string
  phone: string
  country: string
  city: string
  region: string
  street: string
  building: string
  apartment: string
  zipCode: string
  isDefault: boolean
}

const initialFormState: AddressFormState = {
  label: '',
  fullName: '',
  phone: '',
  country: '',
  city: '',
  region: '',
  street: '',
  building: '',
  apartment: '',
  zipCode: '',
  isDefault: false,
}

function toPayload(state: AddressFormState): CreateAddressDto {
  return {
    label: state.label || null,
    fullName: state.fullName,
    phone: state.phone,
    country: state.country,
    city: state.city,
    region: state.region || null,
    street: state.street,
    building: state.building,
    apartment: state.apartment || null,
    zipCode: state.zipCode || null,
    isDefault: state.isDefault,
  }
}

export default function CheckoutAddressSelector({
  addresses,
  selectedAddressId,
  onSelect,
  onAddAddress,
  isSaving,
  errorMessage,
}: {
  addresses: CheckoutAddressOption[]
  selectedAddressId: string
  onSelect: (addressId: string) => void
  onAddAddress: (payload: CreateAddressDto) => Promise<unknown>
  isSaving: boolean
  errorMessage: string | null
}) {
  const [isAdding, setIsAdding] = useState(false)
  const [formState, setFormState] = useState<AddressFormState>(initialFormState)

  const handleFieldChange = (field: keyof AddressFormState, value: string | boolean) => {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const result = await onAddAddress(toPayload(formState))
    if (result) {
      setFormState(initialFormState)
      setIsAdding(false)
    }
  }

  return (
    <DashboardCard
      title="Адреса доставки"
      description="Оберіть збережену адресу доставки або додайте нову, не залишаючи оформлення замовлення."
      action={
        <button
          type="button"
          className="ui-secondary-button"
          onClick={() => setIsAdding((current) => !current)}
        >
          {isAdding ? 'Закрити форму' : 'Додати адресу'}
        </button>
      }
    >
      <div className="space-y-4">
        {addresses.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-panelBorder bg-panel/60 px-4 py-4 text-sm text-copy-muted">
            Збережених адрес доставки ще немає. Додайте одну нижче, щоб продовжити.
          </p>
        ) : (
          <fieldset className="space-y-3">
            <legend className="sr-only">Збережені адреси доставки</legend>
            {addresses.map((address) => (
              <label
                key={address.id}
                className={`block cursor-pointer rounded-2xl border px-4 py-4 transition-colors ${selectedAddressId === address.id
                  ? 'border-brand bg-brand/10'
                  : 'border-panelBorder bg-panel hover:bg-panel/80'
                  }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="shipping-address"
                    value={address.id}
                    checked={selectedAddressId === address.id}
                    onChange={() => onSelect(address.id)}
                    className="mt-1"
                  />

                  <div className="space-y-1 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-copy-strong">
                        {address.label || address.fullName}
                      </span>
                      {address.isDefault ? (
                        <span className="rounded-full border border-brand-success/30 bg-brand-success/10 px-2 py-0.5 text-xs font-medium text-brand-success">
                          За замовчуванням
                        </span>
                      ) : null}
                    </div>
                    <p className="text-copy-secondary">{address.fullName}</p>
                    <p className="text-copy-muted">{address.phone}</p>
                    <p className="text-copy-muted">
                      {address.street}, {address.building}
                      {address.apartment ? `, кв. ${address.apartment}` : ''}
                    </p>
                    <p className="text-copy-muted">
                      {address.city}
                      {address.region ? `, ${address.region}` : ''}, {address.country}
                      {address.zipCode ? `, ${address.zipCode}` : ''}
                    </p>
                  </div>
                </div>
              </label>
            ))}
          </fieldset>
        )}

        {isAdding ? (
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            {[
              ['label', 'Назва'],
              ['fullName', 'Повне ім’я'],
              ['phone', 'Телефон'],
              ['country', 'Країна'],
              ['city', 'Місто'],
              ['region', 'Область'],
              ['street', 'Вулиця'],
              ['building', 'Будинок'],
              ['apartment', 'Квартира'],
              ['zipCode', 'Поштовий індекс'],
            ].map(([field, label]) => (
              <label
                key={field}
                className={`space-y-2 ${field === 'street' ? 'sm:col-span-2' : ''}`}
              >
                <span className="block text-sm font-medium text-copy-strong">{label}</span>
                <input
                  className="ui-surface-input"
                  value={formState[field as keyof AddressFormState] as string}
                  onChange={(event) =>
                    handleFieldChange(field as keyof AddressFormState, event.target.value)
                  }
                  required={['fullName', 'phone', 'country', 'city', 'street', 'building'].includes(field)}
                />
              </label>
            ))}

            <label className="sm:col-span-2 flex items-center gap-3 rounded-2xl border border-panelBorder bg-panel px-4 py-3 text-sm text-copy-primary">
              <input
                type="checkbox"
                checked={formState.isDefault}
                onChange={(event) => handleFieldChange('isDefault', event.target.checked)}
              />
              Зробити адресою доставки за замовчуванням
            </label>

            {errorMessage ? (
              <p className="sm:col-span-2 rounded-2xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-3 text-sm text-copy-primary">
                {errorMessage}
              </p>
            ) : null}

            <div className="sm:col-span-2 flex flex-col gap-3 sm:flex-row">
              <button type="submit" className="ui-primary-button" disabled={isSaving}>
                {isSaving ? 'Зберігаємо адресу...' : 'Зберегти адресу'}
              </button>
              <button
                type="button"
                className="ui-secondary-button"
                onClick={() => setIsAdding(false)}
                disabled={isSaving}
              >
                Скасувати
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </DashboardCard>
  )
}
