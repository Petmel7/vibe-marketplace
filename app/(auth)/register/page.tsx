import { getCurrentUser } from '@/lib/session/getSession'
import { redirectAuthenticatedUser, signUpWithPasswordAction } from '@/features/auth/auth.actions'
import AuthForm from '@/components/auth/AuthForm'
import AuthPageShell from '@/components/auth/AuthPageShell'

type SearchParams = Promise<{
  next?: string
}>

export default async function RegisterPage({ searchParams }: { searchParams: SearchParams }) {
  const [{ next }, user] = await Promise.all([searchParams, getCurrentUser()])

  if (user) {
    await redirectAuthenticatedUser(user, typeof next === 'string' ? next : undefined)
  }

  return (
    <AuthPageShell
      title="Create your account"
      description="Start as a buyer today, then expand into seller or admin workflows as your role grows."
      alternateHref="/login"
      alternateLabel="Already have an account?"
      alternateCta="Go to sign in"
    >
      <AuthForm
        action={signUpWithPasswordAction}
        submitLabel="Create account"
        pendingLabel="Creating account..."
        next={typeof next === 'string' ? next : undefined}
        passwordAutoComplete="new-password"
        intro="Email verification, password reset, social login, and MFA hooks can plug into this same flow later."
      />
    </AuthPageShell>
  )
}
