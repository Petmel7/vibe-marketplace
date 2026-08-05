'use client'

import { useState } from 'react'
import AuditLogDetailDrawer from '@/components/operations/AuditLogDetailDrawer'
import { DataTable, TableActionCell, TableCell, TableDateCell, TableHead, TableHeaderCell, TableMetaCell, TableRow } from '@/components/ui/table'
import { getAdminAuditActorLabel, type AdminAuditLog } from '@/types/operations'

function getMetadataPreview(metadata: AdminAuditLog['metadata']) {
  if (!metadata) {
    return 'Немає зведення метаданих'
  }

  const keys = Object.keys(metadata)
  if (keys.length === 0) {
    return 'Порожні метадані'
  }

  return keys.slice(0, 3).join(', ')
}

export default function AuditLogsTable({ items }: { items: AdminAuditLog[] }) {
  const [selected, setSelected] = useState<AdminAuditLog | null>(null)

  return (
    <>
      <DataTable>
        <TableHead>
          <tr>
            <TableHeaderCell>Виконавець</TableHeaderCell>
            <TableHeaderCell>Дія</TableHeaderCell>
            <TableHeaderCell>Ресурс</TableHeaderCell>
            <TableHeaderCell>Метадані</TableHeaderCell>
            <TableHeaderCell>Час</TableHeaderCell>
            <TableHeaderCell>Деталі</TableHeaderCell>
          </tr>
        </TableHead>
        <tbody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableMetaCell title={getAdminAuditActorLabel(item)} meta={item.actorId ? <span className="break-all">{item.actorId}</span> : undefined} titleClassName="font-medium text-copy-strong" />
              <TableMetaCell title={item.action} meta={item.domain} titleClassName="font-medium text-copy-strong" />
              <TableCell tone="secondary">
                <p>{item.resourceType}</p>
                <p className="mt-1 break-all text-xs text-copy-muted">{item.resourceId ?? '—'}</p>
              </TableCell>
              <TableCell tone="secondary">{getMetadataPreview(item.metadata)}</TableCell>
              <TableDateCell value={item.createdAt} />
              <TableActionCell>
                <button type="button" className="ui-secondary-button" onClick={() => setSelected(item)}>
                  Переглянути метадані
                </button>
              </TableActionCell>
            </TableRow>
          ))}
        </tbody>
      </DataTable>

      {selected ? <AuditLogDetailDrawer item={selected} onClose={() => setSelected(null)} /> : null}
    </>
  )
}
