import { getFeatureFlags } from '@/config/env'
import { logError } from '@/utils/logger'
import type {
  EnqueueJobInputDto,
  JobDto,
  ProcessNotificationDigestJobPayload,
  RecalculateProductMetricsJobPayload,
  RecalculateRiskProfileJobPayload,
  RefreshAnalyticsJobPayload,
  ReleaseSellerFundsJobPayload,
  SyncShipmentStatusJobPayload,
} from './jobs.dto'
import { enqueueJob } from './jobs.service'

type JobScheduleOptions = {
  runAt?: string | Date | null
  dedupeKey?: string | null
  maxAttempts?: number
}

async function enqueueJobIfEnabled<T extends EnqueueJobInputDto['type']>(
  input: EnqueueJobInputDto<T>,
): Promise<JobDto | null> {
  const flags = getFeatureFlags()
  if (!flags.jobsEnabled) {
    return null
  }

  return enqueueJob(input)
}

export async function enqueueEmailJob(
  emailEventId: string,
  options?: JobScheduleOptions,
) {
  return enqueueJobIfEnabled({
    type: 'SEND_EMAIL',
    payload: { emailEventId },
    dedupeKey: options?.dedupeKey ?? `send-email:${emailEventId}`,
    runAt: options?.runAt,
    maxAttempts: options?.maxAttempts,
  })
}

export async function enqueueProductMetricsJob(
  payload: RecalculateProductMetricsJobPayload = {},
  options?: JobScheduleOptions,
) {
  return enqueueJobIfEnabled({
    type: 'RECALCULATE_PRODUCT_METRICS',
    payload,
    dedupeKey: options?.dedupeKey ?? `product-metrics:${payload.productId ?? 'all'}`,
    runAt: options?.runAt,
    maxAttempts: options?.maxAttempts,
  })
}

export async function enqueueRiskRecalculationJob(
  payload: RecalculateRiskProfileJobPayload,
  options?: JobScheduleOptions,
) {
  const dedupeKey =
    options?.dedupeKey ??
    (payload.userId
      ? `risk-profile:user:${payload.userId}`
      : `risk-profile:store:${payload.storeId}`)

  return enqueueJobIfEnabled({
    type: 'RECALCULATE_RISK_PROFILE',
    payload,
    dedupeKey,
    runAt: options?.runAt,
    maxAttempts: options?.maxAttempts,
  })
}

export async function enqueueShipmentSyncJob(
  payload: SyncShipmentStatusJobPayload,
  options?: JobScheduleOptions,
) {
  return enqueueJobIfEnabled({
    type: 'SYNC_SHIPMENT_STATUS',
    payload,
    dedupeKey: options?.dedupeKey ?? `shipment-sync:${payload.shipmentId ?? 'pending'}`,
    runAt: options?.runAt,
    maxAttempts: options?.maxAttempts,
  })
}

export async function enqueueSellerFundsReleaseJob(
  payload: ReleaseSellerFundsJobPayload,
  options?: JobScheduleOptions,
) {
  const dedupeKey =
    options?.dedupeKey ??
    (payload.storeId
      ? `seller-funds-release:store:${payload.storeId}`
      : `seller-funds-release:seller:${payload.sellerId}`)

  return enqueueJobIfEnabled({
    type: 'RELEASE_SELLER_FUNDS',
    payload,
    dedupeKey,
    runAt: options?.runAt,
    maxAttempts: options?.maxAttempts,
  })
}

export async function enqueueAnalyticsRefreshJob(
  payload: RefreshAnalyticsJobPayload = {},
  options?: JobScheduleOptions,
) {
  return enqueueJobIfEnabled({
    type: 'REFRESH_ANALYTICS',
    payload,
    dedupeKey: options?.dedupeKey ?? `analytics-refresh:${payload.scope ?? 'all'}:${payload.storeId ?? 'all'}`,
    runAt: options?.runAt,
    maxAttempts: options?.maxAttempts,
  })
}

export async function enqueueNotificationDigestJob(
  payload: ProcessNotificationDigestJobPayload = {},
  options?: JobScheduleOptions,
) {
  return enqueueJobIfEnabled({
    type: 'PROCESS_NOTIFICATION_DIGEST',
    payload,
    dedupeKey: options?.dedupeKey ?? `notification-digest:${payload.userId ?? 'all'}`,
    runAt: options?.runAt,
    maxAttempts: options?.maxAttempts,
  })
}

export function enqueueJobInBackground(task: Promise<unknown>, label: string) {
  void task.catch((error) => {
    logError(label, error, { domain: 'jobs' })
  })
}
