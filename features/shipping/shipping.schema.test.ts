import { describe, expect, it } from 'vitest'
import {
  novaPoshtaCitiesQuerySchema,
  novaPoshtaWarehousesQuerySchema,
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
})
