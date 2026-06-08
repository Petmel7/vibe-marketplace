import {
  NovaPoshtaCancelShipmentError,
  NovaPoshtaCityNotFoundError,
  NovaPoshtaCreateShipmentError,
  NovaPoshtaTrackingError,
  ShippingProviderError,
} from '@/lib/errors/shipping'
import { getServerEnv } from '@/config/env'
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
    const providerResponse = await this.request<NovaPoshtaShipmentCreateResponse>(
      'InternetDocument',
      'save',
      {
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
      },
    ).catch(() => {
      throw new NovaPoshtaCreateShipmentError()
    })

    const created = providerResponse[0]
    const trackingNumber = created?.IntDocNumber?.trim()
    if (!trackingNumber) {
      throw new NovaPoshtaCreateShipmentError('Nova Poshta did not return a tracking number')
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
