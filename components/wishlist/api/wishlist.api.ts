
import { apiClient }
    from '@/shared/api/api.client'

import type { WishlistDto }
    from '@/features/wishlist/wishlist.dto'

interface WishlistItemsData {
    items: WishlistDto[]
}

export const wishlistApi = {
    add(productId: string) {
        return apiClient.post<void>(
            '/api/wishlist',
            {
                productId,
            },
            {
                auth: true,
            },
        )
    },

    remove(productId: string) {
        return apiClient.delete<void>(
            `/api/wishlist/${productId}`,
            {
                auth: true,
            },
        )
    },

    getAll() {
        return apiClient.get<WishlistItemsData>(
            '/api/wishlist',
            {
                auth: true,
            },
        )
    },
}