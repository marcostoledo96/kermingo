import type { Metadata } from 'next'
import { ProductsScreen } from '@/components/admin/products-screen'

export const metadata: Metadata = {
  title: 'Productos · Kermingo Admin',
  description: 'Alta, baja y modificación de productos del evento Kermingo',
}

export default function AdminProductsPage() {
  return <ProductsScreen />
}
