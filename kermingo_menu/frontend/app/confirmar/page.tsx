import type { Metadata } from 'next'
import { CheckoutScreen } from '@/components/menu/checkout-screen'

export const metadata: Metadata = {
  title: 'Confirmá tu pedido · Kermingo',
  description: 'Revisá tu pedido, elegí el método de pago y confirmá. Sin registro.',
}

export default function ConfirmarPage() {
  return <CheckoutScreen />
}
