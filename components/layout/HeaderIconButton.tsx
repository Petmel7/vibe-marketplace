import { ReactNode } from 'react'

export default function HeaderIconButton({
    label,
    children,
    onClick,
}: {
    label: string
    children: ReactNode
    onClick?: () => void
}) {
    return (
        <button aria-label={label} className="ui-icon-button" onClick={onClick}>
            {children}
        </button>
    )
}