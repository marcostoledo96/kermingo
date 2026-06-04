import { OrdersScreen } from '@/components/admin/orders-screen'

export const metadata = {
  title: 'Pedidos · Kermingo Admin',
  description: 'Gestión de pedidos de la kermesse: estados, pagos y detalle.',
}

export default function PedidosPage() {
  return <OrdersScreen />
}
