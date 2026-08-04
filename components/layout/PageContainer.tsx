import type { ReactNode } from 'react'
import ContentContainer from '@/components/layout/ContentContainer'

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
            <ContentContainer as="div" size="narrow" gutter={false} className={className}>
                {children}
            </ContentContainer>
        </main>
    )
}
