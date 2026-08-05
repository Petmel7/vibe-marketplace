import type { CreateAddressDto, ShippingAddressDto, UpdateAddressDto } from '@/features/address/address.dto'
import type { AddressFormState } from './types'

export function toFormState(address?: ShippingAddressDto): AddressFormState {
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

export function toPayload(state: AddressFormState): CreateAddressDto | UpdateAddressDto {
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
