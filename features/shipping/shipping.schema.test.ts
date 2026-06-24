import { describe, expect, it } from 'vitest'
import {
  bulkCreateShipmentTtnSchema,
  novaPoshtaEstimateSchema,
  novaPoshtaCitiesQuerySchema,
  novaPoshtaWarehousesQuerySchema,
  requiredCheckoutDeliverySelectionSchema,
  sellerShipmentListQuerySchema,
  shipmentSyncSchema,
  shipmentIdParamsSchema,
} from './shipping.schema'

function buildWarehouseSelection(overrides: Record<string, unknown> = {}) {
  return {
    deliveryType: 'NOVA_POSHTA_WAREHOUSE',
    recipientFirstName: 'Іван',
    recipientLastName: 'Петренко',
    recipientPhone: '+380000000000',
    recipientCityRef: 'city-ref',
    recipientCityName: 'Kyiv',
    recipientWarehouseRef: 'warehouse-ref',
    recipientWarehouseName: 'Warehouse 1',
    ...overrides,
  }
}

describe('shipping schema', () => {
  it('accepts empty city search query safely', () => {
    const parsed = novaPoshtaCitiesQuerySchema.safeParse({})
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.q).toBe('')
    }
  })

  it('requires cityRef for warehouse lookup', () => {
    const parsed = novaPoshtaWarehousesQuerySchema.safeParse({ cityRef: '' })
    expect(parsed.success).toBe(false)
  })

  it('requires courier street and building for courier delivery selection', () => {
    const parsed = requiredCheckoutDeliverySelectionSchema.safeParse({
      deliveryType: 'NOVA_POSHTA_COURIER',
      recipientFirstName: 'Іван',
      recipientLastName: 'Петренко',
      recipientPhone: '+380000000000',
      recipientCityRef: 'city-ref',
      recipientCityName: 'Kyiv',
    })

    expect(parsed.success).toBe(false)
  })

  it('still accepts complete warehouse delivery selection', () => {
    const parsed = requiredCheckoutDeliverySelectionSchema.safeParse(
      buildWarehouseSelection({
        recipientMiddleName: 'Іванович',
      }),
    )

    expect(parsed.success).toBe(true)
  })

  it('accepts regression case with Oleg Syuma', () => {
    const parsed = requiredCheckoutDeliverySelectionSchema.safeParse(
      buildWarehouseSelection({
        recipientFirstName: 'Олег',
        recipientLastName: 'Сюма',
      }),
    )

    expect(parsed.success).toBe(true)
  })

  it.each([
    'Олег',
    'Сюма',
    'Марія',
    'Іван',
    'Євген',
    'Ґалаган',
    'Анна-Марія',
    'О’Браєн',
  ])('accepts valid Ukrainian recipient names: %s', (name) => {
    const parsed = requiredCheckoutDeliverySelectionSchema.safeParse(
      buildWarehouseSelection({
        recipientFirstName: name,
      }),
    )

    expect(parsed.success).toBe(true)
  })

  it.each(['Petro', 'Тест1', 'Oлег'])('rejects invalid first names: %s', (name) => {
    const parsed = requiredCheckoutDeliverySelectionSchema.safeParse(
      buildWarehouseSelection({
        recipientFirstName: name,
      }),
    )

    expect(parsed.success).toBe(false)
  })

  it('rejects invalid last name with latin mix', () => {
    const parsed = requiredCheckoutDeliverySelectionSchema.safeParse(
      buildWarehouseSelection({
        recipientLastName: 'Oлег',
      }),
    )

    expect(parsed.success).toBe(false)
  })

  it('validates estimate delivery input safely', () => {
    const parsed = novaPoshtaEstimateSchema.safeParse({
      deliveryType: 'NOVA_POSHTA_COURIER',
      recipientCityRef: 'city-ref',
      recipientStreet: 'Khreshchatyk',
      recipientBuilding: '1',
    })

    expect(parsed.success).toBe(true)
  })

  it('accepts shipment list query defaults safely', () => {
    const parsed = sellerShipmentListQuerySchema.safeParse({})
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.page).toBe(1)
      expect(parsed.data.limit).toBe(20)
    }
  })

  it('requires a valid shipment id param', () => {
    const parsed = shipmentIdParamsSchema.safeParse({ id: 'bad-id' })
    expect(parsed.success).toBe(false)
  })

  it('validates bulk TTN request safely', () => {
    const parsed = bulkCreateShipmentTtnSchema.safeParse({
      shipmentIds: ['11111111-1111-4111-8111-111111111111'],
    })

    expect(parsed.success).toBe(true)
  })

  it('accepts sync defaults safely', () => {
    const parsed = shipmentSyncSchema.safeParse({})

    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.limit).toBe(50)
    }
  })
})
