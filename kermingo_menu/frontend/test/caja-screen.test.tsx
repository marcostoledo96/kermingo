/**
 * Tests for CajaScreen — product image rendering with fallback.
 *
 * Spec traceability:
 *   payment-verification-gate-and-pedidos-tabs/T2.2 — product images in caja
 *   payment-verification-gate-and-pedidos-tabs/T2.5 — test product image rendering
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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
const mockApiPost = vi.fn()

vi.mock('@/lib/api', () => ({
  apiGet: (...args: unknown[]) => mockApiGet(...args),
  apiPost: (...args: unknown[]) => mockApiPost(...args),
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

    mockApiPost.mockResolvedValue({ numero: 'KMG-9999', id: 77 })
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

  it('sends optional notes as observaciones when confirming caja sale', async () => {
    const product = makeProduct({
      id: 10,
      nombre: 'Empanadita',
      imagen_url: '/api/productos/10/imagen?v=10',
    })

    mockProductList([product])

    render(<CajaScreen />)

    // Add product to cart
    await waitFor(() => {
      const productBtn = screen.getByRole('button', { name: /empanadita/i })
      fireEvent.click(productBtn)
    })

    const noteInput = await screen.findByLabelText(/nota opcional/i)
    fireEvent.change(noteInput, { target: { value: 'Cliente habitual' } })

    const confirmButtons = screen.getAllByRole('button', { name: /confirmar venta/i })
    fireEvent.click(confirmButtons[0])

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith(
        '/api/admin/pedidos/caja',
        expect.objectContaining({
          observaciones: 'Cliente habitual',
        }),
      )
    })
  })

  it('does not show pending verification copy when transfer is selected', async () => {
    mockProductList([makeProduct({ id: 20, nombre: 'Café' })])

    render(<CajaScreen />)

    fireEvent.click(await screen.findByRole('button', { name: /café/i }))
    fireEvent.click(screen.getByRole('button', { name: /transfer/i }))

    expect(screen.queryByText(/pago pendiente de verificación/i)).toBeNull()
  })

  it('marks unavailable promo cards as disabled and not addable', async () => {
    mockProductList([
      makeProduct({ id: 30, nombre: 'Combo no disponible', tipo: 'promo', disponible: 0, stock_limitado: 0, stock_actual: null }),
    ])

    render(<CajaScreen />)

    const promoButton = await screen.findByRole('button', { name: /combo no disponible/i })
    expect((promoButton as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getAllByText(/no disponible/i).length).toBeGreaterThan(0)

    fireEvent.click(promoButton)
    expect(screen.getByText('$ 0')).toBeTruthy()
  })
})

describe('CajaScreen catalog grouping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    mockApiPost.mockResolvedValue({ numero: 'KMG-9999', id: 77 })
  })

  it('renders category section headings when "todos" filter shows multiple categories', async () => {
    const products: ApiProducto[] = [
      makeProduct({ id: 1, nombre: 'Pizza muzza', tipo: 'comida', categorias: 'Cena' }),
      makeProduct({ id: 2, nombre: 'Medialunas', tipo: 'comida', categorias: 'Merienda' }),
      makeProduct({ id: 3, nombre: 'Coca Cola', tipo: 'bebida', categorias: 'Merienda,Cena' }),
      makeProduct({ id: 4, nombre: 'Combo cena', tipo: 'promo', categorias: 'Cena' }),
    ]

    mockProductList(products)

    render(<CajaScreen />)

    // Default filter is "todos", so all section headings should appear.
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Cena' })).toBeTruthy()
      expect(screen.getByRole('heading', { name: 'Merienda' })).toBeTruthy()
      expect(screen.getByRole('heading', { name: 'Bebidas' })).toBeTruthy()
      expect(screen.getByRole('heading', { name: 'Promos' })).toBeTruthy()
    })
  })

  it('keeps order summary and actions accessible after adding items', async () => {
    const products: ApiProducto[] = [
      makeProduct({ id: 1, nombre: 'Pizza muzza', tipo: 'comida', categorias: 'Cena' }),
      makeProduct({ id: 2, nombre: 'Coca Cola', tipo: 'bebida', categorias: 'Cena' }),
    ]

    mockProductList(products)

    render(<CajaScreen />)

    const pizzaBtn = await screen.findByRole('button', { name: /pizza muzza/i })
    fireEvent.click(pizzaBtn)

    // Total is present, and primary action buttons remain accessible.
    expect(screen.getByText('Total')).toBeTruthy()
    const confirmButtons = screen.getAllByRole('button', { name: /confirmar venta/i })
    expect(confirmButtons.length).toBeGreaterThan(0)
    const clearButtons = screen.getAllByRole('button', { name: /limpiar pedido/i })
    expect(clearButtons.length).toBeGreaterThan(0)

    // Payment method toggle and customer inputs remain available.
    expect(screen.getByRole('button', { name: /efectivo/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /transfer/i })).toBeTruthy()
    expect(screen.getByLabelText(/nombre del cliente/i)).toBeTruthy()
  })
})
