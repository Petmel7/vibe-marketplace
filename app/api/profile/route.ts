import { type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/session/getSession'
import { getMyProfile, updateMyProfile } from '@/features/profile/profile.service'
import { updateProfileSchema } from '@/features/profile/profile.schema'
import { toErrorResponse } from '@/lib/errors/handleError'

export async function GET(): Promise<Response> {
  try {
    const user = await requireAuth()
    const data = await getMyProfile(user)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('GET /api/profile', err)
  }
}

export async function PATCH(request: NextRequest): Promise<Response> {
  try {
    const user = await requireAuth()
    const parsed = updateProfileSchema.safeParse(await request.json())
    if (!parsed.success) {
      return Response.json(
        {
          success: false,
          error: {
            message: 'Validation error',
            code: 'VALIDATION_ERROR',
            details: parsed.error.flatten(),
          },
        },
        { status: 400 },
      )
    }
    const data = await updateMyProfile(user, parsed.data)
    return Response.json({ success: true, data })
  } catch (err) {
    return toErrorResponse('PATCH /api/profile', err)
  }
}
