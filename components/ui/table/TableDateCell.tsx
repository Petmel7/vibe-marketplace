import TableCell from './TableCell'

function formatDate(value: string | Date | null | undefined, mode: 'date' | 'datetime', fallback: string) {
  if (!value) {
    return fallback
  }

  const date = value instanceof Date ? value : new Date(value)
  return mode === 'datetime'
    ? date.toLocaleString('uk-UA')
    : date.toLocaleDateString('uk-UA')
}

export default function TableDateCell({
  value,
  mode = 'datetime',
  fallback = '—',
}: {
  value: string | Date | null | undefined
  mode?: 'date' | 'datetime'
  fallback?: string
}) {
  return (
    <TableCell tone="secondary">
      {formatDate(value, mode, fallback)}
    </TableCell>
  )
}
