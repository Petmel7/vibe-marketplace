'use client'

import { useState, type ReactNode } from 'react'
import { Plus, X } from 'lucide-react'

interface Props {
  title: string
  children: ReactNode
  defaultOpen?: boolean
}

export default function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: Props) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-t border-[#333A47] pt-4">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="flex items-center justify-between w-full py-1"
        aria-expanded={isOpen}
      >
        <span className="font-normal text-[14px] text-[#A5A8AD]">{title}</span>
        {isOpen ? <X size={24} color="#A5A8AD" /> : <Plus size={24} color="#A5A8AD" />}
      </button>
      {isOpen && children}
    </div>
  )
}
