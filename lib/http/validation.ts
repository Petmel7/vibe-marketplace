import { ZodError } from 'zod'
import { mapErrorToApiError } from '@/lib/errors/mapper'

export function validationErrorResponse(error: ZodError): Response {
  const mapped = mapErrorToApiError(error)

  return Response.json(mapped.body, {
    status: mapped.status,
    headers: mapped.headers,
  })
}
