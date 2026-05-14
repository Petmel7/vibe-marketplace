
'use client'

import Link from 'next/link'

type BreadcrumbItem = {
    label: string
    href?: string
}

type BreadcrumbsProps = {
    items: BreadcrumbItem[]
    className?: string
}

export function Breadcrumbs({
    items,
    className = '',
}: BreadcrumbsProps) {
    return (
        <nav
            aria-label="breadcrumbs"
            className={`mb-6 ${className}`}
        >
            <ol
                className="flex items-center gap-1.5"
                itemScope
                itemType="https://schema.org/BreadcrumbList"
            >
                {items.map((item, index) => {
                    const isLast = index === items.length - 1

                    return (
                        <li
                            key={`${item.label}-${index}`}
                            className="flex items-center gap-1.5"
                            itemProp="itemListElement"
                            itemScope
                            itemType="https://schema.org/ListItem"
                        >
                            {item.href && !isLast ? (
                                <Link
                                    href={item.href}
                                    className="text-[13px] font-medium leading-5 text-white hover:underline"
                                    itemProp="item"
                                >
                                    <span itemProp="name">
                                        {item.label}
                                    </span>
                                </Link>
                            ) : (
                                <span
                                    className="text-[13px] font-medium leading-5 text-copy-muted"
                                    itemProp="name"
                                >
                                    {item.label}
                                </span>
                            )}

                            <meta
                                itemProp="position"
                                content={`${index + 1}`}
                            />

                            {!isLast && (
                                <span
                                    aria-hidden="true"
                                    className="text-[13px] text-copy-muted"
                                >
                                    /
                                </span>
                            )}
                        </li>
                    )
                })}
            </ol>
        </nav>
    )
}