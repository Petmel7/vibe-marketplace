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
      title="Створення акаунта"
      description="Почніть як покупець уже сьогодні, а згодом розширте доступ до сценаріїв продавця або адміністратора."
      alternateHref="/login"
      alternateLabel="Уже маєте акаунт?"
      alternateCta="Перейти до входу"
    >
      <AuthForm
        action={signUpWithPasswordAction}
        submitLabel="Створити акаунт"
        pendingLabel="Створюємо акаунт..."
        next={typeof next === 'string' ? next : undefined}
        passwordAutoComplete="new-password"
        intro="Пізніше в цей самий потік можна додати підтвердження email, скидання пароля, соціальний вхід і MFA."
      />
    </AuthPageShell>
  )
}
