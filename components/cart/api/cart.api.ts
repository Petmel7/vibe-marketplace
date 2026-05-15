
import { apiClient } from '@/shared/api/api.client'
import type { CartDto } from '@/features/cart/cart.dto'

export const cartApi = {
    get(sessionId: string) {
        return apiClient.get<CartDto>(
            '/api/cart',
            {
                headers: {
                    'x-session-id': sessionId,
                },
            },
        )
    },

    updateItem(
        sessionId: string,
        itemId: string,
        quantity: number,
    ) {
        return apiClient.patch<CartDto>(
            `/api/cart/items/${itemId}`,
            {
                quantity,
            },
            {
                headers: {
                    'x-session-id': sessionId,
                },
            },
        )
    },

    removeItem(
        sessionId: string,
        itemId: string,
    ) {
        return apiClient.delete<CartDto>(
            `/api/cart/items/${itemId}`,
            {
                headers: {
                    'x-session-id': sessionId,
                },
            },
        )
    },
}
