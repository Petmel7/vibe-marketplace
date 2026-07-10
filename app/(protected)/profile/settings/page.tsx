import ProfileSection from '@/components/profile/ProfileSection'
import ProfileSettingsForm from '@/components/profile/ProfileSettingsForm'
import { getCurrentUser } from '@/lib/session/getSession'
import { getSettingsPageData } from '@/app/(protected)/profile/_lib/profile-dashboard.data'

export default async function ProfileSettingsPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const { profile } = await getSettingsPageData(user)

  return (
    <ProfileSection
      eyebrow="Налаштування"
      title="Налаштування акаунта"
      description="Оновлюйте дані покупця, контакти та готовність акаунта, не залишаючи кабінет."
    >
      <ProfileSettingsForm user={user} profile={profile} />
    </ProfileSection>
  )
}
