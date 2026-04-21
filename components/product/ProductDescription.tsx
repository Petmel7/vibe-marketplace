'use client'

import CollapsibleSection from './CollapsibleSection'

interface Props {
  description: string | null
}

export default function ProductDescription({ description }: Props) {
  if (!description) return null

  return (
    <CollapsibleSection title="Опис товару">
      <div className="mt-3">
        <p className="ui-body-primary">{description}</p>
      </div>
    </CollapsibleSection>
  )
}
