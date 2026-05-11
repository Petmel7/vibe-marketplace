import { getCurrentUser } from '@/lib/session/getSession'
import ProtectedRouteState from '@/components/auth/ProtectedRouteState'

export default async function ProfilePage() {
  const user = await getCurrentUser()

  if (!user) {
    return (
      <ProtectedRouteState
        title="Session required"
        description="Please sign in to open your marketplace account."
        actionHref="/login?notice=auth-required&next=/profile"
        actionLabel="Sign in"
      />
    )
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <section className="ui-elevated-panel p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-copy-muted">Account overview</p>
          <h1 className="ui-heading-page mt-3">Welcome back</h1>
          <p className="mt-2 text-sm text-copy-secondary">
            Signed in as <span className="font-medium text-copy-strong">{user.email}</span>
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="ui-panel p-5">
              <h2 className="text-base font-semibold text-copy-strong">Buyer profile</h2>
              <p className="mt-2 text-sm text-copy-secondary">
                Your authenticated account is ready for profile, addresses, and checkout flows.
              </p>
            </div>
            <div className="ui-panel p-5">
              <h2 className="text-base font-semibold text-copy-strong">Session state</h2>
              <p className="mt-2 text-sm text-copy-secondary">
                Navigation and protected routes are hydrated from the server session on each request.
              </p>
            </div>
            <div className="ui-panel p-5">
              <h2 className="text-base font-semibold text-copy-strong">Roles</h2>
              <p className="mt-2 text-sm text-copy-secondary">{user.roles.join(', ')}</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
