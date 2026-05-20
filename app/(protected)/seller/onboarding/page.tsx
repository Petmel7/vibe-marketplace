import { redirect } from 'next/navigation'
import OnboardingEmptyState from '@/components/seller/OnboardingEmptyState'
import SellerOnboardingForm from '@/components/seller/SellerOnboardingForm'
import SellerOnboardingShell from '@/components/seller/SellerOnboardingShell'
import SellerStatusCard from '@/components/seller/SellerStatusCard'
import SellerVerificationBadge from '@/components/seller/SellerVerificationBadge'
import { getCurrentUser } from '@/lib/session/getSession'
import { getSellerOnboardingPageData } from '@/app/(protected)/seller/_lib/seller-dashboard.data'

export default async function SellerOnboardingPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const data = await getSellerOnboardingPageData(user)

  if (data.onboardingState === 'STORE_READY') {
    redirect('/seller')
  }

  const displayName =
    data.profile?.displayName ||
    data.sellerProfile?.businessName ||
    user.email

  return (
    <SellerOnboardingShell
      eyebrow="Seller onboarding"
      title={
        data.onboardingState === 'BUYER'
          ? 'Become a seller'
          : data.onboardingState === 'PENDING_VERIFICATION'
            ? 'Seller verification in progress'
            : data.onboardingState === 'VERIFIED_NO_STORE'
              ? 'Set up your storefront'
            : data.onboardingState === 'REJECTED'
              ? 'Seller application needs attention'
              : data.onboardingState === 'SUSPENDED'
                ? 'Seller account is suspended'
                : 'Seller storefront is ready'
      }
      description={
        data.onboardingState === 'BUYER'
          ? 'Upgrade your buyer account into a marketplace seller experience with a reviewed storefront identity and a clear verification path.'
          : data.onboardingState === 'PENDING_VERIFICATION'
            ? 'Your seller application is already under review. Buyer tools remain active while we prepare the next seller setup steps.'
            : data.onboardingState === 'VERIFIED_NO_STORE'
              ? 'Your seller profile is approved. The last step is provisioning your storefront so catalog, order, inventory, and analytics tools can open without restrictions.'
            : data.onboardingState === 'REJECTED'
              ? 'Review the feedback below, update your seller context when needed, and coordinate the next verification attempt.'
            : data.onboardingState === 'SUSPENDED'
              ? 'Seller operations are currently paused. You can still review account context and buyer tools while moderation resolves the suspension.'
                : 'Your seller profile and storefront are both ready. We will hand you off to the seller workspace automatically.'
      }
      badge={<SellerVerificationBadge state={data.onboardingState} />}
      aside={
        <>
          <section className="ui-elevated-panel p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-copy-muted">Account snapshot</p>
            <h2 className="mt-3 text-xl font-semibold text-copy-strong">{displayName}</h2>
            <p className="mt-1 break-all text-sm text-copy-muted">{user.email}</p>
            <div className="mt-4">
              <SellerVerificationBadge state={data.onboardingState} />
            </div>
          </section>

          <section className="ui-panel p-5">
            <h3 className="text-base font-semibold text-copy-strong">What happens next</h3>
            <ul className="mt-3 space-y-3 text-sm text-copy-muted">
              <li>Buyer dashboard access stays available while seller onboarding is in progress.</li>
              <li>Seller product, order, inventory, and analytics tools unlock after verification and storefront provisioning.</li>
              <li>Future steps will expand into verification uploads, payouts, and storefront customization.</li>
            </ul>
          </section>
        </>
      }
    >
      {data.onboardingState === 'BUYER' ? (
        <SellerOnboardingForm
          defaultStoreName={data.profile?.displayName || ''}
          defaultBio={data.profile?.bio || ''}
        />
      ) : null}

      {data.onboardingState === 'PENDING_VERIFICATION' ? (
        <SellerStatusCard
          title="Application received"
          description="Your seller application is being reviewed. As soon as moderation clears it, this route will hand you off to the seller workspace automatically."
          status="PENDING"
          actionHref="/profile"
          actionLabel="Return to buyer dashboard"
        />
      ) : null}

      {data.onboardingState === 'REJECTED' ? (
        <SellerStatusCard
          title="Application needs updates"
          description="Your seller application was not approved in its current form. Review the moderation notes below and prepare the requested updates before retrying the next step with marketplace support."
          status="REJECTED"
          reason={data.moderationReason}
          actionHref="/profile/settings"
          actionLabel="Update profile details"
        />
      ) : null}

      {data.onboardingState === 'SUSPENDED' ? (
        <SellerStatusCard
          title="Seller access is paused"
          description="Moderation has paused seller operations for this account. Buyer tools remain available while the marketplace team resolves the suspension."
          status="SUSPENDED"
          reason={data.moderationReason}
          actionHref="/profile"
          actionLabel="Open buyer dashboard"
        />
      ) : null}

      {data.onboardingState === 'VERIFIED_NO_STORE' ? (
        <OnboardingEmptyState
          title="Storefront setup is ready"
          description="Your seller identity is approved and the marketplace can now provision your storefront. Finish store settings to unlock the full seller workspace without any redirect loops."
          actionHref="/seller/store?setup=storefront"
          actionLabel="Open store settings"
        />
      ) : null}
    </SellerOnboardingShell>
  )
}
