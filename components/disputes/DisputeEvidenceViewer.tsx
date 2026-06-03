import EvidenceFileCard from '@/components/abuse-reports/EvidenceFileCard'
import type { DisputeEvidence } from '@/types/disputes'
import { buildDisputeEvidenceCountLabel } from './dispute-evidence.shared'

export default function DisputeEvidenceViewer({
  evidence,
  title = 'Докази',
  description = 'Файли, які сторони додали до суперечки.',
  emptyMessage = 'Докази ще не додано.',
}: {
  evidence: DisputeEvidence[]
  title?: string
  description?: string
  emptyMessage?: string
}) {
  return (
    <section className="ui-elevated-panel p-5 sm:p-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-copy-strong">{title}</h2>
          <p className="mt-1 text-sm text-copy-muted">{description}</p>
        </div>

        {evidence.length === 0 ? (
          <p className="text-sm text-copy-muted">{emptyMessage}</p>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-copy-muted">
              {buildDisputeEvidenceCountLabel(evidence)}
            </p>
            {evidence.map((item) => (
              <EvidenceFileCard
                key={item.id}
                fileName={item.fileName}
                fileType={item.fileType}
                fileSize={item.fileSize}
                previewUrl={item.url}
                fileUrl={item.url}
                createdAt={item.createdAt}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
