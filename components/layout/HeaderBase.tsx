import { ReactNode } from 'react'

export default function HeaderBase({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <header className={`ui-header-shell h-18 ${className}`}>
            <div className="ui-container relative flex h-full items-center">
                {children}
            </div>
        </header>
    )
}