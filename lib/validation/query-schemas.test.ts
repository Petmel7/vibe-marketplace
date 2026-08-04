import { describe, expect, it } from 'vitest'
import { analyticsQuerySchema } from '@/features/analytics/analytics.schema'
import { adminAuditLogQuerySchema } from '@/features/admin/operations/admin-operations.schema'
import {
  adminStoreOptionQuerySchema,
  userOversightFilterSchema,
} from '@/features/admin/oversight/admin-oversight.schema'
import { adminReportsQuerySchema, myReportsQuerySchema } from '@/features/abuse-reports/abuse-reports.schema'
import { checkoutPreviewSchema } from '@/features/checkout/checkout.schema'
import { commissionRuleQuerySchema } from '@/features/commissions/commissions.schema'
import { adminDisputeListQuerySchema, disputeListQuerySchema } from '@/features/disputes/disputes.schema'
import { adminEmailQuerySchema } from '@/features/email/email.schema'
import { heroBannerQuerySchema } from '@/features/hero/hero.schema'
import { jobListQuerySchema } from '@/features/jobs/jobs.schema'
import { paymentDiagnosticsQuerySchema } from '@/features/payments/payment.schema'
import {
  adminPayoutQuerySchema,
  adminSellerBalanceQuerySchema,
  sellerLedgerQuerySchema,
  sellerPayoutQuerySchema,
} from '@/features/payouts/payouts.schema'
import { productBadgesQuerySchema, productMetricsQuerySchema } from '@/features/products/product-badge.schema'
import {
  productCategoryPaginationQuerySchema,
  productListQuerySchema,
  productSearchQuerySchema,
} from '@/features/products/product.schema'
import { promotionQuerySchema } from '@/features/promotions/promotions.schema'
import { adminReviewListQuerySchema } from '@/features/review/review.schema'
import { adminRefundListQuerySchema, refundListQuerySchema } from '@/features/refunds/refunds.schema'
import { riskProfileQuerySchema } from '@/features/risk/risk.schema'
import { seoListQuerySchema } from '@/features/seo/seo.schema'
import { sellerProductListQuerySchema } from '@/features/seller/products/seller-product.schema'
import {
  adminNovaPoshtaSenderDiagnosticsQuerySchema,
  novaPoshtaCitiesQuerySchema,
  sellerShipmentListQuerySchema,
} from '@/features/shipping/shipping.schema'
import { sellerStoreContextQuerySchema } from '@/features/store/store.schema'
import { orderFilterSchema } from '@/features/orders/orders.schema'

describe('enum query schemas', () => {
  it('treats empty enum filter values as omitted filters', () => {
    expect(heroBannerQuerySchema.parse({ status: '', destinationType: '' })).toMatchObject({
      status: undefined,
      destinationType: undefined,
    })
    expect(adminEmailQuerySchema.parse({ eventType: '', status: '', template: '' })).toMatchObject({
      eventType: undefined,
      status: undefined,
      template: undefined,
    })
    expect(promotionQuerySchema.parse({ type: '' }).type).toBeUndefined()
    expect(commissionRuleQuerySchema.parse({ scope: '' }).scope).toBeUndefined()
    expect(adminReviewListQuerySchema.parse({ status: '' }).status).toBeUndefined()
    expect(disputeListQuerySchema.parse({ status: '', scope: '' })).toMatchObject({
      status: undefined,
      scope: undefined,
    })
    expect(adminDisputeListQuerySchema.parse({ reason: '', priority: '' })).toMatchObject({
      reason: undefined,
      priority: undefined,
    })
    expect(myReportsQuerySchema.parse({ status: '' }).status).toBeUndefined()
    expect(adminReportsQuerySchema.parse({ status: '', targetType: '', reason: '' })).toMatchObject({
      status: undefined,
      targetType: undefined,
      reason: undefined,
    })
    expect(refundListQuerySchema.parse({ status: '' }).status).toBeUndefined()
    expect(adminRefundListQuerySchema.parse({ reason: '' }).reason).toBeUndefined()
    expect(sellerLedgerQuerySchema.parse({ status: '', type: '' })).toMatchObject({
      status: undefined,
      type: undefined,
    })
    expect(sellerPayoutQuerySchema.parse({ status: '' }).status).toBeUndefined()
    expect(adminPayoutQuerySchema.parse({ status: '' }).status).toBeUndefined()
    expect(riskProfileQuerySchema.parse({ level: '' }).level).toBeUndefined()
    expect(sellerShipmentListQuerySchema.parse({ status: '' }).status).toBeUndefined()
    expect(paymentDiagnosticsQuerySchema.parse({ status: '', provider: '', method: '' })).toMatchObject({
      status: undefined,
      provider: undefined,
      method: undefined,
    })
    expect(seoListQuerySchema.parse({ entityType: '' }).entityType).toBeUndefined()
    expect(productSearchQuerySchema.parse({ badge: '', sort: '' })).toMatchObject({
      badge: undefined,
      sort: undefined,
    })
    expect(productBadgesQuerySchema.parse({ type: '' }).type).toBeUndefined()
    expect(jobListQuerySchema.parse({ status: '', type: '' })).toMatchObject({
      status: undefined,
      type: undefined,
    })
  })

  it('applies defaults after normalizing empty defaulted enum values', () => {
    expect(analyticsQuerySchema.parse({ range: '', interval: '' })).toMatchObject({
      range: '30d',
      interval: undefined,
    })
    expect(productListQuerySchema.parse({ sort: '' }).sort).toBe('newest')
  })

  it('normalizes empty pagination values to defaults', () => {
    expect(productListQuerySchema.parse({ page: '', limit: '' })).toMatchObject({ page: 1, limit: 12 })
    expect(productCategoryPaginationQuerySchema.parse({ page: '', limit: '' })).toMatchObject({
      page: 1,
      limit: 12,
    })
    expect(adminAuditLogQuerySchema.parse({ page: '', limit: '' })).toMatchObject({ page: 1, limit: 20 })
    expect(userOversightFilterSchema.parse({ page: '', limit: '' })).toMatchObject({ page: 1, limit: 20 })
  })

  it('normalizes empty UUID query values as omitted filters', () => {
    expect(sellerStoreContextQuerySchema.parse({ storeId: '' }).storeId).toBeUndefined()
    expect(orderFilterSchema.parse({ storeId: '' }).storeId).toBeUndefined()
    expect(sellerProductListQuerySchema.parse({ storeId: '' }).storeId).toBeUndefined()
    expect(productMetricsQuerySchema.parse({ productId: '' }).productId).toBeUndefined()
    expect(adminSellerBalanceQuerySchema.parse({ storeId: '', sellerId: '' })).toMatchObject({
      storeId: undefined,
      sellerId: undefined,
    })
  })

  it('normalizes empty boolean query values as omitted filters instead of false', () => {
    expect(commissionRuleQuerySchema.parse({ isActive: '' }).isActive).toBeUndefined()
    expect(promotionQuerySchema.parse({ isActive: '' }).isActive).toBeUndefined()
    expect(productSearchQuerySchema.parse({ inStock: '' }).inStock).toBeUndefined()
    expect(productBadgesQuerySchema.parse({ activeOnly: '' }).activeOnly).toBe(true)
  })

  it('normalizes empty date and datetime query values as omitted filters', () => {
    expect(adminReportsQuerySchema.parse({ dateFrom: '', dateTo: '' })).toMatchObject({
      dateFrom: undefined,
      dateTo: undefined,
    })
    expect(adminDisputeListQuerySchema.parse({ dateFrom: '', dateTo: '' })).toMatchObject({
      dateFrom: undefined,
      dateTo: undefined,
    })
    expect(adminPayoutQuerySchema.parse({ dateFrom: '', dateTo: '' })).toMatchObject({
      dateFrom: undefined,
      dateTo: undefined,
    })
    expect(adminRefundListQuerySchema.parse({ dateFrom: '', dateTo: '' })).toMatchObject({
      dateFrom: undefined,
      dateTo: undefined,
    })
  })

  it('normalizes empty strict string query values as omitted filters', () => {
    expect(adminStoreOptionQuerySchema.parse({ q: '' }).q).toBeUndefined()
    expect(riskProfileQuerySchema.parse({ search: '' }).search).toBeUndefined()
    expect(seoListQuerySchema.parse({ entityId: '' }).entityId).toBeUndefined()
    expect(sellerProductListQuerySchema.parse({ status: '' }).status).toBeUndefined()
    expect(adminNovaPoshtaSenderDiagnosticsQuerySchema.parse({ senderRef: '', cityRef: '', cityName: '' }))
      .toMatchObject({
        senderRef: undefined,
        cityRef: undefined,
        cityName: undefined,
      })
  })

  it('preserves query defaults that intentionally default to empty strings', () => {
    expect(novaPoshtaCitiesQuerySchema.parse({ q: '' }).q).toBe('')
  })

  it('rejects invalid non-empty values after query normalization', () => {
    expect(checkoutPreviewSchema.safeParse({ cartId: 'not-a-uuid' }).success).toBe(false)
    expect(productSearchQuerySchema.safeParse({ inStock: 'yes' }).success).toBe(false)
    expect(adminAuditLogQuerySchema.safeParse({ dateFrom: '2026/08/04' }).success).toBe(false)
    expect(productListQuerySchema.safeParse({ page: '0' }).success).toBe(false)
  })
})
