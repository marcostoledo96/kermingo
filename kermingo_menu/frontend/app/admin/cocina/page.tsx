import type { Metadata } from 'next'
import { CocinaScreen } from '@/components/admin/cocina-screen'

export const metadata: Metadata = {
  title: 'Cocina / Entrega · Kermingo Admin',
  description: 'Panel operativo de cocina y entrega de pedidos.',
}

export default function CocinaPage() {
  return <CocinaScreen />
}
