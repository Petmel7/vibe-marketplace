'use client'

export default function NovaPoshtaCourierAddressForm({
  street,
  building,
  apartment,
  onStreetChange,
  onBuildingChange,
  onApartmentChange,
}: {
  street: string
  building: string
  apartment: string
  onStreetChange: (value: string) => void
  onBuildingChange: (value: string) => void
  onApartmentChange: (value: string) => void
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="space-y-2 sm:col-span-2">
        <span className="block text-sm font-medium text-copy-strong">Вулиця</span>
        <input
          className="ui-surface-input"
          value={street}
          onChange={(event) => onStreetChange(event.target.value)}
          placeholder="Наприклад, Хрещатик"
        />
      </label>

      <label className="space-y-2">
        <span className="block text-sm font-medium text-copy-strong">Будинок</span>
        <input
          className="ui-surface-input"
          value={building}
          onChange={(event) => onBuildingChange(event.target.value)}
          placeholder="Наприклад, 22"
        />
      </label>

      <label className="space-y-2">
        <span className="block text-sm font-medium text-copy-strong">Квартира</span>
        <input
          className="ui-surface-input"
          value={apartment}
          onChange={(event) => onApartmentChange(event.target.value)}
          placeholder="Необов’язково"
        />
      </label>
    </div>
  )
}
