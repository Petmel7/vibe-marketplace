'use client'

import Image from "next/image";
import { Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import WishlistToggleButton from "../wishlist/WishlistToggleButton";
import { getProductCardDisplayState, type ProductCardProductLike } from "./productCard.selectors";
import { formatPrice } from "@/utils/formatters/price";

interface ProductCardProps {
  id: string;
  name: string;
  imageUrl: string;
  isActive?: boolean;
  isHit?: boolean;
  isNew?: boolean;
  badgeVariant?: 'hit' | 'new';
  product: ProductCardProductLike;
}

function ShareIcon() {
  return (
    <button aria-label="Поширити" className="ui-icon-button-card">
      <Share2
        size={20}
        color="#A5A8AD"
        aria-hidden="true" />
    </button>
  );
}

export default function ProductCard({
  id,
  name,
  imageUrl,
  isActive,
  isHit,
  isNew,
  badgeVariant,
  product,
}: ProductCardProps) {
  const router = useRouter();
  const { price, sku } = getProductCardDisplayState(product);
  const resolvedBadgeVariant =
    badgeVariant ?? (isHit ? 'hit' : isNew ? 'new' : null);

  return (
    <div
      className="ui-product-card"
      onClick={() => router.push(`/products/${id}`)}
      onKeyDown={(e) => e.key === 'Enter' && router.push(`/products/${id}`)}
      role="link"
      tabIndex={0}
      style={{ cursor: 'pointer' }}
    >
      <div className="ui-product-card-media">
        {resolvedBadgeVariant && (
          <span
            className={`absolute left-2 top-2 z-10 rounded px-2 text-[13px] font-medium leading-5 text-white ${resolvedBadgeVariant === 'hit' ? 'bg-brand-accent' : 'bg-brand-accent-new'
              }`}
          >
            {resolvedBadgeVariant === 'hit' ? "Хіт" : "Новинка"}
          </span>
        )}

        <div className="absolute right-2 top-2 z-10 flex flex-col gap-1 xs:hidden" onClick={(e) => e.stopPropagation()}>
          <WishlistToggleButton productId={id} variant="card" />
          <ShareIcon />
        </div>

        <Image
          src={imageUrl}
          alt={name}
          fill
          className="object-contain p-4"
          sizes="(min-width: 480px) 25vw, 207px"
        />
      </div>

      <div className="flex flex-col gap-1 px-3 pb-3 pt-2">
        <p className="truncate text-[14px] font-bold leading-5 text-copy-muted">{name}</p>

        <div className="flex flex-wrap items-center gap-2">
          {isActive && (
            <span className="ui-status-badge">
              <span className="ui-status-dot" />
              В наявності
            </span>
          )}
          {sku && <span className="ui-meta-text"> Арт.: {sku}</span>}
        </div>

        <p className="ui-price-card">{formatPrice(price)}</p>
      </div>
    </div>
  );
}
