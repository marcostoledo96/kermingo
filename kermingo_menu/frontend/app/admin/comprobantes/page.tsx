import type { Metadata } from 'next'
import { ComprobantesScreen } from '@/components/admin/comprobantes-screen'

export const metadata: Metadata = {
  title: 'Comprobantes · Kermingo Admin',
  description: 'Revisión de comprobantes de transferencia',
}

export default function ComprobantesPage() {
  return <ComprobantesScreen />
}