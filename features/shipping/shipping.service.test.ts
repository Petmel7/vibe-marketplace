import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/store/store.repository', () => ({
  findStoreByUserId: vi.fn(),
}))
vi.mock('@/features/shipping/shipping.repository', () => ({
  findStoreShippingSettingsByStoreId: vi.fn(),
  upsertStoreShippingSettings: vi.fn(),
}))
vi.mock('@/lib/auth/guards', () => ({
  requireSeller: vi.fn(),
}))
vi.mock('@/features/shipping/providers/nova-poshta.provider', () => ({
  getNovaPoshtaProvider: vi.fn(),
}))

import { requireSeller } from '@/lib/auth/guards'
import { findStoreByUserId } from '@/features/store/store.repository'
import {
  findStoreShippingSettingsByStoreId,
  upsertStoreShippingSettings,
} from '@/features/shipping/shipping.repository'
import { getNovaPoshtaProvider } from '@/features/shipping/providers/nova-poshta.provider'
import {
  buildShipmentDrafts,
  filterMissingShipmentDrafts,
  resolveCheckoutDeliverySelection,
  updateMyStoreShippingSettings,
} from '@/features/shipping/shipping.service'
import { StoreOwnershipError } from '@/lib/errors/seller'
import { NovaPoshtaWarehouseNotFoundError } from '@/lib/errors/shipping'
import type { SessionUser } from '@/features/auth/auth.dto'

const mockRequireSeller = vi.mocked(requireSeller)
const mockFindStoreByUserId = vi.mocked(findStoreByUserId)
const mockFindStoreShippingSettingsByStoreId = vi.mocked(findStoreShippingSettingsByStoreId)
const mockUpsertStoreShippingSettings = vi.mocked(upsertStoreShippingSettings)
const mockGetNovaPoshtaProvider = vi.mocked(getNovaPoshtaProvider)

const user: SessionUser = {
  id: 'user-1',
  email: 'seller@example.com',
  roles: ['SELLER'],
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
