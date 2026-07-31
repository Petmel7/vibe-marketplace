
'use client'

import { KeyboardEvent } from 'react'
import clsx from 'clsx'
import { ArrowUpRight } from 'lucide-react'
import CategoryImage from '@/components/category/CategoryImage'
import Icon from '@/components/ui/Icon'

type Category = {
    id: string
    slug: string
    name: string
    imageUrl?: string | null
}

type Props = {
    category: Category
    index: number
    categories: Category[]
    isActive: boolean
    onSelect: (slug: string) => void
}

function getNextIndex(
    key: string,
    index: number,
    length: number
): number {
    if (key === 'ArrowDown') return (index + 1) % length
    if (key === 'ArrowUp') return (index - 1 + length) % length
    return index
}

function getButtonStyles(isActive: boolean) {
    return clsx(
        'flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition-colors',
        isActive
            ? 'bg-brand text-white'
            : 'text-copy-secondary hover:bg-panelAlt hover:text-copy-strong'
    )
}

export default function CategoryButton({
    category,
    index,
    categories,
    isActive,
    onSelect,
}: Props) {
    const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return

        event.preventDefault()

        const nextIndex = getNextIndex(event.key, index, categories.length)
        const nextSlug = categories[nextIndex]?.slug ?? category.slug

        onSelect(nextSlug)

        document
            .querySelector<HTMLButtonElement>(
                `[data-root-category="${nextSlug}"]`
            )
            ?.focus()
    }

    return (
        <button
            type="button"
            className={getButtonStyles(isActive)}
            aria-current={isActive ? 'true' : undefined}
            onClick={() => onSelect(category.slug)}
            onKeyDown={handleKeyDown}
            data-root-category={category.slug}
        >
            <div className="flex items-center gap-2">
                {category.imageUrl ? (
                    <CategoryImage
                        src={category.imageUrl}
                        alt={category.name}
                        sizes="24px"
                        className="relative block h-6 w-6 shrink-0 overflow-hidden rounded-lg bg-panelAlt"
                        imageClassName="object-cover"
                    />
                ) : (
                    <Icon src={null} size={20} />
                )}
                <span>{category.name}</span>
            </div>

            {isActive && <ArrowUpRight size={16} aria-hidden />}
        </button>
    )
}
