import { z } from 'zod'

export const checkoutSchema = z.object({
  cartId: z.string().uuid(),
  shippingAddressId: z.string().uuid(),
  note: z.string().max(500).optional(),
})
