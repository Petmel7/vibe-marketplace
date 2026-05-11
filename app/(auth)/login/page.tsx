import { getCurrentUser } from '@/lib/session/getSession'
import { redirectAuthenticatedUser, signInWithPasswordAction } from '@/features/auth/auth.actions'
import AuthForm from '@/components/auth/AuthForm'
import AuthPageShell from '@/components/auth/AuthPageShell'

type SearchParams = Promise<{
  next?: string
  notice?: string
}>

function getNoticeMessage(notice: string | undefined): string | undefined {
  switch (notice) {
    case 'check-email':
      return 'Check your inbox to verify your email, then sign in.'
    case 'signed-out':
      return 'You have been signed out.'
    case 'auth-required':
      return 'Sign in to continue to that page.'
    default:
      return undefined
  }
}

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const [{ next, notice }, user] = await Promise.all([searchParams, getCurrentUser()])

  if (user) {
    await redirectAuthenticatedUser(user, typeof next === 'string' ? next : undefined)
  }

  return (
    <AuthPageShell
      title="Sign in"
      description="Access your buyer account, seller workspace, or admin tools with the same secure session."
      alternateHref="/register"
      alternateLabel="New to the marketplace?"
      alternateCta="Create account"
      notice={typeof notice === 'string' ? getNoticeMessage(notice) : undefined}
    >
      <AuthForm
        action={signInWithPasswordAction}
        submitLabel="Sign in"
        pendingLabel="Signing in..."
        next={typeof next === 'string' ? next : undefined}
        intro="Your session is handled server-side so protected routes and navigation stay in sync."
      />
    </AuthPageShell>
  )
}
