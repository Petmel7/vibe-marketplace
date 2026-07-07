import { apiClient }
    from '@/shared/api/api.client'
import {
    API_ROUTES,
    getWishlistItemRoute,
} from '@/lib/constants/apiRoutes'

import type {
    WishlistDto,
    WishlistToggleDto,
}
    from '@/features/wishlist/wishlist.dto'

interface WishlistItemsData {
    items: WishlistDto[]
}

export const wishlistApi = {
    add(productId: string) {
        return apiClient.post<WishlistToggleDto>(
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
        return apiClient.delete<WishlistToggleDto>(
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
