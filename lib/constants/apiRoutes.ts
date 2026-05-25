export const API_ROUTES = {
  authMe: '/api/auth/me',
  visitorInit: '/api/visitor/init',
  categoriesTree: '/api/categories/tree',
  adminBadgeRules: '/api/admin/badge-rules',
  adminHitBadgeRule: '/api/admin/badge-rules/hit',
  adminCategories: '/api/admin/categories',
  adminCategoryReorder: '/api/admin/categories/reorder',
} as const

export const AUTH_PAGE_PATHS = ['/login', '/register'] as const

export type ApiRouteKey = keyof typeof API_ROUTES

export function isAuthPagePath(pathname: string | null | undefined) {
  return Boolean(pathname && AUTH_PAGE_PATHS.includes(pathname as (typeof AUTH_PAGE_PATHS)[number]))
}
