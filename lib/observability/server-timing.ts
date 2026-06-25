import { logError, logInfo } from '@/utils/logger'

type TimingBand = '100ms' | '500ms' | '1s' | '5s'

type ServerTimingContext = {
  route?: string
  component?: string
  service?: string
  repository?: string
  sql?: string
  cache?: string
  externalApi?: string
  auth?: string
  analytics?: string
  seo?: string
  categoryTree?: string
  notifications?: string
  wishlist?: string
  [key: string]: unknown
}

function getDurationMs(start: bigint): number {
  return Number(process.hrtime.bigint() - start) / 1_000_000
}

function getTimingBand(durationMs: number): TimingBand | null {
  if (durationMs >= 5000) return '5s'
  if (durationMs >= 1000) return '1s'
  if (durationMs >= 500) return '500ms'
  if (durationMs >= 100) return '100ms'
  return null
}

export async function measureServerOperation<T>(
  operation: string,
  context: ServerTimingContext,
  run: () => T | Promise<T>,
): Promise<T> {
  const start = process.hrtime.bigint()

  try {
    const result = await run()
    const durationMs = getDurationMs(start)
    const band = getTimingBand(durationMs)

    if (band) {
      logInfo('server-operation-timing', {
        operation,
        durationMs: Number(durationMs.toFixed(1)),
        threshold: band,
        ...context,
      })
    }

    return result
  } catch (error) {
    const durationMs = getDurationMs(start)

    logError('server-operation-failed', error, {
      operation,
      durationMs: Number(durationMs.toFixed(1)),
      ...context,
    })

    throw error
  }
}
