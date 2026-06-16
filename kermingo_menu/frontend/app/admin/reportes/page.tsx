import type { Metadata } from 'next'
import { ReportesScreen } from '@/components/admin/reportes-screen'

export const metadata: Metadata = {
  title: 'Reportes · Kermingo Admin',
  description: 'Estadísticas y reportes del evento Kermingo',
}

export default function ReportesPage() {
  return <ReportesScreen />
}