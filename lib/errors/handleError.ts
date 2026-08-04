import { mapErrorToApiError } from './mapper'
import { logError } from '@/utils/logger'

export function toErrorResponse(label: string, err: unknown): Response {
  const mapped = mapErrorToApiError(err)

  if (mapped.shouldLog) {
    logError(label, err)
  }

  return Response.json(mapped.body, {
    status: mapped.status,
    headers: mapped.headers,
  })
}
