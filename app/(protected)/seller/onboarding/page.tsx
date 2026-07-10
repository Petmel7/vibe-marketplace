import { redirect } from 'next/navigation'
import OnboardingEmptyState from '@/components/seller/OnboardingEmptyState'
import SellerOnboardingForm from '@/components/seller/SellerOnboardingForm'
import SellerOnboardingShell from '@/components/seller/SellerOnboardingShell'
import SellerStatusCard from '@/components/seller/SellerStatusCard'
import SellerVerificationBadge from '@/components/seller/SellerVerificationBadge'
import { getCurrentUser } from '@/lib/session/getSession'
import { getSellerOnboardingPageData } from '@/app/(protected)/seller/_lib/seller-dashboard.data'

export default async function SellerOnboardingPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getSellerOnboardingPageData(user)

  if (data.onboardingState === 'STORE_READY') {
    redirect('/seller')
  }

  const displayName =
    data.profile?.displayName ||
    data.sellerProfile?.businessName ||
    user.email

  return (
    <SellerOnboardingShell
      eyebrow="Онбординг продавця"
      title={
        data.onboardingState === 'BUYER'
          ? 'Стати продавцем'
          : data.onboardingState === 'PENDING_VERIFICATION'
            ? 'Верифікація продавця триває'
            : data.onboardingState === 'VERIFIED_NO_STORE'
              ? 'Налаштуйте свою вітрину'
              : data.onboardingState === 'REJECTED'
                ? 'Заявка продавця потребує уваги'
                : data.onboardingState === 'SUSPENDED'
                  ? 'Обліковий запис продавця призупинено'
                  : 'Вітрина продавця готова'
      }
      description={
        data.onboardingState === 'BUYER'
          ? 'Розширте свій акаунт покупця до ролі продавця з перевіреною вітриною та зрозумілим процесом верифікації.'
          : data.onboardingState === 'PENDING_VERIFICATION'
            ? 'Вашу заявку продавця вже перевіряють. Інструменти покупця залишаються активними, поки ми готуємо наступні кроки налаштування.'
            : data.onboardingState === 'VERIFIED_NO_STORE'
              ? 'Ваш профіль продавця схвалено. Залишився останній крок — підключити вітрину, щоб без обмежень відкрити каталог, замовлення, залишки та аналітику.'
              : data.onboardingState === 'REJECTED'
                ? 'Перегляньте зауваження нижче, за потреби оновіть дані продавця та підготуйте наступну спробу верифікації.'
              : data.onboardingState === 'SUSPENDED'
                ? 'Операції продавця тимчасово призупинено. Ви все ще можете переглядати дані акаунта та інструменти покупця, поки модерація вирішує питання.'
                : 'Ваш профіль продавця та вітрина вже готові. Ми автоматично переведемо вас у робочий простір продавця.'
      }
      badge={<SellerVerificationBadge state={data.onboardingState} />}
      aside={
        <>
          <section className="ui-elevated-panel p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-copy-muted">Стан акаунта</p>
            <h2 className="mt-3 text-xl font-semibold text-copy-strong">{displayName}</h2>
            <p className="mt-1 break-all text-sm text-copy-muted">{user.email}</p>
            <div className="mt-4">
              <SellerVerificationBadge state={data.onboardingState} />
            </div>
          </section>

          <section className="ui-panel p-5">
            <h3 className="text-base font-semibold text-copy-strong">Що далі</h3>
            <ul className="mt-3 space-y-3 text-sm text-copy-muted">
              <li>Доступ до кабінету покупця залишається активним, поки триває онбординг продавця.</li>
              <li>Інструменти товарів, замовлень, залишків і аналітики відкриються після верифікації та підключення вітрини.</li>
              <li>Наступні етапи охоплять документи для верифікації, виплати та налаштування вітрини.</li>
            </ul>
          </section>
        </>
      }
    >
      {data.onboardingState === 'BUYER' ? (
        <SellerOnboardingForm
          defaultStoreName={data.profile?.displayName || ''}
          defaultBio={data.profile?.bio || ''}
        />
      ) : null}

      {data.onboardingState === 'PENDING_VERIFICATION' ? (
        <SellerStatusCard
          title="Заявку отримано"
          description="Вашу заявку продавця перевіряють. Щойно модерація схвалить її, цей маршрут автоматично переведе вас у кабінет продавця."
          status="PENDING"
          actionHref="/profile"
          actionLabel="Повернутися до кабінету покупця"
        />
      ) : null}

      {data.onboardingState === 'REJECTED' ? (
        <SellerStatusCard
          title="Заявку потрібно доопрацювати"
          description="Вашу заявку продавця не схвалили в поточному вигляді. Перегляньте зауваження модерації нижче та внесіть потрібні зміни перед наступною спробою."
          status="REJECTED"
          reason={data.moderationReason}
          actionHref="/profile/settings"
          actionLabel="Оновити дані профілю"
        />
      ) : null}

      {data.onboardingState === 'SUSPENDED' ? (
        <SellerStatusCard
          title="Доступ продавця призупинено"
          description="Модерація тимчасово зупинила операції продавця для цього акаунта. Інструменти покупця залишаються доступними, поки команда маркетплейсу вирішує питання."
          status="SUSPENDED"
          reason={data.moderationReason}
          actionHref="/profile"
          actionLabel="Відкрити кабінет покупця"
        />
      ) : null}

      {data.onboardingState === 'VERIFIED_NO_STORE' ? (
        <OnboardingEmptyState
          title="Налаштування вітрини готове"
          description="Ваш профіль продавця схвалено, і маркетплейс може підключити вашу вітрину. Завершіть налаштування магазину, щоб відкрити повний робочий простір продавця без зайвих редіректів."
          actionHref="/seller/store?setup=storefront"
          actionLabel="Відкрити налаштування магазину"
        />
      ) : null}
    </SellerOnboardingShell>
  )
}
