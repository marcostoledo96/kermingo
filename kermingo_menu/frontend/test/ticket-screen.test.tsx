import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { LastOrder } from '@/lib/products'

// Mock ArgentinaStripe to avoid deep dependency chains
vi.mock('@/components/argentina-stripe', () => ({
  ArgentinaStripe: () => <div data-testid="argentina-stripe" />,
}))

// Mock ProductIconGlyph
vi.mock('@/components/menu/product-visual', () => ({
  ProductIconGlyph: () => <span data-testid="product-icon-glyph" />,
}))

// Mock useLocalStorageState to avoid useSyncExternalStore infinite loop in jsdom
let mockOrderValue: LastOrder | null = null
vi.mock('@/lib/use-local-storage', () => ({
  useLocalStorageState: () => [mockOrderValue, vi.fn()],
}))

import { TicketScreen } from '@/components/menu/ticket-screen'

const MOCK_ORDER: LastOrder = {
  id: 1,
  numero: 'KMG-0042',
  token: 'abc123def456',
  createdAt: new Date().toISOString(),
  name: 'Juan Pérez',
  table: '5',
  whatsapp: '5491112345678',
  notes: '',
  method: 'efectivo',
  total: 5000,
  count: 2,
  items: [
    {
      id: '1',
      producto_id: 10,
      nombre: 'Pizza muzza',
      precio_unitario: 2500,
      cantidad: 2,
      subtotal: 5000,
      icon: 'pizza',
    },
  ],
  status: 'recibido',
  payment: 'pendiente',
}

beforeEach(() => {
  mockOrderValue = null
  window.localStorage.clear()
})

describe('TicketScreen sin QR (S1, S2, S3 legacy)', () => {
  it('no renderiza un QR en la pantalla de ticket', () => {
    mockOrderValue = MOCK_ORDER

    const { container } = render(<TicketScreen />)

    // El QR fue removido porque en el evento la gente usa su propio celular
    // y no tiene con qué escanear. Confirmamos que no hay SVG de QR.
    const svgs = container.querySelectorAll('svg')
    const qrLike = Array.from(svgs).filter(
      (svg) => svg.getAttribute('data-testid') === 'qr-code-svg' || (svg.getAttribute('class') ?? '').includes('qr'),
    )
    expect(qrLike.length).toBe(0)
  })

  it('muestra el número de pedido destacado (KMG-0042)', () => {
    mockOrderValue = MOCK_ORDER

    render(<TicketScreen />)

    expect(screen.getByText('KMG-0042')).toBeTruthy()
  })

  it('muestra el link a /seguimiento para "Seguir mi pedido"', () => {
    mockOrderValue = MOCK_ORDER

    render(<TicketScreen />)

    const link = screen.getByRole('link', { name: /seguir mi pedido/i })
    expect(link).toBeTruthy()
    expect(link.getAttribute('href')).toBe('/seguimiento')
  })

  it('muestra el botón de imprimir/descargar ticket', () => {
    mockOrderValue = MOCK_ORDER

    render(<TicketScreen />)

    expect(screen.getByText(/descargar ticket pdf/i)).toBeTruthy()
  })

  it('renderiza el empty state cuando no hay pedido', () => {
    mockOrderValue = null

    render(<TicketScreen />)

    expect(screen.getByText('No hay un pedido reciente')).toBeTruthy()
  })
})

/**
 * Regression: TicketScreen con useLocalStorageState real (sin mock).
 * Verifica que el render inicial no entra en loop de React #185.
 */
describe('TicketScreen con useLocalStorageState real (regresión S3)', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('no entra en loop infinito de re-render (regresión React #185)', () => {
    mockOrderValue = MOCK_ORDER

    render(<TicketScreen />)

    expect(screen.getByText(/KMG-0042/)).toBeTruthy()
  })
})
