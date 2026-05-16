import EmptyState from '@/components/profile/EmptyState'

export default function AdminEmptyState({
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
    <EmptyState
      title={title}
      description={description}
      actionHref={actionHref}
      actionLabel={actionLabel}
    />
  )
}
