import type { Metadata } from 'next'
import { ConfigScreen } from '@/components/admin/config-screen'

export const metadata: Metadata = {
  title: 'Configuración · Kermingo Admin',
  description: 'Configuración de la tienda Kermingo',
}

export default function ConfigPage() {
  return <ConfigScreen />
}