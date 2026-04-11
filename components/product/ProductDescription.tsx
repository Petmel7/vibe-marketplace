'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'

interface Props {
  description: string | null
}

export default function ProductDescription({ description }: Props) {
  const [isOpen, setIsOpen] = useState(false)

  if (!description) return null

  return (
    <div className="border-t border-[#333A47] pt-4">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center justify-between w-full py-1"
        aria-expanded={isOpen}
      >
        <span className="font-normal text-[14px] text-[#A5A8AD]">Опис</span>
        {isOpen ? <X size={24} color="#A5A8AD" /> : <Plus size={24} color="#A5A8AD" />}
      </button>
      {isOpen && (
        <p className="mt-3 font-normal text-[14px] leading-5 text-[#E8E9EA]">
          {description}
        </p>
      )}
    </div>
  )
}
