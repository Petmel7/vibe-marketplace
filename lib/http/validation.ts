import { ZodError } from 'zod'

export function validationErrorResponse(error: ZodError): Response {
  return Response.json(
    {
      success: false,
      error: {
        message: error.issues.map((issue) => issue.message).join('; ') || 'Validation error',
        code: 'VALIDATION_ERROR',
      },
    },
    { status: 400 },
  )
}
