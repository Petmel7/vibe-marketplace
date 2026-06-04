'use client'

import { useMemo, useState } from 'react'
import DashboardCard from '@/components/profile/DashboardCard'
import NovaPoshtaCityCombobox from '@/components/shipping/NovaPoshtaCityCombobox'
import NovaPoshtaWarehouseSelect from '@/components/shipping/NovaPoshtaWarehouseSelect'
import { useSellerStoreShippingSettings } from '@/hooks/useSellerStoreShippingSettings'
import type { NovaPoshtaCity, NovaPoshtaWarehouse } from '@/types/shipping'

type ShippingFormState = {
  senderName: string
  senderPhone: string
}

function SellerShippingSettingsFields({
  settings,
  isSaving,
  errorMessage,
  onSave,
}: {
  settings: {
    senderName: string | null
    senderPhone: string | null
    senderCityRef: string | null
    senderCityName: string | null
    senderWarehouseRef: string | null
    senderWarehouseName: string | null
    isConfigured?: boolean
    updatedAt?: string | null
  } | null
  isSaving: boolean
  errorMessage: string | null
  onSave: ReturnType<typeof useSellerStoreShippingSettings>['saveSettings']
}) {
  const [formState, setFormState] = useState<ShippingFormState>({
    senderName: settings?.senderName ?? '',
    senderPhone: settings?.senderPhone ?? '',
  })
  const [selectedCity, setSelectedCity] = useState<NovaPoshtaCity | null>(
    settings?.senderCityRef && settings.senderCityName
      ? {
          ref: settings.senderCityRef,
          name: settings.senderCityName,
          area: null,
          settlementType: null,
        }
      : null,
  )
  const [selectedWarehouse, setSelectedWarehouse] = useState<NovaPoshtaWarehouse | null>(
    settings?.senderWarehouseRef && settings.senderWarehouseName
      ? {
          ref: settings.senderWarehouseRef,
          name: settings.senderWarehouseName,
          cityRef: settings.senderCityRef ?? '',
          cityName: settings.senderCityName,
        }
      : null,
  )

  const isConfigured = Boolean(settings?.isConfigured)
  const statusDescription = useMemo(() => {
    if (isConfigured) {
      return 'Використаємо ці дані на наступному етапі для створення ТТН та відправлень Нова Пошта.'
    }

    return 'Заповніть дані відправника заздалегідь, щоб пізніше швидше перейти до створення ТТН.'
  }, [isConfigured])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    await onSave({
      senderName: formState.senderName.trim() || null,
      senderPhone: formState.senderPhone.trim() || null,
      senderCityRef: selectedCity?.ref ?? null,
      senderCityName: selectedCity?.name ?? null,
      senderWarehouseRef: selectedWarehouse?.ref ?? null,
      senderWarehouseName: selectedWarehouse?.name ?? null,
    })
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="rounded-2xl border border-panelBorder bg-panel/60 px-4 py-4 text-sm text-copy-secondary">
        <p className="font-medium text-copy-strong">Статус конфігурації</p>
        <p className="mt-2">{statusDescription}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="block text-sm font-medium text-copy-strong">Ім’я відправника</span>
          <input
            className="ui-surface-input"
            value={formState.senderName}
            onChange={(event) =>
              setFormState((current) => ({ ...current, senderName: event.target.value }))
            }
            placeholder="Наприклад, Менеджер магазину"
          />
        </label>

        <label className="space-y-2">
          <span className="block text-sm font-medium text-copy-strong">Телефон відправника</span>
          <input
            className="ui-surface-input"
            value={formState.senderPhone}
            onChange={(event) =>
              setFormState((current) => ({ ...current, senderPhone: event.target.value }))
            }
            placeholder="+380..."
          />
        </label>
      </div>

      <NovaPoshtaCityCombobox
        key={selectedCity?.ref ?? 'seller-city'}
        value={selectedCity}
        onChange={(city) => {
          setSelectedCity(city)
          setSelectedWarehouse(null)
        }}
        label="Місто відправлення Нова Пошта"
      />

      <NovaPoshtaWarehouseSelect
        key={selectedCity?.ref ?? 'seller-warehouse'}
        cityRef={selectedCity?.ref ?? null}
        value={selectedWarehouse}
        onChange={setSelectedWarehouse}
        label="Відділення / поштомат відправника"
      />

      {errorMessage ? (
        <p className="rounded-2xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-3 text-sm text-copy-primary" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="submit" className="ui-primary-button" disabled={isSaving}>
          {isSaving ? 'Зберігаємо...' : 'Зберегти дані відправника'}
        </button>
        {settings?.updatedAt ? (
          <p className="text-sm text-copy-muted">
            Оновлено {new Date(settings.updatedAt).toLocaleDateString('uk-UA')}
          </p>
        ) : null}
      </div>
    </form>
  )
}

export default function SellerShippingSettingsForm() {
  const { settings, isLoading, isSaving, errorMessage, saveSettings } =
    useSellerStoreShippingSettings(true)

  return (
    <DashboardCard
      title="Налаштування відправника"
      description="Ці дані збережемо для майбутнього створення ТТН Нова Пошта. На поточному етапі вони не створюють відправлення автоматично."
      action={
        settings ? (
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${
              settings.isConfigured
                ? 'border-brand-success/30 bg-brand-success/10 text-brand-success'
                : 'border-amber-400/30 bg-amber-400/10 text-amber-200'
            }`}
          >
            {settings.isConfigured ? 'Налаштовано' : 'Не налаштовано'}
          </span>
        ) : null
      }
    >
      {isLoading ? (
        <div className="space-y-3" aria-busy="true">
          <div className="h-12 animate-pulse rounded-2xl bg-panel" />
          <div className="h-12 animate-pulse rounded-2xl bg-panel" />
          <div className="h-24 animate-pulse rounded-2xl bg-panel" />
        </div>
      ) : (
        <SellerShippingSettingsFields
          key={settings?.updatedAt ?? settings?.storeId ?? 'shipping-settings'}
          settings={settings}
          isSaving={isSaving}
          errorMessage={errorMessage}
          onSave={saveSettings}
        />
      )}
    </DashboardCard>
  )
}
