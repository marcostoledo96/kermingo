import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

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
  mapPedido: vi.fn((data: { token_seguimiento: string; numero?: string }) => ({
    id: 1,
    numero: data.numero ?? 'KMG-0001',
    token: data.token_seguimiento,
    name: 'Test',
    table: '',
    createdAt: new Date().toISOString(),
    method: 'efectivo' as const,
    total: 5000,
    count: 2,
    status: 'en_preparacion' as const,
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

const API_PEDIDO = {
  token_seguimiento: 'url-abc',
  numero: 'KMG-0001',
  estado_pedido: 'en_preparacion',
  estado_pago: 'pendiente',
  metodo_pago: 'efectivo',
}

beforeEach(() => {
  window.localStorage.clear()
  mockGet.mockReturnValue(null) // no URL token by default
  mockApiGet.mockReset()
})

/** Helper: persiste un pedido en la lista de este dispositivo */
function setMyOrders(orders: Array<{ token: string; numero: string; createdAt: string }>) {
  window.localStorage.setItem('kermingo:myOrders', JSON.stringify(orders))
}

describe('TrackingScreen — auto-carga desde este celular (S5, S6, S7)', () => {
  it('muestra loading inicial y luego lista los pedidos del celular sin pedir código (S5)', async () => {
    // El usuario tiene 2 pedidos guardados en su celular
    setMyOrders([
      { token: 'token-1', numero: 'KMG-0001', createdAt: '2026-06-17T18:00:00.000Z' },
      { token: 'token-2', numero: 'KMG-0002', createdAt: '2026-06-17T19:00:00.000Z' },
    ])

    mockApiGet.mockImplementation(async (url: string) => ({
      ...API_PEDIDO,
      token_seguimiento: url.split('/').pop(),
      numero: url.includes('token-1') ? 'KMG-0001' : 'KMG-0002',
    }))

    render(<TrackingScreen />)

    // NO debe mostrar el form de "código de seguimiento" — la queja original del usuario
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/pegá el código que te llegó al confirmar/i)).toBeNull()
    })

    // Sí debe mostrar la lista de pedidos del dispositivo
    expect(screen.getByText(/Tus pedidos/i)).toBeTruthy()
    expect(screen.getAllByText(/KMG-000/).length).toBeGreaterThanOrEqual(2)

    // Las llamadas a la API deben hacerse para cada token
    expect(mockApiGet).toHaveBeenCalledWith(expect.stringContaining('token-1'))
    expect(mockApiGet).toHaveBeenCalledWith(expect.stringContaining('token-2'))
  })

  it('muestra form manual cuando el celular no tiene pedidos guardados (S6)', async () => {
    // No hay pedidos guardados ni URL token
    mockGet.mockReturnValue(null)

    render(<TrackingScreen />)

    // Debe mostrar el form con placeholder del input
    expect(screen.getByPlaceholderText('Pegá el código que te llegó al confirmar')).toBeTruthy()
    // No debe llamar a la API
    expect(mockApiGet).not.toHaveBeenCalled()
  })

  it('acepta un ?token= en la URL y lo agrega a la lista automáticamente (S7)', async () => {
    mockGet.mockImplementation((key: string) => (key === 'token' ? 'url-abc' : null))
    mockApiGet.mockResolvedValue(API_PEDIDO)

    render(<TrackingScreen />)

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith(expect.stringContaining('url-abc'))
    })

    // El token de la URL debe quedar persistido para próximas visitas
    const persisted = window.localStorage.getItem('kermingo:myOrders')
    expect(persisted).toBeTruthy()
    expect(persisted).toContain('url-abc')
  })

  it('puede buscar otro pedido con código manual cuando ya hay pedidos en la lista', async () => {
    setMyOrders([
      { token: 'token-1', numero: 'KMG-0001', createdAt: '2026-06-17T18:00:00.000Z' },
    ])
    mockApiGet.mockResolvedValue(API_PEDIDO)

    render(<TrackingScreen />)

    // Aparece la lista, no el form automático
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Pegá el código que te llegó al confirmar')).toBeNull()
    })

    // El botón "Buscar otro pedido" sí está disponible
    const searchBtn = screen.getByRole('button', { name: /buscar otro pedido con un código/i })
    expect(searchBtn).toBeTruthy()
  })

  it('mantiene compatibilidad con kermingo:lastToken (legacy)', async () => {
    // Alguien con la versión vieja que solo tiene lastToken
    window.localStorage.setItem('kermingo:lastToken', JSON.stringify('legacy-token'))

    mockApiGet.mockResolvedValue(API_PEDIDO)

    render(<TrackingScreen />)

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith(expect.stringContaining('legacy-token'))
    })
  })

  it('no muestra el form para "código de seguimiento" si el celular tiene al menos un pedido', async () => {
    setMyOrders([
      { token: 'token-1', numero: 'KMG-0001', createdAt: '2026-06-17T18:00:00.000Z' },
    ])
    mockApiGet.mockResolvedValue(API_PEDIDO)

    render(<TrackingScreen />)

    await waitFor(() => {
      expect(screen.getByText(/Tus pedidos/i)).toBeTruthy()
    })
    // Crítico: el form de "tengo que tipear" no debe aparecer
    expect(screen.queryByText(/^Seguí tu pedido$/)).toBeNull()
  })

  it('muestra "Estamos comprobando tu pago" para pedido recibido con comprobante_subido', async () => {
    setMyOrders([
      { token: 'token-recibido', numero: 'KMG-0099', createdAt: '2026-06-17T18:00:00.000Z' },
    ])

    const { mapPedido } = await import('@/lib/mappers')
    vi.mocked(mapPedido).mockReturnValue({
      id: 1,
      numero: 'KMG-0099',
      token: 'token-recibido',
      name: 'Test Recibido',
      table: '',
      createdAt: new Date().toISOString(),
      method: 'transferencia',
      total: 5000,
      count: 1,
      status: 'recibido',
      payment: 'comprobante_subido',
      items: [],
    })

    mockApiGet.mockResolvedValue({
      token_seguimiento: 'token-recibido',
      numero: 'KMG-0099',
    })

    render(<TrackingScreen />)

    await waitFor(() => {
      expect(screen.getByText(/Estamos comprobando tu pago/i)).toBeTruthy()
    })
  })

  it('muestra "pago confirmado" para pedido recibido ya pagado', async () => {
    setMyOrders([
      { token: 'token-recibido-pagado', numero: 'KMG-0100', createdAt: '2026-06-17T18:00:00.000Z' },
    ])

    const { mapPedido } = await import('@/lib/mappers')
    vi.mocked(mapPedido).mockReturnValue({
      id: 2,
      numero: 'KMG-0100',
      token: 'token-recibido-pagado',
      name: 'Test Recibido Pagado',
      table: '',
      createdAt: new Date().toISOString(),
      method: 'transferencia',
      total: 5000,
      count: 1,
      status: 'recibido',
      payment: 'pagado',
      items: [],
    })

    mockApiGet.mockResolvedValue({
      token_seguimiento: 'token-recibido-pagado',
      numero: 'KMG-0100',
    })

    render(<TrackingScreen />)

    await waitFor(() => {
      expect(screen.getByText(/Pago confirmado.*preparado pronto/i)).toBeTruthy()
    })
  })

  it('sorts orders with most recent first (newer on top)', async () => {
    // Add two orders: one older, one newer
    setMyOrders([
      { token: 'older-token', numero: 'KMG-0001', createdAt: '2026-06-17T18:00:00.000Z' },
      { token: 'newer-token', numero: 'KMG-0002', createdAt: '2026-06-17T20:00:00.000Z' },
    ])

    mockApiGet.mockImplementation(async (url: string) => {
      const token = url.split('/').pop()
      const isNewer = token === 'newer-token'
      return {
        ...API_PEDIDO,
        token_seguimiento: token,
        numero: isNewer ? 'KMG-0002' : 'KMG-0001',
      }
    })

    const { mapPedido } = await import('@/lib/mappers')
    vi.mocked(mapPedido).mockImplementation((data: { token_seguimiento: string }) => {
      const isNewer = data.token_seguimiento === 'newer-token'
      return {
        id: isNewer ? 2 : 1,
        numero: isNewer ? 'KMG-0002' : 'KMG-0001',
        token: data.token_seguimiento,
        name: isNewer ? 'Newer Order' : 'Older Order',
        table: '',
        createdAt: isNewer ? '2026-06-17T20:00:00.000Z' : '2026-06-17T18:00:00.000Z',
        method: 'efectivo' as const,
        total: 5000,
        count: 2,
        status: 'en_preparacion' as const,
        payment: 'pendiente' as const,
        items: [],
      }
    })

    render(<TrackingScreen />)

    // Wait for the orders to load
    await waitFor(() => {
      expect(screen.getByText(/Tus pedidos/i)).toBeTruthy()
    })

    // Find all order number texts — the newer order (KMG-0002) should appear before the older (KMG-0001)
    const allOrderNumbers = screen.getAllByText(/KMG-000[12]/)
    // The first rendered order number should be the newer one
    expect(allOrderNumbers[0].textContent).toContain('KMG-0002')
  })
})
