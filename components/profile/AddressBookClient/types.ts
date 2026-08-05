import type { ShippingAddressDto } from '@/features/address/address.dto'

export type AddressFormState = {
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

export type AddressBookMode =
  | { type: 'create' }
  | { type: 'edit'; addressId: string }
  | null

export type AddressBookField = keyof AddressFormState

export type AddressBookController = {
  addresses: ShippingAddressDto[]
  mode: AddressBookMode
  formState: AddressFormState
  errorMessage: string | null
  isPending: boolean
  openCreate: () => void
  openEdit: (address: ShippingAddressDto) => void
  closeForm: () => void
  handleFieldChange: (field: AddressBookField, value: string | boolean) => void
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  handleDelete: (addressId: string) => void
  handleSetDefault: (addressId: string) => void
}
