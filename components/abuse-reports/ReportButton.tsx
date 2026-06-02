'use client'

import ReportDialog from './ReportDialog'
import type { AbuseReportTargetType } from '@/types/abuse-reports'
import type { SessionUser } from '@/types/auth'

export default function ReportButton({
  currentUser,
  targetType,
  targetId,
  triggerLabel = 'Поскаржитися',
  triggerClassName = 'ui-secondary-button',
  title,
  description,
}: {
  currentUser: SessionUser | null
  targetType: AbuseReportTargetType
  targetId: string
  triggerLabel?: string
  triggerClassName?: string
  title?: string
  description?: string
}) {
  if (!currentUser) {
    return null
  }

  return (
    <ReportDialog
      targetType={targetType}
      targetId={targetId}
      triggerLabel={triggerLabel}
      triggerClassName={triggerClassName}
      title={title}
      description={description}
    />
  )
}
