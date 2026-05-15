import type { ReactNode } from 'react'

type PageTitleProps = {
    title: string
    count?: number
    countLabel?: ReactNode
}

export function PageTitle({
    title,
    count,
    countLabel,
}: PageTitleProps) {
    return (
        <div className="mb-6 flex items-center gap-3">
            <h1 className="ui-heading-page">{title}</h1>

            {count !== undefined && (
                <span className="ui-body-muted">
                    {count} {countLabel}
                </span>
            )}
        </div>
    )
}