import {
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
} from '@/lib/errors/shipping'
import type { SessionUser } from '@/features/auth/auth.dto'
import type {
  CheckoutDeliverySelectionDto,
  CheckoutDeliverySelectionInput,
  NovaPoshtaCityDto,
  NovaPoshtaWarehouseDto,
  ResolvedCheckoutDeliverySelectionDto,
  ShipmentDraftDto,
  ShipmentDraftInputItem,
  StoreShippingSettingsDto,
  UpdateStoreShippingSettingsInput,
} from './shipping.dto'
import {
  findStoreShippingSettingsByStoreId,
  upsertStoreShippingSettings,
} from './shipping.repository'
import { getNovaPoshtaProvider } from './providers/nova-poshta.provider'
import { requiredCheckoutDeliverySelectionSchema } from './shipping.schema'

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
