import type { Metadata } from 'next'
import CartDrawer from '@/components/cart/CartDrawer'

export const metadata: Metadata = {
  title: 'Кошик — Вайб',
}

export default function CartPage() {
  return <CartDrawer />
}
