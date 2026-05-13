import { NextResponse } from 'next/server'
import { getOrCreateVisitorId } from '@/lib/visitor/visitor.server'

/**
 * POST /api/visitor/init
 *
 * Idempotently provisions a guest visitor cookie. If the `visitor_id` cookie
 * is already present, its value is returned unchanged; otherwise a new UUID
 * is generated and set with httpOnly / sameSite=lax / 30-day cookie config
 * (see `lib/visitor/visitor.server.ts`). The visitorId is included in the
 * response so the client can use it for diagnostic / correlation purposes.
 */
export async function POST() {
  const visitorId = await getOrCreateVisitorId()

  return NextResponse.json({
    success: true,
    data: { visitorId },
  })
}
