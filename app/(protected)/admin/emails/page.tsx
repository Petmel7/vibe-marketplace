import Link from 'next/link'
import AdminFilterBar from '@/components/admin/AdminFilterBar'
import AdminSection from '@/components/admin/AdminSection'
import EmailDiagnosticsTable from '@/components/admin/EmailDiagnosticsTable'
import PaginationControls from '@/components/admin/PaginationControls'
import StatusFilter from '@/components/admin/StatusFilter'
import { getAdminEmailsPageData } from '@/app/(protected)/admin/_lib/admin-email.data'
import { getCurrentUser } from '@/lib/session/getSession'
import {
  ADMIN_EMAIL_EVENT_STATUSES,
  ADMIN_EMAIL_EVENT_TYPES,
  ADMIN_EMAIL_TEMPLATE_KEYS,
  formatEmailEventLabel,
} from '@/types/admin-emails'

export default async function AdminEmailsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await getCurrentUser()
  if (!user) {
    return null
  }

  const rawSearchParams = await searchParams
  const data = await getAdminEmailsPageData(user, rawSearchParams)

  return (
    <AdminSection
      eyebrow="Email-операції"
      title="Діагностика транзакційних листів"
      description="Переглядайте email-події маркетплейсу, перевіряйте результати доставки від провайдера та повторно запускайте невдалі транзакційні відправлення, не залишаючи адмін-простір."
    >
      <AdminFilterBar action="/admin/emails">
        <StatusFilter
          name="status"
          label="Статус події"
          defaultValue={data.filters.status}
          options={ADMIN_EMAIL_EVENT_STATUSES.map((status) => ({
            label: formatEmailEventLabel(status),
            value: status,
          }))}
        />
        <StatusFilter
          name="eventType"
          label="Тип події"
          defaultValue={data.filters.eventType}
          options={ADMIN_EMAIL_EVENT_TYPES.map((eventType) => ({
            label: formatEmailEventLabel(eventType),
            value: eventType,
          }))}
        />
        <StatusFilter
          name="template"
          label="Шаблон"
          defaultValue={data.filters.template}
          options={ADMIN_EMAIL_TEMPLATE_KEYS.map((template) => ({
            label: formatEmailEventLabel(template),
            value: template,
          }))}
        />
        <div className="flex flex-wrap gap-2 xl:self-end">
          <button type="submit" className="ui-primary-button">Застосувати фільтри</button>
          {process.env.NODE_ENV === 'development' ? (
            <Link href="/admin/emails/preview" className="ui-secondary-button">
              Відкрити попередній перегляд шаблонів
            </Link>
          ) : null}
        </div>
      </AdminFilterBar>

      <EmailDiagnosticsTable items={data.items} />

      <PaginationControls
        pathname="/admin/emails"
        page={data.page}
        limit={data.limit}
        total={data.total}
        query={{
          status: data.filters.status,
          eventType: data.filters.eventType,
          template: data.filters.template,
          limit: String(data.limit),
        }}
      />
    </AdminSection>
  )
}
