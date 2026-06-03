export const API_ROUTES = {
  productSearch: '/api/products/search',
  authMe: '/api/auth/me',
  visitorInit: '/api/visitor/init',
  wishlist: '/api/wishlist',
  cart: '/api/cart',
  cartItems: '/api/cart/items',
  checkoutPreview: '/api/checkout',
  checkoutSubmit: '/api/checkout',
  checkoutPromotionApply: '/api/checkout/promotions/apply',
  notifications: '/api/notifications',
  notificationsUnreadCount: '/api/notifications/unread-count',
  notificationsReadAll: '/api/notifications/read-all',
  profileAddresses: '/api/profile/addresses',
  categoriesTree: '/api/categories/tree',
  reports: '/api/reports',
  disputes: '/api/disputes',
  profileReports: '/api/profile/reports',
  adminReviews: '/api/admin/reviews',
  adminReports: '/api/admin/reports',
  adminDisputes: '/api/admin/disputes',
  adminBadgeRules: '/api/admin/badge-rules',
  adminHitBadgeRule: '/api/admin/badge-rules/hit',
  adminPromotions: '/api/admin/promotions',
  adminCategories: '/api/admin/categories',
  adminCategoryReorder: '/api/admin/categories/reorder',
  adminEmails: '/api/admin/emails',
  adminRiskUsers: '/api/admin/risk/users',
  adminRiskStores: '/api/admin/risk/stores',
  adminRiskRecalculate: '/api/admin/risk/recalculate',
  sellerPromotions: '/api/seller/promotions',
  sellerFinanceSummary: '/api/seller/finance/summary',
  sellerFinanceLedger: '/api/seller/finance/ledger',
  sellerFinancePayouts: '/api/seller/finance/payouts',
  adminPayouts: '/api/admin/payouts',
  adminSellerBalances: '/api/admin/seller-balances',
  adminSellerBalancesRecalculate: '/api/admin/seller-balances/recalculate',
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

export function getDisputeRoute(id: string) {
  return `${API_ROUTES.disputes}/${id}`
}

export function getDisputeMessagesRoute(id: string) {
  return `${getDisputeRoute(id)}/messages`
}

export function getDisputeEvidenceRoute(id: string) {
  return `${getDisputeRoute(id)}/evidence`
}

export function getAdminDisputeRoute(id: string) {
  return `${API_ROUTES.adminDisputes}/${id}`
}

export function getAdminDisputeStatusRoute(id: string) {
  return `${getAdminDisputeRoute(id)}/status`
}

export function getAdminDisputeResolveRoute(id: string) {
  return `${getAdminDisputeRoute(id)}/resolve`
}

export function getAdminRiskUserRoute(id: string) {
  return `${API_ROUTES.adminRiskUsers}/${id}`
}

export function getAdminRiskStoreRoute(id: string) {
  return `${API_ROUTES.adminRiskStores}/${id}`
}

export function getAdminPayoutDetailRoute(id: string) {
  return `${API_ROUTES.adminPayouts}/${id}`
}

export function getAdminPromotionDetailRoute(id: string) {
  return `${API_ROUTES.adminPromotions}/${id}`
}

export function getAdminPromotionStatusRoute(id: string) {
  return `${getAdminPromotionDetailRoute(id)}/status`
}

export function getSellerPromotionDetailRoute(id: string) {
  return `${API_ROUTES.sellerPromotions}/${id}`
}

export function getSellerPromotionStatusRoute(id: string) {
  return `${getSellerPromotionDetailRoute(id)}/status`
}

export function getAdminPayoutStatusRoute(id: string) {
  return `${getAdminPayoutDetailRoute(id)}/status`
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

export function getAdminReportRoute(id: string) {
  return `${API_ROUTES.adminReports}/${id}`
}

export function getReportEvidenceRoute(id: string) {
  return `${API_ROUTES.reports}/${id}/evidence`
}

export function getReportEvidenceItemRoute(id: string, evidenceId: string) {
  return `${getReportEvidenceRoute(id)}/${evidenceId}`
}

export function getAdminReportStatusRoute(id: string) {
  return `${API_ROUTES.adminReports}/${id}/status`
}

export function getAdminReportActionsRoute(id: string) {
  return `${API_ROUTES.adminReports}/${id}/actions`
}

export function getAdminReportEvidenceRoute(id: string) {
  return `${API_ROUTES.adminReports}/${id}/evidence`
}

export function isAuthPagePath(pathname: string | null | undefined) {
  return Boolean(pathname && AUTH_PAGE_PATHS.includes(pathname as (typeof AUTH_PAGE_PATHS)[number]))
}
