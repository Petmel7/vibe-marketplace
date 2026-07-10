import AdminStatusBadge from '@/components/admin/AdminStatusBadge'

export default function ProviderStatusBadge({
  isReady,
  readyLabel = 'Готово',
  missingLabel = 'Потрібне налаштування',
}: {
  isReady: boolean
  readyLabel?: string
  missingLabel?: string
}) {
  return (
    <AdminStatusBadge
      label={isReady ? readyLabel : missingLabel}
      tone={isReady ? 'success' : 'warning'}
    />
  )
}
