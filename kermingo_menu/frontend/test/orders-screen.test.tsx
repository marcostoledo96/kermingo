/**
 * Tests for OrdersScreen — tab switching and confirm-payment action.
 *
 * Spec traceability:
 *   payment-verification-gate-and-pedidos-tabs/T2.1 — admin pedidos tabs
 *   payment-verification-gate-and-pedidos-tabs/T2.4 — confirm-payment action
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { OrdersScreen } from '@/components/admin/orders-screen'

// --- Mock dependencies ---

const mockExpireSession = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/pedidos',
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

vi.mock('@/components/menu/product-visual', () => ({
  ProductIconGlyph: ({ icon }: { icon: string }) => (
    <span data-testid="product-icon-glyph">{icon}</span>
  ),
}))

vi.mock('@/lib/config', () => ({
  API_BASE: 'http://localhost:3001',
  ABSOLUTE_IMAGE_URL: (path: string | null | undefined) => path ? `http://localhost:3001${path.startsWith('/') ? '' : '/'}${path}` : undefined,
}))

// --- Helpers ---

function makeApiOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    numero: 'KMG-0001',
    token_seguimiento: 'abc123',
    origen: 'online',
    nombre_cliente: 'Test Client',
    mesa: null,
    telefono_cliente: null,
    telefono_whatsapp: null,
    estado_pedido: 'recibido',
    estado_pago: 'comprobante_subido',
    metodo_pago: 'transferencia',
    total: '5000.00',
    observaciones: null,
    comprobante_archivo_id: null,
    created_at: '2026-06-17T18:00:00.000Z',
    updated_at: '2026-06-17T18:00:00.000Z',
    ...overrides,
  }
}

function mockPaginatedResponse(pedidos: ReturnType<typeof makeApiOrder>[]) {
  return {
    pedidos,
    paginacion: { total: pedidos.length, page: 1, limit: 50, totalPages: 1 },
  }
}

describe('OrdersScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()

    // Default: return empty orders list for any tab
    mockApiGet.mockResolvedValue(mockPaginatedResponse([]))
  })

  describe('Tab switching', () => {
    it('renders 4 status tabs with correct aria-labels', async () => {
      mockApiGet.mockResolvedValue(mockPaginatedResponse([]))

      render(<OrdersScreen />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /ver: pendiente/i })).toBeTruthy()
        expect(screen.getByRole('button', { name: /ver: en preparación/i })).toBeTruthy()
        expect(screen.getByRole('button', { name: /ver: listo/i })).toBeTruthy()
        expect(screen.getByRole('button', { name: /ver: entregado/i })).toBeTruthy()
      })
    })

    it('defaults to recibido (Pendiente) tab and fetches with estado_pedido=recibido', async () => {
      mockApiGet.mockResolvedValue(mockPaginatedResponse([]))

      render(<OrdersScreen />)

      await waitFor(() => {
        const calls = mockApiGet.mock.calls
        const pedidosCall = calls.find(
          (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('/api/admin/pedidos'),
        )
        expect(pedidosCall).toBeTruthy()
        const queryArg = pedidosCall![1] as Record<string, unknown>
        expect(queryArg.estado_pedido).toBe('recibido')
        expect(queryArg.origen).toBe('online')
        expect(queryArg.estado_pago).toBe('comprobante_subido')
      })
    })

    it('does not render caja orders in the pending tab even if the API returns them', async () => {
      const onlineOrder = makeApiOrder({
        id: 11,
        nombre_cliente: 'Pedido Online',
        estado_pedido: 'recibido',
        estado_pago: 'comprobante_subido',
        origen: 'online',
      })
      const cajaOrder = makeApiOrder({
        id: 12,
        nombre_cliente: 'Venta Caja',
        estado_pedido: 'recibido',
        estado_pago: 'pagado',
        metodo_pago: 'efectivo',
        origen: 'caja',
      })
      mockApiGet.mockResolvedValue(mockPaginatedResponse([onlineOrder, cajaOrder]))

      render(<OrdersScreen />)

      await waitFor(() => {
        expect(screen.getAllByText(/pedido online/i).length).toBeGreaterThan(0)
      })
      expect(screen.queryByText(/venta caja/i)).toBeNull()
    })

    it('fetches with estado_pedido=en_preparacion after switching to preparacion tab', async () => {
      mockApiGet.mockResolvedValue(mockPaginatedResponse([]))

      render(<OrdersScreen />)

      // Wait for initial load
      await waitFor(() => {
        expect(mockApiGet.mock.calls.length).toBeGreaterThanOrEqual(1)
      })

      const initialCallCount = mockApiGet.mock.calls.length

      // Click "En preparación" tab
      const prepTab = screen.getByRole('button', { name: /ver: en preparación/i })
      fireEvent.click(prepTab)

      // Wait for a new API call with estado_pedido=en_preparacion
      await waitFor(() => {
        const newCalls = mockApiGet.mock.calls.slice(initialCallCount)
        const prepCall = newCalls.find(
          (c: unknown[]) =>
            typeof c[0] === 'string' &&
            (c[0] as string).includes('/api/admin/pedidos') &&
            (c[1] as Record<string, unknown>)?.estado_pedido === 'en_preparacion',
        )
        expect(prepCall).toBeTruthy()
      })
    })

    it('fetches with estado_pedido=listo after switching to listo tab', async () => {
      mockApiGet.mockResolvedValue(mockPaginatedResponse([]))

      render(<OrdersScreen />)

      await waitFor(() => {
        expect(mockApiGet.mock.calls.length).toBeGreaterThanOrEqual(1)
      })

      const initialCallCount = mockApiGet.mock.calls.length

      const listoTab = screen.getByRole('button', { name: /ver: listo/i })
      fireEvent.click(listoTab)

      await waitFor(() => {
        const newCalls = mockApiGet.mock.calls.slice(initialCallCount)
        const listoCall = newCalls.find(
          (c: unknown[]) =>
            typeof c[0] === 'string' &&
            (c[0] as string).includes('/api/admin/pedidos') &&
            (c[1] as Record<string, unknown>)?.estado_pedido === 'listo',
        )
        expect(listoCall).toBeTruthy()
      })
    })

    it('fetches with estado_pedido=entregado after switching to entregado tab', async () => {
      mockApiGet.mockResolvedValue(mockPaginatedResponse([]))

      render(<OrdersScreen />)

      await waitFor(() => {
        expect(mockApiGet.mock.calls.length).toBeGreaterThanOrEqual(1)
      })

      const initialCallCount = mockApiGet.mock.calls.length

      const entregadoTab = screen.getByRole('button', { name: /ver: entregado/i })
      fireEvent.click(entregadoTab)

      await waitFor(() => {
        const newCalls = mockApiGet.mock.calls.slice(initialCallCount)
        const entregadoCall = newCalls.find(
          (c: unknown[]) =>
            typeof c[0] === 'string' &&
            (c[0] as string).includes('/api/admin/pedidos') &&
            (c[1] as Record<string, unknown>)?.estado_pedido === 'entregado',
        )
        expect(entregadoCall).toBeTruthy()
      })
    })
  })

  describe('Confirm payment action', () => {
    it('shows "Confirmar pago" button for recibido orders with comprobante_subido', async () => {
      const recibidoOrder = makeApiOrder({
        id: 10,
        estado_pedido: 'recibido',
        estado_pago: 'comprobante_subido',
        metodo_pago: 'transferencia',
        origen: 'online',
      })
      mockApiGet.mockResolvedValue(mockPaginatedResponse([recibidoOrder]))

      render(<OrdersScreen />)

      await waitFor(() => {
        expect(screen.getByText(/confirmar pago y enviar a cocina/i)).toBeTruthy()
      })
    })

    it('calls PATCH /pago then PATCH /estado on confirm payment', async () => {
      const recibidoOrder = makeApiOrder({
        id: 42,
        estado_pedido: 'recibido',
        estado_pago: 'comprobante_subido',
        metodo_pago: 'transferencia',
        origen: 'online',
      })
      mockApiGet.mockResolvedValue(mockPaginatedResponse([recibidoOrder]))
      mockApiPatch.mockResolvedValue({ ok: true })

      render(<OrdersScreen />)

      const confirmBtn = await screen.findByRole('button', { name: /confirmar pago y enviar a cocina/i })
      fireEvent.click(confirmBtn)

      await waitFor(() => {
        // Should call PATCH /pago first
        expect(mockApiPatch).toHaveBeenCalledWith(
          '/api/admin/pedidos/42/pago',
          { estado_pago: 'pagado' },
        )
        // Then call PATCH /estado
        expect(mockApiPatch).toHaveBeenCalledWith(
          '/api/admin/pedidos/42/estado',
          { estado_pedido: 'en_preparacion' },
        )
      })

      // Verify order: payment call comes before state call
      const pagoCallIndex = mockApiPatch.mock.calls.findIndex(
        (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('/pago'),
      )
      const estadoCallIndex = mockApiPatch.mock.calls.findIndex(
        (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('/estado'),
      )
      expect(pagoCallIndex).toBeLessThan(estadoCallIndex)
    })

    it('does not call PATCH /estado when PATCH /pago fails', async () => {
      const recibidoOrder = makeApiOrder({
        id: 99,
        estado_pedido: 'recibido',
        estado_pago: 'comprobante_subido',
        metodo_pago: 'transferencia',
        origen: 'online',
      })
      mockApiGet.mockResolvedValue(mockPaginatedResponse([recibidoOrder]))
      // Make the payment PATCH fail
      mockApiPatch.mockRejectedValueOnce(new Error('Payment failed'))

      render(<OrdersScreen />)

      const confirmBtn = await screen.findByRole('button', { name: /confirmar pago y enviar a cocina/i })
      fireEvent.click(confirmBtn)

      await waitFor(() => {
        // Payment PATCH was attempted
        expect(mockApiPatch).toHaveBeenCalledWith(
          '/api/admin/pedidos/99/pago',
          { estado_pago: 'pagado' },
        )
      })

      // Give it a moment for any subsequent calls
      await new Promise((r) => setTimeout(r, 100))

      // State PATCH should NOT have been called
      const estadoCalls = mockApiPatch.mock.calls.filter(
        (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('/estado'),
      )
      expect(estadoCalls.length).toBe(0)
    })

    it('does not show generic "Enviar a cocina" advance button for recibido orders', async () => {
      const recibidoOrder = makeApiOrder({
        id: 55,
        estado_pedido: 'recibido',
        estado_pago: 'comprobante_subido',
        metodo_pago: 'transferencia',
        origen: 'online',
      })
      mockApiGet.mockResolvedValue(mockPaginatedResponse([recibidoOrder]))

      render(<OrdersScreen />)

      await waitFor(() => {
        // Confirm payment button should be present
        expect(screen.getByText(/confirmar pago y enviar a cocina/i)).toBeTruthy()
      })

      // Generic "Enviar a cocina" / "Marcar listo" / "Entregar" should NOT appear
      // for recibido — only the dedicated confirm-payment flow is allowed
      expect(screen.queryByText(/^Enviar a cocina$/i)).toBeNull()
      expect(screen.queryByText(/^Marcar listo$/i)).toBeNull()
      expect(screen.queryByText(/^Entregar$/i)).toBeNull()
    })
  })

  describe('Comprobante view in detail modal', () => {
    it('shows "Ver comprobante adjunto" button when transfer order has receipt and comprobante has public URL', async () => {
      const orderWithReceipt = makeApiOrder({
        id: 100,
        estado_pedido: 'recibido',
        estado_pago: 'comprobante_subido',
        metodo_pago: 'transferencia',
        comprobante_archivo_id: 42,
        origen: 'online',
      })
      const orderDetail = {
        ...orderWithReceipt,
        items: [],
      }

      // Mock: return different data based on URL
      mockApiGet.mockImplementation(async (url: string) => {
        if (url.includes('/comprobante')) {
          return {
            url_publica: 'https://drive.google.com/file/d/abc/view',
            url_proxy: '/api/admin/pedidos/100/comprobante/imagen',
            nombre_original: 'comprobante.jpg',
            mime_type: 'image/jpeg',
          }
        }
        if (url.includes('/pedidos/100')) {
          return orderDetail
        }
        // Default: paginated list with the order
        return mockPaginatedResponse([orderWithReceipt])
      })

      render(<OrdersScreen />)

      // Wait for order to appear
      await waitFor(() => {
        expect(screen.getByText(/confirmar pago y enviar a cocina/i)).toBeTruthy()
      })

      // Click the detail dropdown
      const moreButtons = screen.getAllByRole('button', { name: /más acciones/i })
      fireEvent.click(moreButtons[0])

      // Click "Ver detalle"
      await waitFor(() => {
        expect(screen.getByText(/ver detalle/i)).toBeTruthy()
      })
      fireEvent.click(screen.getByText(/ver detalle/i))

      // Wait for the detail modal to show comprobante button
      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /ver comprobante adjunto/i }).length).toBeGreaterThan(0)
      }, { timeout: 5000 })
    })

    it('opens comprobante image modal when clicking "Ver comprobante adjunto" button', async () => {
      const orderWithReceipt = makeApiOrder({
        id: 200,
        estado_pedido: 'recibido',
        estado_pago: 'comprobante_subido',
        metodo_pago: 'transferencia',
        comprobante_archivo_id: 50,
        origen: 'online',
      })
      const orderDetail = {
        ...orderWithReceipt,
        items: [],
      }
      const comprobanteUrl = 'https://drive.google.com/file/d/xyz/view'

      mockApiGet.mockImplementation(async (url: string) => {
        if (url.includes('/comprobante')) {
          return {
            url_publica: comprobanteUrl,
            url_proxy: '/api/admin/pedidos/200/comprobante/imagen',
            nombre_original: 'receipt.jpg',
            mime_type: 'image/jpeg',
          }
        }
        if (url.includes('/pedidos/200')) {
          return orderDetail
        }
        return mockPaginatedResponse([orderWithReceipt])
      })

      render(<OrdersScreen />)

      await waitFor(() => {
        expect(screen.getByText(/confirmar pago y enviar a cocina/i)).toBeTruthy()
      })

      // Open detail modal
      const moreButtons = screen.getAllByRole('button', { name: /más acciones/i })
      fireEvent.click(moreButtons[0])

      await waitFor(() => {
        expect(screen.getByText(/ver detalle/i)).toBeTruthy()
      })
      fireEvent.click(screen.getByText(/ver detalle/i))

      // Wait for the "Ver comprobante adjunto" button to appear
      let comprobanteBtn: HTMLElement | undefined
      await waitFor(() => {
        const buttons = screen.getAllByRole('button', { name: /ver comprobante adjunto/i })
        comprobanteBtn = buttons[buttons.length - 1]
        expect(comprobanteBtn).toBeTruthy()
      }, { timeout: 5000 })

      // Click it to open the image modal
      fireEvent.click(comprobanteBtn!)

      // Modal should show with heading (use specific heading level to avoid ambiguity)
      await waitFor(() => {
        const modalHeading = screen.getByRole('heading', { level: 3, name: /comprobante adjunto/i })
        expect(modalHeading).toBeTruthy()
      })

      // Image should have the proxy URL as src (not the Drive public URL)
      const img = screen.getByAltText('Comprobante de pago adjunto') as HTMLImageElement
      expect(img.src).toContain('/api/admin/pedidos/200/comprobante/imagen')
    })

    it('shows "Abrir en otra pestaña" fallback link inside the comprobante modal', async () => {
      const orderWithReceipt = makeApiOrder({
        id: 201,
        estado_pedido: 'recibido',
        estado_pago: 'comprobante_subido',
        metodo_pago: 'transferencia',
        comprobante_archivo_id: 51,
        origen: 'online',
      })
      const orderDetail = {
        ...orderWithReceipt,
        items: [],
      }
      const comprobanteUrl = 'https://drive.google.com/file/d/def/view'

      mockApiGet.mockImplementation(async (url: string) => {
        if (url.includes('/comprobante')) {
          return {
            url_publica: comprobanteUrl,
            url_proxy: '/api/admin/pedidos/201/comprobante/imagen',
            nombre_original: 'receipt.png',
            mime_type: 'image/png',
          }
        }
        if (url.includes('/pedidos/201')) {
          return orderDetail
        }
        return mockPaginatedResponse([orderWithReceipt])
      })

      render(<OrdersScreen />)

      await waitFor(() => {
        expect(screen.getByText(/confirmar pago y enviar a cocina/i)).toBeTruthy()
      })

      const moreButtons = screen.getAllByRole('button', { name: /más acciones/i })
      fireEvent.click(moreButtons[0])

      await waitFor(() => {
        expect(screen.getByText(/ver detalle/i)).toBeTruthy()
      })
      fireEvent.click(screen.getByText(/ver detalle/i))

      let comprobanteBtn: HTMLElement | undefined
      await waitFor(() => {
        const buttons = screen.getAllByRole('button', { name: /ver comprobante adjunto/i })
        comprobanteBtn = buttons[buttons.length - 1]
        expect(comprobanteBtn).toBeTruthy()
      }, { timeout: 5000 })
      fireEvent.click(comprobanteBtn!)

      // Modal should show "Abrir en otra pestaña" link
      await waitFor(() => {
        const openLinks = screen.getAllByRole('link', { name: /abrir en otra pestaña/i })
        expect(openLinks.length).toBeGreaterThanOrEqual(1)
        expect((openLinks[0] as HTMLAnchorElement).href).toContain('drive.google.com')
      })
    })

    it('shows comprobante image via proxy even when public URL is null', async () => {
      const orderWithReceipt = makeApiOrder({
        id: 101,
        estado_pedido: 'recibido',
        estado_pago: 'comprobante_subido',
        metodo_pago: 'transferencia',
        comprobante_archivo_id: 43,
        origen: 'online',
      })
      const orderDetail = {
        ...orderWithReceipt,
        items: [],
      }

      mockApiGet.mockImplementation(async (url: string) => {
        if (url.includes('/comprobante')) {
          return {
            url_publica: null,
            url_proxy: '/api/admin/pedidos/101/comprobante/imagen',
            nombre_original: 'comprobante.jpg',
            mime_type: 'image/jpeg',
          }
        }
        if (url.includes('/pedidos/101')) {
          return orderDetail
        }
        return mockPaginatedResponse([orderWithReceipt])
      })

      render(<OrdersScreen />)

      await waitFor(() => {
        expect(screen.getByText(/confirmar pago y enviar a cocina/i)).toBeTruthy()
      })

      const moreButtons = screen.getAllByRole('button', { name: /más acciones/i })
      fireEvent.click(moreButtons[0])

      await waitFor(() => {
        expect(screen.getByText(/ver detalle/i)).toBeTruthy()
      })
      fireEvent.click(screen.getByText(/ver detalle/i))

      await waitFor(() => {
        // With url_proxy present, the comprobante button should show (no error)
        expect(screen.getAllByRole('button', { name: /ver comprobante adjunto/i }).length).toBeGreaterThan(0)
      }, { timeout: 5000 })
    })

    it('shows "Sin comprobante adjunto" for transfer orders without receipt', async () => {
      const orderNoReceipt = makeApiOrder({
        id: 102,
        estado_pedido: 'recibido',
        estado_pago: 'pendiente',
        metodo_pago: 'transferencia',
        comprobante_archivo_id: null,
        origen: 'online',
      })
      const orderDetail = {
        ...orderNoReceipt,
        items: [],
      }

      mockApiGet.mockImplementation(async (url: string) => {
        if (url.includes('/pedidos/102')) {
          return orderDetail
        }
        return mockPaginatedResponse([orderNoReceipt])
      })

      render(<OrdersScreen />)

      // Wait for the order to appear — for a recibido+pendiente order, there's a "Pago pendiente" text
      await waitFor(() => {
        expect(screen.getByText(/pago pendiente/i)).toBeTruthy()
      })

      // Open the detail dropdown
      const moreButtons = screen.getAllByRole('button', { name: /más acciones/i })
      fireEvent.click(moreButtons[0])

      await waitFor(() => {
        expect(screen.getByText(/ver detalle/i)).toBeTruthy()
      })
      fireEvent.click(screen.getByText(/ver detalle/i))

      // Wait for detail modal to show "Sin comprobante adjunto"
      await waitFor(() => {
        expect(screen.getByText(/sin comprobante adjunto/i)).toBeTruthy()
      }, { timeout: 5000 })
    })

    it('closes comprobante modal when clicking close button', async () => {
      const orderWithReceipt = makeApiOrder({
        id: 203,
        estado_pedido: 'recibido',
        estado_pago: 'comprobante_subido',
        metodo_pago: 'transferencia',
        comprobante_archivo_id: 55,
        origen: 'online',
      })
      const orderDetail = {
        ...orderWithReceipt,
        items: [],
      }
      const comprobanteUrl = 'https://drive.google.com/file/d/close-test/view'

      mockApiGet.mockImplementation(async (url: string) => {
        if (url.includes('/comprobante')) {
          return {
            url_publica: comprobanteUrl,
            url_proxy: '/api/admin/pedidos/203/comprobante/imagen',
            nombre_original: 'receipt.jpg',
            mime_type: 'image/jpeg',
          }
        }
        if (url.includes('/pedidos/203')) {
          return orderDetail
        }
        return mockPaginatedResponse([orderWithReceipt])
      })

      render(<OrdersScreen />)

      await waitFor(() => {
        expect(screen.getByText(/confirmar pago y enviar a cocina/i)).toBeTruthy()
      })

      const moreButtons = screen.getAllByRole('button', { name: /más acciones/i })
      fireEvent.click(moreButtons[0])

      await waitFor(() => {
        expect(screen.getByText(/ver detalle/i)).toBeTruthy()
      })
      fireEvent.click(screen.getByText(/ver detalle/i))

      let comprobanteBtn: HTMLElement | undefined
      await waitFor(() => {
        const buttons = screen.getAllByRole('button', { name: /ver comprobante adjunto/i })
        comprobanteBtn = buttons[buttons.length - 1]
        expect(comprobanteBtn).toBeTruthy()
      }, { timeout: 5000 })
      fireEvent.click(comprobanteBtn!)

      // Wait for modal heading (use role+level to disambiguate from button text)
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 3, name: /comprobante adjunto/i })).toBeTruthy()
      })

      // Click the "Cerrar" button inside the modal footer (last one)
      const closeButtons = screen.getAllByRole('button', { name: /^cerrar$/i })
      // The modal has a "Cerrar" button in the footer — use the last one
      fireEvent.click(closeButtons[closeButtons.length - 1])

      // The modal should no longer show the image
      await waitFor(() => {
        expect(screen.queryByAltText('Comprobante de pago adjunto')).toBeNull()
      })
    })

    it('shows image load error state and fallback link when image fails to load', async () => {
      const orderWithReceipt = makeApiOrder({
        id: 204,
        estado_pedido: 'recibido',
        estado_pago: 'comprobante_subido',
        metodo_pago: 'transferencia',
        comprobante_archivo_id: 56,
        origen: 'online',
      })
      const orderDetail = {
        ...orderWithReceipt,
        items: [],
      }
      const comprobanteUrl = 'https://drive.google.com/broken-image-url'

      mockApiGet.mockImplementation(async (url: string) => {
        if (url.includes('/comprobante')) {
          return {
            url_publica: comprobanteUrl,
            url_proxy: '/api/admin/pedidos/204/comprobante/imagen',
            nombre_original: 'receipt.jpg',
            mime_type: 'image/jpeg',
          }
        }
        if (url.includes('/pedidos/204')) {
          return orderDetail
        }
        return mockPaginatedResponse([orderWithReceipt])
      })

      render(<OrdersScreen />)

      await waitFor(() => {
        expect(screen.getByText(/confirmar pago y enviar a cocina/i)).toBeTruthy()
      })

      const moreButtons = screen.getAllByRole('button', { name: /más acciones/i })
      fireEvent.click(moreButtons[0])

      await waitFor(() => {
        expect(screen.getByText(/ver detalle/i)).toBeTruthy()
      })
      fireEvent.click(screen.getByText(/ver detalle/i))

      let comprobanteBtn: HTMLElement | undefined
      await waitFor(() => {
        const buttons = screen.getAllByRole('button', { name: /ver comprobante adjunto/i })
        comprobanteBtn = buttons[buttons.length - 1]
        expect(comprobanteBtn).toBeTruthy()
      }, { timeout: 5000 })
      fireEvent.click(comprobanteBtn!)

      // Wait for the modal to show the image
      await waitFor(() => {
        expect(screen.getByAltText('Comprobante de pago adjunto')).toBeTruthy()
      })

      // Simulate an image load error
      const img = screen.getByAltText('Comprobante de pago adjunto') as HTMLImageElement
      fireEvent.error(img)

      // Should now show the error state with "No se pudo cargar la imagen"
      await waitFor(() => {
        expect(screen.getByText(/no se pudo cargar la imagen/i)).toBeTruthy()
      })

      // Should also show the "Abrir en otra pestaña" fallback link
      const fallbackLinks = screen.getAllByRole('link', { name: /abrir en otra pestaña/i })
      expect(fallbackLinks.length).toBeGreaterThanOrEqual(1)
    })

    it('opens comprobante modal directly from dropdown without opening detail modal first', async () => {
      const orderWithReceipt = makeApiOrder({
        id: 300,
        estado_pedido: 'recibido',
        estado_pago: 'comprobante_subido',
        metodo_pago: 'transferencia',
        comprobante_archivo_id: 70,
        origen: 'online',
      })
      const comprobanteUrl = 'https://drive.google.com/file/d/direct-test/view'

      mockApiGet.mockImplementation(async (url: string) => {
        if (url.includes('/comprobante')) {
          return {
            url_publica: comprobanteUrl,
            url_proxy: '/api/admin/pedidos/205/comprobante/imagen',
            nombre_original: 'direct-receipt.jpg',
            mime_type: 'image/jpeg',
          }
        }
        return mockPaginatedResponse([orderWithReceipt])
      })

      render(<OrdersScreen />)

      // Wait for the order to appear
      await waitFor(() => {
        expect(screen.getByText(/confirmar pago y enviar a cocina/i)).toBeTruthy()
      })

      // Open the "Más acciones" dropdown
      const moreButtons = screen.getAllByRole('button', { name: /más acciones/i })
      fireEvent.click(moreButtons[0])

      // Click "Ver comprobante adjunto" from the dropdown — this should open the image modal directly
      const comprobanteDropdownBtn = await screen.findByText(/ver comprobante adjunto/i)
      fireEvent.click(comprobanteDropdownBtn)

      // The comprobante modal should appear directly (no detail modal needed)
      // It fetches the comprobante URL and shows the image
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 3, name: /comprobante adjunto/i })).toBeTruthy()
      }, { timeout: 5000 })

      // Verify the API was called for the comprobante metadata
      const comprobanteCall = mockApiGet.mock.calls.find(
        (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('/comprobante'),
      )
      expect(comprobanteCall).toBeTruthy()

      // The image should show the proxy URL (not the Drive public URL directly)
      const img = screen.getByAltText('Comprobante de pago adjunto') as HTMLImageElement
      expect(img.src).toContain('/api/admin/pedidos/205/comprobante/imagen')
    })

    it('shows loading spinner in comprobante modal when opened directly from dropdown', async () => {
      const orderWithReceipt = makeApiOrder({
        id: 301,
        estado_pedido: 'recibido',
        estado_pago: 'comprobante_subido',
        metodo_pago: 'transferencia',
        comprobante_archivo_id: 71,
        origen: 'online',
      })

      // Make the comprobante API call hang indefinitely (never resolves)
      let resolveComprobante: (v: unknown) => void = () => {}
      mockApiGet.mockImplementation(async (url: string) => {
        if (url.includes('/comprobante')) {
          return new Promise((resolve) => { resolveComprobante = resolve })
        }
        return mockPaginatedResponse([orderWithReceipt])
      })

      render(<OrdersScreen />)

      await waitFor(() => {
        expect(screen.getByText(/confirmar pago y enviar a cocina/i)).toBeTruthy()
      })

      // Open dropdown and click "Ver comprobante adjunto"
      const moreButtons = screen.getAllByRole('button', { name: /más acciones/i })
      fireEvent.click(moreButtons[0])

      const comprobanteDropdownBtn = await screen.findByText(/ver comprobante adjunto/i)
      fireEvent.click(comprobanteDropdownBtn)

      // The modal should show with a loading state initially
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 3, name: /comprobante adjunto/i })).toBeTruthy()
      })

      // Should show loading text
      expect(screen.getByText(/cargando comprobante/i)).toBeTruthy()

      // Now resolve the comprobante API call
      resolveComprobante({
        url_publica: 'https://drive.google.com/file/d/resolved/view',
        url_proxy: '/api/admin/pedidos/206/comprobante/imagen',
        nombre_original: 'receipt.jpg',
        mime_type: 'image/jpeg',
      })

      // After resolving, the image should appear
      await waitFor(() => {
        expect(screen.getByAltText('Comprobante de pago adjunto')).toBeTruthy()
      }, { timeout: 5000 })
    })
  })

  describe('Comprobante URL resolution (Fix A)', () => {
    it('uses absolute URL for proxy comprobante image src (not relative path)', async () => {
      const orderWithReceipt = makeApiOrder({
        id: 400,
        estado_pedido: 'recibido',
        estado_pago: 'comprobante_subido',
        metodo_pago: 'transferencia',
        comprobante_archivo_id: 80,
        origen: 'online',
      })
      const comprobanteUrl = 'https://drive.google.com/file/d/test-view/view'

      mockApiGet.mockImplementation(async (url: string) => {
        if (url.includes('/comprobante')) {
          return {
            url_publica: comprobanteUrl,
            // This is a relative path — the backend returns it this way
            url_proxy: '/api/admin/pedidos/400/comprobante/imagen',
            nombre_original: 'receipt.jpg',
            mime_type: 'image/jpeg',
          }
        }
        if (url.includes('/pedidos/400')) {
          return { ...orderWithReceipt, items: [] }
        }
        return mockPaginatedResponse([orderWithReceipt])
      })

      render(<OrdersScreen />)

      // Wait for order to appear
      await waitFor(() => {
        expect(screen.getByText(/confirmar pago y enviar a cocina/i)).toBeTruthy()
      })

      // Open the "Más acciones" dropdown and click "Ver comprobante adjunto"
      const moreButtons = screen.getAllByRole('button', { name: /más acciones/i })
      fireEvent.click(moreButtons[0])

      const comprobanteDropdownBtn = await screen.findByText(/ver comprobante adjunto/i)
      fireEvent.click(comprobanteDropdownBtn)

      // Wait for the comprobante modal to show the image
      await waitFor(() => {
        const img = screen.getByAltText('Comprobante de pago adjunto') as HTMLImageElement
        // The key fix: proxy URL should be absolute (prefixed with API_BASE),
        // not a relative path that would resolve against the frontend host
        expect(img.src).toContain('localhost:3001/api/admin/pedidos/400/comprobante/imagen')
      }, { timeout: 5000 })
    })
  })

  describe('Confirm payment with already-paid orders (Fix C)', () => {
    it('skips PATCH /pago when order is already paid and only sends PATCH /estado', async () => {
      const paidOrder = makeApiOrder({
        id: 500,
        estado_pedido: 'recibido',
        estado_pago: 'pagado',
        metodo_pago: 'efectivo',
        origen: 'online',
      })
      mockApiGet.mockResolvedValue(mockPaginatedResponse([paidOrder]))
      mockApiPatch.mockResolvedValue({ ok: true })

      render(<OrdersScreen />)

      // Should show "Enviar a cocina" for already-paid recibido orders
      // In desktop table view, the button shows "Enviar" text (shortened)
      const confirmBtn = await screen.findByRole('button', { name: /enviar a cocina/i })
      expect(confirmBtn).toBeTruthy()

      fireEvent.click(confirmBtn)

      await waitFor(() => {
        // Should NOT call PATCH /pago since it's already pagado
        const pagoCalls = mockApiPatch.mock.calls.filter(
          (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('/pago'),
        )
        expect(pagoCalls.length).toBe(0)

        // Should call PATCH /estado to move to en_preparacion
        expect(mockApiPatch).toHaveBeenCalledWith(
          '/api/admin/pedidos/500/estado',
          { estado_pedido: 'en_preparacion' },
        )
      })
    })
  })
})
