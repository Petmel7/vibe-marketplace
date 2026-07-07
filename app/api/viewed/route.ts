
import { type NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { getCurrentUser } from '@/lib/session/getSession'
import { getOrCreateVisitorId } from '@/lib/visitor/visitor.server'
import { logError } from '@/utils/logger'
import { viewedRecordSchema } from '@/features/viewed/viewed.schema'
import {
  getRecentlyViewed,
  recordView,
  ProductNotFoundError,
  type ViewedIdentifier,
} from '@/features/viewed/viewed.service'

async function resolveIdentifier(): Promise<ViewedIdentifier> {
  const user = await getCurrentUser()

  if (user) {
    return {
      userId: user.id,
    }
  }

  const visitorId =
    await getOrCreateVisitorId()

  return {
    sessionId: visitorId,
  }
}

export async function GET(): Promise<Response> {
  try {
    const identifier =
      await resolveIdentifier()

    const data =
      await getRecentlyViewed(identifier)

    return Response.json(
      {
        success: true,
        data,
      },
      {
        status: 200,
      },
    )
  } catch (error) {
    logError(
      'GET /api/viewed',
      error,
    )

    return Response.json(
      {
        success: false,
        error: {
          message:
            'An unexpected error occurred',
          code: 'INTERNAL_ERROR',
        },
      },
      {
        status: 500,
      },
    )
  }
}

export async function POST(
  request: NextRequest,
): Promise<Response> {
  try {
    const identifier =
      await resolveIdentifier()

    const body = await request.json()

    const input =
      viewedRecordSchema.parse(body)

    const data = await recordView(
      identifier,
      input,
    )

    return Response.json(
      {
        success: true,
        data,
      },
      {
        status: 200,
      },
    )
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        {
          success: false,
          error: {
            message: error.issues
              .map((e) => e.message)
              .join('; '),
            code: 'VALIDATION_ERROR',
          },
        },
        {
          status: 400,
        },
      )
    }

    if (
      error instanceof ProductNotFoundError
    ) {
      return Response.json(
        {
          success: false,
          error: {
            message: error.message,
            code: error.code,
          },
        },
        {
          status: 404,
        },
      )
    }

    logError(
      'POST /api/viewed',
      error,
    )

    return Response.json(
      {
        success: false,
        error: {
          message:
            'An unexpected error occurred',
          code: 'INTERNAL_ERROR',
        },
      },
      {
        status: 500,
      },
    )
  }
}
