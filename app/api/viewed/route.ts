
import { type NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/session/getSession'
import { getOrCreateVisitorId } from '@/lib/visitor/visitor.server'
import { handleApiRoute } from '@/lib/http/route'
import { viewedRecordSchema } from '@/features/viewed/viewed.schema'
import {
  getRecentlyViewed,
  recordView,
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
  return handleApiRoute('GET /api/viewed', async () => {
    const identifier =
      await resolveIdentifier()

    return getRecentlyViewed(identifier)
  })
}

export async function POST(
  request: NextRequest,
): Promise<Response> {
  return handleApiRoute('POST /api/viewed', async () => {
    const identifier =
      await resolveIdentifier()

    const input =
      viewedRecordSchema.parse(await request.json())

    return recordView(
      identifier,
      input,
    )
  })
}
