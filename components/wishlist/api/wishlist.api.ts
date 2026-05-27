import { apiClient }
    from '@/shared/api/api.client'
import {
    API_ROUTES,
    getWishlistItemRoute,
} from '@/lib/constants/apiRoutes'

import type { WishlistDto }
    from '@/features/wishlist/wishlist.dto'

interface WishlistItemsData {
    items: WishlistDto[]
}

export const wishlistApi = {
    add(productId: string) {
        return apiClient.post<void>(
            API_ROUTES.wishlist,
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
            getWishlistItemRoute(productId),
            {
                auth: true,
            },
        )
    },

    getAll() {
        return apiClient.get<WishlistItemsData>(
            API_ROUTES.wishlist,
            {
                auth: true,
            },
        )
    },
}
