import { processQueuedEmailEvent } from '@/features/email/queue/email.queue'
import { recalculateRiskProfile } from '@/features/risk/risk.service'
import { syncPendingShipments, syncShipmentStatus } from '@/features/shipping/shipping.service'
import type {
  JobDefinition,
  ProcessNotificationDigestJobPayload,
  RecalculateProductMetricsJobPayload,
  RecalculateRiskProfileJobPayload,
  RefreshAnalyticsJobPayload,
  ReleaseSellerFundsJobPayload,
  SendEmailJobPayload,
  SyncShipmentStatusJobPayload,
} from './jobs.dto'

async function runPlaceholderJob(note: string, metadata?: Record<string, unknown>) {
  return {
    skipped: true,
    note,
    ...(metadata ?? {}),
  }
}

export const jobsRegistry = {
  SEND_EMAIL: {
    type: 'SEND_EMAIL',
    maxAttempts: 5,
    async run(payload: SendEmailJobPayload) {
      const event = await processQueuedEmailEvent(payload.emailEventId)
      return {
        emailEventId: event.id,
        status: event.status,
      }
    },
  } satisfies JobDefinition<'SEND_EMAIL'>,

  RECALCULATE_PRODUCT_METRICS: {
    type: 'RECALCULATE_PRODUCT_METRICS',
    maxAttempts: 3,
    async run(payload: RecalculateProductMetricsJobPayload) {
      return runPlaceholderJob('Product metrics background recalculation is not wired yet', {
        productId: payload.productId ?? null,
      })
    },
  } satisfies JobDefinition<'RECALCULATE_PRODUCT_METRICS'>,

  RECALCULATE_RISK_PROFILE: {
    type: 'RECALCULATE_RISK_PROFILE',
    maxAttempts: 5,
    async run(payload: RecalculateRiskProfileJobPayload) {
      const profile = await recalculateRiskProfile({
        userId: payload.userId ?? null,
        storeId: payload.storeId ?? null,
      })

      return {
        profileId: profile.id,
        userId: profile.userId,
        storeId: profile.storeId,
        score: profile.score,
        level: profile.level,
      }
    },
  } satisfies JobDefinition<'RECALCULATE_RISK_PROFILE'>,

  SYNC_SHIPMENT_STATUS: {
    type: 'SYNC_SHIPMENT_STATUS',
    maxAttempts: 5,
    async run(payload: SyncShipmentStatusJobPayload) {
      if (payload.shipmentId) {
        const result = await syncShipmentStatus(payload.shipmentId)
        return {
          shipmentId: result.shipmentId,
          currentStatus: result.currentStatus,
          changed: result.changed,
        }
      }

      const result = await syncPendingShipments(payload.limit ?? 25)
      return {
        processed: result.results.length,
        changed: result.results.filter((item) => item.changed).length,
      }
    },
  } satisfies JobDefinition<'SYNC_SHIPMENT_STATUS'>,

  RELEASE_SELLER_FUNDS: {
    type: 'RELEASE_SELLER_FUNDS',
    maxAttempts: 3,
    async run(payload: ReleaseSellerFundsJobPayload) {
      return runPlaceholderJob('Seller funds release job is not wired yet', {
        storeId: payload.storeId ?? null,
        sellerId: payload.sellerId ?? null,
      })
    },
  } satisfies JobDefinition<'RELEASE_SELLER_FUNDS'>,

  REFRESH_ANALYTICS: {
    type: 'REFRESH_ANALYTICS',
    maxAttempts: 3,
    async run(payload: RefreshAnalyticsJobPayload) {
      return runPlaceholderJob('Analytics refresh job is not wired yet', {
        scope: payload.scope ?? 'all',
        storeId: payload.storeId ?? null,
      })
    },
  } satisfies JobDefinition<'REFRESH_ANALYTICS'>,

  PROCESS_NOTIFICATION_DIGEST: {
    type: 'PROCESS_NOTIFICATION_DIGEST',
    maxAttempts: 3,
    async run(payload: ProcessNotificationDigestJobPayload) {
      return runPlaceholderJob('Notification digest job is not wired yet', {
        userId: payload.userId ?? null,
      })
    },
  } satisfies JobDefinition<'PROCESS_NOTIFICATION_DIGEST'>,
} as const
