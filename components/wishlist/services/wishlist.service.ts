import { wishlistApi } from '../api/wishlist.api'
import {
  ApiError,
  UnauthorizedError as SharedUnauthorizedError,
} from '@/shared/api/api.errors'
import {
  UnauthorizedError,
  WishlistApiError,
} from '../errors/wishlist.errors'
import type { WishlistToggleDto } from '@/features/wishlist/wishlist.dto'

export const wishlistService = {
    async toggle(
        productId: string,
        alreadyExists: boolean,
    ): Promise<WishlistToggleDto> {
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
                return {
                    productId,
                    wished: false,
                }
            }

            if (
                !alreadyExists &&
                error instanceof ApiError &&
                error.status === 409
            ) {
                return {
                    productId,
                    wished: true,
                }
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
