import type { Metadata } from 'next'
import { Footer } from '@/components/footer'
import { MenuScreen } from '@/components/menu/menu-screen'

export const metadata: Metadata = {
  title: 'Menú | Kermingo',
  description:
    'Elegí tus comidas y bebidas de la kermesse Kermingo para retirar en el mostrador. Pizzas, panchos, medialunas, churros, bebidas y promos.',
}

export default function MenuPage() {
  return (
    <>
      <MenuScreen />
      <Footer />
    </>
  )
}
