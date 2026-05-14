import type { ReactNode } from 'react'

type PageContainerProps = {
    children: ReactNode
    className?: string
}

export function PageContainer({
    children,
    className = '',
}: PageContainerProps) {
    return (
        <main className="mx-auto flex justify-center">
            <div className={`w-full max-w-4xl ${className}`}>
                {children}
            </div>
        </main>
    )
}