import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ApiProducto } from '@/lib/types'
import { MenuScreen } from '@/components/menu/menu-screen'

const mockProducts: ApiProducto[] = [
  {
    id: 1,
    nombre: 'Pizza familiar',
    descripcion: 'Deliciosa',
    precio: 1200,
    tipo: 'comida',
    stock_limitado: 0,
    stock_actual: null,
    stock_minimo_alerta: 0,
    activo: 1,
    imagen_archivo_id: null,
    imagen_nombre_original: null,
    imagen_mime_type: null,
    imagen_tamanio_bytes: null,
    imagen_url: null,
    categorias: 'merienda',
  },
]

const mockUseCart = {
  count: 2,
  total: 2400,
  qtyOf: vi.fn(() => 0),
  add: vi.fn(),
  increment: vi.fn(),
  decrement: vi.fn(),
}

vi.mock('@/components/menu/cart-context', () => ({
  useCart: () => mockUseCart,
}))

vi.mock('@/lib/config', async () => {
  const actual = await vi.importActual<typeof import('@/lib/config')>('@/lib/config')
  return {
    ...actual,
    API_BASE: 'http://localhost:3001',
  }
})

describe('MenuScreen — store config loading/error', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockUseCart.qtyOf.mockClear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows "Verificando si la tienda está abierta…" banner when store config is loading', async () => {
    // Simulate: products resolve immediately, config never resolves (stays loading)
    let configResolve: (value: unknown) => void = () => {}
    const configPromise = new Promise((resolve) => { configResolve = resolve })

    mockFetch = vi.fn(async (url: string) => {
      if (url.includes('/api/configuracion-tienda')) {
        return configPromise.then(() =>
          new Response(JSON.stringify({ ok: true, data: { id: 1, estado: 'abierta', mensaje_publico: null } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      }
      if (url.includes('/api/productos')) {
        return new Response(JSON.stringify({ ok: true, data: mockProducts }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      throw new Error(`Unexpected endpoint: ${url}`)
    })

    vi.stubGlobal('fetch', mockFetch)
    render(<MenuScreen />)

    // Products should load, config stays pending
    expect(await screen.findByText('Pizza familiar')).toBeTruthy()
    expect(screen.getByText('Verificando si la tienda está abierta…')).toBeTruthy()

    // Now resolve config
    configResolve(undefined)
  })

  it('shows "No pudimos verificar…" banner with Reintentar button when config fetch errors', async () => {
    mockFetch = vi.fn(async (url: string) => {
      if (url.includes('/api/configuracion-tienda')) {
        throw new Error('Network error')
      }
      if (url.includes('/api/productos')) {
        return new Response(JSON.stringify({ ok: true, data: mockProducts }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      throw new Error(`Unexpected endpoint: ${url}`)
    })

    vi.stubGlobal('fetch', mockFetch)
    render(<MenuScreen />)

    expect(await screen.findByText(/No pudimos verificar si la tienda está abierta/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeTruthy()
  })

  it('Reintentar button triggers refetch for store config', async () => {
    let callCount = 0
    mockFetch = vi.fn(async (url: string) => {
      if (url.includes('/api/configuracion-tienda')) {
        callCount++
        if (callCount === 1) {
          throw new Error('Network error')
        }
        return new Response(
          JSON.stringify({ ok: true, data: { id: 1, estado: 'abierta', mensaje_publico: null } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      if (url.includes('/api/productos')) {
        return new Response(JSON.stringify({ ok: true, data: mockProducts }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      throw new Error(`Unexpected endpoint: ${url}`)
    })

    vi.stubGlobal('fetch', mockFetch)
    render(<MenuScreen />)

    // Error banner appears
    expect(await screen.findByText(/No pudimos verificar si la tienda está abierta/i)).toBeTruthy()

    // Click Reintentar
    const retryBtn = screen.getByRole('button', { name: /reintentar/i })
    fireEvent.click(retryBtn)

    // After refetch resolves, the error banner should disappear
    await screen.findByText('Pizza familiar')
    expect(screen.queryByText(/No pudimos verificar/i)).toBeNull()
  })
})