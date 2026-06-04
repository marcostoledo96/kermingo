import type { Metadata } from 'next'
import { CajaScreen } from '@/components/admin/caja-screen'

export const metadata: Metadata = {
  title: 'Caja rápida · Kermingo Admin',
  description: 'Registro rápido de ventas en caja para el evento Kermingo.',
}

export default function CajaPage() {
  return <CajaScreen />
}
