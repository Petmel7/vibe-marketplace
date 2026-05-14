import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session/getSession'
import WishlistPageClient from '../../components/wishlist/WishlistPageClient'

export default async function WishlistPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login?notice=auth-required&next=/wishlist')
  }

  return <WishlistPageClient />
}
