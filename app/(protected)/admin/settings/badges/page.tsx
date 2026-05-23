import AdminBadgeRuleSettingsForm from '@/components/admin/AdminBadgeRuleSettingsForm'
import AdminSection from '@/components/admin/AdminSection'

export default function AdminBadgeRulesPage() {
  return (
    <AdminSection
      eyebrow="Marketplace configuration"
      title="Badge rules"
      description="Manage the marketplace-controlled HIT badge thresholds that drive public product merchandising."
    >
      <AdminBadgeRuleSettingsForm />
    </AdminSection>
  )
}
