import Link from 'next/link'
import AdminDataTable from '@/components/admin/AdminDataTable'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import AdminMetricCard from '@/components/admin/AdminMetricCard'
import AdminSection from '@/components/admin/AdminSection'
import RiskAdvisoryNotice from '@/components/risk/RiskAdvisoryNotice'
import RiskProfileTable from '@/components/risk/RiskProfileTable'
import RiskRecalculateButton from '@/components/risk/RiskRecalculateButton'
import { getAdminRiskOverviewData } from '@/app/(protected)/admin/_lib/admin-risk.data'
import { getCurrentUser } from '@/lib/session/getSession'

export default async function AdminRiskOverviewPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getAdminRiskOverviewData(user)

  return (
    <AdminSection
      eyebrow="Довіра та безпека"
      title="Оцінка ризику"
      description="Переглядайте advisory-профілі ризику для користувачів і магазинів, аналізуйте нещодавні сигнали та вручну оновлюйте оцінки після модераційних подій."
    >
      <RiskAdvisoryNotice />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          label="Критичні користувачі"
          value={data.criticalUsers.total}
          detail="Акаунти з найвищим advisory-рівнем ризику"
        />
        <AdminMetricCard
          label="Критичні магазини"
          value={data.criticalStores.total}
          detail="Вітрини, які зараз потребують найшвидшого перегляду довіри"
        />
        <AdminMetricCard
          label="Останні профілі користувачів"
          value={data.recentUsers.total}
          detail="Відстежувані профілі ризику користувачів, доступні для перегляду"
        />
        <AdminMetricCard
          label="Останні профілі магазинів"
          value={data.recentStores.total}
          detail="Відстежувані профілі ризику магазинів, доступні для перегляду"
        />
      </div>

      <div className="ui-elevated-panel flex flex-col gap-4 p-5 sm:p-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-copy-strong">Ручний перерахунок</h2>
          <p className="text-sm text-copy-secondary">
            Перебудуйте advisory-оцінки зі збережених сигналів, коли потрібен свіжий операційний знімок.
          </p>
        </div>
        <div className="flex justify-center max-[500px]:block max-[500px]:[&>*]:w-full">
          <RiskRecalculateButton targetType="ALL" label="Перерахувати всі профілі ризику" />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminDataTable
          title="Критичні профілі користувачів"
          description="Акаунти з найтерміновішою комбінацією сигналів довіри та безпеки."
          actions={<Link href="/admin/risk/users?level=CRITICAL" className="ui-link-muted">Відкрити користувачів</Link>}
        >
          {data.criticalUsers.items.length === 0 ? (
            <div className="p-6">
              <AdminEmptyState
                title="Немає критичних профілів користувачів"
                description="Критичні профілі ризику користувачів з’являться тут, коли буде перевищено поріг сигналів."
              />
            </div>
          ) : (
            <RiskProfileTable items={data.criticalUsers.items} entityType="USER" />
          )}
        </AdminDataTable>

        <AdminDataTable
          title="Критичні профілі магазинів"
          description="Вітрини, навантаження сигналів ризику яких потребує перегляду адміністратором."
          actions={<Link href="/admin/risk/stores?level=CRITICAL" className="ui-link-muted">Відкрити магазини</Link>}
        >
          {data.criticalStores.items.length === 0 ? (
            <div className="p-6">
              <AdminEmptyState
                title="Немає критичних профілів магазинів"
                description="Критичні профілі ризику магазинів з’являться тут, коли буде перевищено поріг сигналів."
              />
            </div>
          ) : (
            <RiskProfileTable items={data.criticalStores.items} entityType="STORE" />
          )}
        </AdminDataTable>
      </div>
    </AdminSection>
  )
}
