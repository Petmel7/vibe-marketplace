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
  recipientWarehouseRef: string | null
  recipientWarehouseName: string | null
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
  recipientWarehouseRef: string | null
  recipientWarehouseName: string | null
  trackingNumber: string | null
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
      return 'Нова Пошта: курʼєр'
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
