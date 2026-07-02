import {
  NotificationType,
  ShipmentStatus,
  ShippingDeliveryType,
  ShippingProvider,
} from '@/app/generated/prisma/client'
import { getServerEnv } from '@/config/env'
import Decimal from 'decimal.js'
import { recordAdminAudit } from '@/features/admin/audit/admin-audit'
import { requireAdmin, requireSeller } from '@/lib/auth/guards'
import {
  assertStoreOwnership,
  resolveSellerStoreContext,
} from '@/features/store/store.service'
import {
  InvalidShippingSelectionError,
  NovaPoshtaCreateShipmentError,
  NovaPoshtaWarehouseNotFoundError,
  ShipmentAlreadyReturnedError,
  ShipmentAlreadyHasTrackingError,
  ShipmentInvalidStateError,
  ShipmentNotFoundError,
  ShipmentReturnCreationError,
  ShipmentSyncError,
  ShippingProviderError,
  StoreShippingSettingsRequiredError,
} from '@/lib/errors/shipping'
import { createOrderNotification } from '@/features/notifications/notifications.service'
import { logError, logInfo, logWarn } from '@/utils/logger'
import type { SessionUser } from '@/features/auth/auth.dto'
import type {
  AdminNovaPoshtaSenderDiagnosticsDto,
  AdminNovaPoshtaSenderDiagnosticsQueryDto,
  CheckoutDeliverySelectionDto,
  CheckoutDeliverySelectionInput,
  BulkCreateShipmentTtnResponseDto,
  NovaPoshtaEstimateDto,
  NovaPoshtaEstimateInput,
  NovaPoshtaCityDto,
  NovaPoshtaResolvedRecipientProfileDto,
  NovaPoshtaWarehouseDto,
  ResolvedCheckoutDeliverySelectionDto,
  SellerShipmentDto,
  SellerShipmentListDto,
  ShipmentSyncResponseDto,
  ShipmentDraftDto,
  ShipmentDraftInputItem,
  ShipmentListQueryDto,
  ShipmentSyncResultDto,
  StoreShippingSettingsDto,
  UpdateStoreShippingSettingsInput,
} from './shipping.dto'
import {
  countShipmentsByStoreId,
  createReturnShipment,
  findShipmentById,
  findStoreShippingSettingsByStoreId,
  listStoreShippingSettingsByStoreIds,
  listTrackableShipments,
  listShipmentsByStoreId,
  updateShipmentById,
  upsertStoreShippingSettings,
} from './shipping.repository'
import { getNovaPoshtaProvider } from './providers/nova-poshta.provider'
import { requiredCheckoutDeliverySelectionSchema } from './shipping.schema'

const TTN_CREATABLE_SHIPMENT_STATUSES = new Set<ShipmentStatus>([
  ShipmentStatus.PENDING,
  ShipmentStatus.READY_TO_SHIP,
])

const SHIPMENT_CANCELLABLE_STATUSES = new Set<ShipmentStatus>([
  ShipmentStatus.PENDING,
  ShipmentStatus.READY_TO_SHIP,
  ShipmentStatus.LABEL_CREATED,
  ShipmentStatus.FAILED,
])

const BUYER_VISIBLE_STATUS_NOTIFICATIONS = new Set<ShipmentStatus>([
  ShipmentStatus.SHIPPED,
  ShipmentStatus.IN_TRANSIT,
  ShipmentStatus.ARRIVED,
  ShipmentStatus.DELIVERED,
  ShipmentStatus.RETURNED,
  ShipmentStatus.FAILED,
])

const SELLER_VISIBLE_STATUS_NOTIFICATIONS = new Set<ShipmentStatus>([
  ShipmentStatus.SHIPPED,
  ShipmentStatus.ARRIVED,
  ShipmentStatus.DELIVERED,
  ShipmentStatus.RETURNED,
  ShipmentStatus.FAILED,
])

const TRACKING_SYNCABLE_SHIPMENT_STATUSES = new Set<ShipmentStatus>([
  ShipmentStatus.READY_TO_SHIP,
  ShipmentStatus.LABEL_CREATED,
  ShipmentStatus.SHIPPED,
  ShipmentStatus.IN_TRANSIT,
  ShipmentStatus.ARRIVED,
])

function runNonBlocking(label: string, task: Promise<unknown>) {
  void task.catch((error) => {
    logError(label, error)
  })
}

function resolveAuditActorRole(user: SessionUser) {
  return user.roles[0] ?? null
}

function toStoreShippingSettingsDto(input: {
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
}): StoreShippingSettingsDto {
  const normalize = (value: string | null) => (value && value.trim().length > 0 ? value : null)

  return {
    id: input.id,
    storeId: input.storeId,
    provider: input.provider,
    senderName: normalize(input.senderName),
    senderPhone: normalize(input.senderPhone),
    senderCityRef: normalize(input.senderCityRef),
    senderCityName: normalize(input.senderCityName),
    senderWarehouseRef: normalize(input.senderWarehouseRef),
    senderWarehouseName: normalize(input.senderWarehouseName),
    senderCounterpartyRef: normalize(input.senderCounterpartyRef),
    senderContactRef: normalize(input.senderContactRef),
    senderAddressRef: normalize(input.senderAddressRef),
    isConfigured: input.isConfigured,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  }
}

function toSellerShipmentDto(
  shipment: NonNullable<Awaited<ReturnType<typeof findShipmentById>>>,
): SellerShipmentDto {
  return {
    id: shipment.id,
    orderId: shipment.orderId,
    storeId: shipment.storeId,
    storeName: shipment.store.name,
    originalShipmentId: shipment.originalShipmentId,
    provider: shipment.provider,
    deliveryType: shipment.deliveryType,
    status: shipment.status,
    isReturnShipment: shipment.isReturnShipment,
    recipientName: shipment.recipientName,
    recipientFirstName: shipment.recipientFirstName,
    recipientLastName: shipment.recipientLastName,
    recipientMiddleName: shipment.recipientMiddleName,
    recipientPhone: shipment.recipientPhone,
    recipientCityRef: shipment.recipientCityRef,
    recipientCityName: shipment.recipientCityName,
    recipientStreet: shipment.recipientStreet,
    recipientBuilding: shipment.recipientBuilding,
    recipientApartment: shipment.recipientApartment,
    recipientWarehouseRef: shipment.recipientWarehouseRef,
    recipientWarehouseName: shipment.recipientWarehouseName,
    trackingNumber: shipment.trackingNumber,
    providerShipmentId: shipment.providerShipmentId,
    estimatedCost: shipment.estimatedCost?.toString() ?? null,
    currency: shipment.currency,
    createdAt: shipment.createdAt.toISOString(),
    updatedAt: shipment.updatedAt.toISOString(),
    items: shipment.items.map((item) => ({
      orderItemId: item.orderItemId,
      productNameSnapshot: item.orderItem.productNameSnapshot,
      quantity: item.quantity,
      fulfillmentStatus: item.orderItem.fulfillmentStatus,
    })),
  }
}

function buildStructuredRecipientName(input: {
  recipientFirstName?: string | null
  recipientLastName?: string | null
  recipientMiddleName?: string | null
}) {
  return [
    input.recipientLastName?.trim() ?? '',
    input.recipientFirstName?.trim() ?? '',
    input.recipientMiddleName?.trim() ?? '',
  ]
    .filter(Boolean)
    .join(' ')
}

function splitLegacyRecipientName(recipientName: string) {
  const parts = recipientName
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length < 2) {
    return {
      recipientFirstName: null,
      recipientLastName: null,
      recipientMiddleName: null,
    }
  }

  return {
    recipientLastName: parts[0] ?? null,
    recipientFirstName: parts[1] ?? null,
    recipientMiddleName: parts.slice(2).join(' ') || null,
  }
}

function resolveStructuredRecipientName(input: {
  recipientName: string
  recipientFirstName?: string | null
  recipientLastName?: string | null
  recipientMiddleName?: string | null
}) {
  const recipientFirstName = input.recipientFirstName?.trim() || null
  const recipientLastName = input.recipientLastName?.trim() || null
  const recipientMiddleName = input.recipientMiddleName?.trim() || null

  if (recipientFirstName && recipientLastName) {
    return {
      recipientFirstName,
      recipientLastName,
      recipientMiddleName,
      recipientName:
        buildStructuredRecipientName({
          recipientFirstName,
          recipientLastName,
          recipientMiddleName,
        }) || input.recipientName.trim(),
    }
  }

  const legacy = splitLegacyRecipientName(input.recipientName)

  return {
    recipientFirstName: legacy.recipientFirstName,
    recipientLastName: legacy.recipientLastName,
    recipientMiddleName: legacy.recipientMiddleName,
    recipientName: input.recipientName.trim(),
  }
}

function hasBaseSenderConfiguration(input: UpdateStoreShippingSettingsInput) {
  return Boolean(
    input.senderName?.trim() &&
      input.senderPhone?.trim() &&
      input.senderCityRef?.trim() &&
      input.senderCityName?.trim() &&
      input.senderWarehouseRef?.trim() &&
      input.senderWarehouseName?.trim(),
  )
}

function resolveShipmentWeight() {
  return '1'
}

function resolveShipmentVolumeGeneral() {
  return '0.001'
}

function resolveShipmentSeatsAmount(
  shipment: NonNullable<Awaited<ReturnType<typeof findShipmentById>>>,
) {
  return Math.max(
    1,
    shipment.items.reduce((sum, item) => sum + item.quantity, 0),
  )
}

function getMissingPlatformSenderMessage() {
  return 'Nova Poshta platform sender is not configured. Set platform sender refs before creating TTN.'
}

function getMissingStoreShippingSettingsMessage() {
  return 'Configured store shipping settings are required for this action'
}

function getPlatformSenderConfig() {
  const env = getServerEnv()

  return {
    counterpartyRef: env.NOVA_POSHTA_PLATFORM_SENDER_COUNTERPARTY_REF?.trim() ?? '',
    contactRef: env.NOVA_POSHTA_PLATFORM_SENDER_CONTACT_REF?.trim() ?? '',
    addressRef: env.NOVA_POSHTA_PLATFORM_SENDER_ADDRESS_REF?.trim() ?? '',
    cityRef: env.NOVA_POSHTA_PLATFORM_SENDER_CITY_REF?.trim() ?? '',
    phone: env.NOVA_POSHTA_PLATFORM_SENDER_PHONE?.trim() ?? '',
  }
}

function resolvePlatformSenderProfile() {
  const config = getPlatformSenderConfig()

  if (
    !config.counterpartyRef ||
    !config.contactRef ||
    !config.addressRef ||
    !config.cityRef ||
    !config.phone
  ) {
    throw new NovaPoshtaCreateShipmentError(getMissingPlatformSenderMessage(), {
      statusCode: 422,
    })
  }

  return config
}

function assertShipmentHasRecipientSnapshot(
  shipment: NonNullable<Awaited<ReturnType<typeof findShipmentById>>>,
) {
  const structuredName = resolveStructuredRecipientName({
    recipientName: shipment.recipientName,
    recipientFirstName: shipment.recipientFirstName,
    recipientLastName: shipment.recipientLastName,
    recipientMiddleName: shipment.recipientMiddleName,
  })
  const hasBaseSnapshot =
    structuredName.recipientName &&
    structuredName.recipientFirstName &&
    structuredName.recipientLastName &&
    shipment.recipientPhone.trim() &&
    shipment.recipientCityRef.trim() &&
    shipment.recipientCityName.trim()

  if (!hasBaseSnapshot) {
    throw new ShipmentInvalidStateError('Shipment recipient snapshot is incomplete')
  }

  if (
    shipment.deliveryType === ShippingDeliveryType.NOVA_POSHTA_WAREHOUSE &&
    (!shipment.recipientWarehouseRef?.trim() || !shipment.recipientWarehouseName?.trim())
  ) {
    throw new ShipmentInvalidStateError('Shipment warehouse snapshot is incomplete')
  }

  if (
    shipment.deliveryType === ShippingDeliveryType.NOVA_POSHTA_COURIER &&
    (!shipment.recipientStreet?.trim() || !shipment.recipientBuilding?.trim())
  ) {
    throw new ShipmentInvalidStateError('Shipment courier address snapshot is incomplete')
  }
}

function assertShipmentHasItems(
  shipment: NonNullable<Awaited<ReturnType<typeof findShipmentById>>>,
) {
  if (shipment.items.length === 0) {
    throw new ShipmentInvalidStateError('Shipment does not contain order items')
  }
}

function assertShipmentCanCreateTtn(
  shipment: NonNullable<Awaited<ReturnType<typeof findShipmentById>>>,
) {
  if (shipment.provider !== ShippingProvider.NOVA_POSHTA) {
    throw new ShipmentInvalidStateError('Only Nova Poshta shipments can create TTNs')
  }

  if (shipment.trackingNumber || shipment.providerShipmentId) {
    throw new ShipmentAlreadyHasTrackingError()
  }

  if (!TTN_CREATABLE_SHIPMENT_STATUSES.has(shipment.status)) {
    throw new ShipmentInvalidStateError('Shipment status does not allow TTN creation')
  }
}

function assertShipmentCanCreateReturn(
  shipment: NonNullable<Awaited<ReturnType<typeof findShipmentById>>>,
) {
  if (shipment.isReturnShipment) {
    throw new ShipmentInvalidStateError('Return shipment cannot create another return shipment')
  }

  if (shipment.returnShipments.length > 0) {
    throw new ShipmentAlreadyReturnedError()
  }

  if (
    shipment.status !== ShipmentStatus.ARRIVED &&
    shipment.status !== ShipmentStatus.DELIVERED &&
    shipment.status !== ShipmentStatus.FAILED
  ) {
    throw new ShipmentInvalidStateError('Shipment status does not allow return creation yet')
  }
}

function assertShipmentCanSync(
  shipment: NonNullable<Awaited<ReturnType<typeof findShipmentById>>>,
) {
  if (shipment.provider !== ShippingProvider.NOVA_POSHTA) {
    throw new ShipmentInvalidStateError('Only Nova Poshta shipments can sync status')
  }

  if (!shipment.trackingNumber?.trim()) {
    throw new ShipmentInvalidStateError('Shipment does not have a tracking number yet')
  }

  if (!TRACKING_SYNCABLE_SHIPMENT_STATUSES.has(shipment.status)) {
    throw new ShipmentInvalidStateError('Shipment status cannot be synchronized')
  }
}

function assertShipmentCanRefresh(
  shipment: NonNullable<Awaited<ReturnType<typeof findShipmentById>>>,
) {
  if (shipment.provider !== ShippingProvider.NOVA_POSHTA) {
    throw new ShipmentInvalidStateError('Only Nova Poshta shipments can refresh status')
  }

  if (!shipment.trackingNumber?.trim()) {
    throw new ShipmentInvalidStateError('Shipment does not have a tracking number yet')
  }

  if (
    shipment.status === ShipmentStatus.CANCELLED ||
    shipment.status === ShipmentStatus.FAILED
  ) {
    throw new ShipmentInvalidStateError('Shipment status cannot be refreshed anymore')
  }
}

function assertShipmentCanCancel(
  shipment: NonNullable<Awaited<ReturnType<typeof findShipmentById>>>,
) {
  if (shipment.provider !== ShippingProvider.NOVA_POSHTA) {
    throw new ShipmentInvalidStateError('Only Nova Poshta shipments can be cancelled')
  }

  if (!SHIPMENT_CANCELLABLE_STATUSES.has(shipment.status)) {
    throw new ShipmentInvalidStateError('Shipment status does not allow cancellation')
  }
}

function resolveShipmentCargoDescription(
  shipment: NonNullable<Awaited<ReturnType<typeof findShipmentById>>>,
) {
  const productNames = [...new Set(shipment.items.map((item) => item.orderItem.productNameSnapshot.trim()))]
    .filter(Boolean)
    .slice(0, 3)

  return productNames.join(', ') || `Shipment ${shipment.id}`
}

function resolveShipmentDeclaredCost(
  shipment: NonNullable<Awaited<ReturnType<typeof findShipmentById>>>,
) {
  const total = shipment.items.reduce((sum, item) => {
    const unitPrice = Number(item.orderItem.unitPriceSnapshot.toString())
    return sum + unitPrice * item.quantity
  }, 0)

  return Math.max(1, Math.round(total)).toString()
}

async function resolveRecipientProfile(
  shipment: NonNullable<Awaited<ReturnType<typeof findShipmentById>>>,
): Promise<NovaPoshtaResolvedRecipientProfileDto> {
  const structuredName = resolveStructuredRecipientName({
    recipientName: shipment.recipientName,
    recipientFirstName: shipment.recipientFirstName,
    recipientLastName: shipment.recipientLastName,
    recipientMiddleName: shipment.recipientMiddleName,
  })

  return getNovaPoshtaProvider().resolveRecipientProfile({
    recipientName: structuredName.recipientName,
    recipientFirstName: structuredName.recipientFirstName ?? '',
    recipientLastName: structuredName.recipientLastName ?? '',
    recipientMiddleName: structuredName.recipientMiddleName,
    recipientPhone: shipment.recipientPhone,
    recipientCityRef: shipment.recipientCityRef,
  })
}

async function getOwnedSellerShipment(
  user: SessionUser,
  shipmentId: string,
) {
  requireSeller(user)
  const shipment = await findShipmentById(shipmentId)
  if (!shipment) {
    throw new ShipmentNotFoundError()
  }

  const store = await assertStoreOwnership(user.id, shipment.storeId)

  return { store, shipment }
}

async function notifyBuyerAboutShipment(
  shipment: NonNullable<Awaited<ReturnType<typeof findShipmentById>>>,
  input: {
    title: string
    message: string
  },
) {
  return createOrderNotification({
    userId: shipment.order.userId,
    type: NotificationType.ORDER_SHIPPED,
    title: input.title,
    message: input.message,
    actionUrl: `/profile/orders/${shipment.orderId}`,
    metadata: {
      shipmentId: shipment.id,
      orderId: shipment.orderId,
      storeId: shipment.storeId,
      provider: shipment.provider,
      deliveryType: shipment.deliveryType,
      status: shipment.status,
      trackingNumber: shipment.trackingNumber,
    },
  })
}

async function notifySellerAboutShipment(
  shipment: NonNullable<Awaited<ReturnType<typeof findShipmentById>>>,
  input: {
    title: string
    message: string
  },
) {
  return createOrderNotification({
    userId: shipment.store.ownerId,
    type: NotificationType.ORDER_SHIPPED,
    title: input.title,
    message: input.message,
    actionUrl: `/seller/shipments/${shipment.id}`,
    metadata: {
      shipmentId: shipment.id,
      orderId: shipment.orderId,
      storeId: shipment.storeId,
      provider: shipment.provider,
      deliveryType: shipment.deliveryType,
      status: shipment.status,
      trackingNumber: shipment.trackingNumber,
      isSellerContext: true,
    },
  })
}

function getShipmentDestinationLabel(
  shipment: NonNullable<Awaited<ReturnType<typeof findShipmentById>>>,
) {
  if (
    shipment.deliveryType === ShippingDeliveryType.NOVA_POSHTA_COURIER &&
    shipment.recipientStreet &&
    shipment.recipientBuilding
  ) {
    return `${shipment.recipientStreet}, ${shipment.recipientBuilding}${
      shipment.recipientApartment ? `, кв. ${shipment.recipientApartment}` : ''
    }`
  }

  return shipment.recipientWarehouseName ?? 'відділення Нова Пошта'
}

function buildShipmentLifecycleNotificationCopy(
  shipment: NonNullable<Awaited<ReturnType<typeof findShipmentById>>>,
  status: ShipmentStatus,
) {
  const orderToken = shipment.orderId.slice(0, 8)
  const destinationLabel = getShipmentDestinationLabel(shipment)

  switch (status) {
    case ShipmentStatus.LABEL_CREATED:
      return {
        title: 'Створено ТТН для відправлення',
        message: `Для замовлення #${orderToken} створено ТТН ${shipment.trackingNumber ?? ''}. Відправлення буде доставлено у ${destinationLabel}.`.trim(),
      }
    case ShipmentStatus.SHIPPED:
      return {
        title: 'Замовлення передано на відправку',
        message: `Відправлення за замовленням #${orderToken} передано до Nova Poshta.`,
      }
    case ShipmentStatus.IN_TRANSIT:
      return {
        title: 'Відправлення в дорозі',
        message: `Відправлення за замовленням #${orderToken} вже в дорозі.`,
      }
    case ShipmentStatus.ARRIVED:
      return {
        title: 'Відправлення прибуло',
        message: `Відправлення за замовленням #${orderToken} прибуло до ${destinationLabel}.`,
      }
    case ShipmentStatus.DELIVERED:
      return {
        title: 'Відправлення вручено',
        message: `Відправлення за замовленням #${orderToken} позначено як доставлене.`,
      }
    case ShipmentStatus.RETURNED:
      return {
        title: 'Відправлення повернуто',
        message: `Відправлення за замовленням #${orderToken} повернуто назад.`,
      }
    case ShipmentStatus.FAILED:
      return {
        title: 'Проблема з відправленням',
        message: `У Nova Poshta виникла проблема з відправленням #${orderToken}. Ми вже перевіряємо деталі.`,
      }
    default:
      return null
  }
}

function buildShipmentStatusNotificationCopy(
  shipment: NonNullable<Awaited<ReturnType<typeof findShipmentById>>>,
  status: ShipmentStatus,
) {
  const orderToken = shipment.orderId.slice(0, 8)
  const warehouseLabel = shipment.recipientWarehouseName ?? 'відділення Нова Пошта'

  switch (status) {
    case ShipmentStatus.LABEL_CREATED:
      return {
        title: 'Створено ТТН для відправлення',
        message: `Для замовлення #${orderToken} створено ТТН ${shipment.trackingNumber ?? ''}. Відправлення буде доставлено у ${warehouseLabel}.`.trim(),
      }
    case ShipmentStatus.SHIPPED:
      return {
        title: 'Замовлення передано на відправку',
        message: `Відправлення за замовленням #${orderToken} передано до Nova Poshta.`,
      }
    case ShipmentStatus.IN_TRANSIT:
      return {
        title: 'Відправлення в дорозі',
        message: `Відправлення за замовленням #${orderToken} вже в дорозі.`,
      }
    case ShipmentStatus.ARRIVED:
      return {
        title: 'Відправлення прибуло',
        message: `Відправлення за замовленням #${orderToken} прибуло до ${warehouseLabel}.`,
      }
    case ShipmentStatus.DELIVERED:
      return {
        title: 'Відправлення вручено',
        message: `Відправлення за замовленням #${orderToken} позначено як доставлене.`,
      }
    default:
      return null
  }
}

export function buildCheckoutDeliverySelectionDto(
  input: CheckoutDeliverySelectionInput,
): CheckoutDeliverySelectionDto {
  const selectedDeliveryType = input.deliveryType ?? null
  const recipientFirstName = input.recipientFirstName?.trim() || null
  const recipientLastName = input.recipientLastName?.trim() || null
  const recipientMiddleName = input.recipientMiddleName?.trim() || null
  const recipientName =
    buildStructuredRecipientName({
      recipientFirstName,
      recipientLastName,
      recipientMiddleName,
    }) ||
    input.recipientName?.trim() ||
    null
  const recipientPhone = input.recipientPhone?.trim() || null
  const recipientCityRef = input.recipientCityRef?.trim() || null
  const recipientCityName = input.recipientCityName?.trim() || null
  const recipientStreet = input.recipientStreet?.trim() || null
  const recipientBuilding = input.recipientBuilding?.trim() || null
  const recipientApartment = input.recipientApartment?.trim() || null
  const recipientWarehouseRef = input.recipientWarehouseRef?.trim() || null
  const recipientWarehouseName = input.recipientWarehouseName?.trim() || null
  const isWarehouse = selectedDeliveryType === ShippingDeliveryType.NOVA_POSHTA_WAREHOUSE
  const isCourier = selectedDeliveryType === ShippingDeliveryType.NOVA_POSHTA_COURIER

  return {
    supportedDeliveryTypes: [
      ShippingDeliveryType.NOVA_POSHTA_WAREHOUSE,
      ShippingDeliveryType.NOVA_POSHTA_COURIER,
    ],
    selectedDeliveryType,
    recipientName,
    recipientFirstName,
    recipientLastName,
    recipientMiddleName,
    recipientPhone,
    recipientCityRef,
    recipientCityName,
    recipientStreet,
    recipientBuilding,
    recipientApartment,
    recipientWarehouseRef,
    recipientWarehouseName,
    estimatedCost: null,
    currency: 'UAH',
    isComplete: Boolean(
      selectedDeliveryType &&
        recipientFirstName &&
        recipientLastName &&
        recipientPhone &&
        recipientCityRef &&
        recipientCityName &&
        ((isWarehouse && recipientWarehouseRef && recipientWarehouseName) ||
          (isCourier && recipientStreet && recipientBuilding)),
    ),
  }
}

export async function searchNovaPoshtaCities(query: string): Promise<NovaPoshtaCityDto[]> {
  const normalizedQuery = query.trim()
  if (normalizedQuery.length < 2) {
    return []
  }

  return getNovaPoshtaProvider().searchCities(normalizedQuery)
}

export async function getNovaPoshtaWarehouses(cityRef: string): Promise<NovaPoshtaWarehouseDto[]> {
  return getNovaPoshtaProvider().getWarehouses(cityRef)
}

export async function estimateNovaPoshtaDelivery(
  input: NovaPoshtaEstimateInput,
): Promise<NovaPoshtaEstimateDto> {
  return getNovaPoshtaProvider().estimateDelivery(input)
}

export async function getMyStoreShippingSettings(
  user: SessionUser,
  storeId?: string,
): Promise<StoreShippingSettingsDto> {
  const store = await resolveSellerStoreContext(user, storeId)

  const settings = await findStoreShippingSettingsByStoreId(store.id)
  return toStoreShippingSettingsDto({
    id: settings?.id ?? null,
    storeId: store.id,
    provider: settings?.provider ?? ShippingProvider.NOVA_POSHTA,
    senderName: settings?.senderName ?? null,
    senderPhone: settings?.senderPhone ?? null,
    senderCityRef: settings?.senderCityRef ?? null,
    senderCityName: settings?.senderCityName ?? null,
    senderWarehouseRef: settings?.senderWarehouseRef ?? null,
    senderWarehouseName: settings?.senderWarehouseName ?? null,
    senderCounterpartyRef: settings?.senderCounterpartyRef ?? null,
    senderContactRef: settings?.senderContactRef ?? null,
    senderAddressRef: settings?.senderAddressRef ?? null,
    isConfigured: settings?.isConfigured ?? false,
    createdAt: settings?.createdAt ?? null,
    updatedAt: settings?.updatedAt ?? null,
  })
}

export async function updateMyStoreShippingSettings(
  user: SessionUser,
  data: UpdateStoreShippingSettingsInput,
  storeId?: string,
): Promise<StoreShippingSettingsDto> {
  const store = await resolveSellerStoreContext(user, storeId)
  const normalizedInput: Required<UpdateStoreShippingSettingsInput> = {
    provider: data.provider ?? ShippingProvider.NOVA_POSHTA,
    senderName: data.senderName?.trim() ?? null,
    senderPhone: data.senderPhone?.trim() ?? null,
    senderCityRef: data.senderCityRef?.trim() ?? null,
    senderCityName: data.senderCityName?.trim() ?? null,
    senderWarehouseRef: data.senderWarehouseRef?.trim() ?? null,
    senderWarehouseName: data.senderWarehouseName?.trim() ?? null,
  }

  logInfo('shipping:update-store-settings-before-save', {
    domain: 'shipping',
    storeId: store.id,
    hasSenderName: Boolean(normalizedInput.senderName),
    hasSenderPhone: Boolean(normalizedInput.senderPhone),
    hasSenderCityRef: Boolean(normalizedInput.senderCityRef),
    hasSenderWarehouseRef: Boolean(normalizedInput.senderWarehouseRef),
  })

  logInfo('shipping:update-store-settings-before-db-upsert', {
    domain: 'shipping',
    storeId: store.id,
    isConfigured: hasBaseSenderConfiguration(normalizedInput),
  })

  const settings = await upsertStoreShippingSettings({
    storeId: store.id,
    provider: normalizedInput.provider ?? ShippingProvider.NOVA_POSHTA,
    senderName: normalizedInput.senderName,
    senderPhone: normalizedInput.senderPhone,
    senderCityRef: normalizedInput.senderCityRef,
    senderCityName: normalizedInput.senderCityName,
    senderWarehouseRef: normalizedInput.senderWarehouseRef,
    senderWarehouseName: normalizedInput.senderWarehouseName,
    senderCounterpartyRef: null,
    senderContactRef: null,
    senderAddressRef: null,
    isConfigured: hasBaseSenderConfiguration(normalizedInput),
  })

  return toStoreShippingSettingsDto({
    id: settings.id,
    storeId: settings.storeId,
    provider: settings.provider,
    senderName: settings.senderName,
    senderPhone: settings.senderPhone,
    senderCityRef: settings.senderCityRef,
    senderCityName: settings.senderCityName,
    senderWarehouseRef: settings.senderWarehouseRef,
    senderWarehouseName: settings.senderWarehouseName,
    senderCounterpartyRef: settings.senderCounterpartyRef,
    senderContactRef: settings.senderContactRef,
    senderAddressRef: settings.senderAddressRef,
    isConfigured: settings.isConfigured,
    createdAt: settings.createdAt,
    updatedAt: settings.updatedAt,
  })
}

export async function resolveCheckoutDeliverySelection(
  input: CheckoutDeliverySelectionInput,
): Promise<ResolvedCheckoutDeliverySelectionDto | null> {
  const selection = buildCheckoutDeliverySelectionDto(input)
  if (!selection.selectedDeliveryType) {
    return null
  }

  const parsed = requiredCheckoutDeliverySelectionSchema.safeParse({
    deliveryType: selection.selectedDeliveryType,
    recipientName: selection.recipientName,
    recipientFirstName: selection.recipientFirstName,
    recipientLastName: selection.recipientLastName,
    recipientMiddleName: selection.recipientMiddleName,
    recipientPhone: selection.recipientPhone,
    recipientCityRef: selection.recipientCityRef,
    recipientCityName: selection.recipientCityName,
    recipientStreet: selection.recipientStreet,
    recipientBuilding: selection.recipientBuilding,
    recipientApartment: selection.recipientApartment,
    recipientWarehouseRef: selection.recipientWarehouseRef,
    recipientWarehouseName: selection.recipientWarehouseName,
  })

  if (!parsed.success) {
    throw new InvalidShippingSelectionError('Nova Poshta delivery selection is incomplete')
  }

  if (parsed.data.deliveryType === ShippingDeliveryType.NOVA_POSHTA_WAREHOUSE) {
    const warehouses = await getNovaPoshtaProvider().assertCityHasWarehouses(parsed.data.recipientCityRef)
    const matchedWarehouse = warehouses.find(
      (warehouse) => warehouse.ref === parsed.data.recipientWarehouseRef,
    )

    if (!matchedWarehouse) {
      throw new NovaPoshtaWarehouseNotFoundError()
    }
  }

  return {
    provider: ShippingProvider.NOVA_POSHTA,
    deliveryType: parsed.data.deliveryType,
    recipientName:
      buildStructuredRecipientName({
        recipientFirstName: parsed.data.recipientFirstName,
        recipientLastName: parsed.data.recipientLastName,
        recipientMiddleName: parsed.data.recipientMiddleName,
      }) || parsed.data.recipientName?.trim() || '',
    recipientFirstName: parsed.data.recipientFirstName,
    recipientLastName: parsed.data.recipientLastName,
    recipientMiddleName: parsed.data.recipientMiddleName?.trim() ?? null,
    recipientPhone: parsed.data.recipientPhone,
    recipientCityRef: parsed.data.recipientCityRef,
    recipientCityName: parsed.data.recipientCityName,
    recipientStreet: parsed.data.recipientStreet?.trim() ?? null,
    recipientBuilding: parsed.data.recipientBuilding?.trim() ?? null,
    recipientApartment: parsed.data.recipientApartment?.trim() ?? null,
    recipientWarehouseRef: parsed.data.recipientWarehouseRef?.trim() ?? null,
    recipientWarehouseName: parsed.data.recipientWarehouseName?.trim() ?? null,
    estimatedCost: null,
    currency: 'UAH',
  }
}

export async function estimateCheckoutDeliveryTotal(input: {
  orderItems: ShipmentDraftInputItem[]
  deliverySelection: ResolvedCheckoutDeliverySelectionDto
}): Promise<NovaPoshtaEstimateDto> {
  const drafts = buildShipmentDrafts({
    orderItems: input.orderItems,
    deliverySelection: input.deliverySelection,
  })

  if (drafts.length === 0) {
    return { estimatedCost: '0.00', currency: 'UAH' }
  }

  const settings = await listStoreShippingSettingsByStoreIds(drafts.map((draft) => draft.storeId))
  const settingsByStoreId = new Map(settings.map((setting) => [setting.storeId, setting]))

  const estimates = await Promise.all(
    drafts.map(async (draft) => {
      const storeSettings = settingsByStoreId.get(draft.storeId)
      return estimateNovaPoshtaDelivery({
        deliveryType: draft.deliveryType,
        senderCityRef: storeSettings?.senderCityRef ?? null,
        senderWarehouseRef: storeSettings?.senderWarehouseRef ?? null,
        recipientCityRef: draft.recipientCityRef,
        recipientWarehouseRef: draft.recipientWarehouseRef,
        recipientStreet: draft.recipientStreet,
        recipientBuilding: draft.recipientBuilding,
        recipientApartment: draft.recipientApartment,
        seatsAmount: draft.items.reduce((sum, item) => sum + item.quantity, 0),
      })
    }),
  )

  const total = estimates.reduce(
    (sum, estimate) => sum.plus(estimate.estimatedCost ?? '0'),
    new Decimal(0),
  )

  return {
    estimatedCost: total.toFixed(2),
    currency: 'UAH',
  }
}

async function getShipmentByIdOrThrow(shipmentId: string) {
  const shipment = await findShipmentById(shipmentId)
  if (!shipment) {
    throw new ShipmentNotFoundError()
  }

  return shipment
}

async function getAdminShipment(shipmentId: string) {
  return getShipmentByIdOrThrow(shipmentId)
}

async function syncShipmentRecord(
  shipment: NonNullable<Awaited<ReturnType<typeof findShipmentById>>>,
): Promise<ShipmentSyncResultDto> {
  assertShipmentCanSync(shipment)

  const status = await getNovaPoshtaProvider().getShipmentStatus({
    trackingNumber: shipment.trackingNumber!,
  })

  const statusChanged = shipment.status !== status.internalStatus
  const providerShipmentChanged =
    status.providerShipmentId != null && shipment.providerShipmentId !== status.providerShipmentId
  const trackingChanged =
    status.trackingNumber != null && shipment.trackingNumber !== status.trackingNumber

  const updated =
    statusChanged || providerShipmentChanged || trackingChanged
      ? await updateShipmentById({
          id: shipment.id,
          status: status.internalStatus,
          providerShipmentId: status.providerShipmentId ?? shipment.providerShipmentId,
          trackingNumber: status.trackingNumber ?? shipment.trackingNumber,
        })
      : shipment

  if (statusChanged) {
    const notificationCopy = buildShipmentLifecycleNotificationCopy(updated, updated.status)
    if (notificationCopy && BUYER_VISIBLE_STATUS_NOTIFICATIONS.has(updated.status)) {
      runNonBlocking(
        'shipping:sync-status:buyer-notification',
        notifyBuyerAboutShipment(updated, notificationCopy),
      )
    }
    if (notificationCopy && SELLER_VISIBLE_STATUS_NOTIFICATIONS.has(updated.status)) {
      runNonBlocking(
        'shipping:sync-status:seller-notification',
        notifySellerAboutShipment(updated, notificationCopy),
      )
    }
  }

  return {
    shipmentId: shipment.id,
    previousStatus: shipment.status,
    currentStatus: updated.status,
    trackingNumber: updated.trackingNumber,
    changed: statusChanged || providerShipmentChanged || trackingChanged,
  }
}

export async function getMyShipments(
  user: SessionUser,
  query: ShipmentListQueryDto,
): Promise<SellerShipmentListDto> {
  const store = await resolveSellerStoreContext(user, query.storeId)

  const [shipments, total] = await Promise.all([
    listShipmentsByStoreId({
      storeId: store.id,
      status: query.status,
      page: query.page,
      limit: query.limit,
    }),
    countShipmentsByStoreId({
      storeId: store.id,
      status: query.status,
    }),
  ])

  return {
    items: shipments.map(toSellerShipmentDto),
    page: query.page,
    limit: query.limit,
    total,
  }
}

export async function getMyShipmentById(
  user: SessionUser,
  shipmentId: string,
): Promise<SellerShipmentDto> {
  const { shipment } = await getOwnedSellerShipment(user, shipmentId)
  return toSellerShipmentDto(shipment)
}

export async function createMyShipmentTtn(
  user: SessionUser,
  shipmentId: string,
): Promise<SellerShipmentDto> {
  const { shipment, store } = await getOwnedSellerShipment(user, shipmentId)
  assertShipmentCanCreateTtn(shipment)
  assertShipmentHasRecipientSnapshot(shipment)
  assertShipmentHasItems(shipment)

  const settings = await findStoreShippingSettingsByStoreId(store.id)
  if (
    !settings ||
    !settings.senderName.trim() ||
    !settings.senderPhone.trim() ||
    !settings.senderCityRef.trim() ||
    !settings.senderCityName.trim() ||
    !settings.senderWarehouseRef?.trim() ||
    !settings.senderWarehouseName?.trim()
  ) {
    throw new StoreShippingSettingsRequiredError(getMissingStoreShippingSettingsMessage())
  }

  const platformSender = resolvePlatformSenderProfile()
  const structuredRecipientName = resolveStructuredRecipientName({
    recipientName: shipment.recipientName,
    recipientFirstName: shipment.recipientFirstName,
    recipientLastName: shipment.recipientLastName,
    recipientMiddleName: shipment.recipientMiddleName,
  })
  const recipientProfile = await resolveRecipientProfile(shipment)

  logInfo('shipping:create-ttn-preflight', {
    domain: 'shipping',
    shipmentId: shipment.id,
    orderId: shipment.orderId,
    deliveryType: shipment.deliveryType,
    platformSenderCityRefExists: Boolean(platformSender.cityRef),
    platformSenderAddressRefExists: Boolean(platformSender.addressRef),
    platformSenderCounterpartyRefExists: Boolean(platformSender.counterpartyRef),
    platformSenderContactRefExists: Boolean(platformSender.contactRef),
    recipientFirstNameExists: Boolean(structuredRecipientName.recipientFirstName),
    recipientLastNameExists: Boolean(structuredRecipientName.recipientLastName),
    recipientCityRefExists: Boolean(shipment.recipientCityRef?.trim()),
    recipientWarehouseRefExists: Boolean(shipment.recipientWarehouseRef?.trim()),
    recipientStreetExists: Boolean(shipment.recipientStreet?.trim()),
    recipientBuildingExists: Boolean(shipment.recipientBuilding?.trim()),
    recipientCounterpartyRefExists: Boolean(recipientProfile.counterpartyRef),
    recipientContactRefExists: Boolean(recipientProfile.contactRef),
  })

  const seatsAmount = resolveShipmentSeatsAmount(shipment)
  const providerResult = await getNovaPoshtaProvider().createShipment({
    shipmentId: shipment.id,
    orderId: shipment.orderId,
    deliveryType: shipment.deliveryType,
    senderName: settings.senderName,
    senderPhone: platformSender.phone,
    senderCityRef: platformSender.cityRef,
    senderCityName: settings.senderCityName,
    senderWarehouseRef: platformSender.addressRef,
    senderWarehouseName: settings.senderWarehouseName,
    senderCounterpartyRef: platformSender.counterpartyRef,
    senderContactRef: platformSender.contactRef,
    senderAddressRef: platformSender.addressRef,
    recipientName: structuredRecipientName.recipientName,
    recipientFirstName: structuredRecipientName.recipientFirstName ?? '',
    recipientLastName: structuredRecipientName.recipientLastName ?? '',
    recipientMiddleName: structuredRecipientName.recipientMiddleName,
    recipientPhone: shipment.recipientPhone,
    recipientCityRef: shipment.recipientCityRef,
    recipientCityName: shipment.recipientCityName,
    recipientStreet: shipment.recipientStreet,
    recipientBuilding: shipment.recipientBuilding,
    recipientApartment: shipment.recipientApartment,
    recipientWarehouseRef: shipment.recipientWarehouseRef,
    recipientWarehouseName: shipment.recipientWarehouseName,
    recipientCounterpartyRef: recipientProfile.counterpartyRef,
    recipientContactRef: recipientProfile.contactRef,
    cargoDescription: resolveShipmentCargoDescription(shipment),
    weight: resolveShipmentWeight(),
    volumeGeneral: resolveShipmentVolumeGeneral(),
    seatsAmount,
    declaredCost: resolveShipmentDeclaredCost(shipment),
  })

  const updated = await updateShipmentById({
    id: shipment.id,
    trackingNumber: providerResult.trackingNumber,
    providerShipmentId: providerResult.providerShipmentId,
    status: ShipmentStatus.LABEL_CREATED,
  })
  await recordAdminAudit({
    actorId: user.id,
    actorEmail: user.email ?? null,
    actorRole: resolveAuditActorRole(user),
    domain: 'shipping',
    action: 'create-ttn',
    targetType: 'shipment',
    targetId: shipment.id,
    metadata: {
      orderId: shipment.orderId,
      storeId: shipment.storeId,
      provider: shipment.provider,
      trackingNumber: updated.trackingNumber,
    },
  })

  const notificationCopy = buildShipmentLifecycleNotificationCopy(updated, ShipmentStatus.LABEL_CREATED)
  if (notificationCopy) {
    runNonBlocking(
      'shipping:create-ttn:buyer-notification',
      notifyBuyerAboutShipment(updated, notificationCopy),
    )
  }

  return toSellerShipmentDto(updated)
}

export async function refreshMyShipmentStatus(
  user: SessionUser,
  shipmentId: string,
): Promise<SellerShipmentDto> {
  const { shipment } = await getOwnedSellerShipment(user, shipmentId)
  assertShipmentCanRefresh(shipment)
  const result = await syncShipmentRecord(shipment)
  const updated = result.changed ? await getShipmentByIdOrThrow(shipment.id) : shipment
  return toSellerShipmentDto(updated)
}

export async function cancelMyShipment(
  user: SessionUser,
  shipmentId: string,
): Promise<SellerShipmentDto> {
  const { shipment } = await getOwnedSellerShipment(user, shipmentId)
  assertShipmentCanCancel(shipment)

  if (shipment.trackingNumber?.trim()) {
    await getNovaPoshtaProvider().cancelShipment({
      trackingNumber: shipment.trackingNumber,
      providerShipmentId: shipment.providerShipmentId,
    })
  }

  const updated = await updateShipmentById({
    id: shipment.id,
    status: ShipmentStatus.CANCELLED,
  })

  return toSellerShipmentDto(updated)
}

export async function bulkCreateMyShipmentTtns(
  user: SessionUser,
  shipmentIds: string[],
): Promise<BulkCreateShipmentTtnResponseDto> {
  const uniqueShipmentIds = [...new Set(shipmentIds)]

  const results = await Promise.all(
    uniqueShipmentIds.map(async (shipmentId) => {
      try {
        const shipment = await createMyShipmentTtn(user, shipmentId)
        return {
          shipmentId,
          success: true,
          trackingNumber: shipment.trackingNumber,
          errorMessage: null,
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Shipment TTN could not be created'
        return {
          shipmentId,
          success: false,
          trackingNumber: null,
          errorMessage: message,
        }
      }
    }),
  )

  return { results }
}

export async function createMyReturnShipment(
  user: SessionUser,
  shipmentId: string,
): Promise<SellerShipmentDto> {
  const { shipment, store } = await getOwnedSellerShipment(user, shipmentId)
  assertShipmentCanCreateReturn(shipment)

  const settings = await findStoreShippingSettingsByStoreId(store.id)
  if (
    !settings ||
    !settings.senderName.trim() ||
    !settings.senderPhone.trim() ||
    !settings.senderCityRef.trim() ||
    !settings.senderCityName.trim()
  ) {
    throw new StoreShippingSettingsRequiredError()
  }

  try {
    const structuredSenderName = splitLegacyRecipientName(settings.senderName)
    const returnShipment = await createReturnShipment({
      originalShipmentId: shipment.id,
      orderId: shipment.orderId,
      storeId: shipment.storeId,
      provider: shipment.provider,
      deliveryType: shipment.deliveryType,
      recipientName: settings.senderName,
      recipientFirstName: structuredSenderName.recipientFirstName,
      recipientLastName: structuredSenderName.recipientLastName,
      recipientMiddleName: structuredSenderName.recipientMiddleName,
      recipientPhone: settings.senderPhone,
      recipientCityRef: settings.senderCityRef,
      recipientCityName: settings.senderCityName,
      recipientStreet: null,
      recipientBuilding: null,
      recipientApartment: null,
      recipientWarehouseRef: settings.senderWarehouseRef,
      recipientWarehouseName: settings.senderWarehouseName,
      estimatedCost: shipment.estimatedCost ? new Decimal(shipment.estimatedCost.toString()) : null,
      currency: shipment.currency,
      items: shipment.items.map((item) => ({
        orderItemId: item.orderItemId,
        quantity: item.quantity,
      })),
    })

    return toSellerShipmentDto(returnShipment)
  } catch (error) {
    if (
      error instanceof ShipmentInvalidStateError ||
      error instanceof ShipmentAlreadyReturnedError ||
      error instanceof StoreShippingSettingsRequiredError
    ) {
      throw error
    }

    throw new ShipmentReturnCreationError()
  }
}

export async function createAdminReturnShipment(
  user: SessionUser,
  shipmentId: string,
): Promise<SellerShipmentDto> {
  requireAdmin(user)
  const shipment = await getAdminShipment(shipmentId)
  assertShipmentCanCreateReturn(shipment)

  const settings = await findStoreShippingSettingsByStoreId(shipment.storeId)
  if (
    !settings ||
    !settings.senderName.trim() ||
    !settings.senderPhone.trim() ||
    !settings.senderCityRef.trim() ||
    !settings.senderCityName.trim()
  ) {
    throw new StoreShippingSettingsRequiredError()
  }

  try {
    const structuredSenderName = splitLegacyRecipientName(settings.senderName)
    const returnShipment = await createReturnShipment({
      originalShipmentId: shipment.id,
      orderId: shipment.orderId,
      storeId: shipment.storeId,
      provider: shipment.provider,
      deliveryType: shipment.deliveryType,
      recipientName: settings.senderName,
      recipientFirstName: structuredSenderName.recipientFirstName,
      recipientLastName: structuredSenderName.recipientLastName,
      recipientMiddleName: structuredSenderName.recipientMiddleName,
      recipientPhone: settings.senderPhone,
      recipientCityRef: settings.senderCityRef,
      recipientCityName: settings.senderCityName,
      recipientStreet: null,
      recipientBuilding: null,
      recipientApartment: null,
      recipientWarehouseRef: settings.senderWarehouseRef,
      recipientWarehouseName: settings.senderWarehouseName,
      estimatedCost: shipment.estimatedCost ? new Decimal(shipment.estimatedCost.toString()) : null,
      currency: shipment.currency,
      items: shipment.items.map((item) => ({
        orderItemId: item.orderItemId,
        quantity: item.quantity,
      })),
    })

    return toSellerShipmentDto(returnShipment)
  } catch (error) {
    if (
      error instanceof ShipmentInvalidStateError ||
      error instanceof ShipmentAlreadyReturnedError ||
      error instanceof StoreShippingSettingsRequiredError
    ) {
      throw error
    }

    throw new ShipmentReturnCreationError()
  }
}

export async function syncShipmentStatus(
  shipmentId: string,
): Promise<ShipmentSyncResultDto> {
  const shipment = await getAdminShipment(shipmentId)

  try {
    return await syncShipmentRecord(shipment)
  } catch (error) {
    if (error instanceof ShipmentInvalidStateError) {
      throw error
    }

    throw new ShipmentSyncError()
  }
}

export async function syncPendingShipments(limit = 50): Promise<ShipmentSyncResponseDto> {
  const shipments = await listTrackableShipments({ limit })
  const results: ShipmentSyncResultDto[] = []

  for (const shipment of shipments) {
    try {
      results.push(await syncShipmentRecord(shipment))
    } catch (error) {
      logError('shipping:sync-pending-shipment', error)
      results.push({
        shipmentId: shipment.id,
        previousStatus: shipment.status,
        currentStatus: shipment.status,
        trackingNumber: shipment.trackingNumber,
        changed: false,
      })
    }
  }

  return { results }
}

export async function getAdminNovaPoshtaSenderDiagnostics(
  user: SessionUser,
  query: AdminNovaPoshtaSenderDiagnosticsQueryDto,
): Promise<AdminNovaPoshtaSenderDiagnosticsDto> {
  requireAdmin(user)

  const provider = getNovaPoshtaProvider()
  const senderCounterparties = await provider.getSenderCounterpartiesDebug()
  const senderContacts = query.senderRef
    ? await provider.getCounterpartyContactPersonsDebug(query.senderRef)
    : []
  let senderCounterpartyAddressesLookupError: string | null = null
  const senderCounterpartyAddresses = query.senderRef
    ? await provider.getCounterpartyAddressesDebug(query.senderRef).catch((error) => {
        if (error instanceof ShippingProviderError) {
          senderCounterpartyAddressesLookupError = error.message
          logWarn('shipping:nova-poshta-debug-sender-addresses-unsupported', {
            domain: 'shipping',
            senderRef: query.senderRef,
            message: error.message,
          })
          return []
        }

        throw error
      })
    : []
  const inferredCityRefs = [
    ...new Set(
      senderCounterpartyAddresses
        .map((address) => address.cityRef)
        .filter((cityRef): cityRef is string => Boolean(cityRef)),
    ),
  ]
  const citySearchResults =
    !query.cityRef && query.cityName
      ? await provider.searchCities(query.cityName)
      : []
  const exactCityMatches =
    query.cityName == null
      ? []
      : citySearchResults.filter(
          (city) => city.name.trim().toLowerCase() === query.cityName!.trim().toLowerCase(),
        )
  const selectedCityFromName =
    exactCityMatches.length === 1
      ? exactCityMatches[0]!.ref
      : citySearchResults.length === 1
        ? citySearchResults[0]!.ref
        : null
  const selectedCityRef =
    query.cityRef ??
    (inferredCityRefs.length === 1 ? inferredCityRefs[0]! : null) ??
    selectedCityFromName
  const senderAddresses = selectedCityRef
    ? await provider.getSenderAddressesDebug(selectedCityRef)
    : []
  const selectedCounterpartyRef =
    query.senderRef ?? (senderCounterparties.length === 1 ? senderCounterparties[0]!.ref : null)
  const selectedContact = senderContacts.length === 1 ? senderContacts[0]! : null
  const selectedAddress = senderAddresses.length === 1 ? senderAddresses[0]! : null

  return {
    senderCounterparties,
    senderContacts,
    senderCounterpartyAddresses,
    senderCounterpartyAddressesLookupError,
    citySearchResults,
    inferredCityRefs,
    selectedCityRef,
    senderAddresses,
    envSuggestion: {
      NOVA_POSHTA_PLATFORM_SENDER_COUNTERPARTY_REF: selectedCounterpartyRef,
      NOVA_POSHTA_PLATFORM_SENDER_CONTACT_REF: selectedContact?.ref ?? null,
      NOVA_POSHTA_PLATFORM_SENDER_ADDRESS_REF: selectedAddress?.ref ?? null,
      NOVA_POSHTA_PLATFORM_SENDER_CITY_REF: selectedCityRef,
      NOVA_POSHTA_PLATFORM_SENDER_PHONE: selectedContact?.phones ?? null,
    },
  }
}

export function buildShipmentDrafts(input: {
  orderItems: ShipmentDraftInputItem[]
  deliverySelection: ResolvedCheckoutDeliverySelectionDto
}): ShipmentDraftDto[] {
  const grouped = new Map<string, ShipmentDraftDto>()

  for (const item of input.orderItems) {
    const existing = grouped.get(item.storeId)
    if (existing) {
      existing.items.push({
        orderItemId: item.id,
        quantity: item.quantity,
      })
      continue
    }

    grouped.set(item.storeId, {
      storeId: item.storeId,
      provider: input.deliverySelection.provider,
      deliveryType: input.deliverySelection.deliveryType,
      status: ShipmentStatus.PENDING,
      recipientName: input.deliverySelection.recipientName,
      recipientFirstName: input.deliverySelection.recipientFirstName,
      recipientLastName: input.deliverySelection.recipientLastName,
      recipientMiddleName: input.deliverySelection.recipientMiddleName,
      recipientPhone: input.deliverySelection.recipientPhone,
      recipientCityRef: input.deliverySelection.recipientCityRef,
      recipientCityName: input.deliverySelection.recipientCityName,
      recipientStreet: input.deliverySelection.recipientStreet,
      recipientBuilding: input.deliverySelection.recipientBuilding,
      recipientApartment: input.deliverySelection.recipientApartment,
      recipientWarehouseRef: input.deliverySelection.recipientWarehouseRef,
      recipientWarehouseName: input.deliverySelection.recipientWarehouseName,
      estimatedCost: input.deliverySelection.estimatedCost,
      currency: 'UAH',
      items: [
        {
          orderItemId: item.id,
          quantity: item.quantity,
        },
      ],
    })
  }

  return [...grouped.values()]
}

export function filterMissingShipmentDrafts(
  drafts: ShipmentDraftDto[],
  existingStoreIds: string[],
): ShipmentDraftDto[] {
  const existing = new Set(existingStoreIds)
  return drafts.filter((draft) => !existing.has(draft.storeId))
}
