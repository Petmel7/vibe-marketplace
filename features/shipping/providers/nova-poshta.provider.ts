import {
  NovaPoshtaCityNotFoundError,
  ShippingProviderError,
} from '@/lib/errors/shipping'
import type {
  NovaPoshtaCityDto,
  NovaPoshtaEstimateDto,
  NovaPoshtaEstimateInput,
  NovaPoshtaWarehouseDto,
} from '../shipping.dto'

type NovaPoshtaConfig = {
  apiKey: string
  apiUrl: string
}

type NovaPoshtaEnvelope<T> = {
  success?: boolean
  errors?: string[]
  data?: T[]
}

type NovaPoshtaCityResponse = {
  Ref: string
  Description: string
  AreaDescription?: string
  SettlementTypeDescription?: string
  Addresses?: NovaPoshtaCityResponse[]
}

type NovaPoshtaWarehouseResponse = {
  Ref: string
  Description: string
  CityRef: string
  CityDescription?: string
}

const DEFAULT_API_URL = 'https://api.novaposhta.ua/v2.0/json/'

function getConfigFromEnv(): NovaPoshtaConfig {
  const apiKey = process.env.NOVA_POSHTA_API_KEY?.trim()
  const apiUrl = process.env.NOVA_POSHTA_API_URL?.trim() || DEFAULT_API_URL

  if (!apiKey) {
    throw new ShippingProviderError('NOVA_POSHTA_API_KEY is not configured')
  }

  try {
    new URL(apiUrl)
  } catch {
    throw new ShippingProviderError('NOVA_POSHTA_API_URL must be a valid absolute URL')
  }

  return { apiKey, apiUrl }
}

export class NovaPoshtaProvider {
  constructor(private readonly config: NovaPoshtaConfig = getConfigFromEnv()) {}

  private async request<T>(modelName: string, calledMethod: string, methodProperties: object) {
    let response: Response

    try {
      response = await fetch(this.config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: this.config.apiKey,
          modelName,
          calledMethod,
          methodProperties,
        }),
        cache: 'no-store',
      })
    } catch {
      throw new ShippingProviderError('Nova Poshta request failed')
    }

    if (!response.ok) {
      throw new ShippingProviderError(`Nova Poshta responded with status ${response.status}`)
    }

    let payload: NovaPoshtaEnvelope<T>
    try {
      payload = (await response.json()) as NovaPoshtaEnvelope<T>
    } catch {
      throw new ShippingProviderError('Nova Poshta response could not be parsed')
    }

    if (!payload.success) {
      throw new ShippingProviderError(payload.errors?.[0] ?? 'Nova Poshta request was rejected')
    }

    return payload.data ?? []
  }

  async searchCities(query: string): Promise<NovaPoshtaCityDto[]> {
    if (!query.trim()) {
      return []
    }

    const cities = await this.request<NovaPoshtaCityResponse>('Address', 'searchSettlements', {
      CityName: query.trim(),
      Limit: 20,
    })

    return cities.flatMap((entry) => {
      const addresses = Array.isArray(entry.Addresses) ? entry.Addresses : [entry]

      return addresses
        .filter((city) => city.Ref && city.Description)
        .map((city) => ({
          ref: city.Ref,
          name: city.Description,
          area: city.AreaDescription ?? null,
          settlementType: city.SettlementTypeDescription ?? null,
        }))
    })
  }

  async getWarehouses(cityRef: string): Promise<NovaPoshtaWarehouseDto[]> {
    if (!cityRef.trim()) {
      return []
    }

    const warehouses = await this.request<NovaPoshtaWarehouseResponse>('Address', 'getWarehouses', {
      CityRef: cityRef.trim(),
      Limit: 200,
    })

    return warehouses
      .filter((warehouse) => warehouse.Ref && warehouse.Description)
      .map((warehouse) => ({
        ref: warehouse.Ref,
        name: warehouse.Description,
        cityRef: warehouse.CityRef,
        cityName: warehouse.CityDescription ?? null,
      }))
  }

  async estimateDelivery(input: NovaPoshtaEstimateInput): Promise<NovaPoshtaEstimateDto> {
    void input
    return {
      estimatedCost: null,
      currency: 'UAH',
    }
  }

  async assertCityHasWarehouses(cityRef: string) {
    const warehouses = await this.getWarehouses(cityRef)
    if (warehouses.length === 0) {
      throw new NovaPoshtaCityNotFoundError()
    }

    return warehouses
  }
}

let singletonProvider: NovaPoshtaProvider | null = null

export function getNovaPoshtaProvider() {
  singletonProvider ??= new NovaPoshtaProvider()
  return singletonProvider
}
