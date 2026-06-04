import type {
  ShipmentStatus,
  ShippingDeliveryType,
  ShippingProvider,
} from '@/app/generated/prisma/client'

export type NovaPoshtaCityDto = {
  ref: string
  name: string
  area: string | null
  settlementType: string | null
}

export type NovaPoshtaWarehouseDto = {
  ref: string
  name: string
  cityRef: string
  cityName: string | null
}

export type NovaPoshtaEstimateInput = {
  cityRef: string
  warehouseRef: string
}

export type NovaPoshtaEstimateDto = {
  estimatedCost: string | null
  currency: 'UAH'
}

export type StoreShippingSettingsDto = {
  id: string | null
  storeId: string
  provider: ShippingProvider
  senderName: string | null
  senderPhone: string | null
  senderCityRef: string | null
  senderCityName: string | null
  senderWarehouseRef: string | null
  senderWarehouseName: string | null
  isConfigured: boolean
  createdAt: Date | null
  updatedAt: Date | null
}

export type UpdateStoreShippingSettingsInput = {
  provider?: ShippingProvider
  senderName?: string | null
  senderPhone?: string | null
  senderCityRef?: string | null
  senderCityName?: string | null
  senderWarehouseRef?: string | null
  senderWarehouseName?: string | null
}

export type CheckoutDeliverySelectionInput = {
  deliveryType?: ShippingDeliveryType | null
  recipientName?: string | null
  recipientPhone?: string | null
  recipientCityRef?: string | null
  recipientCityName?: string | null
  recipientWarehouseRef?: string | null
  recipientWarehouseName?: string | null
}

export type CheckoutDeliverySelectionDto = {
  supportedDeliveryTypes: ShippingDeliveryType[]
  selectedDeliveryType: ShippingDeliveryType | null
  recipientName: string | null
  recipientPhone: string | null
  recipientCityRef: string | null
  recipientCityName: string | null
  recipientWarehouseRef: string | null
  recipientWarehouseName: string | null
  isComplete: boolean
}

export type ResolvedCheckoutDeliverySelectionDto = {
  provider: ShippingProvider
  deliveryType: ShippingDeliveryType
  recipientName: string
  recipientPhone: string
  recipientCityRef: string
  recipientCityName: string
  recipientWarehouseRef: string
  recipientWarehouseName: string
}

export type ShipmentSnapshotDto = {
  id: string
  provider: ShippingProvider
  deliveryType: ShippingDeliveryType
  status: ShipmentStatus
  recipientCityRef: string
  recipientCityName: string
  recipientWarehouseRef: string | null
  recipientWarehouseName: string | null
  trackingNumber: string | null
}

export type ShipmentDraftInputItem = {
  id: string
  storeId: string
  quantity: number
}

export type ShipmentDraftDto = {
  storeId: string
  provider: ShippingProvider
  deliveryType: ShippingDeliveryType
  status: ShipmentStatus
  recipientName: string
  recipientPhone: string
  recipientCityRef: string
  recipientCityName: string
  recipientWarehouseRef: string
  recipientWarehouseName: string
  currency: 'UAH'
  items: Array<{
    orderItemId: string
    quantity: number
  }>
}
