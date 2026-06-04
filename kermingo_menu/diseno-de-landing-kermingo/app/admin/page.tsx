import type { Metadata } from 'next'
import { AdminLoginScreen } from '@/components/admin/login-screen'

export const metadata: Metadata = {
  title: 'Ingreso organizadores · Kermingo',
  description: 'Acceso exclusivo para organizadores del evento Kermingo.',
}

export default function AdminLoginPage() {
  return <AdminLoginScreen />
}
