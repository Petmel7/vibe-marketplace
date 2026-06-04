export const SHIPPING_DELIVERY_TYPES = [
  'NOVA_POSHTA_WAREHOUSE',
  'NOVA_POSHTA_COURIER',
] as const
export const SHIPPING_PROVIDERS = ['NOVA_POSHTA', 'MANUAL'] as const
export const SHIPMENT_STATUSES = [
  'PENDING',
  'READY_TO_SHIP',
  'LABEL_CREATED',
  'SHIPPED',
  'IN_TRANSIT',
  'ARRIVED',
  'DELIVERED',
  'FAILED',
  'CANCELLED',
  'RETURNED',
] as const

export type ShippingDeliveryType = (typeof SHIPPING_DELIVERY_TYPES)[number]
export type ShippingProvider = (typeof SHIPPING_PROVIDERS)[number]
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number]
export type CheckoutDeliveryMode = 'ADDRESS' | 'NOVA_POSHTA'

export type NovaPoshtaCity = {
  ref: string
  name: string
  area: string | null
  settlementType: string | null
}

export type NovaPoshtaWarehouse = {
  ref: string
  name: string
  cityRef: string
  cityName: string | null
}

export type CheckoutDeliverySelection = {
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

export type StoreShippingSettings = {
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
  createdAt: string | null
  updatedAt: string | null
}

export type OrderShipment = {
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
  estimatedCost?: string | null
  currency?: string | null
  trackingNumber: string | null
  isReturnShipment: boolean
  originalShipmentId: string | null
}

export type SellerShipmentItem = {
  orderItemId: string
  productNameSnapshot: string
  quantity: number
  fulfillmentStatus: string
}

export type SellerShipment = {
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
  items: SellerShipmentItem[]
}

export type SellerShipmentList = {
  items: SellerShipment[]
  page: number
  limit: number
  total: number
}

export type BulkCreateShipmentTtnResult = {
  shipmentId: string
  success: boolean
  trackingNumber: string | null
  errorMessage: string | null
}

export type BulkCreateShipmentTtnResponse = {
  results: BulkCreateShipmentTtnResult[]
}

export type ShipmentSyncResult = {
  shipmentId: string
  previousStatus: ShipmentStatus
  currentStatus: ShipmentStatus
  trackingNumber: string | null
  changed: boolean
}

export type ShipmentSyncResponse = {
  results: ShipmentSyncResult[]
}

export type NovaPoshtaDeliveryEstimate = {
  estimatedCost: string | null
  currency: 'UAH'
}

export function getShippingProviderLabel(provider: ShippingProvider) {
  switch (provider) {
    case 'NOVA_POSHTA':
      return 'Нова Пошта'
    case 'MANUAL':
      return 'Ручна доставка'
  }
}

export function getShippingDeliveryTypeLabel(deliveryType: ShippingDeliveryType) {
  switch (deliveryType) {
    case 'NOVA_POSHTA_WAREHOUSE':
      return 'Нова Пошта: відділення / поштомат'
    case 'NOVA_POSHTA_COURIER':
      return 'Нова Пошта: кур’єр'
  }
}

export function getShipmentStatusLabel(status: ShipmentStatus) {
  switch (status) {
    case 'PENDING':
      return 'Очікує обробки'
    case 'READY_TO_SHIP':
      return 'Готово до відправлення'
    case 'LABEL_CREATED':
      return 'Накладну створено'
    case 'SHIPPED':
      return 'Відправлено'
    case 'IN_TRANSIT':
      return 'У дорозі'
    case 'ARRIVED':
      return 'Прибуло'
    case 'DELIVERED':
      return 'Доставлено'
    case 'FAILED':
      return 'Помилка доставки'
    case 'CANCELLED':
      return 'Скасовано'
    case 'RETURNED':
      return 'Повернуто'
  }
}

export function getShipmentStatusDescription(status: ShipmentStatus) {
  switch (status) {
    case 'PENDING':
      return 'Продавець готує відправлення'
    case 'READY_TO_SHIP':
      return 'Відправлення готове до створення ТТН'
    case 'LABEL_CREATED':
      return 'ТТН створено, очікуємо передачу до Nova Poshta'
    case 'SHIPPED':
      return 'Відправлення передано до служби доставки'
    case 'IN_TRANSIT':
      return 'Посилка рухається до міста отримувача'
    case 'ARRIVED':
      return 'Відправлення прибуло до точки отримання'
    case 'DELIVERED':
      return 'Відправлення вручено покупцю'
    case 'FAILED':
      return 'Виникла проблема з відправленням'
    case 'CANCELLED':
      return 'Відправлення скасовано'
    case 'RETURNED':
      return 'Відправлення повертається відправнику'
  }
}

export function getShipmentDestinationLabel(
  shipment: Pick<
    OrderShipment | SellerShipment,
    | 'deliveryType'
    | 'recipientWarehouseName'
    | 'recipientStreet'
    | 'recipientBuilding'
    | 'recipientApartment'
  >,
) {
  if (
    shipment.deliveryType === 'NOVA_POSHTA_COURIER' &&
    shipment.recipientStreet &&
    shipment.recipientBuilding
  ) {
    return `${shipment.recipientStreet}, ${shipment.recipientBuilding}${
      shipment.recipientApartment ? `, кв. ${shipment.recipientApartment}` : ''
    }`
  }

  return shipment.recipientWarehouseName ?? 'Уточнюється'
}

export function canCreateShipmentTtn(
  shipment: Pick<
    SellerShipment,
    'provider' | 'status' | 'trackingNumber' | 'providerShipmentId'
  >,
  isShippingConfigured: boolean,
) {
  return (
    isShippingConfigured &&
    shipment.provider === 'NOVA_POSHTA' &&
    (shipment.status === 'PENDING' || shipment.status === 'READY_TO_SHIP') &&
    !shipment.trackingNumber &&
    !shipment.providerShipmentId
  )
}

export function canRefreshShipmentStatus(
  shipment: Pick<SellerShipment, 'provider' | 'trackingNumber' | 'status'>,
) {
  return (
    shipment.provider === 'NOVA_POSHTA' &&
    Boolean(shipment.trackingNumber) &&
    shipment.status !== 'CANCELLED' &&
    shipment.status !== 'FAILED'
  )
}

export function canCancelShipment(
  shipment: Pick<SellerShipment, 'provider' | 'status'>,
) {
  return (
    shipment.provider === 'NOVA_POSHTA' &&
    (shipment.status === 'PENDING' ||
      shipment.status === 'READY_TO_SHIP' ||
      shipment.status === 'LABEL_CREATED' ||
      shipment.status === 'FAILED')
  )
}

export function canCreateReturnShipment(
  shipment: Pick<SellerShipment, 'isReturnShipment' | 'originalShipmentId' | 'status'>,
) {
  return (
    !shipment.isReturnShipment &&
    !shipment.originalShipmentId &&
    (shipment.status === 'ARRIVED' ||
      shipment.status === 'DELIVERED' ||
      shipment.status === 'FAILED')
  )
}
