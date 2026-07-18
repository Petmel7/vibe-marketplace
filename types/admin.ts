import type { UserRole } from '@/types/roles'
import type {
  MarketplaceOrderStatus,
  SellerProductStatus,
  SellerVerificationStatus,
} from '@/types/seller'

export const ADMIN_USER_ROLE_FILTERS = ['BUYER', 'SELLER', 'ADMIN'] as const satisfies readonly UserRole[]
export const ADMIN_SELLER_STATUS_FILTERS = ['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'] as const satisfies readonly SellerVerificationStatus[]
export const ADMIN_PRODUCT_STATUS_FILTERS = ['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'ARCHIVED'] as const satisfies readonly SellerProductStatus[]
export const ADMIN_ORDER_STATUS_FILTERS = [
  'pending',
  'confirmed',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
] as const satisfies readonly MarketplaceOrderStatus[]

export function canAdminApproveSeller(status: string) {
  return status === 'PENDING'
}

export function canAdminRejectSeller(status: string) {
  return status === 'PENDING'
}

export function canAdminSuspendSeller(status: string) {
  return status === 'VERIFIED'
}

export function canAdminReactivateSeller(status: string) {
  return status === 'SUSPENDED'
}

export function canAdminApproveProduct(status: string) {
  return status === 'PENDING_REVIEW'
}

export function canAdminRejectProduct(status: string) {
  return status === 'PENDING_REVIEW'
}

export function canAdminArchiveProduct(status: string) {
  return status === 'PUBLISHED' || status === 'REJECTED'
}

export function canAdminRestoreProduct(status: string) {
  return status === 'ARCHIVED'
}

export function getAdminSellerStatusTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'VERIFIED') return 'success'
  if (status === 'PENDING') return 'warning'
  if (status === 'REJECTED' || status === 'SUSPENDED') return 'danger'
  return 'neutral'
}

export function getAdminSellerStatusLabel(status: string) {
  switch (status) {
    case 'PENDING':
      return 'Очікує'
    case 'VERIFIED':
      return 'Верифіковано'
    case 'REJECTED':
      return 'Відхилено'
    case 'SUSPENDED':
      return 'Призупинено'
    default:
      return status
  }
}

export function getAdminProductStatusTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'PUBLISHED') return 'success'
  if (status === 'PENDING_REVIEW') return 'warning'
  if (status === 'REJECTED' || status === 'ARCHIVED') return 'danger'
  if (status === 'DRAFT') return 'info'
  return 'neutral'
}

export function getAdminProductStatusLabel(status: string) {
  switch (status) {
    case 'DRAFT':
      return 'Чернетка'
    case 'PENDING_REVIEW':
      return 'Очікує'
    case 'PUBLISHED':
      return 'Опубліковано'
    case 'REJECTED':
      return 'Відхилено'
    case 'ARCHIVED':
      return 'Архівовано'
    default:
      return status
  }
}

export function getAdminOrderStatusTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'delivered' || status === 'paid') return 'success'
  if (status === 'pending' || status === 'confirmed' || status === 'processing' || status === 'shipped') {
    return 'warning'
  }
  if (status === 'cancelled' || status === 'refunded') return 'danger'
  return 'neutral'
}

export function getAdminRoleTone(role: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (role === 'ADMIN') return 'danger'
  if (role === 'SELLER') return 'warning'
  if (role === 'BUYER') return 'info'
  return 'neutral'
}
