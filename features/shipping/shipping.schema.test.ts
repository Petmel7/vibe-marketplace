import { describe, expect, it } from 'vitest'
import {
  novaPoshtaCitiesQuerySchema,
  novaPoshtaWarehousesQuerySchema,
  sellerShipmentListQuerySchema,
  shipmentIdParamsSchema,
} from './shipping.schema'

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
})
