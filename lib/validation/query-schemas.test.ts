import { describe, expect, it } from 'vitest'
import { analyticsQuerySchema } from '@/features/analytics/analytics.schema'
import { adminReportsQuerySchema, myReportsQuerySchema } from '@/features/abuse-reports/abuse-reports.schema'
import { commissionRuleQuerySchema } from '@/features/commissions/commissions.schema'
import { adminDisputeListQuerySchema, disputeListQuerySchema } from '@/features/disputes/disputes.schema'
import { adminEmailQuerySchema } from '@/features/email/email.schema'
import { heroBannerQuerySchema } from '@/features/hero/hero.schema'
import { jobListQuerySchema } from '@/features/jobs/jobs.schema'
import { paymentDiagnosticsQuerySchema } from '@/features/payments/payment.schema'
import {
  adminPayoutQuerySchema,
  sellerLedgerQuerySchema,
  sellerPayoutQuerySchema,
} from '@/features/payouts/payouts.schema'
import { productBadgesQuerySchema } from '@/features/products/product-badge.schema'
import { productListQuerySchema, productSearchQuerySchema } from '@/features/products/product.schema'
import { promotionQuerySchema } from '@/features/promotions/promotions.schema'
import { adminReviewListQuerySchema } from '@/features/review/review.schema'
import { adminRefundListQuerySchema, refundListQuerySchema } from '@/features/refunds/refunds.schema'
import { riskProfileQuerySchema } from '@/features/risk/risk.schema'
import { seoListQuerySchema } from '@/features/seo/seo.schema'
import { sellerShipmentListQuerySchema } from '@/features/shipping/shipping.schema'

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
})
