import type { ReactNode } from 'react'

type JsonLdValue = Record<string, unknown> | Array<Record<string, unknown>>

function serializeJsonLd(data: JsonLdValue) {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
}

export default function JsonLd({
  data,
  id,
}: {
  data: JsonLdValue
  id?: string
}): ReactNode {
  return (
    <script
      {...(id ? { id } : {})}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  )
}
