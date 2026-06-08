'use client'

import { useId } from 'react'
import type { AdminAuditLog } from '@/types/operations'

export default function AuditLogDetailDrawer({
  item,
  onClose,
}: {
  item: AdminAuditLog
  onClose: () => void
}) {
  const titleId = useId()

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background/70 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${titleId}-title`}
        className="h-full w-full max-w-2xl overflow-y-auto border-l border-panelBorder bg-background p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-copy-muted">Audit log</p>
            <h2 id={`${titleId}-title`} className="mt-2 text-2xl font-semibold text-copy-strong">
              {item.action}
            </h2>
            <p className="mt-1 text-sm text-copy-muted">
              {item.domain} · {item.resourceType} · {new Date(item.createdAt).toLocaleString('uk-UA')}
            </p>
          </div>
          <button type="button" className="ui-secondary-button" onClick={onClose}>
            Close
          </button>
        </div>

        <dl className="mt-6 grid gap-4 rounded-3xl border border-panelBorder bg-panel p-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-copy-muted">Actor</dt>
            <dd className="mt-1 text-sm text-copy-strong">{item.actorEmail ?? item.actorId}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-copy-muted">Resource id</dt>
            <dd className="mt-1 break-all text-sm text-copy-strong">{item.resourceId ?? '—'}</dd>
          </div>
        </dl>

        <section className="mt-6 space-y-3">
          <h3 className="text-base font-semibold text-copy-strong">Metadata</h3>
          <pre className="overflow-x-auto rounded-3xl border border-panelBorder bg-panel px-4 py-4 text-xs text-copy-secondary">
            {JSON.stringify(item.metadata ?? {}, null, 2)}
          </pre>
        </section>
      </div>
    </div>
  )
}

