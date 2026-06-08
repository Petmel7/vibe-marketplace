import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/logger', () => ({
  logInfo: vi.fn(),
  logWarn: vi.fn(),
}))

import { ShippingProviderError } from '@/lib/errors/shipping'
import {
  InMemoryNovaPoshtaDirectoryCache,
} from './nova-poshta-directory-cache'
import {
  NovaPoshtaProvider,
  normalizeNovaPoshtaCityQuery,
} from './nova-poshta.provider'

const fetchMock = vi.fn()

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
    json: vi.fn().mockResolvedValue(payload),
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

  it('normalizes city queries for cache keys safely', () => {
    expect(normalizeNovaPoshtaCityQuery('  Київ   Область  ')).toBe('київ область')
  })

  it('caches city lookup results after first provider call', async () => {
    const provider = createProvider()
    mockFetchSuccess({
      success: true,
      data: [
        {
          Addresses: [
            {
              Ref: 'city-ref',
              Description: 'Київ',
              AreaDescription: 'Київська',
              SettlementTypeDescription: 'місто',
            },
          ],
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
          Addresses: [
            {
              Ref: 'city-ref',
              Description: 'Київ',
            },
          ],
        },
      ],
    })

    await provider.searchCities('  КиЇв   ')
    const cities = await provider.searchCities('київ')

    expect(cities[0]?.ref).toBe('city-ref')
    expect(fetchMock).toHaveBeenCalledTimes(1)
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

  it('refetches after cache expiration', async () => {
    const provider = createProvider({ citySearchCacheTtlMs: 1_000 })
    mockFetchSuccess({
      success: true,
      data: [{ Addresses: [{ Ref: 'city-ref-1', Description: 'Київ' }] }],
    })
    mockFetchSuccess({
      success: true,
      data: [{ Addresses: [{ Ref: 'city-ref-2', Description: 'Київ' }] }],
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
      data: [{ Addresses: [{ Ref: 'city-ref', Description: 'Київ' }] }],
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
      data: [{ Addresses: [{ Ref: 'city-ref-1', Description: 'Київ' }] }],
    })
    mockFetchSuccess({
      success: true,
      data: [{ Addresses: [{ Ref: 'city-ref-2', Description: 'Київ' }] }],
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
})
