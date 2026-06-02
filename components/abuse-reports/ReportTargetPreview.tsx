import type { AbuseReportTargetPreview as ReportTargetPreviewType } from '@/types/abuse-reports'

function getPreviewLabel(preview: ReportTargetPreviewType) {
  if (preview.productName) return preview.productName
  if (preview.storeName) return preview.storeName
  if (preview.reviewSnippet) return preview.reviewSnippet
  if (preview.orderId) return `Замовлення #${preview.orderId.slice(0, 8)}`
  if (preview.userEmailMasked) return preview.userEmailMasked
  return preview.targetId
}

function getTargetTypeLabel(targetType: ReportTargetPreviewType['targetType']) {
  switch (targetType) {
    case 'PRODUCT':
      return 'Товар'
    case 'REVIEW':
      return 'Відгук'
    case 'STORE':
      return 'Магазин'
    case 'USER':
      return 'Користувач'
    case 'ORDER':
      return 'Замовлення'
  }
}

export default function ReportTargetPreview({
  preview,
}: {
  preview: ReportTargetPreviewType | null
}) {
  if (!preview) {
    return <span className="text-sm text-copy-muted">Ціль скарги більше недоступна.</span>
  }

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-copy-muted">
        {getTargetTypeLabel(preview.targetType)}
      </p>
      <p className="text-sm text-copy-primary">{getPreviewLabel(preview)}</p>
    </div>
  )
}
