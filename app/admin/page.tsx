import { getCurrentUser } from '@/lib/session/getSession'
import { getMyAdminProfile } from '@/features/admin/admin.service'
import { AdminProfileNotFoundError } from '@/lib/errors/profile'
import ProtectedRouteState from '@/components/auth/ProtectedRouteState'

export default async function AdminPage() {
  const user = await getCurrentUser()

  if (!user) return null

  let adminProfile: Awaited<ReturnType<typeof getMyAdminProfile>> | null = null
  let isMissingAdminProfile = false

  try {
    adminProfile = await getMyAdminProfile(user)
  } catch (error) {
    if (error instanceof AdminProfileNotFoundError) {
      isMissingAdminProfile = true
    } else {
      throw error
    }
  }

  if (isMissingAdminProfile || !adminProfile) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <ProtectedRouteState
          title="Admin profile not ready"
          description="Your admin role is present, but the admin profile has not been initialized yet."
          actionHref="/profile"
          actionLabel="Go to account"
        />
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="ui-elevated-panel p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-copy-muted">Admin workspace</p>
        <h1 className="ui-heading-page mt-3">Administrative access is active</h1>
        <p className="mt-2 text-sm text-copy-secondary">
          This protected surface is ready for marketplace moderation, analytics, and operational tooling.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="ui-panel p-5">
            <h2 className="text-base font-semibold text-copy-strong">Permissions</h2>
            <p className="mt-2 text-sm text-copy-secondary">
              {adminProfile.permissions.length ? adminProfile.permissions.join(', ') : 'No explicit permissions yet'}
            </p>
          </div>
          <div className="ui-panel p-5">
            <h2 className="text-base font-semibold text-copy-strong">Session strategy</h2>
            <p className="mt-2 text-sm text-copy-secondary">
              Role-aware route protection is enforced server-side before this page renders.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
