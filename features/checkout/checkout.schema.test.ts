import {
  describe,
  expect,
  it,
} from 'vitest'
import { checkoutSchema } from '@/features/checkout/checkout.schema'

const validPayload = {
  cartId: '11111111-1111-4111-8111-111111111111',
  shippingAddressId:
    '22222222-2222-4222-8222-222222222222',
  acceptedPrivacy: true,
  paymentMethod: 'CASH_ON_DELIVERY' as const,
}

describe(
  'checkoutSchema',
  () => {
    it(
      'accepts checkout submissions when privacy consent is explicitly confirmed',
      () => {
        const result =
          checkoutSchema.safeParse(
            validPayload,
          )

        expect(
          result.success,
        ).toBe(true)
      },
    )

    it(
      'rejects checkout submissions without acceptedPrivacy=true',
      () => {
        const result =
          checkoutSchema.safeParse({
            ...validPayload,
            acceptedPrivacy:
              false,
          })

        expect(
          result.success,
        ).toBe(false)

        if (
          result.success
        ) {
          throw new Error(
            'Expected schema validation to fail',
          )
        }

        expect(
          result.error.issues[0]
            ?.message,
        ).toBe(
          'Підтвердьте згоду на обробку персональних даних.',
        )
      },
    )
  },
)
