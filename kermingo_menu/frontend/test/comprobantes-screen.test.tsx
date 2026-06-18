import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ComprobantesScreen } from '@/components/admin/comprobantes-screen'
import type { ApiPedidoListItem } from '@/lib/types'

const mockExpireSession = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/comprobantes',
}))

vi.mock('@/components/admin/admin-session', () => ({
  useAdminSession: () => ({ expireSession: mockExpireSession }),
}))

vi.mock('@/components/admin/admin-shell', () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const mockApiGet = vi.fn()
const mockApiPatch = vi.fn()

vi.mock('@/lib/api', () => ({
  apiGet: (...args: unknown[]) => mockApiGet(...args),
  apiPatch: (...args: unknown[]) => mockApiPatch(...args),
  ApiError: class ApiError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  },
}))

vi.mock('@/lib/config', () => ({
  API_BASE: 'http://localhost:3001',
}))

function makeOrder(overrides: Partial<ApiPedidoListItem> = {}): ApiPedidoListItem {
  return {
    id: 101,
    numero: 'KMG-0101',
    token_seguimiento: 'tk-0101',
    origen: 'online',
    nombre_cliente: 'Marcos',
    mesa: null,
    telefono_cliente: null,
    telefono_whatsapp: null,
    estado_pedido: 'recibido',
    estado_pago: 'comprobante_subido',
    metodo_pago: 'transferencia',
    total: '3500.00',
    observaciones: null,
    comprobante_archivo_id: 55,
    created_at: '2026-06-17T18:00:00.000Z',
    updated_at: '2026-06-17T18:00:00.000Z',
    ...overrides,
  }
}

function mockOrdersResponse(orders: ApiPedidoListItem[]) {
  mockApiGet.mockImplementation(async (url: string) => {
    if (url.includes('/comprobante')) {
      if (url.includes('/11/comprobante')) {
        return {
          url_publica: 'https://drive.google.com/file/d/abc/view',
          url_proxy: '/api/admin/pedidos/11/comprobante/imagen',
          nombre_original: 'comprobante.jpg',
          mime_type: 'image/jpeg',
        }
      }

      return {
        url_publica: 'https://drive.google.com/file/d/pdf/view',
        url_proxy: '/api/admin/pedidos/22/comprobante/imagen',
        nombre_original: 'comprobante.pdf',
        mime_type: 'application/pdf',
      }
    }
    if (url.includes('/api/admin/pedidos')) {
      return {
        pedidos: orders,
        paginacion: { total: orders.length, page: 1, limit: 100, totalPages: 1 },
      }
    }
    return {}
  })
}

describe('ComprobantesScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows separate actions: Ver pedido and Ver comprobante', async () => {
    const order = makeOrder({ id: 11, numero: 'KMG-0011' })
    mockOrdersResponse([order])

    render(<ComprobantesScreen />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ver pedido/i })).toBeTruthy()
    })

    const verPedidoBtn = screen.getByRole('button', { name: /ver pedido/i })
    const verComprobanteBtn = screen.getByRole('button', { name: /ver comprobante/i })

    expect(verPedidoBtn).toBeTruthy()
    expect(verComprobanteBtn).toBeTruthy()

    fireEvent.click(verComprobanteBtn)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 3, name: /comprobante adjunto/i })).toBeTruthy()
      expect(screen.getByAltText('Comprobante de pago adjunto')).toBeTruthy()
    })

    const apiCalls = mockApiGet.mock.calls.map((call) => String(call[0]))
    expect(apiCalls).toContain('/api/admin/pedidos/11/comprobante')
  })

  it('renders PDF comprobante in iframe when MIME type is application/pdf', async () => {
    const order = makeOrder({
      id: 22,
      numero: 'KMG-0022',
      estado_pago: 'comprobante_subido',
      comprobante_archivo_id: 77,
      metodo_pago: 'transferencia',
      origen: 'online',
    })
    mockOrdersResponse([order])

    render(<ComprobantesScreen />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ver pedido/i })).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: /ver comprobante/i }))

    await waitFor(() => {
      const frame = screen.getByTitle('Comprobante de pago adjunto en PDF') as HTMLIFrameElement
      expect(frame.src).toContain('/api/admin/pedidos/22/comprobante/imagen')
    })
  })
})
