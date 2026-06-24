import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/logger', () => ({
  logInfo: vi.fn(),
  logWarn: vi.fn(),
}))

import { NovaPoshtaCreateShipmentError, ShippingProviderError } from '@/lib/errors/shipping'
import { logInfo } from '@/utils/logger'
import { InMemoryNovaPoshtaDirectoryCache } from './nova-poshta-directory-cache'
import {
  NovaPoshtaProvider,
  formatNovaPoshtaDate,
  normalizeNovaPoshtaCityQuery,
} from './nova-poshta.provider'

const fetchMock = vi.fn()
const mockLogInfo = vi.mocked(logInfo)

function createProvider(overrides?: {
  directoryCacheEnabled?: boolean
  citySearchCacheTtlMs?: number
  warehouseLookupCacheTtlMs?: number
}) {
  return new NovaPoshtaProvider(
    {
      apiKey: 'nova-poshta-api-key',
      apiUrl: 'https://api.novaposhta.example/json/',
      directoryCacheEnabled: overrides?.directoryCacheEnabled ?? true,
      citySearchCacheTtlMs: overrides?.citySearchCacheTtlMs ?? 24 * 60 * 60 * 1000,
      warehouseLookupCacheTtlMs: overrides?.warehouseLookupCacheTtlMs ?? 12 * 60 * 60 * 1000,
      logDiagnostics: false,
    },
    new InMemoryNovaPoshtaDirectoryCache(),
  )
}

function mockFetchSuccess(payload: unknown) {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    text: vi.fn().mockResolvedValue(JSON.stringify(payload)),
  })
}

describe('NovaPoshtaProvider directory cache', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-08T10:00:00.000Z'))
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('returns empty results without provider call for short city queries', async () => {
    const provider = createProvider()

    await expect(provider.searchCities(' ')).resolves.toEqual([])
    await expect(provider.searchCities('К')).resolves.toEqual([])

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('normalizes city queries for cache keys safely', () => {
    expect(normalizeNovaPoshtaCityQuery('  Київ   Область  ')).toBe('київ область')
  })

  it('caches city lookup results after first provider call', async () => {
    const provider = createProvider()
    mockFetchSuccess({
      success: true,
      data: [
        {
          Ref: 'city-ref',
          Description: 'Київ',
          AreaDescription: 'Київська',
          SettlementTypeDescription: 'місто',
        },
      ],
    })

    const first = await provider.searchCities('Київ')
    const second = await provider.searchCities('Київ')

    expect(first).toEqual(second)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('shares one cache entry for normalized city queries', async () => {
    const provider = createProvider()
    mockFetchSuccess({
      success: true,
      data: [
        {
          Ref: 'city-ref',
          Description: 'Київ',
        },
      ],
    })

    await provider.searchCities('  Київ   ')
    const cities = await provider.searchCities('київ')

    expect(cities[0]?.ref).toBe('city-ref')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('deduplicates city results by ref safely', async () => {
    const provider = createProvider()
    mockFetchSuccess({
      success: true,
      data: [
        { Ref: 'dup-ref', Description: 'РљРёС—РІ' },
        { Ref: 'dup-ref', Description: 'РљРёС—РІ дубль' },
        { Ref: 'unique-ref', Description: 'Р‘СЂРѕРІР°СЂРё' },
      ],
    })

    const cities = await provider.searchCities('РљРё')

    expect(cities).toHaveLength(2)
    expect(cities[0]?.ref).toBe('dup-ref')
    expect(cities[1]?.ref).toBe('unique-ref')
  })

  it('caches warehouse lookup results after first provider call', async () => {
    const provider = createProvider()
    mockFetchSuccess({
      success: true,
      data: [
        {
          Ref: 'warehouse-ref',
          Description: 'Відділення 1',
          CityRef: 'city-ref',
          CityDescription: 'Київ',
        },
      ],
    })

    const first = await provider.getWarehouses('city-ref')
    const second = await provider.getWarehouses('city-ref')

    expect(first).toEqual(second)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('deduplicates warehouse results by ref safely', async () => {
    const provider = createProvider()
    mockFetchSuccess({
      success: true,
      data: [
        {
          Ref: 'warehouse-ref',
          Description: 'Р’С–РґРґС–Р»РµРЅРЅСЏ 1',
          CityRef: 'city-ref',
          CityDescription: 'РљРёС—РІ',
        },
        {
          Ref: 'warehouse-ref',
          Description: 'Р’С–РґРґС–Р»РµРЅРЅСЏ 1 дубль',
          CityRef: 'city-ref',
          CityDescription: 'РљРёС—РІ',
        },
      ],
    })

    const warehouses = await provider.getWarehouses('city-ref')

    expect(warehouses).toHaveLength(1)
    expect(warehouses[0]?.ref).toBe('warehouse-ref')
  })

  it('refetches after cache expiration', async () => {
    const provider = createProvider({ citySearchCacheTtlMs: 1_000 })
    mockFetchSuccess({
      success: true,
      data: [{ Ref: 'city-ref-1', Description: 'Київ' }],
    })
    mockFetchSuccess({
      success: true,
      data: [{ Ref: 'city-ref-2', Description: 'Київ' }],
    })

    const first = await provider.searchCities('Київ')
    vi.advanceTimersByTime(1_001)
    const second = await provider.searchCities('Київ')

    expect(first[0]?.ref).toBe('city-ref-1')
    expect(second[0]?.ref).toBe('city-ref-2')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not cache failed provider responses', async () => {
    const provider = createProvider()
    fetchMock.mockRejectedValueOnce(new Error('network down'))
    mockFetchSuccess({
      success: true,
      data: [{ Ref: 'city-ref', Description: 'Київ' }],
    })

    await expect(provider.searchCities('Київ')).rejects.toThrow(ShippingProviderError)
    const second = await provider.searchCities('Київ')

    expect(second[0]?.ref).toBe('city-ref')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('can disable directory cache safely', async () => {
    const provider = createProvider({ directoryCacheEnabled: false })
    mockFetchSuccess({
      success: true,
      data: [{ Ref: 'city-ref-1', Description: 'Київ' }],
    })
    mockFetchSuccess({
      success: true,
      data: [{ Ref: 'city-ref-2', Description: 'Київ' }],
    })

    const first = await provider.searchCities('Київ')
    const second = await provider.searchCities('Київ')

    expect(first[0]?.ref).toBe('city-ref-1')
    expect(second[0]?.ref).toBe('city-ref-2')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('coalesces concurrent warehouse lookups for one city', async () => {
    const provider = createProvider()
    let resolveFetch: ((value: Response) => void) | undefined

    fetchMock.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve
        }),
    )

    const firstPromise = provider.getWarehouses('city-ref')
    const secondPromise = provider.getWarehouses('city-ref')

    resolveFetch?.(
      new Response(
        JSON.stringify({
          success: true,
          data: [
            {
              Ref: 'warehouse-ref',
              Description: 'Відділення 1',
              CityRef: 'city-ref',
              CityDescription: 'Київ',
            },
          ],
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    )

    const [first, second] = await Promise.all([firstPromise, secondPromise])

    expect(first).toEqual(second)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('sends FindByString to getCities and maps provider city fields correctly', async () => {
    const provider = createProvider()
    mockFetchSuccess({
      success: true,
      data: [
        {
          Ref: 'kyiv-ref',
          Description: 'Київ',
          AreaDescription: 'Київська',
          SettlementTypeDescription: 'м.',
        },
      ],
    })

    const cities = await provider.searchCities('Ки')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.novaposhta.example/json/',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        body: JSON.stringify({
          apiKey: 'nova-poshta-api-key',
          modelName: 'Address',
          calledMethod: 'getCities',
          methodProperties: {
            FindByString: 'Ки',
            Limit: 20,
          },
        }),
      }),
    )
    expect(cities).toEqual([
      {
        ref: 'kyiv-ref',
        name: 'Київ',
        area: 'Київська',
        settlementType: 'м.',
      },
    ])
  })

  it('counterparty lookup includes FindByString', async () => {
    const provider = createProvider()
    mockFetchSuccess({
      success: true,
      data: [{ Ref: 'sender-ref', Description: 'Sender' }],
    })

    await provider.getCounterparties({
      counterpartyProperty: 'Sender',
      findByString: 'Sender',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.novaposhta.example/json/',
      expect.objectContaining({
        body: JSON.stringify({
          apiKey: 'nova-poshta-api-key',
          modelName: 'Counterparty',
          calledMethod: 'getCounterparties',
          methodProperties: {
            CounterpartyProperty: 'Sender',
            FindByString: 'Sender',
            Page: 1,
          },
        }),
      }),
    )
    expect(mockLogInfo).toHaveBeenCalledWith(
      'shipping:nova-poshta-counterparty-lookup-request',
      expect.objectContaining({
        methodProperties: {
          CounterpartyProperty: 'Sender',
          FindByString: 'Sender',
          Page: 1,
        },
      }),
    )
  })

  it('returns an empty list when provider search returns no cities', async () => {
    const provider = createProvider()
    mockFetchSuccess({
      success: true,
      data: [],
    })

    await expect(provider.searchCities('Ки')).resolves.toEqual([])
  })

  it('does not cache empty city search results so valid provider results are not masked later', async () => {
    const provider = createProvider()
    mockFetchSuccess({
      success: true,
      data: [],
    })
    mockFetchSuccess({
      success: true,
      data: [
        {
          Ref: 'kyiv-ref',
          Description: 'Київ',
          AreaDescription: 'Київська',
          SettlementTypeDescription: 'м.',
        },
      ],
    })

    const first = await provider.searchCities('Ки')
    const second = await provider.searchCities('Ки')

    expect(first).toEqual([])
    expect(second).toEqual([
      {
        ref: 'kyiv-ref',
        name: 'Київ',
        area: 'Київська',
        settlementType: 'м.',
      },
    ])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('NovaPoshtaProvider shipment contracts', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('formats Nova Poshta dates as dd.MM.yyyy', () => {
    expect(formatNovaPoshtaDate(new Date('2026-06-23T12:00:00.000Z'))).toBe('23.06.2026')
  })

  it('rejects invalid cargo fields before provider call', async () => {
    const provider = createProvider()

    await expect(
      provider.createShipment({
        shipmentId: 'shipment-1',
        orderId: 'order-1',
        deliveryType: 'NOVA_POSHTA_WAREHOUSE',
        senderName: 'Sender',
        senderPhone: '+380000000000',
        senderCityRef: 'sender-city-ref',
        senderCityName: 'Kyiv',
        senderWarehouseRef: 'sender-warehouse-ref',
        senderWarehouseName: 'Warehouse 1',
        senderCounterpartyRef: 'sender-counterparty-ref',
        senderContactRef: 'sender-contact-ref',
        senderAddressRef: 'sender-address-ref',
        recipientName: 'Recipient',
        recipientFirstName: 'Петро',
        recipientLastName: 'Мельничин',
        recipientMiddleName: null,
        recipientPhone: '+380111111111',
        recipientCityRef: 'recipient-city-ref',
        recipientCityName: 'Lviv',
        recipientStreet: null,
        recipientBuilding: null,
        recipientApartment: null,
        recipientWarehouseRef: 'recipient-warehouse-ref',
        recipientWarehouseName: 'Warehouse 2',
        recipientCounterpartyRef: 'recipient-counterparty-ref',
        recipientContactRef: 'recipient-contact-ref',
        cargoDescription: 'Order #1',
        weight: '0',
        volumeGeneral: '0.001',
        seatsAmount: 1,
        declaredCost: '600',
      }),
    ).rejects.toThrow(NovaPoshtaCreateShipmentError)

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sends TTN payload with refs, cargo fields, and Nova Poshta date format', async () => {
    const provider = createProvider()
    mockFetchSuccess({
      success: true,
      data: [
        {
          Ref: 'provider-shipment-1',
          IntDocNumber: '20451234567890',
        },
      ],
    })

    await provider.createShipment({
      shipmentId: 'shipment-1',
      orderId: 'order-1',
      deliveryType: 'NOVA_POSHTA_WAREHOUSE',
      senderName: 'Sender',
      senderPhone: '+380000000000',
      senderCityRef: 'sender-city-ref',
      senderCityName: 'Kyiv',
      senderWarehouseRef: 'sender-warehouse-ref',
      senderWarehouseName: 'Warehouse 1',
      senderCounterpartyRef: 'sender-counterparty-ref',
      senderContactRef: 'sender-contact-ref',
      senderAddressRef: 'sender-address-ref',
      recipientName: 'Recipient',
      recipientFirstName: 'Петро',
      recipientLastName: 'Мельничин',
      recipientMiddleName: 'Йосипович',
      recipientPhone: '+380111111111',
      recipientCityRef: 'recipient-city-ref',
      recipientCityName: 'Lviv',
      recipientStreet: null,
      recipientBuilding: null,
      recipientApartment: null,
      recipientWarehouseRef: 'recipient-warehouse-ref',
      recipientWarehouseName: 'Warehouse 2',
      recipientCounterpartyRef: 'recipient-counterparty-ref',
      recipientContactRef: 'recipient-contact-ref',
      cargoDescription: 'Order #1',
      weight: '1',
      volumeGeneral: '0.001',
      seatsAmount: 1,
      declaredCost: '600',
    })

    const request = fetchMock.mock.calls[0]?.[1]
    const body = JSON.parse(String(request?.body ?? '{}'))

    expect(body.methodProperties).toEqual(
      expect.objectContaining({
        DateTime: expect.stringMatching(/^\d{2}\.\d{2}\.\d{4}$/),
        Sender: 'sender-counterparty-ref',
        ContactSender: 'sender-contact-ref',
        SenderAddress: 'sender-address-ref',
        Recipient: 'recipient-counterparty-ref',
        ContactRecipient: 'recipient-contact-ref',
        FirstName: 'Петро',
        LastName: 'Мельничин',
        MiddleName: 'Йосипович',
        Weight: '1',
        VolumeGeneral: '0.001',
        SeatsAmount: '1',
      }),
    )
  })

  it('maps provider validation errors to 422 during TTN creation', async () => {
    const provider = createProvider()
    mockFetchSuccess({
      success: false,
      errors: ['Weight is invalid', 'ContactRecipient is incorrect'],
      warnings: [],
      info: [],
      data: [],
    })

    await expect(
      provider.createShipment({
        shipmentId: 'shipment-1',
        orderId: 'order-1',
        deliveryType: 'NOVA_POSHTA_WAREHOUSE',
        senderName: 'Sender',
        senderPhone: '+380000000000',
        senderCityRef: 'sender-city-ref',
        senderCityName: 'Kyiv',
        senderWarehouseRef: 'sender-warehouse-ref',
        senderWarehouseName: 'Warehouse 1',
        senderCounterpartyRef: 'sender-counterparty-ref',
        senderContactRef: 'sender-contact-ref',
        senderAddressRef: 'sender-address-ref',
        recipientName: 'Recipient',
        recipientFirstName: 'Петро',
        recipientLastName: 'Мельничин',
        recipientMiddleName: null,
        recipientPhone: '+380111111111',
        recipientCityRef: 'recipient-city-ref',
        recipientCityName: 'Lviv',
        recipientStreet: null,
        recipientBuilding: null,
        recipientApartment: null,
        recipientWarehouseRef: 'recipient-warehouse-ref',
        recipientWarehouseName: 'Warehouse 2',
        recipientCounterpartyRef: 'recipient-counterparty-ref',
        recipientContactRef: 'recipient-contact-ref',
        cargoDescription: 'Order #1',
        weight: '1',
        volumeGeneral: '0.001',
        seatsAmount: 1,
        declaredCost: '600',
      }),
    ).rejects.toMatchObject({
      statusCode: 422,
    })
  })

})
