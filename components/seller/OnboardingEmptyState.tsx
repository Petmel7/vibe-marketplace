import EmptyState from '@/components/profile/EmptyState'

export default function OnboardingEmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string
  description: string
  actionHref?: string
  actionLabel?: string
}) {
  return (
    <section className="ui-elevated-panel p-5 sm:p-6">
      <EmptyState
        title={title}
        description={description}
        actionHref={actionHref}
        actionLabel={actionLabel}
      />
    </section>
  )
}
