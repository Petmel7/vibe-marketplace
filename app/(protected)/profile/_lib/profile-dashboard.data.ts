import { getMyOrders, getMyOrderById } from '@/features/orders/orders.service'
import { getMyAddresses } from '@/features/address/address.service'
import { getWishlist } from '@/features/wishlist/wishlist.service'
import { getRecentlyViewed } from '@/features/viewed/viewed.service'
import { getMyProfile } from '@/features/profile/profile.service'
import { getMyBuyerProfile } from '@/features/buyer/buyer.service'
import { ProfileNotFoundError } from '@/lib/errors/profile'
import type { SessionUser } from '@/types/auth'

export async function getProfileDashboardLayoutData(user: SessionUser) {
  try {
    const [profile, buyerProfile] = await Promise.all([
      getMyProfile(user),
      getMyBuyerProfile(user),
    ])

    return {
      user,
      profile,
      buyerProfile,
    }
  } catch (error) {
    if (error instanceof ProfileNotFoundError) {
      return {
        user,
        profile: null,
        buyerProfile: null,
      }
    }

    throw error
  }
}

export async function getProfileOverviewData(user: SessionUser) {
  const [layout, orders, addresses, wishlist, viewed] = await Promise.all([
    getProfileDashboardLayoutData(user),
    getMyOrders(user, { limit: 4, page: 1 }),
    getMyAddresses(user),
    getWishlist(user.id),
    getRecentlyViewed({ userId: user.id }),
  ])

  console.log("VIEWED:", viewed)

  const defaultAddress =
    addresses.find((address) => address.isDefault) ??
    (layout.buyerProfile?.defaultShippingAddressId
      ? addresses.find((address) => address.id === layout.buyerProfile?.defaultShippingAddressId) ?? null
      : null)

  return {
    ...layout,
    recentOrders: orders,
    defaultAddress,
    addressCount: addresses.length,
    wishlist,
    viewed,
  }
}

export async function getOrdersPageData(user: SessionUser) {
  return getMyOrders(user, { limit: 20, page: 1 })
}

export async function getOrderDetailPageData(user: SessionUser, orderId: string) {
  const [order, addresses] = await Promise.all([
    getMyOrderById(user, orderId),
    getMyAddresses(user),
  ])

  return {
    order,
    shippingAddress:
      order.shippingAddressId
        ? addresses.find((address) => address.id === order.shippingAddressId) ?? null
        : null,
  }
}

export async function getAddressesPageData(user: SessionUser) {
  return Promise.all([
    getProfileDashboardLayoutData(user),
    getMyAddresses(user),
  ]).then(([layout, addresses]) => ({
    ...layout,
    addresses,
  }))
}

export async function getWishlistPageData(user: SessionUser) {
  return getWishlist(user.id)
}

export async function getSettingsPageData(user: SessionUser) {
  return getProfileDashboardLayoutData(user)
}
