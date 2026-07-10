import { notFound } from 'next/navigation'
import AdminSection from '@/components/admin/AdminSection'
import EmailTemplatePreviewList from '@/components/admin/EmailTemplatePreviewList'

export default function AdminEmailPreviewPage() {
  if (process.env.NODE_ENV !== 'development') {
    notFound()
  }

  return (
    <AdminSection
      eyebrow="Інструменти розробника"
      title="Попередній перегляд транзакційних листів"
      description="Переглядайте поточні React Email шаблони на безпечних тестових даних. Цей маршрут доступний лише в development і ніколи не надсилає реальні листи."
    >
      <EmailTemplatePreviewList />
    </AdminSection>
  )
}
