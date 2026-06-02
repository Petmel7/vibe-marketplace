export const API_ROUTES = {
  authMe: '/api/auth/me',
  visitorInit: '/api/visitor/init',
  wishlist: '/api/wishlist',
  cart: '/api/cart',
  cartItems: '/api/cart/items',
  checkoutPreview: '/api/checkout',
  checkoutSubmit: '/api/checkout',
  notifications: '/api/notifications',
  notificationsUnreadCount: '/api/notifications/unread-count',
  notificationsReadAll: '/api/notifications/read-all',
  profileAddresses: '/api/profile/addresses',
  categoriesTree: '/api/categories/tree',
  adminReviews: '/api/admin/reviews',
  adminBadgeRules: '/api/admin/badge-rules',
  adminHitBadgeRule: '/api/admin/badge-rules/hit',
  adminCategories: '/api/admin/categories',
  adminCategoryReorder: '/api/admin/categories/reorder',
  adminEmails: '/api/admin/emails',
} as const

export const AUTH_PAGE_PATHS = ['/login', '/register'] as const

export type ApiRouteKey = keyof typeof API_ROUTES

export function getAdminEmailDetailRoute(id: string) {
  return `/api/admin/emails/${id}`
}

export function getAdminEmailRetryRoute(id: string) {
  return `/api/admin/emails/${id}/retry`
}

export function getOrderRoute(id: string) {
  return `/api/orders/${id}`
}

export function getWishlistItemRoute(productId: string) {
  return `${API_ROUTES.wishlist}/${productId}`
}

export function getNotificationRoute(id: string) {
  return `${API_ROUTES.notifications}/${id}`
}

export function getNotificationReadRoute(id: string) {
  return `${API_ROUTES.notifications}/${id}/read`
}

export function getProductReviewsRoute(productId: string) {
  return `/api/products/${productId}/reviews`
}

export function getReviewRoute(id: string) {
  return `/api/reviews/${id}`
}

export function getSellerReviewReplyRoute(id: string) {
  return `/api/seller/reviews/${id}/reply`
}

export function getAdminReviewModerateRoute(id: string) {
  return `/api/admin/reviews/${id}/moderate`
}

export function isAuthPagePath(pathname: string | null | undefined) {
  return Boolean(pathname && AUTH_PAGE_PATHS.includes(pathname as (typeof AUTH_PAGE_PATHS)[number]))
}
