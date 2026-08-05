import type { AddressBookField, AddressBookMode, AddressFormState } from './types'

const addressFields: Array<[AddressBookField, string]> = [
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
]

const requiredFields: AddressBookField[] = ['fullName', 'phone', 'country', 'city', 'street', 'building']

export default function AddressBookForm({
  mode,
  formState,
  isPending,
  onFieldChange,
  onSubmit,
  onCancel,
}: {
  mode: Exclude<AddressBookMode, null>
  formState: AddressFormState
  isPending: boolean
  onFieldChange: (field: AddressBookField, value: string | boolean) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onCancel: () => void
}) {
  return (
    <section className="ui-elevated-panel p-5 sm:p-6">
      <h3 className="text-base font-semibold text-copy-strong">
        {mode.type === 'edit' ? 'Редагувати адресу' : 'Нова адреса'}
      </h3>
      <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
        {addressFields.map(([field, label]) => (
          <label key={field} className={`space-y-2 ${field === 'street' ? 'sm:col-span-2' : ''}`}>
            <span className="block text-sm font-medium text-copy-strong">{label}</span>
            <input
              className="ui-surface-input"
              value={formState[field] as string}
              onChange={(event) => onFieldChange(field, event.target.value)}
              required={requiredFields.includes(field)}
            />
          </label>
        ))}

        <label className="sm:col-span-2 flex items-center gap-3 rounded-2xl border border-panelBorder bg-panel px-4 py-3 text-sm text-copy-primary">
          <input
            type="checkbox"
            checked={formState.isDefault}
            onChange={(event) => onFieldChange('isDefault', event.target.checked)}
          />
          Зробити основною адресою доставки
        </label>

        <div className="sm:col-span-2 flex flex-col gap-3 sm:flex-row">
          <button type="submit" className="ui-primary-button" disabled={isPending}>
            {isPending ? 'Зберігаємо...' : mode.type === 'edit' ? 'Зберегти зміни' : 'Створити адресу'}
          </button>
          <button type="button" className="ui-secondary-button" onClick={onCancel} disabled={isPending}>
            Скасувати
          </button>
        </div>
      </form>
    </section>
  )
}
