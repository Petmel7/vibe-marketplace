import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/store/store.repository', () => ({
  findStoreByUserId: vi.fn(),
}))
vi.mock('@/features/shipping/shipping.repository', () => ({
  countShipmentsByStoreId: vi.fn(),
  createReturnShipment: vi.fn(),
  findShipmentById: vi.fn(),
  findStoreShippingSettingsByStoreId: vi.fn(),
  listStoreShippingSettingsByStoreIds: vi.fn(),
  listTrackableShipments: vi.fn(),
  listShipmentsByStoreId: vi.fn(),
  updateShipmentById: vi.fn(),
  upsertStoreShippingSettings: vi.fn(),
}))
vi.mock('@/features/notifications/notifications.service', () => ({
  createOrderNotification: vi.fn(),
}))
vi.mock('@/lib/auth/guards', () => ({
  requireAdmin: vi.fn(),
  requireSeller: vi.fn(),
}))
vi.mock('@/features/shipping/providers/nova-poshta.provider', () => ({
  getNovaPoshtaProvider: vi.fn(),
}))

import { requireAdmin, requireSeller } from '@/lib/auth/guards'
import { createOrderNotification } from '@/features/notifications/notifications.service'
import { findStoreByUserId } from '@/features/store/store.repository'
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
} from '@/features/shipping/shipping.repository'
import { getNovaPoshtaProvider } from '@/features/shipping/providers/nova-poshta.provider'
import {
  buildShipmentDrafts,
  bulkCreateMyShipmentTtns,
  cancelMyShipment,
  createAdminReturnShipment,
  createMyReturnShipment,
  createMyShipmentTtn,
  estimateCheckoutDeliveryTotal,
  filterMissingShipmentDrafts,
  getMyShipments,
  refreshMyShipmentStatus,
  resolveCheckoutDeliverySelection,
  syncPendingShipments,
  syncShipmentStatus,
  updateMyStoreShippingSettings,
} from '@/features/shipping/shipping.service'
import { StoreOwnershipError } from '@/lib/errors/seller'
import {
  NovaPoshtaWarehouseNotFoundError,
  ShipmentAlreadyReturnedError,
  ShipmentAlreadyHasTrackingError,
  ShipmentOwnershipError,
  StoreShippingSettingsRequiredError,
} from '@/lib/errors/shipping'
import type { SessionUser } from '@/features/auth/auth.dto'

const mockRequireSeller = vi.mocked(requireSeller)
const mockRequireAdmin = vi.mocked(requireAdmin)
const mockFindStoreByUserId = vi.mocked(findStoreByUserId)
const mockFindStoreShippingSettingsByStoreId = vi.mocked(findStoreShippingSettingsByStoreId)
const mockListStoreShippingSettingsByStoreIds = vi.mocked(listStoreShippingSettingsByStoreIds)
const mockUpsertStoreShippingSettings = vi.mocked(upsertStoreShippingSettings)
const mockFindShipmentById = vi.mocked(findShipmentById)
const mockListShipmentsByStoreId = vi.mocked(listShipmentsByStoreId)
const mockCountShipmentsByStoreId = vi.mocked(countShipmentsByStoreId)
const mockListTrackableShipments = vi.mocked(listTrackableShipments)
const mockCreateReturnShipment = vi.mocked(createReturnShipment)
const mockUpdateShipmentById = vi.mocked(updateShipmentById)
const mockGetNovaPoshtaProvider = vi.mocked(getNovaPoshtaProvider)
const mockCreateOrderNotification = vi.mocked(createOrderNotification)

const user: SessionUser = {
  id: 'user-1',
  email: 'seller@example.com',
  roles: ['SELLER'],
}

const adminUser: SessionUser = {
  id: 'admin-1',
  email: 'admin@example.com',
  roles: ['ADMIN'],
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
    recipientStreet: null,
    recipientBuilding: null,
    recipientApartment: null,
    recipientWarehouseRef: 'warehouse-ref',
    recipientWarehouseName: 'Warehouse 1',
    estimatedCost: null,
    currency: 'UAH',
    originalShipmentId: null,
    isReturnShipment: false,
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
    originalShipment: null,
    returnShipments: [],
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
  mockRequireAdmin.mockReturnValue(undefined)
  mockFindStoreByUserId.mockResolvedValue({
    id: 'store-1',
    ownerId: 'user-1',
    slug: 'store',
    name: 'Store',
  } as never)
  mockFindStoreShippingSettingsByStoreId.mockResolvedValue(null)
  mockListStoreShippingSettingsByStoreIds.mockResolvedValue([])
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
  mockListTrackableShipments.mockResolvedValue([makeShipment()] as never)
  mockCreateReturnShipment.mockImplementation(async (input) =>
    makeShipment({
      id: 'return-shipment-1',
      originalShipmentId: input.originalShipmentId,
      isReturnShipment: true,
      status: 'PENDING',
      recipientName: input.recipientName,
      recipientPhone: input.recipientPhone,
      recipientCityRef: input.recipientCityRef,
      recipientCityName: input.recipientCityName,
      recipientStreet: input.recipientStreet ?? null,
      recipientBuilding: input.recipientBuilding ?? null,
      recipientApartment: input.recipientApartment ?? null,
      recipientWarehouseRef: input.recipientWarehouseRef ?? null,
      recipientWarehouseName: input.recipientWarehouseName ?? null,
      trackingNumber: null,
      providerShipmentId: null,
      returnShipments: [],
      originalShipment: {
        id: input.originalShipmentId,
        status: 'DELIVERED',
        trackingNumber: '20450000000001',
      },
    }),
  )
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

  it('resolves Nova Poshta courier selection safely', async () => {
    const result = await resolveCheckoutDeliverySelection({
      deliveryType: 'NOVA_POSHTA_COURIER',
      recipientName: 'John Doe',
      recipientPhone: '+380000000000',
      recipientCityRef: 'city-ref',
      recipientCityName: 'Kyiv',
      recipientStreet: 'Khreshchatyk',
      recipientBuilding: '1',
      recipientApartment: '5',
    })

    expect(result?.deliveryType).toBe('NOVA_POSHTA_COURIER')
    expect(result?.recipientStreet).toBe('Khreshchatyk')
    expect(result?.recipientWarehouseRef).toBeNull()
  })

  it('estimates delivery total across grouped store shipments', async () => {
    mockListStoreShippingSettingsByStoreIds.mockResolvedValueOnce([
      {
        storeId: 'store-1',
        senderCityRef: 'sender-city-ref',
        senderWarehouseRef: 'sender-warehouse-ref',
      },
      {
        storeId: 'store-2',
        senderCityRef: 'sender-city-ref-2',
        senderWarehouseRef: 'sender-warehouse-ref-2',
      },
    ] as never)
    mockGetNovaPoshtaProvider.mockReturnValue({
      estimateDelivery: vi
        .fn()
        .mockResolvedValueOnce({ estimatedCost: '80.00', currency: 'UAH' })
        .mockResolvedValueOnce({ estimatedCost: '120.00', currency: 'UAH' }),
    } as never)

    const result = await estimateCheckoutDeliveryTotal({
      orderItems: [
        { id: 'item-1', storeId: 'store-1', quantity: 1 },
        { id: 'item-2', storeId: 'store-2', quantity: 2 },
      ],
      deliverySelection: {
        provider: 'NOVA_POSHTA',
        deliveryType: 'NOVA_POSHTA_WAREHOUSE',
        recipientName: 'John Doe',
        recipientPhone: '+380000000000',
        recipientCityRef: 'city-ref',
        recipientCityName: 'Kyiv',
        recipientStreet: null,
        recipientBuilding: null,
        recipientApartment: null,
        recipientWarehouseRef: 'warehouse-ref',
        recipientWarehouseName: 'Warehouse 1',
        estimatedCost: null,
        currency: 'UAH',
      },
    })

    expect(result.estimatedCost).toBe('200.00')
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
    mockFindShipmentById.mockResolvedValueOnce(
      makeShipment({
        status: 'IN_TRANSIT',
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

  it('syncs a shipment idempotently when provider status did not change', async () => {
    mockFindShipmentById.mockResolvedValueOnce(
      makeShipment({
        status: 'SHIPPED',
        trackingNumber: '20450000000001',
        providerShipmentId: 'provider-shipment-1',
      }),
    )
    mockGetNovaPoshtaProvider.mockReturnValue({
      getShipmentStatus: vi.fn().mockResolvedValue({
        trackingNumber: '20450000000001',
        providerShipmentId: 'provider-shipment-1',
        rawStatus: 'Відправлення передано до Nova Poshta',
        internalStatus: 'SHIPPED',
      }),
    } as never)

    const result = await syncShipmentStatus('shipment-1')

    expect(result.changed).toBe(false)
    expect(mockUpdateShipmentById).not.toHaveBeenCalled()
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

  it('creates courier TTN for own shipment', async () => {
    mockFindShipmentById.mockResolvedValueOnce(
      makeShipment({
        deliveryType: 'NOVA_POSHTA_COURIER',
        recipientStreet: 'Khreshchatyk',
        recipientBuilding: '1',
        recipientApartment: '5',
        recipientWarehouseRef: null,
        recipientWarehouseName: null,
      }),
    )
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
    const createShipment = vi.fn().mockResolvedValue({
      trackingNumber: '20451234567891',
      providerShipmentId: 'provider-shipment-2',
      rawStatus: null,
    })
    mockGetNovaPoshtaProvider.mockReturnValue({
      createShipment,
    } as never)

    const result = await createMyShipmentTtn(user, 'shipment-1')

    expect(createShipment).toHaveBeenCalledWith(
      expect.objectContaining({
        deliveryType: 'NOVA_POSHTA_COURIER',
        recipientStreet: 'Khreshchatyk',
        recipientBuilding: '1',
      }),
    )
    expect(result.trackingNumber).toBe('20451234567891')
  })

  it('creates return shipment foundation for seller shipment', async () => {
    mockFindShipmentById.mockResolvedValueOnce(
      makeShipment({
        status: 'DELIVERED',
        trackingNumber: '20450000000001',
      }),
    )
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

    const result = await createMyReturnShipment(user, 'shipment-1')

    expect(mockCreateReturnShipment).toHaveBeenCalledWith(
      expect.objectContaining({
        originalShipmentId: 'shipment-1',
        orderId: 'order-1',
        storeId: 'store-1',
      }),
    )
    expect(result.isReturnShipment).toBe(true)
    expect(result.originalShipmentId).toBe('shipment-1')
  })

  it('admin can create return shipment foundation safely', async () => {
    mockFindShipmentById.mockResolvedValueOnce(
      makeShipment({
        status: 'DELIVERED',
        trackingNumber: '20450000000001',
      }),
    )
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

    const result = await createAdminReturnShipment(adminUser, 'shipment-1')

    expect(result.isReturnShipment).toBe(true)
  })

  it('prevents duplicate return shipment foundation', async () => {
    mockFindShipmentById.mockResolvedValueOnce(
      makeShipment({
        status: 'DELIVERED',
        returnShipments: [
          {
            id: 'return-shipment-1',
            status: 'PENDING',
            trackingNumber: null,
            createdAt: new Date(),
          },
        ],
      }),
    )

    await expect(createMyReturnShipment(user, 'shipment-1')).rejects.toThrow(
      ShipmentAlreadyReturnedError,
    )
  })

  it('bulk TTN creation reports partial success', async () => {
    mockFindStoreShippingSettingsByStoreId.mockResolvedValue({
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
    mockFindShipmentById
      .mockResolvedValueOnce(makeShipment({ id: 'shipment-1' }))
      .mockResolvedValueOnce(makeShipment({ id: 'shipment-2', trackingNumber: '20450000000001' }))
    mockGetNovaPoshtaProvider.mockReturnValue({
      createShipment: vi.fn().mockResolvedValue({
        trackingNumber: '20451234567890',
        providerShipmentId: 'provider-shipment-1',
        rawStatus: null,
      }),
    } as never)

    const result = await bulkCreateMyShipmentTtns(user, ['shipment-1', 'shipment-2'])

    expect(result.results).toEqual([
      expect.objectContaining({ shipmentId: 'shipment-1', success: true }),
      expect.objectContaining({ shipmentId: 'shipment-2', success: false }),
    ])
  })

  it('syncs pending shipments in bulk', async () => {
    mockListTrackableShipments.mockResolvedValueOnce([
      makeShipment({
        id: 'shipment-1',
        status: 'LABEL_CREATED',
        trackingNumber: '20450000000001',
        providerShipmentId: 'provider-shipment-1',
      }),
    ] as never)
    mockGetNovaPoshtaProvider.mockReturnValue({
      getShipmentStatus: vi.fn().mockResolvedValue({
        trackingNumber: '20450000000001',
        providerShipmentId: 'provider-shipment-1',
        rawStatus: 'Відправлення вручено',
        internalStatus: 'DELIVERED',
      }),
    } as never)

    const result = await syncPendingShipments(10)

    expect(result.results[0]).toEqual(
      expect.objectContaining({
        shipmentId: 'shipment-1',
        currentStatus: 'DELIVERED',
        changed: true,
      }),
    )
    expect(mockCreateOrderNotification).toHaveBeenCalled()
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
        recipientStreet: null,
        recipientBuilding: null,
        recipientApartment: null,
        recipientWarehouseRef: 'warehouse-ref',
        recipientWarehouseName: 'Warehouse 1',
        estimatedCost: null,
        currency: 'UAH',
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
          recipientStreet: null,
          recipientBuilding: null,
          recipientApartment: null,
          recipientWarehouseRef: 'warehouse-ref',
          recipientWarehouseName: 'Warehouse 1',
          estimatedCost: null,
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
          recipientStreet: null,
          recipientBuilding: null,
          recipientApartment: null,
          recipientWarehouseRef: 'warehouse-ref',
          recipientWarehouseName: 'Warehouse 1',
          estimatedCost: null,
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
