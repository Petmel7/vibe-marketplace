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
  senderCounterpartyRef: string | null
  senderContactRef: string | null
  senderAddressRef: string | null
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
  recipientFirstName?: string | null
  recipientLastName?: string | null
  recipientMiddleName?: string | null
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
  recipientFirstName: string | null
  recipientLastName: string | null
  recipientMiddleName: string | null
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
  recipientFirstName: string
  recipientLastName: string
  recipientMiddleName: string | null
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
  senderCounterpartyRef: string
  senderContactRef: string
  senderAddressRef: string | null
  recipientName: string
  recipientFirstName: string
  recipientLastName: string
  recipientMiddleName: string | null
  recipientPhone: string
  recipientCityRef: string
  recipientCityName: string
  recipientStreet: string | null
  recipientBuilding: string | null
  recipientApartment: string | null
  recipientWarehouseRef: string | null
  recipientWarehouseName: string | null
  recipientCounterpartyRef: string
  recipientContactRef: string
  cargoDescription: string
  weight: string
  volumeGeneral: string
  seatsAmount: number
  declaredCost: string
}

export type NovaPoshtaCounterpartyDto = {
  ref: string
  name: string | null
  phone: string | null
}

export type NovaPoshtaContactPersonDto = {
  ref: string
  name: string | null
  phone: string | null
}

export type NovaPoshtaSenderCounterpartyDebugDto = {
  ref: string
  description: string | null
  firstName: string | null
  lastName: string | null
}

export type NovaPoshtaSenderContactDebugDto = {
  ref: string
  fullName: string | null
  phones: string | null
}

export type NovaPoshtaSenderAddressDebugDto = {
  ref: string
  name: string
  cityRef: string
  cityName: string | null
}

export type NovaPoshtaSenderCounterpartyAddressDebugDto = {
  ref: string
  description: string | null
  cityRef: string | null
  cityName: string | null
}

export type AdminNovaPoshtaSenderDiagnosticsQueryDto = {
  senderRef?: string
  cityRef?: string
  cityName?: string
}

export type NovaPoshtaPlatformSenderEnvSuggestionDto = {
  NOVA_POSHTA_PLATFORM_SENDER_COUNTERPARTY_REF: string | null
  NOVA_POSHTA_PLATFORM_SENDER_CONTACT_REF: string | null
  NOVA_POSHTA_PLATFORM_SENDER_ADDRESS_REF: string | null
  NOVA_POSHTA_PLATFORM_SENDER_CITY_REF: string | null
  NOVA_POSHTA_PLATFORM_SENDER_PHONE: string | null
}

export type AdminNovaPoshtaSenderDiagnosticsDto = {
  senderCounterparties: NovaPoshtaSenderCounterpartyDebugDto[]
  senderContacts: NovaPoshtaSenderContactDebugDto[]
  senderCounterpartyAddresses: NovaPoshtaSenderCounterpartyAddressDebugDto[]
  senderCounterpartyAddressesLookupError: string | null
  citySearchResults: NovaPoshtaCityDto[]
  inferredCityRefs: string[]
  selectedCityRef: string | null
  senderAddresses: NovaPoshtaSenderAddressDebugDto[]
  envSuggestion: NovaPoshtaPlatformSenderEnvSuggestionDto
}

export type NovaPoshtaResolvedSenderProfileDto = {
  counterpartyRef: string
  contactRef: string
  addressRef: string | null
}

export type NovaPoshtaResolvedRecipientProfileDto = {
  counterpartyRef: string
  contactRef: string
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
  storeId?: string
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
  recipientFirstName: string | null
  recipientLastName: string | null
  recipientMiddleName: string | null
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
  recipientFirstName: string
  recipientLastName: string
  recipientMiddleName: string | null
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
