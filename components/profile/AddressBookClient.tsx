'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ShippingAddressDto, CreateAddressDto, UpdateAddressDto } from '@/features/address/address.dto'
import EmptyState from '@/components/profile/EmptyState'

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

type Mode =
  | { type: 'create' }
  | { type: 'edit'; addressId: string }
  | null

function toFormState(address?: ShippingAddressDto): AddressFormState {
  return {
    label: address?.label ?? '',
    fullName: address?.fullName ?? '',
    phone: address?.phone ?? '',
    country: address?.country ?? '',
    city: address?.city ?? '',
    region: address?.region ?? '',
    street: address?.street ?? '',
    building: address?.building ?? '',
    apartment: address?.apartment ?? '',
    zipCode: address?.zipCode ?? '',
    isDefault: address?.isDefault ?? false,
  }
}

function toPayload(state: AddressFormState): CreateAddressDto | UpdateAddressDto {
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

type ApiSuccess<T> = { success: true; data: T }
type ApiError = { success: false; error: { message: string; code: string } }

export default function AddressBookClient({
  initialAddresses,
}: {
  initialAddresses: ShippingAddressDto[]
}) {
  const router = useRouter()
  const [addresses, setAddresses] = useState(initialAddresses)
  const [mode, setMode] = useState<Mode>(null)
  const [formState, setFormState] = useState<AddressFormState>(toFormState())
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const openCreate = () => {
    setMode({ type: 'create' })
    setFormState(toFormState())
    setErrorMessage(null)
  }

  const openEdit = (address: ShippingAddressDto) => {
    setMode({ type: 'edit', addressId: address.id })
    setFormState(toFormState(address))
    setErrorMessage(null)
  }

  const closeForm = () => {
    setMode(null)
    setErrorMessage(null)
  }

  const handleFieldChange = (field: keyof AddressFormState, value: string | boolean) => {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)

    startTransition(async () => {
      const payload = toPayload(formState)
      const url =
        mode?.type === 'edit'
          ? `/api/profile/addresses/${mode.addressId}`
          : '/api/profile/addresses'
      const method = mode?.type === 'edit' ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = (await response.json()) as ApiSuccess<ShippingAddressDto> | ApiError
      if (!json.success) {
        setErrorMessage(json.error.message)
        return
      }

      let nextAddresses =
        mode?.type === 'edit'
          ? addresses.map((address) => (address.id === json.data.id ? json.data : address))
          : [json.data, ...addresses]

      if (formState.isDefault) {
        const optimisticDefault = nextAddresses.map((address) => ({
          ...address,
          isDefault: address.id === json.data.id,
        }))
        setAddresses(optimisticDefault)

        const defaultResponse = await fetch(`/api/profile/addresses/${json.data.id}/default`, {
          method: 'POST',
        })

        if (!defaultResponse.ok) {
          setAddresses(nextAddresses)
          setErrorMessage('Адресу збережено, але не вдалося зробити її основною.')
        } else {
          nextAddresses = optimisticDefault
        }
      }

      setAddresses(nextAddresses)
      closeForm()
      router.refresh()
    })
  }

  const handleDelete = (addressId: string) => {
    const previousAddresses = addresses
    setAddresses((current) => current.filter((address) => address.id !== addressId))
    setErrorMessage(null)

    startTransition(async () => {
      const response = await fetch(`/api/profile/addresses/${addressId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        setAddresses(previousAddresses)
        setErrorMessage('Не вдалося видалити адресу. Спробуйте ще раз.')
        return
      }

      router.refresh()
    })
  }

  const handleSetDefault = (addressId: string) => {
    const previousAddresses = addresses
    const optimisticAddresses = addresses.map((address) => ({
      ...address,
      isDefault: address.id === addressId,
    }))

    setAddresses(optimisticAddresses)
    setErrorMessage(null)

    startTransition(async () => {
      const response = await fetch(`/api/profile/addresses/${addressId}/default`, {
        method: 'POST',
      })

      if (!response.ok) {
        setAddresses(previousAddresses)
        setErrorMessage('Не вдалося оновити основну адресу.')
        return
      }

      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-copy-strong">Адреси доставки</h2>
          <p className="text-sm text-copy-muted">Керуйте адресами доставки для майбутніх замовлень.</p>
        </div>
        <div className="flex justify-center max-[500px]:justify-stretch">
          <button type="button" className="ui-primary-button w-fit max-[500px]:w-full" onClick={openCreate}>
            Додати адресу
          </button>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-3 text-sm text-copy-strong">
          {errorMessage}
        </div>
      ) : null}

      {mode ? (
        <section className="ui-elevated-panel p-5 sm:p-6">
          <h3 className="text-base font-semibold text-copy-strong">
            {mode.type === 'edit' ? 'Редагувати адресу' : 'Нова адреса'}
          </h3>
          <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
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
              <label key={field} className={`space-y-2 ${field === 'street' ? 'sm:col-span-2' : ''}`}>
                <span className="block text-sm font-medium text-copy-strong">{label}</span>
                <input
                  className="ui-surface-input"
                  value={formState[field as keyof AddressFormState] as string}
                  onChange={(event) => handleFieldChange(field as keyof AddressFormState, event.target.value)}
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
              Зробити основною адресою доставки
            </label>

            <div className="sm:col-span-2 flex flex-col gap-3 sm:flex-row">
              <button type="submit" className="ui-primary-button" disabled={isPending}>
                {isPending ? 'Зберігаємо...' : mode.type === 'edit' ? 'Зберегти зміни' : 'Створити адресу'}
              </button>
              <button type="button" className="ui-secondary-button" onClick={closeForm} disabled={isPending}>
                Скасувати
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {addresses.length === 0 ? (
        <EmptyState
          title="Збережених адрес поки що немає"
          description="Додайте першу адресу доставки, щоб пришвидшити оформлення та впорядкувати доставки."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {addresses.map((address) => (
            <article key={address.id} className="ui-elevated-panel p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-copy-strong">
                      {address.label || address.fullName}
                    </h3>
                    {address.isDefault ? (
                      <span className="rounded-full border border-brand-success/30 bg-brand-success/10 px-3 py-1 text-xs font-medium text-brand-success">
                        Основна
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-copy-secondary">{address.fullName}</p>
                  <p className="text-sm text-copy-muted">{address.phone}</p>
                </div>
              </div>

              <div className="mt-4 space-y-1 text-sm text-copy-secondary">
                <p>{address.street}, {address.building}{address.apartment ? `, кв. ${address.apartment}` : ''}</p>
                <p>{address.city}{address.region ? `, ${address.region}` : ''}</p>
                <p>{address.country}{address.zipCode ? `, ${address.zipCode}` : ''}</p>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button type="button" className="ui-secondary-button h-10 px-5 py-2 text-sm" onClick={() => openEdit(address)}>
                  Редагувати
                </button>
                {!address.isDefault ? (
                  <button
                    type="button"
                    className="rounded-full border border-panelBorder px-5 py-2 text-sm text-copy-primary transition-colors hover:bg-panel"
                    onClick={() => handleSetDefault(address.id)}
                    disabled={isPending}
                  >
                    Зробити основною
                  </button>
                ) : null}
                <button
                  type="button"
                  className="rounded-full border border-brand-danger/30 px-5 py-2 text-sm text-brand-danger transition-colors hover:bg-brand-danger/10"
                  onClick={() => handleDelete(address.id)}
                  disabled={isPending}
                >
                  Видалити
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
