import { toErrorResponse } from '@/lib/errors/handleError'

type ApiRouteOptions = {
  status?: number
  headers?: HeadersInit
}

type ApiRouteResult<T> = T | Response

/**
 * Wraps a thin API route with the project's standard success/error response
 * shape. Use this when the route can simply parse input, call a service, and
 * return data. Existing auth helpers may still return a Response directly.
 */
export async function handleApiRoute<T>(
  label: string,
  handler: () => Promise<ApiRouteResult<T>> | ApiRouteResult<T>,
  options: ApiRouteOptions = {},
): Promise<Response> {
  try {
    const result = await handler()

    if (result instanceof Response) {
      return result
    }

    return Response.json(
      {
        success: true,
        data: result,
      },
      {
        status: options.status ?? 200,
        headers: options.headers,
      },
    )
  } catch (error) {
    return toErrorResponse(label, error)
  }
}
