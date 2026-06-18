/**
 * Tests for CajaScreen — product image rendering with fallback.
 *
 * Spec traceability:
 *   payment-verification-gate-and-pedidos-tabs/T2.2 — product images in caja
 *   payment-verification-gate-and-pedidos-tabs/T2.5 — test product image rendering
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { CajaScreen } from '@/components/admin/caja-screen'
import type { ApiProducto } from '@/lib/types'

const mockExpireSession = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/caja',
}))

vi.mock('@/components/admin/admin-session', () => ({
  useAdminSession: () => ({ expireSession: mockExpireSession }),
}))

vi.mock('@/components/admin/admin-shell', () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const mockApiGet = vi.fn()

vi.mock('@/lib/api', () => ({
  apiGet: (...args: unknown[]) => mockApiGet(...args),
  apiPost: vi.fn().mockResolvedValue({ ok: true }),
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

function makeProduct(overrides: Partial<ApiProducto> = {}): ApiProducto {
  return {
    id: 1,
    nombre: 'Pizza',
    descripcion: 'Test pizza',
    precio: '5000.00',
    tipo: 'comida',
    stock_limitado: 1,
    stock_actual: 10,
    stock_minimo_alerta: 2,
    activo: 1,
    disponible: 1,
    orden: 0,
    imagen_archivo_id: null,
    imagen_nombre_original: null,
    imagen_mime_type: null,
    imagen_tamanio_bytes: null,
    imagen_url: null,
    categorias: 'Cena',
    ...overrides,
  }
}

function mockProductList(products: ApiProducto[]) {
  mockApiGet.mockImplementation(async (url: string) => {
    if (url.includes('/api/productos')) {
      return products
    }
    if (url.includes('/api/configuracion-tienda')) {
      return { id: 1, estado: 'abierta', mensaje_publico: null, cena_habilitada_desde: null }
    }
    return {}
  })
}

describe('CajaScreen product images', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
  })

  it('renders <img> when product has imagen_url', async () => {
    const productWithImage = makeProduct({
      id: 1,
      nombre: 'Empanada',
      imagen_archivo_id: 42,
      imagen_url: '/api/productos/1/imagen?v=42',
    })

    mockProductList([productWithImage])

    render(<CajaScreen />)

    await waitFor(() => {
      const img = screen.getByRole('img', { name: /empanada/i })
      expect(img).toBeTruthy()
      expect(img.getAttribute('src')).toContain('/api/productos/1/imagen')
    })
  })

  it('renders icon fallback when product has no imagen_url', async () => {
    const productNoImage = makeProduct({
      id: 2,
      nombre: 'Gaseosa',
      imagen_archivo_id: null,
      imagen_url: null,
    })

    mockProductList([productNoImage])

    render(<CajaScreen />)

    await waitFor(() => {
      // Should NOT have an img element for this product
      const images = screen.queryByRole('img', { name: /gaseosa/i })
      expect(images).toBeNull()

      // Should have the icon glyph fallback
      const icon = screen.getByTestId('product-icon-glyph')
      expect(icon).toBeTruthy()
    })
  })

  it('renders icon fallback for product with null image fields', async () => {
    const productNullImage = makeProduct({
      id: 3,
      nombre: 'Agua',
      imagen_archivo_id: null,
      imagen_nombre_original: null,
      imagen_mime_type: null,
      imagen_tamanio_bytes: null,
      imagen_url: null,
    })

    mockProductList([productNullImage])

    render(<CajaScreen />)

    await waitFor(() => {
      // No img for this product
      expect(screen.queryByRole('img', { name: /agua/i })).toBeNull()
      // Icon glyph is present
      expect(screen.getByTestId('product-icon-glyph')).toBeTruthy()
    })
  })

  it('renders both img and icon for mixed product list', async () => {
    const withImage = makeProduct({
      id: 1,
      nombre: 'Pizza',
      imagen_archivo_id: 10,
      imagen_url: '/api/productos/1/imagen?v=10',
    })
    const withoutImage = makeProduct({
      id: 2,
      nombre: 'Cerveza',
      imagen_url: null,
    })

    mockProductList([withImage, withoutImage])

    render(<CajaScreen />)

    await waitFor(() => {
      // Product with image has an <img>
      const pizzaImg = screen.getByRole('img', { name: /pizza/i })
      expect(pizzaImg).toBeTruthy()
      // Product without image has icon glyph
      expect(screen.getByTestId('product-icon-glyph')).toBeTruthy()
    })
  })
})