export const API_ROUTES = {
  authMe: '/api/auth/me',
  visitorInit: '/api/visitor/init',
} as const

export type ApiRouteKey = keyof typeof API_ROUTES
