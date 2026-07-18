import AdminDataTable from '@/components/admin/AdminDataTable'
import AdminEmptyState from '@/components/admin/AdminEmptyState'
import AdminSection from '@/components/admin/AdminSection'
import AdminReportsTable from '@/components/abuse-reports/AdminReportsTable'
import { getCurrentUser } from '@/lib/session/getSession'
import { getAdminReportsPageData } from '@/app/(protected)/admin/_lib/admin-reports.data'

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getAdminReportsPageData(user, await searchParams)

  return (
    <AdminSection
      eyebrow="Довіра та безпека"
      title="Черга скарг"
      description="Переглядайте скарги про зловживання на маркетплейсі, фільтруйте вхідні сигнали безпеки та відкривайте детальні moderation workflows."
    >
      <AdminDataTable
        title="Скарги"
        description="Використовуйте фільтри, щоб звузити чергу за статусом, типом цілі, причиною та датою."
        stackActionsOnTablet
        actions={
          <form method="GET" className="w-full xl:w-[min(100%,52rem)]">
            <div className="space-y-3">
              <div className="grid gap-3 min-[501px]:grid-cols-2 xl:grid-cols-3">
                <label className="space-y-2 text-sm text-copy-secondary">
                  <span className="block font-medium text-copy-strong">Статус</span>
                  <select
                    name="status"
                    defaultValue={data.filters.status ?? ''}
                    className="ui-native-select w-full rounded-2xl border border-panelBorder bg-panelAlt px-4 py-2 text-sm text-copy-primary outline-none transition focus:border-brand-accent"
                  >
                    <option value="">Усі</option>
                    <option value="PENDING">Очікує</option>
                    <option value="UNDER_REVIEW">На розгляді</option>
                    <option value="RESOLVED">Вирішено</option>
                    <option value="DISMISSED">Відхилено</option>
                    <option value="ESCALATED">Ескальовано</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm text-copy-secondary">
                  <span className="block font-medium text-copy-strong">Ціль</span>
                  <select
                    name="targetType"
                    defaultValue={data.filters.targetType ?? ''}
                    className="ui-native-select w-full rounded-2xl border border-panelBorder bg-panelAlt px-4 py-2 text-sm text-copy-primary outline-none transition focus:border-brand-accent"
                  >
                    <option value="">Усі</option>
                    <option value="PRODUCT">Товар</option>
                    <option value="REVIEW">Відгук</option>
                    <option value="STORE">Магазин</option>
                    <option value="USER">Користувач</option>
                    <option value="ORDER">Замовлення</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm text-copy-secondary min-[501px]:col-span-2 xl:col-span-1">
                  <span className="block font-medium text-copy-strong">Причина</span>
                  <select
                    name="reason"
                    defaultValue={data.filters.reason ?? ''}
                    className="ui-native-select w-full rounded-2xl border border-panelBorder bg-panelAlt px-4 py-2 text-sm text-copy-primary outline-none transition focus:border-brand-accent"
                  >
                    <option value="">Усі</option>
                    <option value="SPAM">Спам</option>
                    <option value="SCAM">Шахрайство</option>
                    <option value="COUNTERFEIT">Підробка</option>
                    <option value="PROHIBITED_ITEM">Заборонений товар</option>
                    <option value="INAPPROPRIATE_CONTENT">Неприйнятний контент</option>
                    <option value="HARASSMENT">Домагання</option>
                    <option value="MISLEADING_INFO">Оманлива інформація</option>
                    <option value="PAYMENT_ISSUE">Проблема з оплатою</option>
                    <option value="DELIVERY_ISSUE">Проблема з доставкою</option>
                    <option value="OTHER">Інше</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-3 min-[501px]:grid-cols-2">
                <label className="space-y-2 text-sm text-copy-secondary">
                  <span className="block font-medium text-copy-strong">Від</span>
                  <input
                    type="date"
                    name="dateFrom"
                    defaultValue={data.filters.dateFrom?.slice(0, 10) ?? ''}
                    className="w-full rounded-2xl border border-panelBorder bg-panelAlt px-4 py-2 text-sm text-copy-primary outline-none transition focus:border-brand-accent"
                  />
                </label>
                <label className="space-y-2 text-sm text-copy-secondary">
                  <span className="block font-medium text-copy-strong">До</span>
                  <input
                    type="date"
                    name="dateTo"
                    defaultValue={data.filters.dateTo?.slice(0, 10) ?? ''}
                    className="w-full rounded-2xl border border-panelBorder bg-panelAlt px-4 py-2 text-sm text-copy-primary outline-none transition focus:border-brand-accent"
                  />
                </label>
              </div>

              <div className="flex justify-center max-[500px]:block max-[500px]:[&>*]:w-full">
                <button type="submit" className="ui-secondary-button">
                  Застосувати
                </button>
              </div>
            </div>
          </form>
        }
      >
        <div className="p-5 sm:p-6">
          {data.items.length === 0 ? (
            <AdminEmptyState
              title="Скарг не знайдено"
              description="Тут з’являться скарги, що відповідають поточному набору фільтрів."
            />
          ) : (
            <AdminReportsTable reports={data.items} />
          )}
        </div>
      </AdminDataTable>
    </AdminSection>
  )
}
