import type { Metadata } from 'next'
import { TrackingScreen } from '@/components/menu/tracking-screen'

export const metadata: Metadata = {
  title: 'Seguimiento de pedido · Kermingo',
  description: 'Seguí el estado de tu pedido en tiempo real.',
}

export default function SeguimientoPage() {
  return <TrackingScreen />
}
