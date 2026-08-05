import Image from 'next/image'
import type { ReactNode } from 'react'
import TableCell from './TableCell'

export default function TableAvatarCell({
  src,
  alt,
  title,
  meta,
}: {
  src?: string | null
  alt: string
  title: ReactNode
  meta?: ReactNode
}) {
  return (
    <TableCell>
      <div className="flex items-center gap-3">
        {src ? (
          <Image
            src={src}
            alt={alt}
            width={40}
            height={40}
            className="h-10 w-10 rounded-full border border-panelBorder object-cover"
          />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-panelBorder bg-panelAlt text-sm font-semibold text-copy-muted">
            {alt.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-copy-strong">{title}</p>
          {meta ? <p className="mt-1 truncate text-copy-muted">{meta}</p> : null}
        </div>
      </div>
    </TableCell>
  )
}
