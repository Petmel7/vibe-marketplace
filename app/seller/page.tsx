import { getCurrentUser } from '@/lib/session/getSession'
import { getMySellerProfile } from '@/features/seller/seller.service'
import { SellerProfileNotFoundError } from '@/lib/errors/profile'
import ProtectedRouteState from '@/components/auth/ProtectedRouteState'

export default async function SellerPage() {
  const user = await getCurrentUser()

  if (!user) return null

  let sellerProfile: Awaited<ReturnType<typeof getMySellerProfile>> | null = null
  let isMissingSellerProfile = false

  try {
    sellerProfile = await getMySellerProfile(user)
  } catch (error) {
    if (error instanceof SellerProfileNotFoundError) {
      isMissingSellerProfile = true
    } else {
      throw error
    }
  }

  if (isMissingSellerProfile || !sellerProfile) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <ProtectedRouteState
          title="Seller profile not ready"
          description="Your seller role is present, but the seller profile has not been initialized yet."
          actionHref="/profile"
          actionLabel="Go to account"
        />
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="ui-elevated-panel p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-copy-muted">Seller workspace</p>
        <h1 className="ui-heading-page mt-3">Seller access is connected</h1>
        <p className="mt-2 text-sm text-copy-secondary">
          Your server session already protects this route and can power future dashboard modules.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="ui-panel p-5">
            <h2 className="text-base font-semibold text-copy-strong">Verification</h2>
            <p className="mt-2 text-sm text-copy-secondary">{sellerProfile.verificationStatus}</p>
          </div>
          <div className="ui-panel p-5">
            <h2 className="text-base font-semibold text-copy-strong">Business name</h2>
            <p className="mt-2 text-sm text-copy-secondary">
              {sellerProfile.businessName ?? 'Not provided yet'}
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
