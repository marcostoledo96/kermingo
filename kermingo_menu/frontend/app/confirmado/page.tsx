import type { Metadata } from 'next'
import { TicketScreen } from '@/components/menu/ticket-screen'

export const metadata: Metadata = {
  title: 'Pedido confirmado · Kermingo',
  description: 'Tu ticket digital de Kermingo. Presentalo en el mostrador para retirar tu pedido.',
}

export default function ConfirmadoPage() {
  return <TicketScreen />
}
