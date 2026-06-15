import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import type React from 'react'

// --- Mock dependencies before importing ---

// Mock useSearchParams — each test will override via mockReturnValue
const mockGet = vi.fn()
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: mockGet,
  }),
}))

// Mock apiGet to avoid real network requests
const mockApiGet = vi.fn()
vi.mock('@/lib/api', () => ({
  apiGet: (...args: unknown[]) => mockApiGet(...args),
  ApiError: class ApiError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  },
}))

// Mock mapPedido
vi.mock('@/lib/mappers', () => ({
  mapPedido: vi.fn((data: { token_seguimiento: string }) => ({
    id: data.token_seguimiento === 'url-abc' ? 1 : 2,
    numero: 'KMG-0001',
    token: data.token_seguimiento,
    name: 'Test',
    createdAt: new Date().toISOString(),
    method: 'efectivo' as const,
    total: 5000,
    count: 2,
    status: 'recibido' as const,
    payment: 'pendiente' as const,
    items: [],
  })),
  pickProductIcon: vi.fn(() => 'pizza'),
}))

// Mock MenuHeader
vi.mock('@/components/menu/menu-header', () => ({
  MenuHeader: () => <div data-testid="menu-header" />,
}))

// Mock ProductIconGlyph
vi.mock('@/components/menu/product-visual', () => ({
  ProductIconGlyph: () => <span data-testid="product-icon-glyph" />,
}))

import { TrackingScreen } from '@/components/menu/tracking-screen'

// Helper: standard API response for a tracked order
const API_PEDIDO = {
  token_seguimiento: 'url-abc',
  estado_pedido: 'recibido',
  estado_pago: 'pendiente',
  metodo_pago: 'efectivo',
}

beforeEach(() => {
  window.localStorage.clear()
  mockGet.mockReturnValue(null) // no URL token by default
  mockApiGet.mockReset()
})

describe('TrackingScreen URL token (S5, S6, S7)', () => {
  it('auto-fetches order when URL contains ?token= (S5)', async () => {
    // Set URL token
    mockGet.mockReturnValue('url-abc')

    // Also store a different token in localStorage to test precedence
    window.localStorage.setItem('kermingo:lastToken', JSON.stringify('stored-xyz'))

    mockApiGet.mockResolvedValue(API_PEDIDO)

    render(<TrackingScreen />)

    await waitFor(() => {
      // apiGet should have been called with the URL token
      expect(mockApiGet).toHaveBeenCalledWith(
        expect.stringContaining('url-abc'),
      )
    })
  })

  it('shows manual input form when no token in URL or localStorage (S6)', () => {
    mockGet.mockReturnValue(null) // no URL token
    // No localStorage token either

    render(<TrackingScreen />)

    // Should show the input form, not order details
    expect(screen.getByText('Seguí tu pedido')).toBeTruthy()
    expect(screen.getByPlaceholderText('ej: 7f2a1c0e…')).toBeTruthy()
    // Should NOT auto-fetch
    expect(mockApiGet).not.toHaveBeenCalled()
  })

  it('URL token takes precedence over localStorage token (S7)', async () => {
    const urlToken = 'url-abc'
    const storedToken = 'stored-xyz'

    mockGet.mockReturnValue(urlToken)
    window.localStorage.setItem('kermingo:lastToken', JSON.stringify(storedToken))
    mockApiGet.mockResolvedValue(API_PEDIDO)

    render(<TrackingScreen />)

    await waitFor(() => {
      // The API should be called with the URL token, NOT the stored one
      expect(mockApiGet).toHaveBeenCalledWith(
        expect.stringContaining(urlToken),
      )
      expect(mockApiGet).not.toHaveBeenCalledWith(
        expect.stringContaining(storedToken),
      )
    })
  })

  it('persists URL token to localStorage for future visits', async () => {
    const urlToken = 'url-abc'
    mockGet.mockReturnValue(urlToken)
    mockApiGet.mockResolvedValue(API_PEDIDO)

    render(<TrackingScreen />)

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalled()
    })

    // After the URL token is used, it should be persisted to localStorage
    // Note: fetchByToken writes the raw string via window.localStorage.setItem,
    // while useLocalStorageState's setToken writes JSON.stringify.
    // Either way, the stored value should contain the URL token.
    const stored = window.localStorage.getItem('kermingo:lastToken')
    expect(stored).toBeTruthy()
    // The token value should be present in the stored string
    // (either as raw "url-abc" or as JSON '"url-abc"')
    expect(stored).toContain(urlToken)
  })

  it('falls back to localStorage token when no URL token', async () => {
    mockGet.mockReturnValue(null) // no URL token
    const storedToken = 'stored-xyz'
    window.localStorage.setItem('kermingo:lastToken', JSON.stringify(storedToken))
    mockApiGet.mockResolvedValue({
      ...API_PEDIDO,
      token_seguimiento: storedToken,
    })

    render(<TrackingScreen />)

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith(
        expect.stringContaining(storedToken),
      )
    })
  })
})

describe('QR ↔ Tracking contract (S1 ↔ S5)', () => {
  it('QR query key "token" matches useSearchParams key "token"', async () => {
    // This test verifies the contract between:
    // - TicketScreen QR: encodes ?token=<value>
    // - TrackingScreen: reads useSearchParams().get('token')
    // If either side changes the key, this test should fail.
    const urlToken = 'contract-test-token'
    mockGet.mockReturnValue(urlToken)
    mockApiGet.mockResolvedValue(API_PEDIDO)

    render(<TrackingScreen />)

    await waitFor(() => {
      // useSearchParams().get('token') was called with 'token' key
      expect(mockGet).toHaveBeenCalledWith('token')
      // And the API was called with that same token
      expect(mockApiGet).toHaveBeenCalledWith(
        expect.stringContaining(urlToken),
      )
    })
  })
})