'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, List, Heart, ShoppingCart, Ellipsis } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", icon: House, label: "Головна" },
  { href: "/catalog", icon: List, label: "Каталог" },
  { href: "/wishlist", icon: Heart, label: "Вибране" },
  { href: "/cart", icon: ShoppingCart, label: "Кошик" },
  { href: "/more", icon: Ellipsis, label: "Ще" },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Навігація" className="ui-mobile-nav">
      <ul className="flex justify-around">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          const color = isActive ? "#E8E9EA" : "#A5A8AD";

          return (
            <li key={href}>
              <Link href={href} className="ui-mobile-nav-link" aria-current={isActive ? "page" : undefined}>
                <Icon size={24} color={color} aria-hidden="true" />
                <span style={{ color }}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
