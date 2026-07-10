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
      return 'Перевірте пошту, підтвердьте email і після цього увійдіть.'
    case 'signed-out':
      return 'Ви вийшли з акаунта.'
    case 'auth-required':
      return 'Увійдіть, щоб перейти на цю сторінку.'
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
      title="Вхід"
      description="Увійдіть у свій акаунт покупця, кабінет продавця або адмін-інтерфейс через єдину захищену сесію."
      alternateHref="/register"
      alternateLabel="Вперше на маркетплейсі?"
      alternateCta="Створити акаунт"
      notice={typeof notice === 'string' ? getNoticeMessage(notice) : undefined}
    >
      <AuthForm
        action={signInWithPasswordAction}
        submitLabel="Увійти"
        pendingLabel="Входимо..."
        next={typeof next === 'string' ? next : undefined}
        intro="Сесія обробляється на сервері, тому захищені маршрути й навігація залишаються синхронізованими."
      />
    </AuthPageShell>
  )
}
