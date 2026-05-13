import ProfileSection from '@/components/profile/ProfileSection'
import AddressBookClient from '@/components/profile/AddressBookClient'
import { getCurrentUser } from '@/lib/session/getSession'
import { getAddressesPageData } from '@/app/(protected)/profile/_lib/profile-dashboard.data'

export default async function ProfileAddressesPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const { addresses } = await getAddressesPageData(user)

  return (
    <ProfileSection
      eyebrow="Addresses"
      title="Shipping addresses"
      description="Create, update, and prioritize delivery destinations with responsive buyer-friendly controls."
    >
      <AddressBookClient initialAddresses={addresses} />
    </ProfileSection>
  )
}
