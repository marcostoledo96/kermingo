import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { DashboardScreen } from '@/components/admin/dashboard-screen'
import type { ApiPedidoListItem, ApiPedidoPaginada } from '@/lib/types'
import type { ReactNode } from 'react'

const mockApiGet = vi.fn()

vi.mock('@/lib/api', () => ({
  apiGet: (...args: unknown[]) => mockApiGet(...args),
  ApiError: class ApiError extends Error {
    status: number
    constructor(message: string, status = 500) {
      super(message)
      this.status = status
    }
  },
}))

const mockLogout = vi.fn(async () => Promise.resolve())

vi.mock('@/components/admin/admin-session', () => ({
  useAdminSession: () => ({
    user: { name: 'María' },
    logout: mockLogout,
    expireSession: vi.fn(),
    refresh: vi.fn(),
    status: 'authenticated',
  }),
}))

vi.mock('@/components/admin/admin-shell', () => ({
  AdminShell: ({
    children,
    section,
    actions,
    lastUpdate,
  }: {
    children: ReactNode
    section: string
    actions?: ReactNode
    lastUpdate?: string
  }) => (
    <div>
      <header>
        <h1>{section}</h1>
        {actions}
        {lastUpdate && <span>Última actualización · {lastUpdate}</span>}
      </header>
      <main>{children}</main>
    </div>
  ),
}))

function makeOrder(overrides: Partial<ApiPedidoListItem> = {}): ApiPedidoListItem {
  return {
    id: 100,
    numero: 'KMG-0001',
    token_seguimiento: 'token-001',
    origen: 'online',
    nombre_cliente: 'Ana',
    mesa: null,
    telefono_cliente: null,
    telefono_whatsapp: null,
    estado_pedido: 'recibido',
    estado_pago: 'comprobante_subido',
    metodo_pago: 'transferencia',
    total: '1200.00',
    observaciones: null,
    comprobante_archivo_id: null,
    created_at: '2026-06-17T18:30:00.000Z',
    updated_at: '2026-06-17T18:30:00.000Z',
    ...overrides,
  }
}

function makePaginated(
  pedidos: ApiPedidoListItem[],
  {
    total = pedidos.length,
    page = 1,
    limit = 50,
    totalPages = 1,
  }: { total?: number; page?: number; limit?: number; totalPages?: number } = {},
): ApiPedidoPaginada {
  return {
    pedidos,
    paginacion: { total, page, limit, totalPages },
  }
}

function ars(value: number) {
  return value.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  })
}

function getMetricValue(label: string): string | null {
  const labelNode = screen.getByText(label)
  const parent = labelNode.parentElement
  return parent?.nextElementSibling?.textContent ?? parent?.parentElement?.querySelector('p')?.textContent ?? null
}

  describe('DashboardScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads data from API and shows live metrics + latest orders', async () => {
    const recent = makePaginated([
      makeOrder({ id: 1, numero: 'KMG-0001', nombre_cliente: 'Ana' }),
      makeOrder({
        id: 2,
        numero: 'KMG-0002',
        nombre_cliente: 'Luis',
        estado_pedido: 'entregado',
        estado_pago: 'pagado',
        metodo_pago: 'efectivo',
      }),
    ])

    mockApiGet
      .mockResolvedValueOnce(recent)
      .mockResolvedValueOnce(makePaginated([], { total: 3 }))
      .mockResolvedValueOnce(makePaginated([], { total: 1 }))
      .mockResolvedValueOnce(makePaginated([], { total: 2 }))
      .mockResolvedValueOnce(makePaginated([], { total: 4 }))
      .mockResolvedValueOnce(makePaginated([], { total: 6 }))
      .mockResolvedValueOnce(makePaginated(
        [
          makeOrder({ id: 10, total: '12000.00', estado_pedido: 'entregado', estado_pago: 'pagado', numero: 'KMG-P1' }),
        ],
        { totalPages: 2, limit: 100 },
      ))
      .mockResolvedValueOnce(
        makePaginated([
          makeOrder({
            id: 11,
            total: '9999.00',
            estado_pedido: 'cancelado',
            estado_pago: 'pagado',
            numero: 'KMG-P2',
          }),
        ], { page: 2, totalPages: 2 }),
      )

    render(<DashboardScreen />)

    expect(screen.getByText(/cargando panel.../i)).toBeTruthy()

    await waitFor(() => {
      expect(screen.getByText(/buenos días/i)).toBeTruthy()
    })

    const latestOrdersSection = screen.getByRole('heading', {
      name: /últimos pedidos/i,
    }).closest('section')
    const latestOrders = latestOrdersSection ? within(latestOrdersSection) : null
    expect(latestOrders).toBeTruthy()
    const latestOrderRows = latestOrders?.getAllByRole('row') ?? []
    expect(latestOrderRows).toHaveLength(3)

    const [_, firstOrderRow, secondOrderRow] = latestOrderRows
    expect(firstOrderRow).toBeTruthy()
    expect(secondOrderRow).toBeTruthy()

    const firstOrder = firstOrderRow ? within(firstOrderRow) : null
    const secondOrder = secondOrderRow ? within(secondOrderRow) : null

    expect(firstOrder?.getByText('KMG-0001')).toBeTruthy()
    expect(firstOrder?.getByText('Ana')).toBeTruthy()
    expect(firstOrder?.getByText(/nuevo/i)).toBeTruthy()

    expect(secondOrder?.getByText('KMG-0002')).toBeTruthy()
    expect(secondOrder?.getByText('Luis')).toBeTruthy()

    expect(getMetricValue('Pendientes')).toBe('3')
    expect(getMetricValue('Preparando')).toBe('1')
    expect(getMetricValue('Listos')).toBe('2')
    expect(getMetricValue('Entregados')).toBe('4')
    expect(getMetricValue('Pagos pend.')).toBe('6')
    expect(getMetricValue('Recaudación')).toBe(ars(12000))

    expect(mockApiGet).toHaveBeenCalledTimes(8)
    expect(mockApiGet).toHaveBeenNthCalledWith(1, '/api/admin/pedidos', {
      limit: 6,
    })
    expect(mockApiGet).toHaveBeenNthCalledWith(2, '/api/admin/pedidos', {
      estado_pedido: 'recibido',
      limit: 1,
    })
    expect(mockApiGet).toHaveBeenNthCalledWith(3, '/api/admin/pedidos', {
      estado_pedido: 'en_preparacion',
      limit: 1,
    })
    expect(mockApiGet).toHaveBeenNthCalledWith(4, '/api/admin/pedidos', {
      estado_pedido: 'listo',
      limit: 1,
    })
    expect(mockApiGet).toHaveBeenNthCalledWith(5, '/api/admin/pedidos', {
      estado_pedido: 'entregado',
      limit: 1,
    })
    expect(mockApiGet).toHaveBeenNthCalledWith(6, '/api/admin/pedidos', {
      solo_pagos_pendientes: 'true',
      limit: 1,
    })
    expect(mockApiGet).toHaveBeenNthCalledWith(7, '/api/admin/pedidos', {
      estado_pago: 'pagado',
      limit: 100,
      page: 1,
    })
    expect(mockApiGet).toHaveBeenNthCalledWith(8, '/api/admin/pedidos', {
      estado_pago: 'pagado',
      limit: 100,
      page: 2,
    })
  })

  it('shows empty state when no latest orders exist', async () => {
    mockApiGet
      .mockResolvedValueOnce(makePaginated([], { total: 0 }))
      .mockResolvedValueOnce(makePaginated([], { total: 0 }))
      .mockResolvedValueOnce(makePaginated([], { total: 0 }))
      .mockResolvedValueOnce(makePaginated([], { total: 0 }))
      .mockResolvedValueOnce(makePaginated([], { total: 0 }))
      .mockResolvedValueOnce(makePaginated([], { total: 0 }))
      .mockResolvedValueOnce(makePaginated([], { total: 0, totalPages: 1, limit: 100 }))

    render(<DashboardScreen />)

    await waitFor(() => {
      expect(screen.getByText(/no hay pedidos todavía/i)).toBeTruthy()
    })

    expect(screen.getByText(/panel general/i)).toBeTruthy()
    expect(screen.queryByText('Nuevo')).toBeNull()
    expect(getMetricValue('Pendientes')).toBe('0')
    expect(getMetricValue('Preparando')).toBe('0')
    expect(getMetricValue('Listos')).toBe('0')
    expect(getMetricValue('Entregados')).toBe('0')
    expect(getMetricValue('Pagos pend.')).toBe('0')
    expect(getMetricValue('Recaudación')).toBe(ars(0))
  })

  it('shows API error and allows retry', async () => {
    const response = makePaginated([], { total: 0 })

    mockApiGet
      .mockRejectedValueOnce(new Error('Error de red'))
      .mockResolvedValue(response) // recent
      .mockResolvedValue(response) // recibido
      .mockResolvedValue(response) // en_preparacion
      .mockResolvedValue(response) // listo
      .mockResolvedValue(response) // entregado
      .mockResolvedValue(response) // pagos
      .mockResolvedValue(response)

    render(<DashboardScreen />)

    await waitFor(() => {
      expect(screen.getByText(/no se pudo cargar el panel/i)).toBeTruthy()
    })

    const retry = screen.getByRole('button', { name: /reintentar/i })
    expect(retry).toBeTruthy()

    mockApiGet.mockClear()
    mockApiGet.mockResolvedValue(response)

    fireEvent.click(retry)

    await waitFor(() => {
      expect(screen.getByText(/no hay pedidos todavía/i)).toBeTruthy()
    })
  })

  it('calls silent refresh when clicking manual refresh action', async () => {
    const response = makePaginated([], { total: 0 })
    mockApiGet.mockResolvedValue(response).mockResolvedValue(response).mockResolvedValue(response)

    render(<DashboardScreen />)

    await waitFor(() => {
      expect(screen.getByText(/no hay pedidos todavía/i)).toBeTruthy()
    })

    const before = mockApiGet.mock.calls.length
    const refreshButton = screen.getByRole('button', { name: /actualizar/i })
    fireEvent.click(refreshButton)

    await waitFor(() => {
      expect(mockApiGet.mock.calls.length).toBeGreaterThan(before)
    })

    expect(mockApiGet).toHaveBeenCalled()
  })
})
