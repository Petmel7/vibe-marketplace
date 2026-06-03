import Link from 'next/link'
import type { RiskEntityType, RiskProfileDetail } from '@/types/risk'
import { formatRiskScore } from '@/types/risk'
import RiskLevelBadge from '@/components/risk/RiskLevelBadge'

export default function RiskProfileSummaryCard({
  profile,
  entityType,
}: {
  profile: RiskProfileDetail
  entityType: RiskEntityType
}) {
  const heading =
    entityType === 'USER'
      ? profile.user?.displayName ?? profile.user?.name ?? profile.user?.email ?? 'Unknown user'
      : profile.store?.name ?? 'Unknown store'

  const subheading =
    entityType === 'USER'
      ? profile.user?.email ?? profile.userId ?? 'No account metadata'
      : profile.store
        ? `${profile.store.slug} · owner ${profile.store.owner.email}`
        : profile.storeId ?? 'No store metadata'

  const quickLinks = [
    profile.user ? { href: `/admin/users?search=${encodeURIComponent(profile.user.email)}`, label: 'User account' } : null,
    profile.store ? { href: '/admin/sellers', label: 'Seller accounts' } : null,
    { href: '/admin/reports', label: 'Abuse reports' },
    { href: '/admin/disputes', label: 'Disputes' },
  ].filter(Boolean) as Array<{ href: string; label: string }>

  return (
    <section className="ui-elevated-panel p-5 sm:p-6">
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-copy-muted">
            {entityType === 'USER' ? 'User risk profile' : 'Store risk profile'}
          </p>
          <h2 className="text-2xl font-semibold text-copy-strong">{heading}</h2>
          <p className="text-sm text-copy-secondary">{subheading}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-panelBorder bg-panelAlt px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-copy-muted">Risk score</p>
            <p className="mt-3 text-2xl font-semibold text-copy-strong">{formatRiskScore(profile.score)}</p>
          </div>
          <div className="rounded-3xl border border-panelBorder bg-panelAlt px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-copy-muted">Risk level</p>
            <div className="mt-3">
              <RiskLevelBadge level={profile.level} />
            </div>
          </div>
          <div className="rounded-3xl border border-panelBorder bg-panelAlt px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-copy-muted">Signals</p>
            <p className="mt-3 text-2xl font-semibold text-copy-strong">{profile.signals.length}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {quickLinks.map((link) => (
            <Link key={link.href + link.label} href={link.href} className="ui-link-muted">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
