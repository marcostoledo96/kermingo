import type { Metadata } from 'next'
import { CartScreen } from '@/components/menu/cart-screen'

export const metadata: Metadata = {
  title: 'Tu carrito | Kermingo',
  description: 'Revisá tu pedido de comidas y bebidas de Kermingo antes de confirmar.',
}

export default function CarritoPage() {
  return <CartScreen />
}
