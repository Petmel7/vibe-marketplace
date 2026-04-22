'use client'

import { House, List, Ellipsis } from 'lucide-react'
import CartIcon from '@/components/cart/CartIcon'
import WishlistIcon from '../wishlist/WishlistIcon'
import NavItem from '@/components/ui/NavItem'

const NAV_ITEMS = [
  { href: '/', icon: House, label: 'Головна', exact: true },
  { href: '/catalog', icon: List, label: 'Каталог' },
  { href: '/wishlist', component: WishlistIcon, label: 'Вибране' },
  { href: '/cart', component: CartIcon, label: 'Кошик' },
  { href: '/more', icon: Ellipsis, label: 'Ще' },
] as const

export default function BottomNav() {
  return (
    <nav aria-label="Навігація" className="ui-mobile-nav">
      <ul className="flex justify-around">
        {NAV_ITEMS.map((item) => (
          <li key={item.label}>
            <NavItem {...item} />
          </li>
        ))}
      </ul>
    </nav>
  )
}
