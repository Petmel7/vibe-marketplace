
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowUpRight } from 'lucide-react'
import { getCategoryImage } from '@/utils/getCategoryImage'

type Category = {
    id: string
    name: string
    href: string
    image?: string | null
    children: Category[]
}

type Props = {
    activeRoot: Category
    onNavigate: () => void
}

export default function MegaMenuContent({ activeRoot, onNavigate }: Props) {
    return (
        <div className="space-y-6 p-6">
            <MegaMenuHeader root={activeRoot} onNavigate={onNavigate} />

            <div className="grid grid-cols-2 gap-6 xl:grid-cols-3">
                {activeRoot.children.map((group) => (
                    <CategoryGroup key={group.id} group={group} onNavigate={onNavigate} />
                ))}
            </div>
        </div>
    )
}

function MegaMenuHeader({
    root,
    onNavigate,
}: {
    root: Category
    onNavigate: () => void
}) {
    return (
        <div className="flex items-center justify-between gap-4">
            <div>
                <p className="ui-body-muted">Каталог</p>
                <h2 className="ui-heading-product text-[28px] leading-8">{root.name}</h2>
            </div>

            <Link
                href={root.href}
                className="inline-flex items-center gap-2 rounded-full border border-panelBorder px-4 py-2 text-sm text-copy-secondary transition-colors hover:border-brand hover:text-copy-strong"
                onClick={onNavigate}
            >
                Переглянути всі
                <ArrowUpRight size={16} aria-hidden />
            </Link>
        </div>
    )
}

function CategoryGroup({
    group,
    onNavigate,
}: {
    group: Category
    onNavigate: () => void
}) {
    const items = group.children.length > 0 ? group.children : [group]

    return (
        <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
                <Link
                    href={group.href}
                    className="text-base font-semibold text-copy-strong transition-colors hover:text-brand-accent"
                    onClick={onNavigate}
                >
                    {group.name}
                </Link>

                <Link
                    href={group.href}
                    className="text-xs uppercase tracking-[0.16em] text-copy-muted transition-colors hover:text-copy-strong"
                    onClick={onNavigate}
                >
                    Переглянути всі
                </Link>
            </div>

            <div className="grid gap-3">
                {items.map((item) => (
                    <CategoryCard key={item.id} item={item} onNavigate={onNavigate} />
                ))}
            </div>
        </section>
    )
}

function CategoryCard({
    item,
    onNavigate,
}: {
    item: Category
    onNavigate: () => void
}) {
    return (
        <Link
            href={item.href}
            className="group flex items-center gap-3 rounded-2xl border border-transparent bg-panel/60 p-3 transition-colors hover:border-panelBorder hover:bg-panelAlt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            onClick={onNavigate}
        >
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-media">
                <Image
                    src={getCategoryImage(item.image)}
                    alt={item.name}
                    fill
                    className="object-cover transition-transform duration-200 group-hover:scale-105"
                    sizes="56px"
                />
            </div>

            <div className="min-w-0">
                <p className="truncate text-sm font-medium text-copy-primary">
                    {item.name}
                </p>
                <p className="ui-body-muted mt-1">Перейти до категорії</p>
            </div>
        </Link>
    )
}