import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Bricolage_Grotesque } from 'next/font/google'
import { CartProvider } from '@/components/menu/cart-context'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Kermingo | Bingo · Kermesse · Mundial · Día de la Bandera',
  description: 'Evento scout recaudatorio del campamento de verano. Grupo Scout San Patricio, Tropa Raider "Compañía de Jesús" y Comunidad Raider "Fortaleza de María". 20 de Junio de 2026.',
  generator: 'v0.app',
  keywords: ['kermingo', 'bingo', 'kermesse', 'scout', 'san patricio', 'dia de la bandera', 'evento', 'argentina'],
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#003B73',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${bricolage.variable} bg-[#EEF5FF]`}>
      <body className="font-sans antialiased min-h-screen">
        <CartProvider>{children}</CartProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
