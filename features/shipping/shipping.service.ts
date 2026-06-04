import {
  NotificationType,
  ShipmentStatus,
  ShippingDeliveryType,
  ShippingProvider,
} from '@/app/generated/prisma/client'
import { requireSeller } from '@/lib/auth/guards'
import { findStoreByUserId } from '@/features/store/store.repository'
import { StoreNotFoundError, StoreOwnershipError } from '@/lib/errors/seller'
import {
  InvalidShippingSelectionError,
  NovaPoshtaWarehouseNotFoundError,
  ShipmentAlreadyHasTrackingError,
  ShipmentInvalidStateError,
  ShipmentNotFoundError,
  ShipmentOwnershipError,
  StoreShippingSettingsRequiredError,
} from '@/lib/errors/shipping'
import { createOrderNotification } from '@/features/notifications/notifications.service'
import { logError } from '@/utils/logger'
import type { SessionUser } from '@/features/auth/auth.dto'
import type {
  CheckoutDeliverySelectionDto,
  CheckoutDeliverySelectionInput,
  NovaPoshtaCityDto,
  NovaPoshtaWarehouseDto,
  ResolvedCheckoutDeliverySelectionDto,
  SellerShipmentDto,
  SellerShipmentListDto,
  ShipmentDraftDto,
  ShipmentDraftInputItem,
  ShipmentListQueryDto,
  StoreShippingSettingsDto,
  UpdateStoreShippingSettingsInput,
} from './shipping.dto'
import {
  countShipmentsByStoreId,
  findShipmentById,
  findStoreShippingSettingsByStoreId,
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
])

function runNonBlocking(label: string, task: Promise<unknown>) {
  void task.catch((error) => {
    logError(label, error)
  })
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
    provider: shipment.provider,
    deliveryType: shipment.deliveryType,
    status: shipment.status,
    recipientName: shipment.recipientName,
    recipientPhone: shipment.recipientPhone,
    recipientCityRef: shipment.recipientCityRef,
    recipientCityName: shipment.recipientCityName,
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

function isConfigured(input: UpdateStoreShippingSettingsInput) {
  return Boolean(
    input.senderName?.trim() &&
      input.senderPhone?.trim() &&
      input.senderCityRef?.trim() &&
      input.senderCityName?.trim() &&
      input.senderWarehouseRef?.trim() &&
      input.senderWarehouseName?.trim(),
  )
}

function assertShipmentHasRecipientSnapshot(
  shipment: NonNullable<Awaited<ReturnType<typeof findShipmentById>>>,
) {
  if (
    !shipment.recipientName.trim() ||
    !shipment.recipientPhone.trim() ||
    !shipment.recipientCityRef.trim() ||
    !shipment.recipientCityName.trim() ||
    !shipment.recipientWarehouseRef?.trim() ||
    !shipment.recipientWarehouseName?.trim()
  ) {
    throw new ShipmentInvalidStateError('Shipment recipient snapshot is incomplete')
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
  if (
    shipment.provider !== ShippingProvider.NOVA_POSHTA ||
    shipment.deliveryType !== ShippingDeliveryType.NOVA_POSHTA_WAREHOUSE
  ) {
    throw new ShipmentInvalidStateError('Only Nova Poshta warehouse shipments can create TTNs')
  }

  if (shipment.trackingNumber || shipment.providerShipmentId) {
    throw new ShipmentAlreadyHasTrackingError()
  }

  if (!TTN_CREATABLE_SHIPMENT_STATUSES.has(shipment.status)) {
    throw new ShipmentInvalidStateError('Shipment status does not allow TTN creation')
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

async function getOwnedSellerShipment(
  user: SessionUser,
  shipmentId: string,
) {
  requireSeller(user)
  const store = await findStoreByUserId(user.id)
  if (!store) {
    throw new StoreNotFoundError()
  }

  if (store.ownerId !== user.id) {
    throw new StoreOwnershipError()
  }

  const shipment = await findShipmentById(shipmentId)
  if (!shipment) {
    throw new ShipmentNotFoundError()
  }

  if (shipment.storeId !== store.id) {
    throw new ShipmentOwnershipError()
  }

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
  const recipientName = input.recipientName?.trim() || null
  const recipientPhone = input.recipientPhone?.trim() || null
  const recipientCityRef = input.recipientCityRef?.trim() || null
  const recipientCityName = input.recipientCityName?.trim() || null
  const recipientWarehouseRef = input.recipientWarehouseRef?.trim() || null
  const recipientWarehouseName = input.recipientWarehouseName?.trim() || null

  return {
    supportedDeliveryTypes: [ShippingDeliveryType.NOVA_POSHTA_WAREHOUSE],
    selectedDeliveryType,
    recipientName,
    recipientPhone,
    recipientCityRef,
    recipientCityName,
    recipientWarehouseRef,
    recipientWarehouseName,
    isComplete: Boolean(
      selectedDeliveryType &&
        recipientName &&
        recipientPhone &&
        recipientCityRef &&
        recipientCityName &&
        recipientWarehouseRef &&
        recipientWarehouseName,
    ),
  }
}

export async function searchNovaPoshtaCities(query: string): Promise<NovaPoshtaCityDto[]> {
  return getNovaPoshtaProvider().searchCities(query)
}

export async function getNovaPoshtaWarehouses(cityRef: string): Promise<NovaPoshtaWarehouseDto[]> {
  return getNovaPoshtaProvider().getWarehouses(cityRef)
}

export async function getMyStoreShippingSettings(user: SessionUser): Promise<StoreShippingSettingsDto> {
  requireSeller(user)
  const store = await findStoreByUserId(user.id)
  if (!store) {
    throw new StoreNotFoundError()
  }

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
    isConfigured: settings?.isConfigured ?? false,
    createdAt: settings?.createdAt ?? null,
    updatedAt: settings?.updatedAt ?? null,
  })
}

export async function updateMyStoreShippingSettings(
  user: SessionUser,
  data: UpdateStoreShippingSettingsInput,
): Promise<StoreShippingSettingsDto> {
  requireSeller(user)
  const store = await findStoreByUserId(user.id)
  if (!store) {
    throw new StoreNotFoundError()
  }

  if (store.ownerId !== user.id) {
    throw new StoreOwnershipError()
  }

  const settings = await upsertStoreShippingSettings({
    storeId: store.id,
    provider: data.provider ?? ShippingProvider.NOVA_POSHTA,
    senderName: data.senderName?.trim() ?? null,
    senderPhone: data.senderPhone?.trim() ?? null,
    senderCityRef: data.senderCityRef?.trim() ?? null,
    senderCityName: data.senderCityName?.trim() ?? null,
    senderWarehouseRef: data.senderWarehouseRef?.trim() ?? null,
    senderWarehouseName: data.senderWarehouseName?.trim() ?? null,
    isConfigured: isConfigured(data),
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
    recipientPhone: selection.recipientPhone,
    recipientCityRef: selection.recipientCityRef,
    recipientCityName: selection.recipientCityName,
    recipientWarehouseRef: selection.recipientWarehouseRef,
    recipientWarehouseName: selection.recipientWarehouseName,
  })

  if (!parsed.success) {
    throw new InvalidShippingSelectionError('Nova Poshta delivery selection is incomplete')
  }

  const warehouses = await getNovaPoshtaProvider().assertCityHasWarehouses(parsed.data.recipientCityRef)
  const matchedWarehouse = warehouses.find(
    (warehouse) => warehouse.ref === parsed.data.recipientWarehouseRef,
  )

  if (!matchedWarehouse) {
    throw new NovaPoshtaWarehouseNotFoundError()
  }

  return {
    provider: ShippingProvider.NOVA_POSHTA,
    deliveryType: parsed.data.deliveryType,
    recipientName: parsed.data.recipientName,
    recipientPhone: parsed.data.recipientPhone,
    recipientCityRef: parsed.data.recipientCityRef,
    recipientCityName: parsed.data.recipientCityName,
    recipientWarehouseRef: parsed.data.recipientWarehouseRef,
    recipientWarehouseName: parsed.data.recipientWarehouseName,
  }
}

export async function getMyShipments(
  user: SessionUser,
  query: ShipmentListQueryDto,
): Promise<SellerShipmentListDto> {
  requireSeller(user)
  const store = await findStoreByUserId(user.id)
  if (!store) {
    throw new StoreNotFoundError()
  }

  if (store.ownerId !== user.id) {
    throw new StoreOwnershipError()
  }

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
    !settings?.isConfigured ||
    !settings.senderName.trim() ||
    !settings.senderPhone.trim() ||
    !settings.senderCityRef.trim() ||
    !settings.senderCityName.trim() ||
    !settings.senderWarehouseRef?.trim() ||
    !settings.senderWarehouseName?.trim()
  ) {
    throw new StoreShippingSettingsRequiredError()
  }

  const seatsAmount = shipment.items.reduce((sum, item) => sum + item.quantity, 0)
  const providerResult = await getNovaPoshtaProvider().createShipment({
    shipmentId: shipment.id,
    orderId: shipment.orderId,
    senderName: settings.senderName,
    senderPhone: settings.senderPhone,
    senderCityRef: settings.senderCityRef,
    senderCityName: settings.senderCityName,
    senderWarehouseRef: settings.senderWarehouseRef,
    senderWarehouseName: settings.senderWarehouseName,
    recipientName: shipment.recipientName,
    recipientPhone: shipment.recipientPhone,
    recipientCityRef: shipment.recipientCityRef,
    recipientCityName: shipment.recipientCityName,
    recipientWarehouseRef: shipment.recipientWarehouseRef ?? '',
    recipientWarehouseName: shipment.recipientWarehouseName ?? '',
    cargoDescription: resolveShipmentCargoDescription(shipment),
    seatsAmount,
    declaredCost: resolveShipmentDeclaredCost(shipment),
  })

  const updated = await updateShipmentById({
    id: shipment.id,
    trackingNumber: providerResult.trackingNumber,
    providerShipmentId: providerResult.providerShipmentId,
    status: ShipmentStatus.LABEL_CREATED,
  })

  const notificationCopy = buildShipmentStatusNotificationCopy(updated, ShipmentStatus.LABEL_CREATED)
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

  if (statusChanged && BUYER_VISIBLE_STATUS_NOTIFICATIONS.has(updated.status)) {
    const notificationCopy = buildShipmentStatusNotificationCopy(updated, updated.status)
    if (notificationCopy) {
      runNonBlocking(
        'shipping:refresh-status:buyer-notification',
        notifyBuyerAboutShipment(updated, notificationCopy),
      )
    }
  }

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
      recipientPhone: input.deliverySelection.recipientPhone,
      recipientCityRef: input.deliverySelection.recipientCityRef,
      recipientCityName: input.deliverySelection.recipientCityName,
      recipientWarehouseRef: input.deliverySelection.recipientWarehouseRef,
      recipientWarehouseName: input.deliverySelection.recipientWarehouseName,
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
