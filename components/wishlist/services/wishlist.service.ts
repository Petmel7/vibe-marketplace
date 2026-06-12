import { wishlistApi } from '../api/wishlist.api'
import {
  ApiError,
  UnauthorizedError as SharedUnauthorizedError,
} from '@/shared/api/api.errors'
import {
  UnauthorizedError,
  WishlistApiError,
} from '../errors/wishlist.errors'

export const wishlistService = {
    async toggle(
        productId: string,
        alreadyExists: boolean,
    ) {
        try {
            if (alreadyExists) {
                return await wishlistApi.remove(productId)
            }

            return await wishlistApi.add(productId)
        } catch (error) {
            if (
                error instanceof SharedUnauthorizedError ||
                (error instanceof ApiError &&
                    error.status === 401)
            ) {
                throw new UnauthorizedError()
            }

            if (
                alreadyExists &&
                error instanceof ApiError &&
                error.status === 404
            ) {
                return
            }

            if (
                !alreadyExists &&
                error instanceof ApiError &&
                error.status === 409
            ) {
                return
            }

            if (error instanceof ApiError) {
                throw new WishlistApiError(
                    error.message,
                )
            }

            throw error
        }
    },
}
