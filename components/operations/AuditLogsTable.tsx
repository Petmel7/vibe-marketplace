'use client'

import { useState } from 'react'
import AuditLogDetailDrawer from '@/components/operations/AuditLogDetailDrawer'
import { getAdminAuditActorLabel, type AdminAuditLog } from '@/types/operations'

function getMetadataPreview(metadata: AdminAuditLog['metadata']) {
  if (!metadata) {
    return 'No metadata summary'
  }

  const keys = Object.keys(metadata)
  if (keys.length === 0) {
    return 'Empty metadata'
  }

  return keys.slice(0, 3).join(', ')
}

export default function AuditLogsTable({ items }: { items: AdminAuditLog[] }) {
  const [selected, setSelected] = useState<AdminAuditLog | null>(null)

  return (
    <>
      <table className="min-w-full text-sm">
        <thead className="bg-panel/60 text-left text-copy-muted">
          <tr>
            <th className="px-5 py-3 font-medium">Actor</th>
            <th className="px-5 py-3 font-medium">Action</th>
            <th className="px-5 py-3 font-medium">Resource</th>
            <th className="px-5 py-3 font-medium">Metadata</th>
            <th className="px-5 py-3 font-medium">Timestamp</th>
            <th className="px-5 py-3 font-medium">Detail</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-panelBorder align-top">
              <td className="px-5 py-4 text-copy-secondary">
                <p className="font-medium text-copy-strong">{getAdminAuditActorLabel(item)}</p>
                {item.actorId ? (
                  <p className="mt-1 break-all text-xs text-copy-muted">{item.actorId}</p>
                ) : null}
              </td>
              <td className="px-5 py-4 text-copy-secondary">
                <p className="font-medium text-copy-strong">{item.action}</p>
                <p className="mt-1 text-xs text-copy-muted">{item.domain}</p>
              </td>
              <td className="px-5 py-4 text-copy-secondary">
                <p>{item.resourceType}</p>
                <p className="mt-1 break-all text-xs text-copy-muted">{item.resourceId ?? '—'}</p>
              </td>
              <td className="px-5 py-4 text-copy-secondary">{getMetadataPreview(item.metadata)}</td>
              <td className="px-5 py-4 text-copy-secondary">{new Date(item.createdAt).toLocaleString('uk-UA')}</td>
              <td className="px-5 py-4">
                <button type="button" className="ui-secondary-button" onClick={() => setSelected(item)}>
                  View metadata
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected ? <AuditLogDetailDrawer item={selected} onClose={() => setSelected(null)} /> : null}
    </>
  )
}
