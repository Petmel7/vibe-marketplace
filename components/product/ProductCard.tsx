import Image from "next/image";
import { Heart, ListPlus } from "lucide-react";

interface ProductCardProps {
  name: string;
  price: number;
  imageUrl: string;
  sku?: string;
  isActive?: boolean;
  isHit?: boolean;
  isNew?: boolean;
}

export default function ProductCard({
  name,
  price,
  imageUrl,
  sku,
  isActive,
  isHit,
  isNew,
}: ProductCardProps) {
  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden"
      style={{
        width: "207px",
        height: "380px",
        background: "linear-gradient(180deg, #4E5D77 0%, #2A323F 100%)",
      }}
    >
      {/* Image area */}
      <div
        className="relative flex-1"
        style={{
          background:
            "radial-gradient(ellipse at center, #6B7A94 0%, #2A323F 100%)",
        }}
      >
        {/* Hit / New label */}
        {(isHit || isNew) && (
          <span
            className="absolute top-2 left-2 z-10 px-2 rounded text-white font-medium"
            style={{
              fontSize: "13px",
              lineHeight: "20px",
              background: "#16D9A6",
            }}
          >
            {isHit ? "Хіт" : "Новинка"}
          </span>
        )}

        {/* Action icons */}
        <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
          <button
            aria-label="Додати до обраного"
            className="flex items-center justify-center w-8 h-8 rounded-lg"
            style={{ background: "#1D2533" }}
          >
            <Heart size={20} color="#A5A8AD" aria-hidden="true" />
          </button>
          <button
            aria-label="Додати до списку"
            className="flex items-center justify-center w-8 h-8 rounded-lg"
            style={{ background: "#1D2533" }}
          >
            <ListPlus size={20} color="#A5A8AD" aria-hidden="true" />
          </button>
        </div>

        {/* Product image */}
        <Image
          src={imageUrl}
          alt={name}
          fill
          className="object-contain p-4"
          sizes="207px"
        />
      </div>

      {/* Info area */}
      <div className="px-3 pb-3 pt-2 flex flex-col gap-1">
        {/* Name */}
        <p
          className="font-bold truncate"
          style={{ fontSize: "14px", lineHeight: "20px", color: "#A5A8AD" }}
        >
          {name}
        </p>

        {/* Availability + article */}
        <div className="flex items-center gap-2">
          {isActive && (
            <span
              className="flex items-center gap-1"
              style={{ fontSize: "10px", lineHeight: "12px", color: "#26DA72" }}
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: "#26DA72" }}
              />
              {isActive ? "В наявності" : "Немає в наявності"}
            </span>
          )}
          {sku && (
            <span
              style={{ fontSize: "10px", lineHeight: "12px", color: "#A5A8AD" }}
            >
              Арт.: {sku}
            </span>
          )}
        </div>

        {/* Price */}
        <p
          className="font-medium"
          style={{ fontSize: "20px", lineHeight: "28px", color: "#E8E9EA" }}
        >
          {price.toLocaleString("uk-UA")} ₴
        </p>

        {/* Cart button */}
        <button
          className="w-full font-medium text-white"
          style={{
            borderRadius: "32px",
            padding: "12px 24px",
            background: "#9466FF",
            fontSize: "16px",
            lineHeight: "24px",
          }}
        >
          В кошик
        </button>
      </div>
    </div>
  );
}
