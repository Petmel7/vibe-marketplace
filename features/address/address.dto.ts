export type ShippingAddressDto = {
  id: string
  userId: string
  label: string | null
  fullName: string
  phone: string
  country: string
  city: string
  region: string | null
  street: string
  building: string
  apartment: string | null
  zipCode: string | null
  isDefault: boolean
  createdAt: Date
}

export type CreateAddressDto = {
  label?: string | null
  fullName: string
  phone: string
  country: string
  city: string
  region?: string | null
  street: string
  building: string
  apartment?: string | null
  zipCode?: string | null
  isDefault?: boolean
}

export type UpdateAddressDto = Partial<CreateAddressDto>
