import AdminBadgeRuleSettingsForm from '@/components/admin/AdminBadgeRuleSettingsForm'
import AdminSection from '@/components/admin/AdminSection'

export default function AdminBadgeRulesPage() {
  return (
    <AdminSection
      eyebrow="Конфігурація маркетплейсу"
      title="Правила бейджів"
      description="Керуйте порогами HIT-бейджа, які контролюються маркетплейсом і впливають на публічне просування товарів."
    >
      <AdminBadgeRuleSettingsForm />
    </AdminSection>
  )
}
