import Image from 'next/image'
import Link from 'next/link'
import { Trash } from 'lucide-react'
import { formatPrice } from '@/utils/formatters/price'
import type { WishlistItemDto } from '@/features/wishlist/wishlist.dto'

interface WishlistItemRowProps {
    item: WishlistItemDto
    isRemoving: boolean
    onRemove: (productId: string) => void
}

export default function WishlistItemRow({ item, isRemoving, onRemove }: WishlistItemRowProps) {
    return (
        <article className="py-4 border-b border-panelBorder flex gap-3 items-center">
            <Link
                href={`/products/${item.productId}`}
                className="shrink-0 w-33 h-33 rounded-xl overflow-hidden bg-panel flex items-center justify-center"
                tabIndex={-1}
                aria-hidden="true"
            >
                {item.imageUrl ? (
                    <Image
                        src={item.imageUrl}
                        alt={item.name}
                        width={132}
                        height={132}
                        className="object-contain w-full h-full p-2"
                    />
                ) : (
                    <span className="ui-meta-text">Немає фото</span>
                )}
            </Link>

            <div className="flex-1 min-w-0 flex flex-col gap-1">
                <Link
                    href={`/products/${item.productId}`}
                    className="font-bold text-[14px] leading-5 text-copy-primary truncate hover:underline"
                >
                    {item.name}
                </Link>
                <p className="ui-price-card text-brand-accent">
                    {formatPrice(item.price)}
                </p>
            </div>

            <button
                type="button"
                aria-label={`Видалити ${item.name} з обраного`}
                onClick={() => onRemove(item.productId)}
                disabled={isRemoving}
                className="shrink-0 flex items-center justify-center w-10 h-10 disabled:opacity-40"
            >
                <Trash width={16} height={18} className="text-copy-muted" aria-hidden="true" />
            </button>
        </article>
    )
}