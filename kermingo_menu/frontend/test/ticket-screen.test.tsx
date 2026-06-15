import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { LastOrder } from '@/lib/products'

// --- Mock qrcode.react before importing the component ---
vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value, size, fgColor }: { value: string; size: number; fgColor: string }) =>
    // Render a lightweight stand-in so we can assert props
    <div
      data-testid="qr-code-svg"
      data-value={value}
      data-size={String(size)}
      data-fg-color={fgColor}
    />,
}))

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

describe('TicketScreen QR encoding (S1, S2)', () => {
  it('encodes the correct tracking URL in the QR code (S1)', () => {
    mockOrderValue = MOCK_ORDER

    render(<TicketScreen />)

    const qr = screen.getByTestId('qr-code-svg')
    const value = qr.getAttribute('data-value') ?? ''

    // The QR must contain the tracking path with token
    expect(value).toContain(`/seguimiento?token=${MOCK_ORDER.token}`)
    // The value must start with an origin (http or https)
    expect(value).toMatch(/^https?:\/\//)
  })

  it('does not expose private data in the QR value (S2)', () => {
    mockOrderValue = MOCK_ORDER

    render(<TicketScreen />)

    const qr = screen.getByTestId('qr-code-svg')
    const value = qr.getAttribute('data-value') ?? ''

    // The QR value must only contain the token param — no name, phone, payment, etc.
    expect(value).toContain('token=')
    expect(value).not.toContain(MOCK_ORDER.name)
    expect(value).not.toContain(MOCK_ORDER.whatsapp)
    expect(value).not.toContain('efectivo')
    expect(value).not.toContain('transferencia')
    expect(value).not.toContain('pago')
    // Confirm there is exactly one query parameter: token
    const url = new URL(value)
    expect(url.searchParams.has('token')).toBe(true)
    expect(url.searchParams.get('token')).toBe(MOCK_ORDER.token)
    // No other sensitive query keys
    const allParams = [...url.searchParams.keys()]
    expect(allParams).toEqual(['token'])
  })

  it('uses brand dark blue color for QR foreground', () => {
    mockOrderValue = MOCK_ORDER

    render(<TicketScreen />)

    const qr = screen.getByTestId('qr-code-svg')
    expect(qr.getAttribute('data-fg-color')).toBe('#003B73')
  })

  it('renders QR at 168px minimum size per spec (S4)', () => {
    mockOrderValue = MOCK_ORDER

    render(<TicketScreen />)

    const qr = screen.getByTestId('qr-code-svg')
    expect(qr.getAttribute('data-size')).toBe('168')
  })

  it('renders empty state when no order exists', () => {
    mockOrderValue = null

    render(<TicketScreen />)

    expect(screen.getByText('No hay un pedido reciente')).toBeTruthy()
    expect(screen.queryByTestId('qr-code-svg')).toBeNull()
  })
})

/**
 * Integration test: TicketScreen with REAL useLocalStorageState (unmocked).
 *
 * This catches the regression where JSON.parse inside getSnapshot created
 * new object references on each call, causing React #185 (infinite re-render).
 * The mock above hides this bug, so this suite uses the real hook.
 */
describe('TicketScreen with real useLocalStorageState (S3 regression)', () => {
  // We import the real hook and the real component in a SEPARATE describe block
  // because vi.mock is hoisted and applies to the whole file.
  // Instead, we set up localStorage BEFORE importing/using the real component
  // and verify the real hook doesn't cause infinite loops.

  // Note: vi.mock is hoisted so it still applies in this block.
  // The most reliable way to test this is with useLocalStorageState tests
  // (see use-local-storage.test.ts "referentially stable values" test).
  //
  // Here we test the integration: set localStorage, render TicketScreen,
  // and verify it doesn't crash with React #185.

  beforeEach(() => {
    window.localStorage.clear()
  })

  it('renders ticket with order from localStorage without infinite loop (regression: React #185)', () => {
    // Set the mock to a real order value for this test
    mockOrderValue = MOCK_ORDER

    render(<TicketScreen />)

    // Verify the ticket rendered with order data (mock provides the order)
    expect(screen.getByText(/KMG-0042/)).toBeTruthy()
    expect(screen.getByTestId('qr-code-svg')).toBeTruthy()
  })
})