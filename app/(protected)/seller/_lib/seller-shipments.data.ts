import {
  ShipmentNotFoundError,
  ShipmentOwnershipError,
} from '@/lib/errors/shipping'
import {
  getMyShipmentById,
  getMyShipments,
  getMyStoreShippingSettings,
} from '@/features/shipping/shipping.service'
import type { SessionUser } from '@/types/auth'
import { getSellerLayoutData } from './seller-dashboard.data'

function serializeShippingSettings(
  settings: Awaited<ReturnType<typeof getMyStoreShippingSettings>>,
) {
  return {
    ...settings,
    createdAt: settings.createdAt ? settings.createdAt.toISOString() : null,
    updatedAt: settings.updatedAt ? settings.updatedAt.toISOString() : null,
  }
}

type RawSearchParams = Record<string, string | string[] | undefined>

function normalizeSearchParams(searchParams: RawSearchParams) {
  return Object.fromEntries(
    Object.entries(searchParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  )
}

export async function getSellerShipmentsPageData(
  user: SessionUser,
  searchParams: RawSearchParams,
) {
  const layout = await getSellerLayoutData(user)
  const normalized = normalizeSearchParams(searchParams)
  const page = Number(normalized.page ?? '1')

  if (!layout.store) {
    return {
      ...layout,
      shipments: { items: [], page: 1, limit: 20, total: 0 },
      filters: {
        page: 1,
      },
    }
  }

  const shipments = await getMyShipments(user, {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    limit: 20,
  })

  return {
    ...layout,
    shipments,
    filters: {
      page: shipments.page,
    },
  }
}

export async function getSellerShipmentDetailPageData(
  user: SessionUser,
  shipmentId: string,
) {
  const layout = await getSellerLayoutData(user)

  if (!layout.store) {
    return {
      ...layout,
      shipment: null,
      shippingSettings: null,
      accessState: 'not-found' as const,
    }
  }

  try {
    const [shipment, shippingSettings] = await Promise.all([
      getMyShipmentById(user, shipmentId),
      getMyStoreShippingSettings(user),
    ])

    return {
      ...layout,
      shipment,
      shippingSettings: serializeShippingSettings(shippingSettings),
      accessState: 'success' as const,
    }
  } catch (error) {
    if (error instanceof ShipmentNotFoundError) {
      return {
        ...layout,
        shipment: null,
        shippingSettings: null,
        accessState: 'not-found' as const,
      }
    }

    if (error instanceof ShipmentOwnershipError) {
      return {
        ...layout,
        shipment: null,
        shippingSettings: null,
        accessState: 'forbidden' as const,
      }
    }

    throw error
  }
}
