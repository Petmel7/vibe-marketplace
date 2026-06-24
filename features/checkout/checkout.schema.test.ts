import { describe, expect, it } from 'vitest'
import {
  checkoutPreviewSchema,
  checkoutSchema,
} from '@/features/checkout/checkout.schema'

const validBasePayload = {
  cartId: '11111111-1111-4111-8111-111111111111',
  shippingAddressId: '22222222-2222-4222-8222-222222222222',
  acceptedPrivacy: true,
  paymentMethod: 'CASH_ON_DELIVERY' as const,
}

const validNovaPoshtaRecipient = {
  deliveryType: 'NOVA_POSHTA_WAREHOUSE' as const,
  recipientName: 'Меличин Олег',
  recipientFirstName: 'Олег',
  recipientLastName: 'Меличин',
  recipientMiddleName: null,
  recipientPhone: '+380000000000',
  recipientCityRef: 'city-ref',
  recipientCityName: 'Самбір',
  recipientWarehouseRef: 'warehouse-ref',
  recipientWarehouseName: 'Відділення 1',
}

describe('checkoutSchema', () => {
  it('accepts checkout submissions when privacy consent is explicitly confirmed', () => {
    const result = checkoutSchema.safeParse(validBasePayload)
    expect(result.success).toBe(true)
  })

  it('rejects checkout submissions without acceptedPrivacy=true', () => {
    const result = checkoutSchema.safeParse({
      ...validBasePayload,
      acceptedPrivacy: false,
    })

    expect(result.success).toBe(false)

    if (result.success) {
      throw new Error('Expected schema validation to fail')
    }

    expect(result.error.issues[0]?.message).toBe(
      'Підтвердіть згоду на обробку персональних даних.',
    )
  })

  it('preview accepts valid structured Nova Poshta recipient fields', () => {
    const result = checkoutPreviewSchema.safeParse({
      cartId: validBasePayload.cartId,
      ...validNovaPoshtaRecipient,
    })

    expect(result.success).toBe(true)
  })

  it('submit accepts valid structured Nova Poshta recipient fields', () => {
    const result = checkoutSchema.safeParse({
      ...validBasePayload,
      ...validNovaPoshtaRecipient,
    })

    expect(result.success).toBe(true)
  })

  it('submit rejects latin O in recipientFirstName', () => {
    const result = checkoutSchema.safeParse({
      ...validBasePayload,
      ...validNovaPoshtaRecipient,
      recipientFirstName: 'Oлег',
      recipientName: 'Меличин Oлег',
    })

    expect(result.success).toBe(false)
  })

  it('submit rejects digits in recipientFirstName', () => {
    const result = checkoutSchema.safeParse({
      ...validBasePayload,
      ...validNovaPoshtaRecipient,
      recipientFirstName: 'Тест1',
      recipientName: 'Меличин Тест1',
    })

    expect(result.success).toBe(false)
  })
})
