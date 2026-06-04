import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/store/store.repository', () => ({
  findStoreByUserId: vi.fn(),
}))
vi.mock('@/features/shipping/shipping.repository', () => ({
  countShipmentsByStoreId: vi.fn(),
  findShipmentById: vi.fn(),
  findStoreShippingSettingsByStoreId: vi.fn(),
  listShipmentsByStoreId: vi.fn(),
  updateShipmentById: vi.fn(),
  upsertStoreShippingSettings: vi.fn(),
}))
vi.mock('@/features/notifications/notifications.service', () => ({
  createOrderNotification: vi.fn(),
}))
vi.mock('@/lib/auth/guards', () => ({
  requireSeller: vi.fn(),
}))
vi.mock('@/features/shipping/providers/nova-poshta.provider', () => ({
  getNovaPoshtaProvider: vi.fn(),
}))

import { requireSeller } from '@/lib/auth/guards'
import { createOrderNotification } from '@/features/notifications/notifications.service'
import { findStoreByUserId } from '@/features/store/store.repository'
import {
  countShipmentsByStoreId,
  findShipmentById,
  findStoreShippingSettingsByStoreId,
  listShipmentsByStoreId,
  updateShipmentById,
  upsertStoreShippingSettings,
} from '@/features/shipping/shipping.repository'
import { getNovaPoshtaProvider } from '@/features/shipping/providers/nova-poshta.provider'
import {
  buildShipmentDrafts,
  cancelMyShipment,
  createMyShipmentTtn,
  filterMissingShipmentDrafts,
  getMyShipments,
  refreshMyShipmentStatus,
  resolveCheckoutDeliverySelection,
  updateMyStoreShippingSettings,
} from '@/features/shipping/shipping.service'
import { StoreOwnershipError } from '@/lib/errors/seller'
import {
  NovaPoshtaWarehouseNotFoundError,
  ShipmentAlreadyHasTrackingError,
  ShipmentOwnershipError,
  StoreShippingSettingsRequiredError,
} from '@/lib/errors/shipping'
import type { SessionUser } from '@/features/auth/auth.dto'

const mockRequireSeller = vi.mocked(requireSeller)
const mockFindStoreByUserId = vi.mocked(findStoreByUserId)
const mockFindStoreShippingSettingsByStoreId = vi.mocked(findStoreShippingSettingsByStoreId)
const mockUpsertStoreShippingSettings = vi.mocked(upsertStoreShippingSettings)
const mockFindShipmentById = vi.mocked(findShipmentById)
const mockListShipmentsByStoreId = vi.mocked(listShipmentsByStoreId)
const mockCountShipmentsByStoreId = vi.mocked(countShipmentsByStoreId)
const mockUpdateShipmentById = vi.mocked(updateShipmentById)
const mockGetNovaPoshtaProvider = vi.mocked(getNovaPoshtaProvider)
const mockCreateOrderNotification = vi.mocked(createOrderNotification)

const user: SessionUser = {
  id: 'user-1',
  email: 'seller@example.com',
  roles: ['SELLER'],
}

function makeShipment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'shipment-1',
    orderId: 'order-1',
    storeId: 'store-1',
    provider: 'NOVA_POSHTA',
    deliveryType: 'NOVA_POSHTA_WAREHOUSE',
    status: 'PENDING',
    recipientName: 'John Doe',
    recipientPhone: '+380000000000',
    recipientCityRef: 'city-ref',
    recipientCityName: 'Kyiv',
    recipientWarehouseRef: 'warehouse-ref',
    recipientWarehouseName: 'Warehouse 1',
    estimatedCost: null,
    currency: 'UAH',
    trackingNumber: null,
    providerShipmentId: null,
    createdAt: new Date('2026-01-01T10:00:00.000Z'),
    updatedAt: new Date('2026-01-01T10:00:00.000Z'),
    order: {
      id: 'order-1',
      userId: 'buyer-1',
      status: 'paid',
    },
    store: {
      id: 'store-1',
      name: 'Store',
      ownerId: 'user-1',
    },
    items: [
      {
        id: 'shipment-item-1',
        quantity: 2,
        orderItemId: 'order-item-1',
        orderItem: {
          id: 'order-item-1',
          productNameSnapshot: 'Test Product',
          quantity: 2,
          unitPriceSnapshot: { toString: () => '49.99' },
          fulfillmentStatus: 'PENDING',
          storeId: 'store-1',
          order: {
            status: 'paid',
          },
        },
      },
    ],
    ...overrides,
  } as never
}

beforeEach(() => {
  vi.resetAllMocks()
  mockRequireSeller.mockReturnValue(undefined)
  mockFindStoreByUserId.mockResolvedValue({
    id: 'store-1',
    ownerId: 'user-1',
    slug: 'store',
    name: 'Store',
  } as never)
  mockFindStoreShippingSettingsByStoreId.mockResolvedValue(null)
  mockUpsertStoreShippingSettings.mockImplementation(async (input) => ({
    id: 'settings-1',
    storeId: input.storeId,
    provider: input.provider,
    senderName: input.senderName ?? '',
    senderPhone: input.senderPhone ?? '',
    senderCityRef: input.senderCityRef ?? '',
    senderCityName: input.senderCityName ?? '',
    senderWarehouseRef: input.senderWarehouseRef ?? null,
    senderWarehouseName: input.senderWarehouseName ?? null,
    isConfigured: input.isConfigured,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  }) as never)
  mockFindShipmentById.mockResolvedValue(makeShipment())
  mockListShipmentsByStoreId.mockResolvedValue([makeShipment()] as never)
  mockCountShipmentsByStoreId.mockResolvedValue(1)
  mockUpdateShipmentById.mockImplementation(async (input) =>
    makeShipment({
      status: input.status ?? 'PENDING',
      trackingNumber: input.trackingNumber ?? null,
      providerShipmentId: input.providerShipmentId ?? null,
      updatedAt: new Date('2026-01-02T10:00:00.000Z'),
    }),
  )
  mockCreateOrderNotification.mockResolvedValue({
    id: 'notification-1',
  } as never)
})

describe('shipping service', () => {
  it('seller can update own shipping settings', async () => {
    const result = await updateMyStoreShippingSettings(user, {
      senderName: 'Sender',
      senderPhone: '+380000000000',
      senderCityRef: 'city-ref',
      senderCityName: 'Kyiv',
      senderWarehouseRef: 'warehouse-ref',
      senderWarehouseName: 'Warehouse 1',
    })

    expect(mockUpsertStoreShippingSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        storeId: 'store-1',
        isConfigured: true,
      }),
    )
    expect(result.isConfigured).toBe(true)
  })

  it('seller cannot update another seller shipping settings', async () => {
    mockFindStoreByUserId.mockResolvedValueOnce({
      id: 'store-1',
      ownerId: 'another-user',
      slug: 'store',
      name: 'Store',
    } as never)

    await expect(
      updateMyStoreShippingSettings(user, {
        senderName: 'Sender',
      }),
    ).rejects.toThrow(StoreOwnershipError)
  })

  it('resolves Nova Poshta warehouse selection against provider results', async () => {
    mockGetNovaPoshtaProvider.mockReturnValue({
      assertCityHasWarehouses: vi.fn().mockResolvedValue([
        {
          ref: 'warehouse-ref',
          name: 'Warehouse 1',
          cityRef: 'city-ref',
          cityName: 'Kyiv',
        },
      ]),
    } as never)

    const result = await resolveCheckoutDeliverySelection({
      deliveryType: 'NOVA_POSHTA_WAREHOUSE',
      recipientName: 'John Doe',
      recipientPhone: '+380000000000',
      recipientCityRef: 'city-ref',
      recipientCityName: 'Kyiv',
      recipientWarehouseRef: 'warehouse-ref',
      recipientWarehouseName: 'Warehouse 1',
    })

    expect(result?.provider).toBe('NOVA_POSHTA')
    expect(result?.recipientWarehouseRef).toBe('warehouse-ref')
  })

  it('rejects warehouse selections that do not exist in the selected city', async () => {
    mockGetNovaPoshtaProvider.mockReturnValue({
      assertCityHasWarehouses: vi.fn().mockResolvedValue([
        {
          ref: 'warehouse-1',
          name: 'Warehouse 1',
          cityRef: 'city-ref',
          cityName: 'Kyiv',
        },
      ]),
    } as never)

    await expect(
      resolveCheckoutDeliverySelection({
        deliveryType: 'NOVA_POSHTA_WAREHOUSE',
        recipientName: 'John Doe',
        recipientPhone: '+380000000000',
        recipientCityRef: 'city-ref',
        recipientCityName: 'Kyiv',
        recipientWarehouseRef: 'warehouse-ref',
        recipientWarehouseName: 'Warehouse 99',
      }),
    ).rejects.toThrow(NovaPoshtaWarehouseNotFoundError)
  })

  it('lists seller shipments only for own store', async () => {
    const result = await getMyShipments(user, {
      page: 1,
      limit: 20,
    })

    expect(mockListShipmentsByStoreId).toHaveBeenCalledWith({
      storeId: 'store-1',
      status: undefined,
      page: 1,
      limit: 20,
    })
    expect(result.total).toBe(1)
    expect(result.items[0]?.storeId).toBe('store-1')
  })

  it('seller can create TTN for own shipment', async () => {
    mockFindStoreShippingSettingsByStoreId.mockResolvedValueOnce({
      id: 'settings-1',
      storeId: 'store-1',
      provider: 'NOVA_POSHTA',
      senderName: 'Sender',
      senderPhone: '+380000000000',
      senderCityRef: 'sender-city-ref',
      senderCityName: 'Kyiv',
      senderWarehouseRef: 'sender-warehouse-ref',
      senderWarehouseName: 'Warehouse 9',
      isConfigured: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never)
    mockGetNovaPoshtaProvider.mockReturnValue({
      createShipment: vi.fn().mockResolvedValue({
        trackingNumber: '20451234567890',
        providerShipmentId: 'provider-shipment-1',
        rawStatus: null,
      }),
    } as never)

    const result = await createMyShipmentTtn(user, 'shipment-1')

    expect(mockUpdateShipmentById).toHaveBeenCalledWith({
      id: 'shipment-1',
      trackingNumber: '20451234567890',
      providerShipmentId: 'provider-shipment-1',
      status: 'LABEL_CREATED',
    })
    expect(result.trackingNumber).toBe('20451234567890')
    expect(mockCreateOrderNotification).toHaveBeenCalled()
  })

  it('seller cannot create TTN for another store shipment', async () => {
    mockFindShipmentById.mockResolvedValueOnce(
      makeShipment({
        storeId: 'store-2',
      }),
    )

    await expect(createMyShipmentTtn(user, 'shipment-1')).rejects.toThrow(ShipmentOwnershipError)
  })

  it('TTN cannot be created twice', async () => {
    mockFindShipmentById.mockResolvedValueOnce(
      makeShipment({
        trackingNumber: '20450000000001',
        providerShipmentId: 'provider-shipment-1',
      }),
    )

    await expect(createMyShipmentTtn(user, 'shipment-1')).rejects.toThrow(
      ShipmentAlreadyHasTrackingError,
    )
  })

  it('missing store shipping settings blocks TTN creation', async () => {
    mockFindStoreShippingSettingsByStoreId.mockResolvedValueOnce(null)

    await expect(createMyShipmentTtn(user, 'shipment-1')).rejects.toThrow(
      StoreShippingSettingsRequiredError,
    )
  })

  it('status refresh maps provider status correctly', async () => {
    mockFindShipmentById.mockResolvedValueOnce(
      makeShipment({
        status: 'LABEL_CREATED',
        trackingNumber: '20450000000001',
        providerShipmentId: 'provider-shipment-1',
      }),
    )
    mockGetNovaPoshtaProvider.mockReturnValue({
      getShipmentStatus: vi.fn().mockResolvedValue({
        trackingNumber: '20450000000001',
        providerShipmentId: 'provider-shipment-1',
        rawStatus: 'Відправлення в дорозі',
        internalStatus: 'IN_TRANSIT',
      }),
    } as never)

    const result = await refreshMyShipmentStatus(user, 'shipment-1')

    expect(mockUpdateShipmentById).toHaveBeenCalledWith({
      id: 'shipment-1',
      status: 'IN_TRANSIT',
      providerShipmentId: 'provider-shipment-1',
      trackingNumber: '20450000000001',
    })
    expect(result.status).toBe('IN_TRANSIT')
    expect(mockCreateOrderNotification).toHaveBeenCalled()
  })

  it('cancel shipment transition works where allowed', async () => {
    mockFindShipmentById.mockResolvedValueOnce(
      makeShipment({
        status: 'LABEL_CREATED',
        trackingNumber: '20450000000001',
        providerShipmentId: 'provider-shipment-1',
      }),
    )
    mockGetNovaPoshtaProvider.mockReturnValue({
      cancelShipment: vi.fn().mockResolvedValue(undefined),
    } as never)

    const result = await cancelMyShipment(user, 'shipment-1')

    expect(mockUpdateShipmentById).toHaveBeenCalledWith({
      id: 'shipment-1',
      status: 'CANCELLED',
    })
    expect(result.status).toBe('CANCELLED')
  })

  it('notification failures do not break shipment flow', async () => {
    mockFindStoreShippingSettingsByStoreId.mockResolvedValueOnce({
      id: 'settings-1',
      storeId: 'store-1',
      provider: 'NOVA_POSHTA',
      senderName: 'Sender',
      senderPhone: '+380000000000',
      senderCityRef: 'sender-city-ref',
      senderCityName: 'Kyiv',
      senderWarehouseRef: 'sender-warehouse-ref',
      senderWarehouseName: 'Warehouse 9',
      isConfigured: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never)
    mockGetNovaPoshtaProvider.mockReturnValue({
      createShipment: vi.fn().mockResolvedValue({
        trackingNumber: '20451234567890',
        providerShipmentId: 'provider-shipment-1',
        rawStatus: null,
      }),
    } as never)
    mockCreateOrderNotification.mockRejectedValueOnce(new Error('notifications down'))

    const result = await createMyShipmentTtn(user, 'shipment-1')

    expect(result.trackingNumber).toBe('20451234567890')
  })

  it('groups order items into one shipment per store with matching shipment items', () => {
    const drafts = buildShipmentDrafts({
      orderItems: [
        { id: 'item-1', storeId: 'store-1', quantity: 2 },
        { id: 'item-2', storeId: 'store-1', quantity: 1 },
        { id: 'item-3', storeId: 'store-2', quantity: 4 },
      ],
      deliverySelection: {
        provider: 'NOVA_POSHTA',
        deliveryType: 'NOVA_POSHTA_WAREHOUSE',
        recipientName: 'John Doe',
        recipientPhone: '+380000000000',
        recipientCityRef: 'city-ref',
        recipientCityName: 'Kyiv',
        recipientWarehouseRef: 'warehouse-ref',
        recipientWarehouseName: 'Warehouse 1',
      },
    })

    expect(drafts).toHaveLength(2)
    expect(drafts[0]?.items).toEqual([
      { orderItemId: 'item-1', quantity: 2 },
      { orderItemId: 'item-2', quantity: 1 },
    ])
    expect(drafts[1]?.items).toEqual([{ orderItemId: 'item-3', quantity: 4 }])
  })

  it('filters out shipment drafts for stores that already have shipment snapshots', () => {
    const drafts = filterMissingShipmentDrafts(
      [
        {
          storeId: 'store-1',
          provider: 'NOVA_POSHTA',
          deliveryType: 'NOVA_POSHTA_WAREHOUSE',
          status: 'PENDING',
          recipientName: 'John Doe',
          recipientPhone: '+380000000000',
          recipientCityRef: 'city-ref',
          recipientCityName: 'Kyiv',
          recipientWarehouseRef: 'warehouse-ref',
          recipientWarehouseName: 'Warehouse 1',
          currency: 'UAH',
          items: [{ orderItemId: 'item-1', quantity: 2 }],
        },
        {
          storeId: 'store-2',
          provider: 'NOVA_POSHTA',
          deliveryType: 'NOVA_POSHTA_WAREHOUSE',
          status: 'PENDING',
          recipientName: 'John Doe',
          recipientPhone: '+380000000000',
          recipientCityRef: 'city-ref',
          recipientCityName: 'Kyiv',
          recipientWarehouseRef: 'warehouse-ref',
          recipientWarehouseName: 'Warehouse 1',
          currency: 'UAH',
          items: [{ orderItemId: 'item-2', quantity: 1 }],
        },
      ],
      ['store-1'],
    )

    expect(drafts).toHaveLength(1)
    expect(drafts[0]?.storeId).toBe('store-2')
  })
})
