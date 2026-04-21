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
        <p className="font-normal text-[14px] leading-5 text-[#E8E9EA]">
          {description}
        </p>
      </div>
    </CollapsibleSection>
  )
}
