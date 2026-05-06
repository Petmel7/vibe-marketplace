
'use client'

import clsx from 'clsx'
import { KeyboardEvent } from 'react'
import { LayoutGrid } from 'lucide-react'

type Props = {
    isOpen: boolean
    onToggle: () => void
    onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void
}

function getStyles(isOpen: boolean) {
    return clsx(
        'ui-icon-button flex items-center gap-2 rounded-full border px-4 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
        isOpen
            ? 'border-brand bg-brand/12 text-white'
            : 'border-panelBorder text-[#E8E9EA] hover:border-brand/60 hover:bg-panel/50'
    )
}

export default function CatalogToggleButton({
    isOpen,
    onToggle,
    onKeyDown,
}: Props) {
    return (
        <div className="absolute left-1/2 -translate-x-1/2">
            <button
                type="button"
                className={getStyles(isOpen)}
                aria-expanded={isOpen}
                aria-controls="mega-menu-catalog"
                aria-haspopup="dialog"
                onClick={onToggle}
                onKeyDown={onKeyDown}
            >
                <LayoutGrid size={20} color="currentColor" />
                <span className="text-sm font-medium">Каталог</span>
            </button>
        </div>
    )
}