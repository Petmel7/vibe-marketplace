import { wishlistApi } from '../api/wishlist.api'

export const wishlistService = {
    async toggle(
        productId: string,
        alreadyExists: boolean,
    ) {
        if (alreadyExists) {
            return wishlistApi.remove(productId)
        }

        return wishlistApi.add(productId)
    },
}