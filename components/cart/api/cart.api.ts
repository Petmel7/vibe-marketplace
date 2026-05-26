import type { CartDto } from '@/features/cart/cart.dto'
import { API_ROUTES } from '@/lib/constants/apiRoutes'
import { apiClient } from '@/shared/api/api.client'

type CartIdentity =
  | { auth: true }
  | { auth?: false; sessionId: string }

function getRequestOptions(identity: CartIdentity) {
  if (identity.auth) {
    return { auth: true as const }
  }

  return {
    headers: {
      'x-session-id': identity.sessionId,
    },
  }
}

export const cartApi = {
  get(identity: CartIdentity) {
    return apiClient.get<CartDto>(API_ROUTES.cart, getRequestOptions(identity))
  },

  addItem(identity: CartIdentity, variantId: string, quantity: number) {
    return apiClient.post<CartDto>(
      API_ROUTES.cartItems,
      { variantId, quantity },
      getRequestOptions(identity),
    )
  },

  updateItem(identity: CartIdentity, itemId: string, quantity: number) {
    return apiClient.patch<CartDto>(
      `${API_ROUTES.cartItems}/${itemId}`,
      { quantity },
      getRequestOptions(identity),
    )
  },

  removeItem(identity: CartIdentity, itemId: string) {
    return apiClient.delete<CartDto>(
      `${API_ROUTES.cartItems}/${itemId}`,
      getRequestOptions(identity),
    )
  },
}
