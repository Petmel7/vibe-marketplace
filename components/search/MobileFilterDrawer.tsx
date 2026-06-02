'use client'

import type { ReactNode } from 'react'
import { X } from 'lucide-react'

interface MobileFilterDrawerProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
}

export default function MobileFilterDrawer({
  isOpen,
  onClose,
  children,
}: MobileFilterDrawerProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Фільтри пошуку">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Закрити фільтри"
      />

      <div className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-canvas shadow-2xl">
        <div className="flex items-center justify-between border-b border-panelBorder px-5 py-4">
          <h2 className="text-lg font-semibold text-copy-strong">Фільтри</h2>
          <button
            type="button"
            onClick={onClose}
            className="ui-dialog-close"
            aria-label="Закрити фільтри"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  )
}
