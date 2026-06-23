import {
  NovaPoshtaCancelShipmentError,
  NovaPoshtaCityNotFoundError,
  NovaPoshtaCreateShipmentError,
  NovaPoshtaTrackingError,
  ShippingProviderError,
} from '@/lib/errors/shipping'
import { getServerEnv } from '@/config/env'
import { logInfo, logWarn } from '@/utils/logger'
import type {
  NovaPoshtaCityDto,
  NovaPoshtaCreateShipmentDto,
  NovaPoshtaCreateShipmentInput,
  NovaPoshtaEstimateDto,
  NovaPoshtaEstimateInput,
  NovaPoshtaShipmentStatusDto,
  NovaPoshtaTrackingEventDto,
  NovaPoshtaWarehouseDto,
} from '../shipping.dto'
import { ShipmentStatus, ShippingDeliveryType } from '@/app/generated/prisma/client'
import {
  InMemoryNovaPoshtaDirectoryCache,
  type NovaPoshtaDirectoryCache,
} from './nova-poshta-directory-cache'

type NovaPoshtaConfig = {
  apiKey: string
  apiUrl: string
  directoryCacheEnabled: boolean
  citySearchCacheTtlMs: number
  warehouseLookupCacheTtlMs: number
  logDiagnostics: boolean
}

type NovaPoshtaEnvelope<T> = {
  success?: boolean
  errors?: string[]
  warnings?: string[]
  info?: string[]
  messageCodes?: string[]
  data?: T[]
}

type NovaPoshtaCityResponse = {
  Ref: string
  Description: string
  DescriptionRu?: string
  AreaDescription?: string
  SettlementTypeDescription?: string
}

type NovaPoshtaWarehouseResponse = {
  Ref: string
  Description: string
  CityRef: string
  CityDescription?: string
}

type NovaPoshtaShipmentCreateResponse = {
  Ref?: string
  IntDocNumber?: string
}

type NovaPoshtaShipmentStatusResponse = {
  Ref?: string
  Number?: string
  Status?: string
  StatusCode?: string
  ScheduledDeliveryDate?: string
}

type NovaPoshtaEstimateResponse = {
  AssessedCost?: number | string
  Cost?: number | string
}

const DEFAULT_API_URL = 'https://api.novaposhta.ua/v2.0/json/'
const FALLBACK_WAREHOUSE_ESTIMATE = '80.00'
const FALLBACK_COURIER_ESTIMATE = '120.00'
const DEFAULT_CITY_SEARCH_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const DEFAULT_WAREHOUSE_LOOKUP_CACHE_TTL_MS = 12 * 60 * 60 * 1000
const CITY_SEARCH_CACHE_VERSION = 'v2'

type NovaPoshtaRequestEnvelopeResult<T> = {
  payload: NovaPoshtaEnvelope<T>
  rawPayload: string
}

function normalizeCacheTtlMs(ttlSeconds: number | undefined, fallbackMs: number) {
  if (ttlSeconds == null) {
    return fallbackMs
  }

  return Math.max(1, ttlSeconds) * 1000
}

export function normalizeNovaPoshtaCityQuery(query: string) {
  return query.trim().toLowerCase().replace(/\s+/g, ' ')
}

function buildCitySearchCacheKey(query: string) {
  return `nova-poshta:cities:${CITY_SEARCH_CACHE_VERSION}:${normalizeNovaPoshtaCityQuery(query)}`
}

function buildWarehouseLookupCacheKey(cityRef: string) {
  return `nova-poshta:warehouses:${cityRef.trim()}`
}

function getConfigFromEnv(): NovaPoshtaConfig {
  const env = getServerEnv()
  const apiKey = env.NOVA_POSHTA_API_KEY?.trim()
  const apiUrl = env.NOVA_POSHTA_API_URL?.trim() || DEFAULT_API_URL

  if (!apiKey) {
    throw new ShippingProviderError('NOVA_POSHTA_API_KEY is not configured')
  }

  try {
    new URL(apiUrl)
  } catch {
    throw new ShippingProviderError('NOVA_POSHTA_API_URL must be a valid absolute URL')
  }

  return {
    apiKey,
    apiUrl,
    directoryCacheEnabled: env.NOVA_POSHTA_CACHE_ENABLED ?? true,
    citySearchCacheTtlMs: normalizeCacheTtlMs(
      env.NOVA_POSHTA_CACHE_TTL_SECONDS,
      DEFAULT_CITY_SEARCH_CACHE_TTL_MS,
    ),
    warehouseLookupCacheTtlMs: normalizeCacheTtlMs(
      env.NOVA_POSHTA_CACHE_TTL_SECONDS,
      DEFAULT_WAREHOUSE_LOOKUP_CACHE_TTL_MS,
    ),
    logDiagnostics: env.NODE_ENV !== 'production',
  }
}

const defaultDirectoryCache = new InMemoryNovaPoshtaDirectoryCache()

export class NovaPoshtaProvider {
  constructor(
    private readonly config: NovaPoshtaConfig = getConfigFromEnv(),
    private readonly directoryCache: NovaPoshtaDirectoryCache = defaultDirectoryCache,
  ) {}

  private logDirectoryCacheHit(key: string) {
    if (!this.config.logDiagnostics) return

    logInfo('shipping:nova-poshta-directory-cache-hit', {
      domain: 'shipping',
      cacheKey: key,
    })
  }

  private logDirectoryCacheMiss(key: string) {
    if (!this.config.logDiagnostics) return

    logInfo('shipping:nova-poshta-directory-cache-miss', {
      domain: 'shipping',
      cacheKey: key,
    })
  }

  private logDirectoryProviderFailure(key: string, error: unknown) {
    if (!this.config.logDiagnostics) return

    logWarn(
      'shipping:nova-poshta-directory-provider-failure',
      {
        domain: 'shipping',
        cacheKey: key,
      },
      error,
    )
  }

  private logCitySearchDiagnostics(input: {
    normalizedQuery: string
    providerResultCount: number
  }) {
    if (!this.config.logDiagnostics) return

    logInfo('shipping:nova-poshta-city-search', {
      domain: 'shipping',
      normalizedQuery: input.normalizedQuery,
      providerSuccess: true,
      resultCount: input.providerResultCount,
    })
  }

  private async requestEnvelope<T>(
    modelName: string,
    calledMethod: string,
    methodProperties: object,
  ): Promise<NovaPoshtaRequestEnvelopeResult<T>> {
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

    const rawPayload = await response.text()

    let payload: NovaPoshtaEnvelope<T>
    try {
      payload = JSON.parse(rawPayload) as NovaPoshtaEnvelope<T>
    } catch (error) {
      logWarn(
        'shipping:nova-poshta-response-parse-failure',
        {
          domain: 'shipping',
          modelName,
          calledMethod,
          rawPayload,
        },
        error,
      )
      throw new ShippingProviderError('Nova Poshta response could not be parsed')
    }

    return {
      payload,
      rawPayload,
    }
  }

  private async request<T>(modelName: string, calledMethod: string, methodProperties: object) {
    const { payload } = await this.requestEnvelope<T>(modelName, calledMethod, methodProperties)

    if (!payload.success) {
      throw new ShippingProviderError(payload.errors?.[0] ?? 'Nova Poshta request was rejected')
    }

    return payload.data ?? []
  }

  async searchCities(query: string): Promise<NovaPoshtaCityDto[]> {
    const normalizedQuery = normalizeNovaPoshtaCityQuery(query)
    if (!normalizedQuery) {
      return []
    }

    const cacheKey = buildCitySearchCacheKey(normalizedQuery)

    return this.directoryCache.getOrLoad({
      key: cacheKey,
      ttlMs: this.config.citySearchCacheTtlMs,
      enabled: this.config.directoryCacheEnabled,
      shouldCache: (cities) => cities.length > 0,
      onHit: (key) => this.logDirectoryCacheHit(key),
      onMiss: (key) => this.logDirectoryCacheMiss(key),
      onLoadError: (key, error) => this.logDirectoryProviderFailure(key, error),
      loader: async () => {
        const cities = await this.request<NovaPoshtaCityResponse>('Address', 'getCities', {
          FindByString: query.trim(),
          Limit: 20,
        })

        const mappedCities = cities
          .filter((city) => city.Ref && city.Description)
          .map((city) => ({
            ref: city.Ref,
            name: city.Description,
            area: city.AreaDescription ?? null,
            settlementType: city.SettlementTypeDescription ?? null,
          }))

        this.logCitySearchDiagnostics({
          normalizedQuery,
          providerResultCount: mappedCities.length,
        })

        return mappedCities
      },
    })
  }

  async getWarehouses(cityRef: string): Promise<NovaPoshtaWarehouseDto[]> {
    const normalizedCityRef = cityRef.trim()
    if (!normalizedCityRef) {
      return []
    }

    const cacheKey = buildWarehouseLookupCacheKey(normalizedCityRef)

    return this.directoryCache.getOrLoad({
      key: cacheKey,
      ttlMs: this.config.warehouseLookupCacheTtlMs,
      enabled: this.config.directoryCacheEnabled,
      onHit: (key) => this.logDirectoryCacheHit(key),
      onMiss: (key) => this.logDirectoryCacheMiss(key),
      onLoadError: (key, error) => this.logDirectoryProviderFailure(key, error),
      loader: async () => {
        const warehouses = await this.request<NovaPoshtaWarehouseResponse>(
          'Address',
          'getWarehouses',
          {
            CityRef: normalizedCityRef,
            Limit: 200,
          },
        )

        return warehouses
          .filter((warehouse) => warehouse.Ref && warehouse.Description)
          .map((warehouse) => ({
            ref: warehouse.Ref,
            name: warehouse.Description,
            cityRef: warehouse.CityRef,
            cityName: warehouse.CityDescription ?? null,
          }))
      },
    })
  }

  async estimateDelivery(input: NovaPoshtaEstimateInput): Promise<NovaPoshtaEstimateDto> {
    const fallbackEstimate =
      input.deliveryType === ShippingDeliveryType.NOVA_POSHTA_COURIER
        ? FALLBACK_COURIER_ESTIMATE
        : FALLBACK_WAREHOUSE_ESTIMATE

    if (!input.senderCityRef?.trim() || !input.recipientCityRef.trim()) {
      return {
        estimatedCost: fallbackEstimate,
        currency: 'UAH',
      }
    }

    try {
      const providerResponse = await this.request<NovaPoshtaEstimateResponse>(
        'InternetDocument',
        'getDocumentPrice',
        {
          CitySender: input.senderCityRef.trim(),
          CityRecipient: input.recipientCityRef.trim(),
          Weight: '1',
          ServiceType:
            input.deliveryType === ShippingDeliveryType.NOVA_POSHTA_COURIER
              ? 'WarehouseDoors'
              : 'WarehouseWarehouse',
          Cost: '1000',
          SeatsAmount: String(Math.max(1, input.seatsAmount ?? 1)),
        },
      )

      const estimate = providerResponse[0]
      const rawCost = estimate?.Cost ?? estimate?.AssessedCost
      if (rawCost == null) {
        return {
          estimatedCost: fallbackEstimate,
          currency: 'UAH',
        }
      }

      const numericCost = Number(rawCost)
      return {
        estimatedCost: Number.isFinite(numericCost)
          ? numericCost.toFixed(2)
          : fallbackEstimate,
        currency: 'UAH',
      }
    } catch {
      return {
        estimatedCost: fallbackEstimate,
        currency: 'UAH',
      }
    }
  }

  private mapStatusCodeToInternalStatus(rawStatus: string | null, statusCode: string | null) {
    const normalized = `${statusCode ?? ''} ${rawStatus ?? ''}`.toLowerCase()

    if (
      statusCode === '1' ||
      statusCode === '2' ||
      normalized.includes('створ') ||
      normalized.includes('наклад')
    ) {
      return ShipmentStatus.LABEL_CREATED
    }

    if (statusCode === '3' || normalized.includes('відправ')) {
      return ShipmentStatus.SHIPPED
    }

    if (
      normalized.includes('в дорозі') ||
      normalized.includes('переміщ') ||
      normalized.includes('транзит')
    ) {
      return ShipmentStatus.IN_TRANSIT
    }

    if (normalized.includes('прибул') || normalized.includes('у відділенні')) {
      return ShipmentStatus.ARRIVED
    }

    if (
      normalized.includes('отриман') ||
      normalized.includes('видан') ||
      normalized.includes('deliver')
    ) {
      return ShipmentStatus.DELIVERED
    }

    if (normalized.includes('повернен')) {
      return ShipmentStatus.RETURNED
    }

    if (normalized.includes('скасован')) {
      return ShipmentStatus.CANCELLED
    }

    if (
      normalized.includes('невдал') ||
      normalized.includes('відмов') ||
      normalized.includes('failed')
    ) {
      return ShipmentStatus.FAILED
    }

    return ShipmentStatus.LABEL_CREATED
  }

  async createShipment(input: NovaPoshtaCreateShipmentInput): Promise<NovaPoshtaCreateShipmentDto> {
    const cargoDescription = input.cargoDescription.trim() || `Shipment ${input.shipmentId}`
    const isCourier = input.deliveryType === ShippingDeliveryType.NOVA_POSHTA_COURIER
    const methodProperties = {
      PayerType: 'Recipient',
      PaymentMethod: 'Cash',
      DateTime: new Date().toISOString().slice(0, 10),
      CargoType: 'Cargo',
      ServiceType: isCourier ? 'WarehouseDoors' : 'WarehouseWarehouse',
      SeatsAmount: String(Math.max(1, input.seatsAmount)),
      Description: cargoDescription.slice(0, 90),
      Cost: input.declaredCost,
      CitySender: input.senderCityRef,
      Sender: input.senderCityRef,
      SenderAddress: input.senderWarehouseRef,
      ContactSender: input.senderName,
      SendersPhone: input.senderPhone,
      CityRecipient: input.recipientCityRef,
      ...(isCourier
        ? {
            RecipientAddressName: input.recipientStreet ?? undefined,
            RecipientHouse: input.recipientBuilding ?? undefined,
            RecipientFlat: input.recipientApartment ?? undefined,
            RecipientStreet: input.recipientStreet ?? undefined,
          }
        : {
            RecipientAddress: input.recipientWarehouseRef,
          }),
      ContactRecipient: input.recipientName,
      RecipientsPhone: input.recipientPhone,
    }

    logInfo('shipping:nova-poshta-create-shipment-request', {
      domain: 'shipping',
      shipmentId: input.shipmentId,
      orderId: input.orderId,
      deliveryType: input.deliveryType,
      senderCityRefExists: Boolean(input.senderCityRef?.trim()),
      senderWarehouseRefExists: Boolean(input.senderWarehouseRef?.trim()),
      recipientCityRefExists: Boolean(input.recipientCityRef?.trim()),
      recipientWarehouseRefExists: Boolean(input.recipientWarehouseRef?.trim()),
      recipientStreetExists: Boolean(input.recipientStreet?.trim()),
      recipientBuildingExists: Boolean(input.recipientBuilding?.trim()),
      seatsAmount: input.seatsAmount,
      declaredCost: input.declaredCost,
      serviceType: methodProperties.ServiceType,
    })

    const { payload, rawPayload } = await this.requestEnvelope<NovaPoshtaShipmentCreateResponse>(
      'InternetDocument',
      'save',
      methodProperties,
    ).catch((error) => {
      if (error instanceof NovaPoshtaCreateShipmentError) {
        throw error
      }

      throw new NovaPoshtaCreateShipmentError(
        error instanceof Error ? error.message : 'Nova Poshta shipment could not be created',
        { statusCode: 422 },
      )
    })

    logInfo('shipping:nova-poshta-create-shipment-response', {
      domain: 'shipping',
      shipmentId: input.shipmentId,
      providerSuccess: payload.success ?? false,
      errors: payload.errors ?? [],
      warnings: payload.warnings ?? [],
      info: payload.info ?? [],
      messageCodes: payload.messageCodes ?? [],
      dataCount: payload.data?.length ?? 0,
    })

    if (!payload.success) {
      const providerErrors = payload.errors ?? []
      const providerWarnings = payload.warnings ?? []
      const providerInfo = payload.info ?? []
      const providerMessage = [
        ...providerErrors,
        ...providerWarnings,
        ...providerInfo,
      ]
        .map((entry) => entry.trim())
        .filter(Boolean)
        .join('; ')

      const loweredMessage = providerMessage.toLowerCase()
      const statusCode =
        loweredMessage.includes('не знайден') ||
        loweredMessage.includes('не найден') ||
        loweredMessage.includes('invalid') ||
        loweredMessage.includes('must be') ||
        loweredMessage.includes('обов')
          ? 400
          : 422

      logWarn('shipping:nova-poshta-create-shipment-rejected', {
        domain: 'shipping',
        shipmentId: input.shipmentId,
        providerErrors,
        providerWarnings,
        providerInfo,
        rawPayload,
      })

      throw new NovaPoshtaCreateShipmentError(
        providerMessage || 'Nova Poshta shipment could not be created',
        {
          statusCode,
          providerErrors,
          providerWarnings,
          providerInfo,
        },
      )
    }

    const created = payload.data?.[0]
    const trackingNumber = created?.IntDocNumber?.trim()
    if (!trackingNumber) {
      logWarn('shipping:nova-poshta-create-shipment-missing-tracking', {
        domain: 'shipping',
        shipmentId: input.shipmentId,
        rawPayload,
      })

      throw new NovaPoshtaCreateShipmentError('Nova Poshta did not return a tracking number', {
        statusCode: 422,
      })
    }

    return {
      trackingNumber,
      providerShipmentId: created?.Ref?.trim() || null,
      rawStatus: null,
    }
  }

  async getShipmentStatus(input: {
    trackingNumber: string
  }): Promise<NovaPoshtaShipmentStatusDto> {
    const providerResponse = await this.request<NovaPoshtaShipmentStatusResponse>(
      'TrackingDocument',
      'getStatusDocuments',
      {
        Documents: [{ DocumentNumber: input.trackingNumber.trim() }],
      },
    ).catch(() => {
      throw new NovaPoshtaTrackingError()
    })

    const shipment = providerResponse[0]
    if (!shipment) {
      throw new NovaPoshtaTrackingError('Nova Poshta tracking data was not returned')
    }

    const rawStatus = shipment.Status?.trim() || null
    const statusCode = shipment.StatusCode?.trim() || null

    return {
      trackingNumber: shipment.Number?.trim() || input.trackingNumber.trim(),
      providerShipmentId: shipment.Ref?.trim() || null,
      rawStatus,
      internalStatus: this.mapStatusCodeToInternalStatus(rawStatus, statusCode),
    }
  }

  async cancelShipment(input: {
    trackingNumber: string
    providerShipmentId?: string | null
  }): Promise<void> {
    await this.request('InternetDocument', 'delete', {
      Ref: input.providerShipmentId?.trim() || undefined,
      IntDocNumber: input.trackingNumber.trim(),
    }).catch(() => {
      throw new NovaPoshtaCancelShipmentError()
    })
  }

  async getTrackingEvents(input: { trackingNumber: string }): Promise<NovaPoshtaTrackingEventDto[]> {
    const status = await this.getShipmentStatus(input)

    return status.rawStatus
      ? [
          {
            occurredAt: null,
            description: status.rawStatus,
            statusCode: null,
          },
        ]
      : []
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
