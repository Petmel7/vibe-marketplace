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
    <div className="ui-divider-top">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="ui-collapsible-trigger"
        aria-expanded={isOpen}
      >
        <span className="ui-body-muted">{title}</span>
        {isOpen ? <X size={24} color="#A5A8AD" /> : <Plus size={24} color="#A5A8AD" />}
      </button>
      {isOpen && children}
    </div>
  )
}
