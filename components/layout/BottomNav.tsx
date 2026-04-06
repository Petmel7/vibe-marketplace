'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, List, Heart, ShoppingCart, Ellipsis } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", icon: House, label: "Головна" },
  { href: "/catalog", icon: List, label: "Каталог" },
  { href: "/wishlist", icon: Heart, label: "Обране" },
  { href: "/cart", icon: ShoppingCart, label: "Кошик" },
  { href: "/more", icon: Ellipsis, label: "Ще" },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Навігація"
      className="fixed bottom-0 left-0 w-full bg-[#1D2533] z-50 md:hidden"
    >
      <ul className="flex justify-around">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          const color = isActive ? "#E8E9EA" : "#A5A8AD";

          return (
            <li key={href}>
              <Link
                href={href}
                className="flex flex-col items-center gap-1 py-2 px-3"
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={24} color={color} aria-hidden="true" />
                <span
                  className="text-sm leading-5"
                  style={{ color }}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
