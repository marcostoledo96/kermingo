import type { Metadata } from 'next'
import { DashboardScreen } from '@/components/admin/dashboard-screen'

export const metadata: Metadata = {
  title: 'Dashboard · Kermingo Admin',
  description: 'Panel de administración del evento Kermingo',
}

export default function AdminDashboardPage() {
  return <DashboardScreen />
}
