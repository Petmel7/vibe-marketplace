'use client'

import type { ShippingAddressDto } from '@/features/address/address.dto'
import EmptyState from '@/components/profile/EmptyState'
import AddressBookForm from './AddressBookClient/AddressBookForm'
import AddressBookHeader from './AddressBookClient/AddressBookHeader'
import AddressList from './AddressBookClient/AddressList'
import { useAddressBook } from './AddressBookClient/hooks/useAddressBook'

export default function AddressBookClient({
  initialAddresses,
}: {
  initialAddresses: ShippingAddressDto[]
}) {
  const {
    addresses,
    mode,
    formState,
    errorMessage,
    isPending,
    openCreate,
    openEdit,
    closeForm,
    handleFieldChange,
    handleSubmit,
    handleDelete,
    handleSetDefault,
  } = useAddressBook(initialAddresses)

  return (
    <div className="space-y-6">
      <AddressBookHeader onCreate={openCreate} />

      {errorMessage ? (
        <div className="rounded-2xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-3 text-sm text-copy-strong">
          {errorMessage}
        </div>
      ) : null}

      {mode ? (
        <AddressBookForm
          mode={mode}
          formState={formState}
          isPending={isPending}
          onFieldChange={handleFieldChange}
          onSubmit={handleSubmit}
          onCancel={closeForm}
        />
      ) : null}

      {addresses.length === 0 ? (
        <EmptyState
          title="Збережених адрес поки що немає"
          description="Додайте першу адресу доставки, щоб пришвидшити оформлення та впорядкувати доставки."
        />
      ) : (
        <AddressList
          addresses={addresses}
          isPending={isPending}
          onEdit={openEdit}
          onSetDefault={handleSetDefault}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
