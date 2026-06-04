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
  deliveryType: ShippingDeliveryType
  senderCityRef?: string | null
  senderWarehouseRef?: string | null
  recipientCityRef: string
  recipientWarehouseRef?: string | null
  recipientStreet?: string | null
  recipientBuilding?: string | null
  recipientApartment?: string | null
  seatsAmount?: number
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
  recipientStreet?: string | null
  recipientBuilding?: string | null
  recipientApartment?: string | null
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
  recipientStreet: string | null
  recipientBuilding: string | null
  recipientApartment: string | null
  recipientWarehouseRef: string | null
  recipientWarehouseName: string | null
  estimatedCost: string | null
  currency: 'UAH'
  isComplete: boolean
}

export type ResolvedCheckoutDeliverySelectionDto = {
  provider: ShippingProvider
  deliveryType: ShippingDeliveryType
  recipientName: string
  recipientPhone: string
  recipientCityRef: string
  recipientCityName: string
  recipientStreet: string | null
  recipientBuilding: string | null
  recipientApartment: string | null
  recipientWarehouseRef: string | null
  recipientWarehouseName: string | null
  estimatedCost: string | null
  currency: 'UAH'
}

export type ShipmentSnapshotDto = {
  id: string
  provider: ShippingProvider
  deliveryType: ShippingDeliveryType
  status: ShipmentStatus
  recipientCityRef: string
  recipientCityName: string
  recipientStreet: string | null
  recipientBuilding: string | null
  recipientApartment: string | null
  recipientWarehouseRef: string | null
  recipientWarehouseName: string | null
  trackingNumber: string | null
  isReturnShipment: boolean
  originalShipmentId: string | null
}

export type NovaPoshtaCreateShipmentInput = {
  shipmentId: string
  orderId: string
  deliveryType: ShippingDeliveryType
  senderName: string
  senderPhone: string
  senderCityRef: string
  senderCityName: string
  senderWarehouseRef: string
  senderWarehouseName: string
  recipientName: string
  recipientPhone: string
  recipientCityRef: string
  recipientCityName: string
  recipientStreet: string | null
  recipientBuilding: string | null
  recipientApartment: string | null
  recipientWarehouseRef: string | null
  recipientWarehouseName: string | null
  cargoDescription: string
  seatsAmount: number
  declaredCost: string
}

export type NovaPoshtaCreateShipmentDto = {
  trackingNumber: string
  providerShipmentId: string | null
  rawStatus: string | null
}

export type NovaPoshtaShipmentStatusDto = {
  trackingNumber: string | null
  providerShipmentId: string | null
  rawStatus: string | null
  internalStatus: ShipmentStatus
}

export type NovaPoshtaTrackingEventDto = {
  occurredAt: string | null
  description: string
  statusCode: string | null
}

export type ShipmentListQueryDto = {
  page: number
  limit: number
  status?: ShipmentStatus
}

export type BulkCreateShipmentTtnInput = {
  shipmentIds: string[]
}

export type BulkCreateShipmentTtnResultDto = {
  shipmentId: string
  success: boolean
  trackingNumber: string | null
  errorMessage: string | null
}

export type BulkCreateShipmentTtnResponseDto = {
  results: BulkCreateShipmentTtnResultDto[]
}

export type ShipmentSyncInput = {
  shipmentId?: string
  limit?: number
}

export type ShipmentSyncResultDto = {
  shipmentId: string
  previousStatus: ShipmentStatus
  currentStatus: ShipmentStatus
  trackingNumber: string | null
  changed: boolean
}

export type ShipmentSyncResponseDto = {
  results: ShipmentSyncResultDto[]
}

export type SellerShipmentItemDto = {
  orderItemId: string
  productNameSnapshot: string
  quantity: number
  fulfillmentStatus: string
}

export type SellerShipmentDto = {
  id: string
  orderId: string
  storeId: string
  storeName: string
  originalShipmentId: string | null
  provider: ShippingProvider
  deliveryType: ShippingDeliveryType
  status: ShipmentStatus
  isReturnShipment: boolean
  recipientName: string
  recipientPhone: string
  recipientCityRef: string
  recipientCityName: string
  recipientStreet: string | null
  recipientBuilding: string | null
  recipientApartment: string | null
  recipientWarehouseRef: string | null
  recipientWarehouseName: string | null
  trackingNumber: string | null
  providerShipmentId: string | null
  estimatedCost: string | null
  currency: string
  createdAt: string
  updatedAt: string
  items: SellerShipmentItemDto[]
}

export type SellerShipmentListDto = {
  items: SellerShipmentDto[]
  page: number
  limit: number
  total: number
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
  recipientStreet: string | null
  recipientBuilding: string | null
  recipientApartment: string | null
  recipientWarehouseRef: string | null
  recipientWarehouseName: string | null
  estimatedCost: string | null
  currency: 'UAH'
  items: Array<{
    orderItemId: string
    quantity: number
  }>
}
