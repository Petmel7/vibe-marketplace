import { z } from 'zod'
import { type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Supabase admin client — uses the service role key which must never be
 * exposed to the browser.  Reads from environment variables:
 *   SUPABASE_URL              — your project URL, e.g. https://<ref>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY — service role secret (Settings → API)
 */
export type AuthResult =
  | { ok: true; userId: string }
  | { ok: false; response: Response }

function unauthorizedResponse(): Response {
  return Response.json(
    { success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
    { status: 401 },
  )
}

/**
 * Extract and verify the Bearer token from the Authorization header.
 *
 * Returns { ok: true, userId } on success.
 * Returns { ok: false, response } with HTTP 401 when:
 *   - Authorization header is absent or is not a Bearer token
 *   - Supabase rejects the token (expired, tampered, etc.)
 *   - The resolved user id is not a valid UUID
 */
export async function verifyBearerToken(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, response: unauthorizedResponse() }
  }

  const token = authHeader.slice(7)

  const adminClient = createAdminClient()
  const { data, error } = await adminClient.auth.getUser(token)
  if (error || !data.user) {
    return { ok: false, response: unauthorizedResponse() }
  }

  const parsed = z.string().uuid().safeParse(data.user.id)
  if (!parsed.success) {
    return { ok: false, response: unauthorizedResponse() }
  }

  return { ok: true, userId: parsed.data }
}
