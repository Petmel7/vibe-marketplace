import { enqueueJobInBackground, enqueueProductMetricsJob } from '@/features/jobs/jobs.queue'

type ScheduleProductMetricsRecalculationInput = {
  dedupeKey?: string | null
  reason: string
}

export function scheduleProductMetricsRecalculation(
  input: ScheduleProductMetricsRecalculationInput,
) {
  enqueueJobInBackground(
    enqueueProductMetricsJob({}, { dedupeKey: input.dedupeKey }),
    `products:metrics:${input.reason}`,
  )
}
