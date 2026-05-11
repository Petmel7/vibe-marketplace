export const USER_ROLES = ['BUYER', 'SELLER', 'ADMIN'] as const

export type UserRole = (typeof USER_ROLES)[number]
