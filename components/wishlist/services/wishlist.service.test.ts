import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import {
  ApiError,
  UnauthorizedError as SharedUnauthorizedError,
} from '@/shared/api/api.errors'
import {
  UnauthorizedError,
  WishlistApiError,
} from '@/components/wishlist/errors/wishlist.errors'
import { wishlistService } from '@/components/wishlist/services/wishlist.service'
import { wishlistApi } from '@/components/wishlist/api/wishlist.api'

vi.mock(
  '@/components/wishlist/api/wishlist.api',
  () => ({
    wishlistApi: {
      add: vi.fn(),
      remove: vi.fn(),
    },
  }),
)

const mockWishlistApi =
  vi.mocked(wishlistApi)

describe(
  'wishlistService.toggle',
  () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it(
      'treats add conflict as idempotent success',
      async () => {
        mockWishlistApi.add.mockRejectedValue(
          new ApiError(
            'Already in wishlist',
            409,
            'ALREADY_IN_WISHLIST',
          ),
        )

        await expect(
          wishlistService.toggle(
            'prod-1',
            false,
          ),
        ).resolves.toBeUndefined()
      },
    )

    it(
      'treats remove missing item as idempotent success',
      async () => {
        mockWishlistApi.remove.mockRejectedValue(
          new ApiError(
            'Missing wishlist item',
            404,
            'NOT_FOUND',
          ),
        )

        await expect(
          wishlistService.toggle(
            'prod-1',
            true,
          ),
        ).resolves.toBeUndefined()
      },
    )

    it(
      'maps unauthorized shared API errors to wishlist unauthorized errors',
      async () => {
        mockWishlistApi.add.mockRejectedValue(
          new SharedUnauthorizedError(),
        )

        await expect(
          wishlistService.toggle(
            'prod-1',
            false,
          ),
        ).rejects.toBeInstanceOf(
          UnauthorizedError,
        )
      },
    )

    it(
      'maps other API errors to wishlist API errors',
      async () => {
        mockWishlistApi.add.mockRejectedValue(
          new ApiError(
            'Server exploded',
            500,
            'INTERNAL_ERROR',
          ),
        )

        await expect(
          wishlistService.toggle(
            'prod-1',
            false,
          ),
        ).rejects.toBeInstanceOf(
          WishlistApiError,
        )
      },
    )
  },
)
