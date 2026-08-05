import type { ShippingAddressDto } from '@/features/address/address.dto'

export default function AddressList({
  addresses,
  isPending,
  onEdit,
  onSetDefault,
  onDelete,
}: {
  addresses: ShippingAddressDto[]
  isPending: boolean
  onEdit: (address: ShippingAddressDto) => void
  onSetDefault: (addressId: string) => void
  onDelete: (addressId: string) => void
}) {
  return (
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
            <button type="button" className="ui-secondary-button h-10 px-5 py-2 text-sm" onClick={() => onEdit(address)}>
              Редагувати
            </button>
            {!address.isDefault ? (
              <button
                type="button"
                className="rounded-full border border-panelBorder px-5 py-2 text-sm text-copy-primary transition-colors hover:bg-panel"
                onClick={() => onSetDefault(address.id)}
                disabled={isPending}
              >
                Зробити основною
              </button>
            ) : null}
            <button
              type="button"
              className="rounded-full border border-brand-danger/30 px-5 py-2 text-sm text-brand-danger transition-colors hover:bg-brand-danger/10"
              onClick={() => onDelete(address.id)}
              disabled={isPending}
            >
              Видалити
            </button>
          </div>
        </article>
      ))}
    </div>
  )
}
