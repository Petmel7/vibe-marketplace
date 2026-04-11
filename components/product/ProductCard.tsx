'use client'

import Image from "next/image";
import { Heart, ListPlus } from "lucide-react";
import { useRouter } from "next/navigation";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  sku?: string;
  isActive?: boolean;
  isHit?: boolean;
  isNew?: boolean;
}

function HeartIcon() {
  return (
    <button
      aria-label="Додати до обраного"
      className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#1D2533]"
    >
      <Heart size={20} color="#A5A8AD" aria-hidden="true" />
    </button>
  );
}

function ListIcon() {
  return (
    <button
      aria-label="Додати до списку"
      className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#1D2533]"
    >
      <ListPlus size={20} color="#A5A8AD" aria-hidden="true" />
    </button>
  );
}

export default function ProductCard({
  id,
  name,
  price,
  imageUrl,
  sku,
  isActive,
  isHit,
  isNew,
}: ProductCardProps) {
  const router = useRouter();

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden w-full h-95 xs:h-75 bg-[linear-gradient(180deg,#4E5D77_0%,#2A323F_100%)]"
      onClick={() => router.push(`/products/${id}`)}
      onKeyDown={(e) => e.key === 'Enter' && router.push(`/products/${id}`)}
      role="link"
      tabIndex={0}
      style={{ cursor: 'pointer' }}
    >
      {/* Image area */}
      <div className="relative flex-1 bg-[radial-gradient(ellipse_at_center,#6B7A94_0%,#2A323F_100%)]">
        {/* Hit / New badge */}
        {(isHit || isNew) && (
          <span className="absolute top-2 left-2 z-10 px-2 rounded text-white font-medium text-[13px] leading-5 bg-[#16D9A6]">
            {isHit ? "Хіт" : "Новинка"}
          </span>
        )}

        {/* Action icons — hidden on desktop */}
        <div
          className="absolute top-2 right-2 z-10 flex flex-col gap-1 xs:hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <HeartIcon />
          <ListIcon />
        </div>

        <Image
          src={imageUrl}
          alt={name}
          fill
          className="object-contain p-4"
          sizes="(min-width: 480px) 25vw, 207px"
        />
      </div>

      {/* Info area */}
      <div className="px-3 pb-3 pt-2 flex flex-col gap-1">
        <p className="font-bold truncate text-[14px] leading-5 text-[#A5A8AD]">
          {name}
        </p>

        <div className="flex items-center gap-2">
          {isActive && (
            <span className="flex items-center gap-1 text-[10px] leading-3 text-[#26DA72]">
              <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0 bg-[#26DA72]" />
              В наявності
            </span>
          )}
          {sku && (
            <span className="text-[10px] leading-3 text-[#A5A8AD]">
              Арт.: {sku}
            </span>
          )}
        </div>

        <p className="font-medium text-[20px] leading-7 text-[#E8E9EA]">
          {price.toLocaleString("uk-UA")} ₴
        </p>
      </div>
    </div>
  );
}
